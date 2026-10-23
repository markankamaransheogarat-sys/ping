# Ping ⚡

> Money that flies like messages. Built on Stellar.

Ping is a Telegram Mini App + bot for sending money as easily as a message:

- **Ping Drop**: send `$5` as a link to anyone in any chat. They claim it in seconds, no wallet setup (Stellar claimable balances). Multi-claim "envelopes": first N people get a share.
- **Ping Split**: chip in for a dinner or a gift inside a group chat. Funds sit in a Soroban escrow: released to the organizer when the goal is met, refunded otherwise.

Status: **scaffold / MVP in progress**.

## Monorepo

| Path | What |
|---|---|
| `apps/miniapp` | Telegram Mini App (Vite + React + TS) |
| `apps/bot` | Telegram bot (grammY + TS): deep links, notifications |
| `contracts/split-escrow` | Soroban contract for Ping Split (Rust) |
| `docs/` | Architecture, roadmap |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/ROADMAP.md](docs/ROADMAP.md).

## License
MIT
