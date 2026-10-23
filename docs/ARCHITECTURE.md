# Architecture

```
Telegram chat ──link──▶ Mini App (React) ──▶ Ping API (bot service)
                              │                     │
                              ▼                     ▼
                     Stellar wallet (passkey /   Stellar Horizon + Soroban RPC
                     custodial-lite for MVP)
```

## Ping Drop
- Sender funds a **claimable balance** (native Stellar op) in USDC/XLM.
- Claim link = `t.me/<bot>/app?startapp=drop_<id>`.
- Claimer opens the Mini App → a wallet is created in the background → balance claimed.
- Unclaimed after expiry → reclaimed by the sender (claim predicate with time bound).
- Envelopes (N recipients) = N claimable balances, first-come first-served.

## Ping Split (Soroban `split-escrow`)
- `create(organizer, token, goal, share, deadline) -> id`
- `contribute(id, from)`: transfers `share` into escrow
- `release(id)`: if total ≥ goal → pay organizer
- `refund(id, who)`: after deadline and goal not met → return contribution

## Wallets (MVP)
- Phase 1: keys derived per Telegram user and held server-side (testnet only).
- Phase 2: passkey smart wallets (non-custodial) before mainnet.

## Security notes
- Testnet only until audit.
- Verify Telegram `initData` HMAC on every API call.
