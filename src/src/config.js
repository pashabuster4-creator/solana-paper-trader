import "dotenv/config";

const num = (key, fallback) => {
  const v = process.env[key];
  return v == null || v === "" ? fallback : Number(v);
};

function parseTokens(value = "") {
  return value.split(",").map(s => s.trim()).filter(Boolean).map(entry => {
    const [mint, decimals, ...label] = entry.split(":");
    if (!mint || !Number.isInteger(Number(decimals)) || Number(decimals) < 0 || Number(decimals) > 18) {
      throw new Error(`Invalid token entry "${entry}". Use mint:decimals:label`);
    }
    return { mint, decimals: Number(decimals), label: label.join(":") || mint.slice(0, 6) };
  });
}

const watchlist = parseTokens(process.env.WATCHLIST || "");
const memes = parseTokens(process.env.MEME_TOKEN_MINTS || "");
const unique = new Map();
for (const t of [...watchlist, ...memes]) unique.set(t.mint, t);

export const config = {
  live: process.env.LIVE_TRADING === "true",
  pollSeconds: Math.max(30, num("POLL_SECONDS", 60)),
  maxCapitalUsd: Math.min(10, Math.max(0, num("MAX_TOTAL_CAPITAL_USD", 10))),
  feeReserveUsd: Math.max(1, num("FEE_RESERVE_USD", 2)),
  maxTradeUsd: Math.min(2, Math.max(0.5, num("MAX_TRADE_USD", 2))),
  maxOpenPositions: Math.min(2, Math.max(1, Math.floor(num("MAX_OPEN_POSITIONS", 2)))),
  dailyLossLimitUsd: Math.min(1, Math.max(0.25, num("DAILY_LOSS_LIMIT_USD", 1))),
  takeProfitPct: num("TAKE_PROFIT_PCT", 20),
  stopLossPct: num("STOP_LOSS_PCT", 10),
  minLiquidityUsd: num("MIN_LIQUIDITY_USD", 10000),
  minVolume24hUsd: num("MIN_VOLUME_24H_USD", 25000),
  maxPriceImpactBps: num("MAX_PRICE_IMPACT_BPS", 150),
  tokens: [...unique.values()].filter(t => t.mint !== "So11111111111111111111111111111111111111112"),
  memeMints: new Set(memes.map(t => t.mint)),
  apiKey: process.env.JUPITER_API_KEY || "",
  botPrivateKey: process.env.BOT_PRIVATE_KEY || ""
};

if (config.maxCapitalUsd > 10) throw new Error("Capital limit cannot exceed $10.");
if (config.maxTradeUsd > 2) throw new Error("Trade limit cannot exceed $2.");
if (config.takeProfitPct <= 0 || config.stopLossPct <= 0) throw new Error("TP/SL must be positive.");
