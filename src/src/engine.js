import { config } from "./config.js";
import { getTokenMarket } from "./market.js";
import { loadState, saveState } from "./store.js";
import { loadBotKey, swap, SOL_MINT } from "./jupiter.js";

const LAMPORTS = 1e9;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function entrySignal(m) {
  return m && m.change5mPct > 0 && m.change1hPct > 0 &&
    m.liquidityUsd >= config.minLiquidityUsd &&
    m.volume24hUsd >= config.minVolume24hUsd;
}

export async function run() {
  const state = await loadState();
  const keypair = config.live ? loadBotKey(config.botPrivateKey) : null;
  if (config.live && !config.apiKey) throw new Error("JUPITER_API_KEY is required for live trading.");
  console.log(`Mode=${config.live ? "LIVE" : "PAPER"} | watchlist=${config.tokens.length} | bot=${keypair?.publicKey.toBase58() || "not loaded"}`);

  while (true) {
    try {
      const today = new Date().toISOString().slice(0,10);
      if (state.day !== today) { state.day = today; state.realizedLossTodayUsd = 0; }

      const markets = new Map();
      for (const token of config.tokens) {
        try { markets.set(token.mint, await getTokenMarket(token.mint)); }
        catch (e) { console.warn(`Market lookup ${token.label}: ${e.message}`); }
      }
      // SOL is the quote/funding asset, never an entry candidate.
      try { markets.set(SOL_MINT, await getTokenMarket(SOL_MINT)); }
      catch (e) { console.warn(`SOL price lookup: ${e.message}`); }

      // Exit checks first. Live sells use the exact token balance recorded from the buy fill.
      for (const [mint, pos] of Object.entries(state.positions)) {
        const m = markets.get(mint);
        if (!m || !m.priceUsd || !pos.entryPriceUsd) continue;
        const pnlPct = (m.priceUsd / pos.entryPriceUsd - 1) * 100;
        if (pnlPct >= config.takeProfitPct || pnlPct <= -config.stopLossPct) {
          console.log(`EXIT ${pos.label}: ${pnlPct.toFixed(2)}%`);
          if (config.live) {
            const out = await swap({ keypair, inputMint: mint, outputMint: SOL_MINT, amount: pos.tokenAmountRaw, apiKey: config.apiKey });
            console.log(`SELL ${out.signature}`);
          }
          const pnlUsd = pos.usdCost * pnlPct / 100;
          if (pnlUsd < 0) state.realizedLossTodayUsd += Math.abs(pnlUsd);
          state.trades.push({ at: new Date().toISOString(), side: "SELL", mint, label: pos.label, pnlPct, pnlUsd, mode: config.live ? "live" : "paper" });
          delete state.positions[mint];
          await saveState(state);
        }
      }

      if (state.realizedLossTodayUsd >= config.dailyLossLimitUsd) {
        console.warn("Daily loss cap reached; no new entries.");
      } else if (Object.keys(state.positions).length < config.maxOpenPositions) {
        for (const token of config.tokens) {
          if (state.positions[token.mint]) continue;
          const m = markets.get(token.mint);
          if (!entrySignal(m)) continue;
          const currentPositions = Object.keys(state.positions).length;
          if (currentPositions >= config.maxOpenPositions) break;
          // No more than $2 per position. Reserve $2 of the $10 wallet for fees.
          const committed = Object.values(state.positions).reduce((n,p) => n + p.usdCost, 0);
          const budget = Math.min(config.maxTradeUsd, config.maxCapitalUsd - config.feeReserveUsd - committed);
          if (budget < 0.5) break;
          console.log(`ENTRY SIGNAL ${token.label}: 5m=${m.change5mPct}% 1h=${m.change1hPct}% liquidity=$${m.liquidityUsd}`);
          if (config.live) {
            // Convert USD budget to SOL using the wrapped-SOL USD market price.
            const solMarket = markets.get(SOL_MINT) || await getTokenMarket(SOL_MINT);
            if (!solMarket?.priceUsd) throw new Error("Cannot price SOL; refusing entry.");
            const solAmount = Math.floor((budget / solMarket.priceUsd) * LAMPORTS);
            const out = await swap({ keypair, inputMint: SOL_MINT, outputMint: token.mint, amount: solAmount, apiKey: config.apiKey });
            const tokenAmountRaw = String(out.outputAmount);
            state.positions[token.mint] = { label: token.label, tokenAmountRaw, decimals: token.decimals, usdCost: budget, entryPriceUsd: m.priceUsd, entryAt: new Date().toISOString(), entrySignature: out.signature };
            console.log(`BUY ${token.label}: ${out.signature}`);
          } else {
            state.positions[token.mint] = { label: token.label, tokenAmountRaw: "PAPER", decimals: token.decimals, usdCost: budget, entryPriceUsd: m.priceUsd, entryAt: new Date().toISOString() };
            console.log(`PAPER BUY ${token.label} $${budget}`);
          }
          state.trades.push({ at: new Date().toISOString(), side: "BUY", mint: token.mint, label: token.label, usdCost: budget, priceUsd: m.priceUsd, mode: config.live ? "live" : "paper" });
          await saveState(state);
        }
      }
      await saveState(state);
    } catch (e) {
      console.error(`Cycle error: ${e.message}`);
    }
    await sleep(config.pollSeconds * 1000);
  }
}
