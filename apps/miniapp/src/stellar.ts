import { Keypair, Horizon, Networks, Asset, Operation, TransactionBuilder, Claimant } from "@stellar/stellar-sdk";

export type NetworkMode = "testnet" | "mainnet";

const STORAGE_KEY_SECRET = "ping_stellar_secret";
const STORAGE_KEY_NETWORK = "ping_stellar_network";

export const TESTNET_HORIZON_URL = "https://horizon-testnet.stellar.org";
export const MAINNET_HORIZON_URL = "https://horizon.stellar.org";

// Official Circle USDC on Stellar Mainnet & Testnet
export const MAINNET_USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
export const TESTNET_USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

export function getNetworkMode(): NetworkMode {
  return (localStorage.getItem(STORAGE_KEY_NETWORK) as NetworkMode) || "testnet";
}

export function setNetworkMode(mode: NetworkMode) {
  localStorage.setItem(STORAGE_KEY_NETWORK, mode);
}

export function getHorizonServer(mode: NetworkMode = getNetworkMode()): Horizon.Server {
  return new Horizon.Server(mode === "mainnet" ? MAINNET_HORIZON_URL : TESTNET_HORIZON_URL);
}

export function getNetworkPassphrase(mode: NetworkMode = getNetworkMode()): string {
  return mode === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
}

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

export async function fetchBalance(
  publicKey: string,
  mode: NetworkMode = getNetworkMode()
): Promise<{ xlm: string; usdc: string }> {
  try {
    const server = getHorizonServer(mode);
    const acc = await server.loadAccount(publicKey);
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
  assetType = "XLM",
  expiryHours = 24,
  mode = getNetworkMode(),
}: {
  senderSecret: string;
  amount: string;
  assetType?: "XLM" | "USDC";
  expiryHours?: number;
  mode?: NetworkMode;
}): Promise<{ balanceId: string; claimUrl: string }> {
  const server = getHorizonServer(mode);
  const senderKp = Keypair.fromSecret(senderSecret);
  const senderAccount = await server.loadAccount(senderKp.publicKey());

  const asset =
    assetType === "USDC"
      ? new Asset("USDC", mode === "mainnet" ? MAINNET_USDC_ISSUER : TESTNET_USDC_ISSUER)
      : Asset.native();

  const expirySeconds = expiryHours * 3600;
  const claimants = [
    new Claimant(
      senderKp.publicKey(),
      Claimant.predicateNot(Claimant.predicateBeforeRelativeTime(expirySeconds.toString()))
    ),
  ];

  const tx = new TransactionBuilder(senderAccount, {
    fee: "10000",
    networkPassphrase: getNetworkPassphrase(mode),
  })
    .addOperation(
      Operation.createClaimableBalance({
        asset,
        amount,
        claimants,
      })
    )
    .setTimeout(60)
    .build();

  tx.sign(senderKp);
  const result: any = await server.submitTransaction(tx);

  let balanceId = "";
  if (result.hash) {
    balanceId = result.hash;
  }

  const claimUrl = `${window.location.origin}${window.location.pathname}?drop=${balanceId}`;
  return { balanceId, claimUrl };
}

export async function claimDrop({
  claimerSecret,
  balanceId,
  mode = getNetworkMode(),
}: {
  claimerSecret: string;
  balanceId: string;
  mode?: NetworkMode;
}): Promise<boolean> {
  const server = getHorizonServer(mode);
  const claimerKp = Keypair.fromSecret(claimerSecret);
  const claimerAccount = await server.loadAccount(claimerKp.publicKey());

  const tx = new TransactionBuilder(claimerAccount, {
    fee: "10000",
    networkPassphrase: getNetworkPassphrase(mode),
  })
    .addOperation(
      Operation.claimClaimableBalance({
        balanceId,
      })
    )
    .setTimeout(60)
    .build();

  tx.sign(claimerKp);
  const res = await server.submitTransaction(tx);
  return !!res.hash;
}
