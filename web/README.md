# Stock Planner

A standalone static web app for quantitative stock research and Rakuten Securities portfolio analysis.

## Features

### Research tab (default)

- **Ticker Input**: Enter any Yahoo Finance tickers (e.g. `MSFT, AAPL, 7011.T, RHM.DE`) with a configurable benchmark
- **Fundamental Data**: Fetches P/E, Price/Book, EV/EBITDA, ROE, margins, D/E, FCF yield, growth rates and analyst recommendations from Yahoo Finance
- **5-Category Scoring**: Quantitative 0–100 score across Valuation, Quality, Health, Growth and Momentum
- **Weighted Final Score**: Default weights Growth (25%), Momentum (25%), Quality (20%), Valuation (15%), Health (15%)
- **Signals**: Scores map to STRONG_BUY / BUY / HOLD / SELL / STRONG_SELL with veto rules for extreme conditions (e.g. excessive leverage, cash-burning unprofitability, persistent underperformance)
- **Overview Table**: Side-by-side comparison of all tickers with CAGR, alpha and signal columns
- **Per-Ticker Detail**: Expandable cards showing scoring breakdown, raw vs normalized metric values and price/performance history
- **Score Charts**: Grouped category bar chart and final score bar chart, both colored by signal

### Rakuten Analysis tab

- **CSV Import**: Drop Rakuten trade-history CSVs (JP stocks or investment trusts) onto the drop zone
- **Automatic Encoding**: Handles Shift-JIS encoded CSV files from Rakuten Securities
- **Price Fetching**: Retrieves 5 years of historical price data from Yahoo Finance via `yahoo-finance2`
- **Performance Metrics**: Calculates CAGR, total return, 1M/6M returns for each position
- **Benchmark Comparison**: Compares each position against S&P 500, TOPIX, Nikkei 225 or MSCI ACWI
- **Alpha Calculation**: Shows outperformance (alpha) vs the benchmark
- **Signal System**: Fuzzy-logic trading signals (Hold, Sell, Buy More, Watch, Take Profit)
- **Interactive Charts**: Bar charts for alpha/CAGR, scatter plot for alpha vs momentum, and per-position price history with buy/sell markers

### Shared infrastructure

- **Server-Side Proxy**: All Yahoo Finance requests are routed through Vite dev server middleware to avoid CORS and rate-limit issues
- **Client-Side Calculation**: All metric and scoring computations run in the browser

## Position Aggregation Rules

All trades for the same ticker are grouped together. Here is how they are handled:

| Scenario | Behaviour |
|---|---|
| **Multiple buys** | Shares and costs are summed. Average cost = total cost ÷ total shares. CAGR is measured from the **first** buy date. |
| **Partial sell** | Remaining shares = bought − sold. Cost basis is reduced proportionally (e.g. sell half → halve the cost). Shown as an **active** position. |
| **Full sell** | Position is removed from the active table and shown in the **Closed Positions** section. Realized return and CAGR are calculated from first buy to last sell date. |

## Development

```bash
npm install
npm run dev      # start dev server (includes Yahoo Finance API proxy)
npm test         # run tests
npm run build    # build for production
npm run lint     # run eslint
```

## Deployment

The app is automatically deployed to GitHub Pages on pushes to `main` that modify the `web/` directory. The deployment workflow can also be triggered manually.

**PR previews**: every pull request that touches `web/` gets its own preview URL at
`https://<org>.github.io/stock-planner/pr-preview/pr-<number>/`. A bot comment on the PR links directly to it. The preview is removed automatically when the PR is closed.

> **One-time setup**: GitHub Pages must be configured to deploy from the **`gh-pages` branch** (repo Settings → Pages → Source). Switch from "GitHub Actions" to "Deploy from a branch" and select `gh-pages`.

> **Note:** The Yahoo Finance proxy (`/api/prices` and `/api/info`) only runs in the Vite dev server. The production build is a static site — price and fundamental data are fetched directly from Yahoo Finance with a CORS proxy in production.

## Documentation

- [docs/finance.md](../docs/finance.md) — financial methodology, scoring model, investment philosophy
- [docs/architecture.md](../docs/architecture.md) — arc42 technical architecture documentation
