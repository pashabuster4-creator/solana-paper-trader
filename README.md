# Phantom Solana Auto Trader — starter

This is a **paper-trading starter**, not a production-ready trading system. It does not connect to Phantom, hold a private key, sign transactions, or submit live swaps. Live trading is intentionally not implemented in this starter.

## Run it

1. Install Node.js 20 or newer on a computer or supported cloud service.
2. Copy `.env.example` to `.env` and keep `LIVE_TRADING=false`.
3. Run `npm install` and then `npm start`.

The program fetches public Solana token market listings from DexScreener for any mint addresses you explicitly add to `WATCHLIST_MINTS`, then prints observations. It does not make buy/sell decisions or place trades.

## Safety

- Never upload `.env`, a wallet seed phrase, or a private key to GitHub.
- Never share your Phantom recovery phrase or private key in chat.
- Do not fund a bot wallet or enable live trading based on this starter.
- A $10 setting is not a guarantee of a hard wallet-balance cap. This starter is observation-only.

Before any real-money trading, the code would need independent security review, wallet-balance enforcement, reliable persistent accounting, swap simulation and verification, slippage/fee controls, failure handling, and extensive paper testing.
