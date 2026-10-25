# Stellar Community Fund (SCF) Grant Application: Ping ⚡

## 1. Project Overview
- **Project Name:** Ping ⚡
- **Tagline:** Money that flies like messages. Fast, social, and trustless payments on Stellar & Soroban.
- **Repository:** [https://github.com/markankamaransheogarat-sys/ping](https://github.com/markankamaransheogarat-sys/ping)
- **Live Demo (Telegram):** [@ping_stellar_pay_bot](https://t.me/ping_stellar_pay_bot)
- **Live Mini App Web:** [https://markankamaransheogarat-sys.github.io/ping/](https://markankamaransheogarat-sys.github.io/ping/)
- **Track / Tier:** Kickstart ($15,000 – $25,000) or Build ($50,000)

---

## 2. Problem Statement
Sending crypto in group chats or to non-crypto natives is still painful:
1. **Onboarding friction:** Traditional wallets require seed phrases, gas funding, and address exchanges before receiving even a single cent.
2. **Social coordination failures:** Splitting bills (dinners, taxi, gifts) in group chats leads to awkward reminders and unpaid shares.
3. **Lack of viral distribution:** Crypto payments lack the viral social dynamics that made WeChat Pay and Venmo household names.

---

## 3. The Solution: Ping ⚡
Ping leverages **Stellar Claimable Balances** and **Soroban Smart Contracts** inside a native **Telegram Mini App**:
1. **Ping Direct Drop:** Send XLM / USDC via a single link. The recipient taps the link and claims funds instantly into an auto-provisioned Stellar wallet—zero prior setup needed. Unclaimed funds auto-refund after expiry.
2. **🧧 Red Envelopes (Multi-Claim):** Drop a money envelope into any Telegram channel or chat. The first $N$ claimers receive their share trustlessly through a custom Soroban smart contract (`envelope-drop`).
3. **🧾 Ping Split Escrow:** Group bill pooling governed by a Soroban smart contract (`split-escrow`). Funds are safely escrowed and only released to the organizer once the target goal is met; otherwise, participants are automatically refunded.
4. **Seamless Telegram UX:** Inline mode (`@ping_stellar_pay_bot drop 10`), haptic feedback, and frictionless WebApp bridge.

---

## 4. Technical Architecture & Tech Stack
- **Smart Contracts (Rust / Soroban):**
  - `contracts/split-escrow`: Escrow pooling, automated goal release, and refund locks.
  - `contracts/envelope-drop`: Multi-claim envelope pool, anti-double-claim registry, dust re-balancing, and expiration reclaim.
- **Telegram Bot Backend (TypeScript / Node.js / grammY):**
  - HMAC-SHA256 `initData` validation, deep link routing, and inline query handling.
- **Client Frontend (React 18 / Vite / TypeScript / Tailwind-ready):**
  - Stellar SDK client, local persistent keypair manager, Testnet / Mainnet toggle, and Circle USDC support.
- **Infrastructure:**
  - GitHub Pages CDN for high availability.
  - GitHub Actions CI/CD for continuous testing of Rust contracts and TypeScript builds.

---

## 5. Roadmap & Milestone Budget ($25,000 Grant)

### Milestone 1: Core Protocol & Mainnet Pilot ($8,000)
- [x] Complete Soroban smart contracts (`split-escrow`, `envelope-drop`) with 100% test coverage.
- [x] Working Telegram Mini App with Testnet / Mainnet switch.
- [ ] Deploy audited Soroban contracts to Stellar Mainnet.
- [ ] Integrate Circle USDC as the default settlement currency.

### Milestone 2: Viral Growth Mechanics & SEP-24 Fiat On-Ramp ($10,000)
- [ ] Add SEP-24 / SEP-38 anchor integration for direct Apple Pay / Credit Card on-ramp into the Telegram Mini App.
- [ ] Support "Lucky Draw" randomized share distributions for Red Envelopes (WeChat style).
- [ ] Referral & community rewards program for Telegram channels.

### Milestone 3: Security Audit, Analytics & Global Launch ($7,000)
- [ ] Independent smart contract security audit.
- [ ] Enterprise analytics dashboard for transaction volume and user retention.
- [ ] Localization (English, Spanish, Russian, Portuguese).

---

## 6. Target Audience & Growth Strategy
- **Telegram Crypto Communities:** 900M+ monthly active Telegram users, specifically Web3 communities, DAOs, and crypto alpha channels.
- **Social Influencers & Channel Owners:** Monetize engagement by distributing Red Envelopes during AMAs and live streams.
- **Everyday Friends & Travelers:** Hassle-free bill-splitting in group chats without awkward bank wire exchanges.
