import {
  Horizon,
  Keypair,
  Asset,
  Operation,
  TransactionBuilder,
  Claimant,
  Networks,
  rpc,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";

export const TESTNET_HORIZON_URL = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
export const TESTNET_RPC_URL = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
export const TESTNET_NETWORK_PASSPHRASE = Networks.TESTNET;

export const horizonServer = new Horizon.Server(TESTNET_HORIZON_URL);
export const rpcServer = new rpc.Server(TESTNET_RPC_URL);

/**
 * Creates a Stellar Claimable Balance for Ping Drop.
 * If claimerPublicKey is provided, only that public key can claim.
 * Otherwise, anyone who holds the secret key/claim link can claim, with optional sender reclaim after expiry.
 */
export async function createPingDropBalance({
  senderSecret,
  amount,
  assetCode = "XLM",
  assetIssuer,
  expiryMinutes = 1440, // 24 hours default
  claimerPublicKey,
}: {
  senderSecret: string;
  amount: string;
  assetCode?: string;
  assetIssuer?: string;
  expiryMinutes?: number;
  claimerPublicKey?: string;
}) {
  const senderKeypair = Keypair.fromSecret(senderSecret);
  const senderAccount = await horizonServer.loadAccount(senderKeypair.publicKey());

  const asset =
    assetCode === "XLM" || !assetIssuer
      ? Asset.native()
      : new Asset(assetCode, assetIssuer);

  const claimants: Claimant[] = [];

  const expiryTimestamp = Math.floor(Date.now() / 1000) + expiryMinutes * 60;

  if (claimerPublicKey) {
    // Specific recipient: can claim immediately before expiry, or sender can reclaim after expiry
    claimants.push(
      new Claimant(
        claimerPublicKey,
        Claimant.predicateBeforeRelativeTime((expiryMinutes * 60).toString())
      )
    );
    claimants.push(
      new Claimant(
        senderKeypair.publicKey(),
        Claimant.predicateNot(Claimant.predicateBeforeRelativeTime((expiryMinutes * 60).toString()))
      )
    );
  } else {
    // Unconditional claimer (e.g. temporary burner public key created for the link)
    // or claimable by sender if expired
    const senderPredicate = Claimant.predicateNot(
      Claimant.predicateBeforeRelativeTime((expiryMinutes * 60).toString())
    );
    claimants.push(new Claimant(senderKeypair.publicKey(), senderPredicate));
  }

  const tx = new TransactionBuilder(senderAccount, {
    fee: "10000",
    networkPassphrase: TESTNET_NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.createClaimableBalance({
        asset,
        amount,
        claimants: claimants.length > 0 ? claimants : [new Claimant(senderKeypair.publicKey(), Claimant.predicateUnconditional())],
      })
    )
    .setTimeout(60)
    .build();

  tx.sign(senderKeypair);
  const result = await horizonServer.submitTransaction(tx);
  return result;
}

/**
 * Claims a Claimable Balance using the claimer's secret key.
 */
export async function claimPingDropBalance({
  claimerSecret,
  balanceId,
}: {
  claimerSecret: string;
  balanceId: string;
}) {
  const claimerKeypair = Keypair.fromSecret(claimerSecret);
  const claimerAccount = await horizonServer.loadAccount(claimerKeypair.publicKey());

  const tx = new TransactionBuilder(claimerAccount, {
    fee: "10000",
    networkPassphrase: TESTNET_NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.claimClaimableBalance({
        balanceId,
      })
    )
    .setTimeout(60)
    .build();

  tx.sign(claimerKeypair);
  const result = await horizonServer.submitTransaction(tx);
  return result;
}

/**
 * Inspects a Claimable Balance from Horizon.
 */
export async function getClaimableBalance(balanceId: string) {
  return await horizonServer.claimableBalances().claimableBalance(balanceId).call();
}

/**
 * Checks an account's testnet balance or funds it with Friendbot if not found.
 */
export async function ensureFundedTestnetAccount(publicKey: string): Promise<boolean> {
  try {
    await horizonServer.loadAccount(publicKey);
    return true;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      // Fund via Friendbot
      const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
      return res.ok;
    }
    throw err;
  }
}
