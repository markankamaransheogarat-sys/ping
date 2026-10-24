#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger}, token, Address, Env};

fn create_token<'a>(env: &Env, admin: &Address) -> token::Client<'a> {
    let token_contract = env.register_stellar_asset_contract_v2(admin.clone());
    token::Client::new(env, &token_contract.address())
}

#[test]
fn test_create_and_get_split() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SplitEscrow, ());
    let client = SplitEscrowClient::new(&env, &contract_id);

    let organizer = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let deadline = 1000u64;
    let goal = 100_000_000i128; // 10 USDC (7 decimals)
    let share = 20_000_000i128; // 2 USDC

    let split_id = client.create(&organizer, &token.address, &goal, &share, &deadline);
    assert_eq!(split_id, 1);

    let split = client.get(&split_id);
    assert_eq!(split.organizer, organizer);
    assert_eq!(split.token, token.address);
    assert_eq!(split.goal, goal);
    assert_eq!(split.share, share);
    assert_eq!(split.deadline, deadline);
    assert_eq!(split.total, 0);
    assert_eq!(split.released, false);
}

#[test]
fn test_contribute_and_release_when_goal_met() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SplitEscrow, ());
    let client = SplitEscrowClient::new(&env, &contract_id);

    let organizer = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);
    let token_sac = token::StellarAssetClient::new(&env, &token.address);

    let participant_1 = Address::generate(&env);
    let participant_2 = Address::generate(&env);

    let goal = 40_000_000i128; // 4 USDC
    let share = 20_000_000i128; // 2 USDC
    let deadline = 2000u64;

    // Mint tokens to participants
    token_sac.mint(&participant_1, &share);
    token_sac.mint(&participant_2, &share);

    let split_id = client.create(&organizer, &token.address, &goal, &share, &deadline);

    // Participant 1 contributes
    client.contribute(&split_id, &participant_1);
    let split = client.get(&split_id);
    assert_eq!(split.total, share);
    assert_eq!(token.balance(&participant_1), 0);
    assert_eq!(token.balance(&contract_id), share);

    // Participant 2 contributes -> goal met
    client.contribute(&split_id, &participant_2);
    let split = client.get(&split_id);
    assert_eq!(split.total, goal);
    assert_eq!(token.balance(&contract_id), goal);

    // Release to organizer
    client.release(&split_id);
    let split = client.get(&split_id);
    assert!(split.released);
    assert_eq!(token.balance(&contract_id), 0);
    assert_eq!(token.balance(&organizer), goal);
}

#[test]
fn test_refund_after_deadline_when_goal_not_met() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SplitEscrow, ());
    let client = SplitEscrowClient::new(&env, &contract_id);

    let organizer = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);
    let token_sac = token::StellarAssetClient::new(&env, &token.address);

    let participant = Address::generate(&env);

    let goal = 100_000_000i128;
    let share = 25_000_000i128;
    let deadline = 1000u64;

    token_sac.mint(&participant, &share);

    let split_id = client.create(&organizer, &token.address, &goal, &share, &deadline);
    client.contribute(&split_id, &participant);

    assert_eq!(token.balance(&contract_id), share);

    // Fast-forward ledger time past deadline
    env.ledger().set_timestamp(deadline + 10);

    // Refund participant
    client.refund(&split_id, &participant);

    assert_eq!(token.balance(&contract_id), 0);
    assert_eq!(token.balance(&participant), share);
}

#[test]
#[should_panic(expected = "already paid")]
fn test_cannot_contribute_twice() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SplitEscrow, ());
    let client = SplitEscrowClient::new(&env, &contract_id);

    let organizer = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);
    let token_sac = token::StellarAssetClient::new(&env, &token.address);

    let participant = Address::generate(&env);
    let share = 10_000_000i128;
    token_sac.mint(&participant, &(share * 2));

    let split_id = client.create(&organizer, &token.address, &(share * 2), &share, &1000);
    client.contribute(&split_id, &participant);
    client.contribute(&split_id, &participant);
}

#[test]
#[should_panic(expected = "closed")]
fn test_cannot_contribute_after_deadline() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SplitEscrow, ());
    let client = SplitEscrowClient::new(&env, &contract_id);

    let organizer = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);
    let token_sac = token::StellarAssetClient::new(&env, &token.address);

    let participant = Address::generate(&env);
    let share = 10_000_000i128;
    token_sac.mint(&participant, &share);

    let deadline = 1000u64;
    let split_id = client.create(&organizer, &token.address, &(share * 2), &share, &deadline);

    env.ledger().set_timestamp(deadline + 1);
    client.contribute(&split_id, &participant);
}

#[test]
#[should_panic(expected = "goal not met")]
fn test_cannot_release_if_goal_unmet() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SplitEscrow, ());
    let client = SplitEscrowClient::new(&env, &contract_id);

    let organizer = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let split_id = client.create(&organizer, &token.address, &50_000_000, &10_000_000, &1000);
    client.release(&split_id);
}
