const BASE = "https://api.dexscreener.com";

export async function getTokenMarket(mint) {
  const res = await fetch(`${BASE}/token-pairs/v1/solana/${encodeURIComponent(mint)}`, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Market data HTTP ${res.status}`);
  const pairs = await res.json();
  if (!Array.isArray(pairs) || !pairs.length) return null;
  const solPairs = pairs.filter(p => p.chainId === "solana" && p.liquidity?.usd != null);
  solPairs.sort((a,b) => Number(b.liquidity.usd) - Number(a.liquidity.usd));
  const p = solPairs[0];
  if (!p) return null;
  return {
    priceUsd: Number(p.priceUsd),
    liquidityUsd: Number(p.liquidity?.usd || 0),
    volume24hUsd: Number(p.volume?.h24 || 0),
    change5mPct: Number(p.priceChange?.m5 || 0),
    change1hPct: Number(p.priceChange?.h1 || 0),
    pairAddress: p.pairAddress,
    dexId: p.dexId
  };
}
