#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env};

fn create_token_contract<'a>(env: &Env, admin: &Address) -> token::Client<'a> {
    let token_contract = env.register_stellar_asset_contract_v2(admin.clone());
    token::Client::new(env, &token_contract.address())
}

#[test]
fn test_create_and_multi_claim() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let user3 = Address::generate(&env);

    let token = create_token_contract(&env, &admin);
    let token_admin = token::StellarAssetClient::new(&env, &token.address);
    token_admin.mint(&creator, &1000);

    let contract_id = env.register(EnvelopeDrop, ());
    let client = EnvelopeDropClient::new(&env, &contract_id);

    // Create envelope: 300 tokens divided among 3 claims (100 each), 1 hour duration
    let drop_id = client.create(&creator, &token.address, &300, &3, &3600);
    assert_eq!(token.balance(&contract_id), 300);

    // User 1 claims
    let s1 = client.claim(&drop_id, &user1);
    assert_eq!(s1, 100);
    assert_eq!(token.balance(&user1), 100);

    // User 2 claims
    let s2 = client.claim(&drop_id, &user2);
    assert_eq!(s2, 100);
    assert_eq!(token.balance(&user2), 100);

    // User 3 claims last share
    let s3 = client.claim(&drop_id, &user3);
    assert_eq!(s3, 100);
    assert_eq!(token.balance(&user3), 100);

    assert_eq!(token.balance(&contract_id), 0);
    let state = client.get(&drop_id);
    assert_eq!(state.claimed_count, 3);
    assert_eq!(state.remaining_amount, 0);
}

#[test]
#[should_panic(expected = "already claimed")]
fn test_cannot_claim_twice() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let user = Address::generate(&env);

    let token = create_token_contract(&env, &admin);
    let token_admin = token::StellarAssetClient::new(&env, &token.address);
    token_admin.mint(&creator, &500);

    let contract_id = env.register(EnvelopeDrop, ());
    let client = EnvelopeDropClient::new(&env, &contract_id);

    let drop_id = client.create(&creator, &token.address, &200, &2, &3600);
    client.claim(&drop_id, &user);
    // Second claim must fail
    client.claim(&drop_id, &user);
}

#[test]
fn test_reclaim_after_expiry() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let user1 = Address::generate(&env);

    let token = create_token_contract(&env, &admin);
    let token_admin = token::StellarAssetClient::new(&env, &token.address);
    token_admin.mint(&creator, &500);

    let contract_id = env.register(EnvelopeDrop, ());
    let client = EnvelopeDropClient::new(&env, &contract_id);

    let drop_id = client.create(&creator, &token.address, &300, &3, &1000);
    
    // Only 1 user claims
    client.claim(&drop_id, &user1);
    assert_eq!(token.balance(&contract_id), 200);

    // Advance time past deadline
    env.ledger().set_timestamp(2000);

    // Creator reclaims remaining 200
    let balance_before = token.balance(&creator);
    let reclaimed = client.reclaim(&drop_id);
    assert_eq!(reclaimed, 200);
    assert_eq!(token.balance(&creator), balance_before + 200);
    assert_eq!(token.balance(&contract_id), 0);
}
