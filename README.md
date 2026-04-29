# Stock Planner

A browser-based tool for quantitative stock research and portfolio analysis. All computation runs entirely in the browser — no server, no account, no data leaves your machine.

## What it does

Stock Planner has two complementary tools:

**Research** (main tab) — enter any set of Yahoo Finance ticker symbols and get a structured, data-driven report within seconds. The app fetches up to 5 years of price history and the latest fundamental data, then scores each stock across five categories: Valuation, Quality, Health, Growth, and Momentum. The result is a ranked overview table and per-ticker detail cards that break down every metric — useful both for initial screening and for monitoring positions you already follow.

**Rakuten Analysis** (second tab) — drag and drop a trade history CSV exported from Rakuten Securities and immediately see how each position has performed versus a benchmark. The app handles Shift-JIS encoding automatically, computes CAGR and alpha for every holding, and produces a fuzzy action signal (Hold, Sell, Buy More, Watch, Take Profit) that accounts for how long you have held the position and whether recent momentum confirms the long-term trend.

## The thinking behind it

Personal investment decisions benefit from a repeatable, emotionally neutral process. Reading news or acting on tips leads to inconsistent, often poorly-timed decisions. The scoring model in Stock Planner tries to operationalize a small set of robust financial principles into a single ranked number per stock, while keeping the underlying data fully visible so you can disagree with any individual score.

The model is deliberately not a black box. Every metric feeds into a named category, every category has a documented weight, and the intermediate scores are always shown alongside the raw numbers. If a stock scores 90 on Growth but 20 on Health you can see that, rather than just trusting the final signal.

Similarly the portfolio analysis does not tell you what to do — it tells you what is happening relative to a benchmark you choose, and flags positions that look statistically unusual (very high CAGR with fading momentum, sustained underperformance, etc.) so you can make an informed decision.

## Quick start

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:5173/stock-planner/](http://localhost:5173/stock-planner/) in your browser.

### Research workflow

1. Type ticker symbols into the input box (e.g. `MSFT, 7011.T, RHM.DE`)
2. Select a reference benchmark (S&P 500 is the default)
3. Click **Run Research** and wait ~10–20 seconds for data to load
4. Review the overview table and expand individual tickers for scoring detail

### Rakuten Analysis workflow

1. Log in to Rakuten Securities → 口座管理 → 取引履歴 → 商品別売買履歴
2. Export JP stocks and/or investment trusts as CSV
3. Switch to the **Rakuten Analysis** tab in Stock Planner
4. Drag the CSV file onto the drop zone (or paste the CSV text)
5. Select a benchmark and review the metrics table and charts

## Development

```bash
npm install         # install dependencies
npm run dev         # dev server with Yahoo Finance proxy at localhost:5173
npm test            # run unit tests (Vitest)
npm run build       # production build → dist/
npm run lint        # ESLint
```

## Deployment

Build output in `web/dist/` is a fully static site. Deploy to any static host (GitHub Pages, Netlify, Vercel, etc.).

The default Vite base path is `/stock-planner/` — override with the `VITE_BASE_PATH` environment variable if deploying to a different sub-path or at root.

```bash
VITE_BASE_PATH=/ npm run build   # deploy at root
```

> **Yahoo Finance proxy:** the Vite dev server proxies `/api/prices` and `/api/info` to avoid CORS issues during development. In production the app calls Yahoo Finance directly through `corsproxy.io`. No API key is required.

## Documentation

| Document | Content |
|---|---|
| [docs/finance.md](docs/finance.md) | Financial methodology — scoring model, metric definitions, signal system, assumptions |
| [docs/architecture.md](docs/architecture.md) | Technical architecture — arc42 format, component structure, data flow, deployment |
| [web/README.md](web/README.md) | Web app specifics — feature list, position aggregation rules, build instructions |

## Ticker format

Yahoo Finance symbols are used throughout. Some common suffixes:

| Market | Example |
|---|---|
| US stocks | `MSFT`, `AAPL`, `NVDA` |
| Japanese stocks | `7011.T`, `9432.T` |
| German stocks (XETRA) | `RHM.DE`, `VOW3.DE` |
| Global ETFs | `ACWI`, `GLD`, `SCHD` |
| Indices | `^GSPC`, `^N225`, `1306.T` |

Find the correct symbol at [finance.yahoo.com](https://finance.yahoo.com).
