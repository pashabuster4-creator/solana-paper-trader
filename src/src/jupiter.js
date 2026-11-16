import { Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";

const API = "https://api.jup.ag/swap/v2";
export const SOL_MINT = "So11111111111111111111111111111111111111112";

export function loadBotKey(secret) {
  if (!secret) throw new Error("BOT_PRIVATE_KEY missing. Live mode requires a dedicated bot wallet.");
  return Keypair.fromSecretKey(bs58.decode(secret));
}

async function request(url, options = {}, apiKey = "") {
  const headers = { ...(options.headers || {}) };
  if (apiKey) headers["x-api-key"] = apiKey;
  const r = await fetch(url, { ...options, headers, signal: AbortSignal.timeout(20000) });
  const body = await r.text();
  if (!r.ok) throw new Error(`Jupiter HTTP ${r.status}: ${body.slice(0,300)}`);
  return JSON.parse(body);
}

export async function swap({ keypair, inputMint, outputMint, amount, apiKey }) {
  const q = new URLSearchParams({
    inputMint, outputMint, amount: String(amount),
    taker: keypair.publicKey.toBase58()
  });
  const order = await request(`${API}/order?${q}`, {}, apiKey);
  if (!order.transaction || !order.requestId) throw new Error(`No executable Jupiter order: ${order.errorMessage || "empty transaction"}`);
  const tx = VersionedTransaction.deserialize(Buffer.from(order.transaction, "base64"));
  tx.sign([keypair]);
  const signedTransaction = Buffer.from(tx.serialize()).toString("base64");
  const result = await request(`${API}/execute`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ signedTransaction, requestId: order.requestId })
  }, apiKey);
  if (result.status !== "Success") throw new Error(`Swap failed: ${result.error || result.code}`);
  return { signature: result.signature, inputAmount: result.totalInputAmount, outputAmount: result.totalOutputAmount, order };
}
