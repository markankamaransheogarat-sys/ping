import { Keypair, Horizon, Networks, Asset, Operation, TransactionBuilder, Claimant } from "@stellar/stellar-sdk";

const STORAGE_KEY_SECRET = "ping_stellar_secret";
export const TESTNET_HORIZON_URL = "https://horizon-testnet.stellar.org";
export const horizonServer = new Horizon.Server(TESTNET_HORIZON_URL);

export interface LocalWallet {
  publicKey: string;
  secretKey: string;
}

export function getOrCreateWallet(): LocalWallet {
  let secret = localStorage.getItem(STORAGE_KEY_SECRET);
  let kp: Keypair;
  if (!secret) {
    kp = Keypair.random();
    localStorage.setItem(STORAGE_KEY_SECRET, kp.secret());
  } else {
    kp = Keypair.fromSecret(secret);
  }
  return {
    publicKey: kp.publicKey(),
    secretKey: kp.secret(),
  };
}

export async function fetchBalance(publicKey: string): Promise<{ xlm: string; usdc: string }> {
  try {
    const acc = await horizonServer.loadAccount(publicKey);
    let xlm = "0";
    let usdc = "0";

    for (const line of acc.balances) {
      if (line.asset_type === "native") {
        xlm = line.balance;
      } else if ("asset_code" in line && line.asset_code === "USDC") {
        usdc = line.balance;
      }
    }
    return { xlm, usdc };
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return { xlm: "0", usdc: "0" };
    }
    throw err;
  }
}

export async function fundTestnetWallet(publicKey: string): Promise<boolean> {
  try {
    const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function createDropLink({
  senderSecret,
  amount,
  expiryHours = 24,
}: {
  senderSecret: string;
  amount: string;
  expiryHours?: number;
}): Promise<{ balanceId: string; claimUrl: string }> {
  const senderKp = Keypair.fromSecret(senderSecret);
  const senderAccount = await horizonServer.loadAccount(senderKp.publicKey());

  const expirySeconds = expiryHours * 3600;
  const claimants = [
    new Claimant(senderKp.publicKey(), Claimant.predicateNot(Claimant.predicateBeforeRelativeTime(expirySeconds.toString()))),
  ];

  const tx = new TransactionBuilder(senderAccount, {
    fee: "10000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.createClaimableBalance({
        asset: Asset.native(),
        amount,
        claimants,
      })
    )
    .setTimeout(60)
    .build();

  tx.sign(senderKp);
  const result: any = await horizonServer.submitTransaction(tx);
  
  // The balance ID is in the transaction result meta
  let balanceId = "";
  if (result.hash) {
    balanceId = result.hash;
  }

  const claimUrl = `${window.location.origin}?drop=${balanceId}`;
  return { balanceId, claimUrl };
}

export async function claimDrop({
  claimerSecret,
  balanceId,
}: {
  claimerSecret: string;
  balanceId: string;
}): Promise<boolean> {
  const claimerKp = Keypair.fromSecret(claimerSecret);
  const claimerAccount = await horizonServer.loadAccount(claimerKp.publicKey());

  const tx = new TransactionBuilder(claimerAccount, {
    fee: "10000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.claimClaimableBalance({
        balanceId,
      })
    )
    .setTimeout(60)
    .build();

  tx.sign(claimerKp);
  const res = await horizonServer.submitTransaction(tx);
  return !!res.hash;
}
