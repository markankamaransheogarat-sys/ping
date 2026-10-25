#![no_std]
//! Ping Envelope Drop: Red Envelope multi-claim smart contract on Soroban.
//! Sender deposits a total amount divided among N claims. First N users claim a share.
//! If expired, remaining unclaimed funds can be reclaimed by the creator.

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};

#[contracttype]
#[derive(Clone)]
pub struct Envelope {
    pub creator: Address,
    pub token: Address,
    pub total_amount: i128,
    pub remaining_amount: i128,
    pub total_claims: u32,
    pub claimed_count: u32,
    pub share_amount: i128,
    pub deadline: u64,
}

#[contracttype]
pub enum Key {
    Count,
    Envelope(u32),
    Claimed(u32, Address),
}

#[contract]
pub struct EnvelopeDrop;

#[contractimpl]
impl EnvelopeDrop {
    /// Create a new Red Envelope drop
    pub fn create(
        env: Env,
        creator: Address,
        token: Address,
        total_amount: i128,
        total_claims: u32,
        duration_seconds: u64,
    ) -> u32 {
        creator.require_auth();
        assert!(total_amount > 0 && total_claims > 0, "invalid parameters");

        let share_amount = total_amount / (total_claims as i128);
        assert!(share_amount > 0, "share amount too small");

        let deadline = env.ledger().timestamp() + duration_seconds;
        let id: u32 = env.storage().instance().get(&Key::Count).unwrap_or(0) + 1;
        env.storage().instance().set(&Key::Count, &id);

        // Transfer tokens from creator to contract
        token::Client::new(&env, &token).transfer(
            &creator,
            &env.current_contract_address(),
            &total_amount,
        );

        let env_obj = Envelope {
            creator,
            token,
            total_amount,
            remaining_amount: total_amount,
            total_claims,
            claimed_count: 0,
            share_amount,
            deadline,
        };

        env.storage().persistent().set(&Key::Envelope(id), &env_obj);
        id
    }

    /// Claim a share from the envelope
    pub fn claim(env: Env, id: u32, claimer: Address) -> i128 {
        claimer.require_auth();
        let mut e: Envelope = env.storage().persistent().get(&Key::Envelope(id)).expect("no envelope");

        assert!(env.ledger().timestamp() <= e.deadline, "envelope expired");
        assert!(e.claimed_count < e.total_claims, "all shares claimed");

        let claimed_key = Key::Claimed(id, claimer.clone());
        assert!(!env.storage().persistent().has(&claimed_key), "already claimed");

        let share = if e.claimed_count + 1 == e.total_claims {
            // Last claim gets all remaining dust to ensure exact balance
            e.remaining_amount
        } else {
            e.share_amount
        };

        token::Client::new(&env, &e.token).transfer(
            &env.current_contract_address(),
            &claimer,
            &share,
        );

        e.claimed_count += 1;
        e.remaining_amount -= share;

        env.storage().persistent().set(&claimed_key, &true);
        env.storage().persistent().set(&Key::Envelope(id), &e);

        share
    }

    /// Reclaim remaining funds after expiry
    pub fn reclaim(env: Env, id: u32) -> i128 {
        let mut e: Envelope = env.storage().persistent().get(&Key::Envelope(id)).expect("no envelope");
        e.creator.require_auth();

        assert!(env.ledger().timestamp() > e.deadline, "not expired yet");
        assert!(e.remaining_amount > 0, "nothing to reclaim");

        let refund = e.remaining_amount;
        e.remaining_amount = 0;

        token::Client::new(&env, &e.token).transfer(
            &env.current_contract_address(),
            &e.creator,
            &refund,
        );

        env.storage().persistent().set(&Key::Envelope(id), &e);
        refund
    }

    /// Get envelope state
    pub fn get(env: Env, id: u32) -> Envelope {
        env.storage().persistent().get(&Key::Envelope(id)).expect("no envelope")
    }

    /// Check if address has claimed
    pub fn has_claimed(env: Env, id: u32, who: Address) -> bool {
        env.storage().persistent().has(&Key::Claimed(id, who))
    }
}

#[cfg(test)]
mod test;
