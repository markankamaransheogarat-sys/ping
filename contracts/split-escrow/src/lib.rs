#![no_std]
//! Ping Split escrow: collect equal shares toward a goal, release or refund.
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};

#[contracttype]
#[derive(Clone)]
pub struct Split {
    pub organizer: Address,
    pub token: Address,
    pub goal: i128,
    pub share: i128,
    pub deadline: u64,
    pub total: i128,
    pub released: bool,
}

#[contracttype]
pub enum Key {
    Count,
    Split(u32),
    Paid(u32, Address),
}

#[contract]
pub struct SplitEscrow;

#[contractimpl]
impl SplitEscrow {
    pub fn create(env: Env, organizer: Address, token: Address, goal: i128, share: i128, deadline: u64) -> u32 {
        organizer.require_auth();
        assert!(goal > 0 && share > 0, "bad amounts");
        let id: u32 = env.storage().instance().get(&Key::Count).unwrap_or(0) + 1;
        env.storage().instance().set(&Key::Count, &id);
        let s = Split { organizer, token, goal, share, deadline, total: 0, released: false };
        env.storage().persistent().set(&Key::Split(id), &s);
        id
    }

    pub fn contribute(env: Env, id: u32, from: Address) {
        from.require_auth();
        let mut s: Split = env.storage().persistent().get(&Key::Split(id)).expect("no split");
        assert!(!s.released && env.ledger().timestamp() < s.deadline, "closed");
        let paid = Key::Paid(id, from.clone());
        assert!(!env.storage().persistent().has(&paid), "already paid");
        token::Client::new(&env, &s.token).transfer(&from, &env.current_contract_address(), &s.share);
        s.total += s.share;
        env.storage().persistent().set(&paid, &true);
        env.storage().persistent().set(&Key::Split(id), &s);
    }

    pub fn release(env: Env, id: u32) {
        let mut s: Split = env.storage().persistent().get(&Key::Split(id)).expect("no split");
        assert!(!s.released && s.total >= s.goal, "goal not met");
        s.released = true;
        token::Client::new(&env, &s.token).transfer(&env.current_contract_address(), &s.organizer, &s.total);
        env.storage().persistent().set(&Key::Split(id), &s);
    }

    pub fn refund(env: Env, id: u32, who: Address) {
        let s: Split = env.storage().persistent().get(&Key::Split(id)).expect("no split");
        assert!(!s.released && s.total < s.goal && env.ledger().timestamp() >= s.deadline, "not refundable");
        let paid = Key::Paid(id, who.clone());
        assert!(env.storage().persistent().has(&paid), "nothing to refund");
        env.storage().persistent().remove(&paid);
        token::Client::new(&env, &s.token).transfer(&env.current_contract_address(), &who, &s.share);
    }

    pub fn get(env: Env, id: u32) -> Split {
        env.storage().persistent().get(&Key::Split(id)).expect("no split")
    }
}

#[cfg(test)]
mod test;
