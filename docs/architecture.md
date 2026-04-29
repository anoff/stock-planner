# Architecture Documentation

Stock Planner — arc42 Technical Architecture Document

---

## 1. Introduction and Goals

### Purpose

Stock Planner is a browser-based tool for quantitative stock research and personal portfolio analysis. It fetches market data from Yahoo Finance and runs all computation client-side, requiring no backend infrastructure to operate.

### Quality Goals

| Priority | Quality Goal | Scenario |
|---|---|---|
| 1 | **Portability** | The app can be deployed as a static folder to any file host (GitHub Pages, Netlify, local disk) without configuration. |
| 2 | **Privacy** | No user data, tickers, or portfolio content is ever sent to a server controlled by the application. All computation is local. |
| 3 | **Zero-install for end users** | No plugins, no account, no API key. Open the URL and start. |
| 4 | **Correctness** | Scoring and metric computations are unit-tested and directly mirror the reference Python implementation in `finance/`. |
| 5 | **Maintainability** | TypeScript throughout. Logic is isolated in `utils/` modules with no UI dependencies, making it independently testable. |

### Stakeholders

| Role | Expectation |
|---|---|
| Personal investor | Accurate, fast research reports for any ticker; honest portfolio performance vs benchmark |
| Developer (maintainer) | Clear separation between data fetching, computation, and rendering; easy to add new metrics or UI components |

---

## 2. Constraints

### Technical Constraints

| Constraint | Impact |
|---|---|
| No backend in production | All data must be sourced from external APIs callable from the browser. Server-side proxy is only available in the Vite dev server. |
| Yahoo Finance CORS policy | Yahoo Finance does not set `Access-Control-Allow-Origin` on most endpoints. In production a third-party CORS proxy (`corsproxy.io`) is used. |
| Yahoo Finance authentication | The `quoteSummary` (v10) API requires a crumb/cookie authentication flow that is not practical from a browser without a dedicated backend. The app uses the `fundamentals-timeseries` API which is unauthenticated. |
| Static hosting | Build output must be a directory of static files with no server-side rendering or routing. |
| Shift-JIS encoding | Rakuten Securities CSV exports are Shift-JIS encoded. The browser `FileReader` API reads bytes as `ArrayBuffer`; the `encoding-japanese` library handles decoding. |

### Organizational Constraints

- Single maintainer, personal project — architecture favors simplicity over scalability.
- No external dependencies beyond npm packages. No CDN-hosted scripts at runtime.

---

## 3. Context and Scope

### System Context

```
┌─────────────────────────────────────────────────────────────────┐
│  User's browser                                                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Stock Planner SPA                                        │   │
│  │  (React + TypeScript, all logic runs in-browser)         │   │
│  └──────────────┬──────────────────┬────────────────────────┘   │
│                 │                  │                             │
└─────────────────┼──────────────────┼─────────────────────────────┘
                  │                  │
       ┌──────────▼──────┐  ┌────────▼─────────────┐
       │ Yahoo Finance   │  │ CORS proxy            │
       │ Price API       │  │ (corsproxy.io, prod)  │
       │ /v8/finance/    │  │ OR Vite dev server    │
       │ chart/:ticker   │  │ proxy (dev)           │
       └─────────────────┘  └──────────────────────┘
                                      │
                             ┌────────▼──────────────┐
                             │ Yahoo Finance          │
                             │ Fundamentals API       │
                             │ /ws/fundamentals-      │
                             │ timeseries/v1/...      │
                             └───────────────────────┘
```

**External interfaces:**

| Interface | Protocol | Auth | Used for |
|---|---|---|---|
| Yahoo Finance price chart API | HTTPS / JSON | None | 5-year daily price history per ticker |
| Yahoo Finance fundamentals-timeseries API | HTTPS / JSON | None | Trailing income statement, quarterly balance sheet |
| User's local file system | `FileReader` API | None | Rakuten CSV import |

---

## 4. Solution Strategy

| Decision | Choice | Rationale |
|---|---|---|
| **Framework** | React 19 (functional components + hooks) | Declarative UI with excellent TypeScript support. No router library needed given the two-tab structure. |
| **Build tool** | Vite | Fast HMR, built-in dev server for proxying, minimal config. |
| **Language** | TypeScript | Catches metric calculation bugs at compile time. Shared types between utils enforce data shape consistency. |
| **State management** | `useState` / `useCallback` in App.tsx | Application state is a simple linear pipeline (idle → parsing → fetching → done/error). No global store needed. |
| **Charts** | Recharts | Composable, declarative chart library with good TypeScript types. Renders SVG — no canvas API needed. |
| **Computation** | Entirely client-side | Eliminates server infrastructure, eliminates privacy concerns, matches the "portable static file" deployment target. |
| **Data source** | Yahoo Finance | Free, no API key required, global coverage including US/JP/EU markets. |
| **Fundamental data endpoint** | `fundamentals-timeseries` (not `quoteSummary`) | The timeseries API does not require a crumb/cookie token, making it callable directly from the browser or CORS proxy without a session-management layer. |

---

## 5. Building Block View

### Level 1 — Application

```
stock-planner/
├── web/
│   ├── src/
│   │   ├── App.tsx             ← Root component; tab routing, portfolio pipeline
│   │   ├── main.tsx            ← React entry point
│   │   ├── components/         ← Pure UI components (receive props, render, emit callbacks)
│   │   └── utils/              ← Pure logic modules (no React imports)
│   └── vite.config.ts          ← Build config + dev server proxy
└── docs/                       ← Documentation
```

### Level 2 — Utils (logic layer)

| Module | Responsibility | Key exports |
|---|---|---|
| `utils/types.ts` | Shared TypeScript interfaces and constants | `Trade`, `Position`, `PositionMetrics`, `PriceData`, `BENCHMARK_OPTIONS` |
| `utils/csv.ts` | Rakuten CSV decoding (Shift-JIS) and trade parsing | `decodeFile`, `parseTrades`, `parsePastedTrades` |
| `utils/prices.ts` | Yahoo Finance price history fetching and point-in-time lookup | `fetchPriceData`, `priceOn`, `periodReturn` |
| `utils/metrics.ts` | Portfolio aggregation and performance metrics (CAGR, alpha, fuzzy signal) | `aggregatePositions`, `calculateMetrics`, `computeClosedPositions` |
| `utils/research.ts` | Research mode: fetch fundamentals, compute all metrics, run scoring | `fetchStockInfo`, `computeResearchMetrics`, `parseFundamentalsTimeSeries` |
| `utils/scoring.ts` | 5-category scoring engine (ported from `finance/scoring.py`) | `evaluateStock`, `CATEGORIES`, `METRIC_BANDS_FALLBACK`, `DEFAULT_WEIGHTS` |

### Level 2 — Components (UI layer)

**Research tab:**

| Component | Purpose |
|---|---|
| `ResearchPage` | Container — owns research state machine; orchestrates fetching, passes results to children |
| `TickerInput` | Ticker text entry, benchmark selector, submit button |
| `ResearchOverview` | Sortable table of all tickers — CAGR, alpha, final score, signal |
| `StockDetail` | Expandable per-ticker card — category scores, raw metric values, score bars |
| `ScoreChart` | Grouped bar chart (categories) and ranked final score bar chart |

**Rakuten Analysis tab:**

| Component | Purpose |
|---|---|
| `DropZone` | File drag-and-drop target and paste handler |
| `Summary` | Portfolio-level aggregate stats (total value, average alpha) |
| `MetricsTable` | Per-position table — CAGR, alpha, signal, returns |
| `OutperformanceChart` | Bar chart of alpha per position |
| `ScatterPlot` | Alpha vs 6M momentum scatter — identifies quadrant (strong hold, watch, sell, etc.) |
| `PositionChart` | Price timeseries per position with buy/sell markers |
| `ClosedPositions` | Table of fully-sold positions with realized CAGR |

---

## 6. Runtime View

### Research workflow

```
User enters tickers + selects benchmark
        │
        ▼
ResearchPage: setState(fetching prices)
        │
        ├─ fetchPriceData(tickers + benchmark)
        │        │
        │        └─ per ticker: GET /api/prices/:ticker (dev)
        │                    OR corsproxy.io → Yahoo Finance chart API (prod)
        │                    → parse OHLCV JSON → PriceHistory[]
        │
        ├─ computeResearchMetrics(tickers, benchmark, priceData)
        │        │
        │        ├─ per ticker: fetchStockInfo(ticker, currentPrice)
        │        │        └─ corsproxy.io → fundamentals-timeseries API
        │        │                       → parseFundamentalsTimeSeries()
        │        │                       → StockInfo (P/E, margins, D/E, …)
        │        │
        │        ├─ per ticker: compute CAGR (1Y/3Y/5Y), alpha, 6M/1M returns
        │        ├─ per ticker: evaluateStock(rawMetrics) → StockEvaluation
        │        └─ sort by finalScore descending → ResearchResult[]
        │
        ▼
ResearchPage: setState(done, results)
        │
        ├─ ResearchOverview (table)
        ├─ StockDetail × N (expandable cards)
        └─ ScoreChart (bar charts)
```

### Rakuten Analysis workflow

```
User drops CSV file (or pastes text)
        │
        ▼
App.handleFile / handlePaste
        │
        ├─ decodeFile(ArrayBuffer) → string (Shift-JIS → UTF-8)
        ├─ parseTrades(text) → Trade[]
        │
        ▼
App.processTrades(trades)
        │
        ├─ collect unique yfTickers + benchmarkTicker
        ├─ fetchPriceData(tickers) → PriceData
        ├─ aggregatePositions(trades, priceData) → Position[]
        ├─ calculateMetrics(positions, priceData, benchmark) → PositionMetrics[]
        └─ computeClosedPositions(trades) → ClosedPosition[]
                │
                ▼
        App: setState(done, { metrics, closed, priceData, trades })
                │
                ├─ Summary
                ├─ OutperformanceChart
                ├─ MetricsTable
                ├─ ScatterPlot
                ├─ PositionChart × N (togglable, range selector)
                └─ ClosedPositions
```

---

## 7. Deployment View

### Development

```
Developer machine
├── npm run dev
│     └─ Vite dev server (localhost:5173)
│           ├─ /stock-planner/          → serves React SPA from src/
│           ├─ /api/prices/:ticker      → proxy → Yahoo Finance chart API
│           └─ /api/info/:ticker        → proxy → Yahoo Finance quoteSummary API
└── npm test
      └─ Vitest (jsdom environment, no browser required)
```

### Production

```
GitHub Actions (push to main / manual trigger)
        │
        ├─ npm run build
        │     └─ tsc -b && vite build → web/dist/ (static files)
        │
        └─ Deploy web/dist/ to gh-pages branch
                │
                ▼
        GitHub Pages
        https://<org>.github.io/stock-planner/
                │
                └─ Browser loads SPA
                        │
                        └─ API calls go to corsproxy.io → Yahoo Finance
                           (no server involved)
```

**PR Preview:** every PR touching `web/` gets a preview at `https://<org>.github.io/stock-planner/pr-preview/pr-<N>/`, deployed by the same GitHub Actions workflow. Previews are cleaned up on PR close.

---

## 8. Crosscutting Concepts

### Theme (dark / light mode)

`ThemeContext` (React context) distributes the active theme and chart color palette to all components. The theme is initialized from `window.matchMedia('prefers-color-scheme')` and toggled by the sun/moon button in the header. CSS custom properties on `html[data-theme]` control all colors. Recharts components receive theme-aware color sets via context rather than hardcoded hex values.

### Price fetching and caching

`fetchPriceData` fetches all tickers concurrently (one `fetch` per ticker) and reports progress via a callback. There is no in-memory cache between sessions — data is re-fetched on each run. In development the Vite proxy adds appropriate CORS headers and handles the Yahoo Finance authentication cookie automatically via a `jar` (cookie jar in the proxy middleware). In production the CORS proxy passes the request directly.

### Rakuten CSV encoding

Rakuten Securities exports Shift-JIS encoded files. The browser `FileReader` reads raw bytes into an `ArrayBuffer`. The `encoding-japanese` package detects and converts the encoding to UTF-8 before the CSV parser runs. Pasted text is assumed to already be UTF-8 (the browser handles clipboard encoding).

### Metric normalization parity with Python

The `scoring.ts` module is a direct port of `finance/scoring.py`. Band constants, category definitions, weights, and veto rules are kept in sync manually. The shared test suite in `src/test/` verifies that outputs match for known inputs.

### Error handling

Fetch errors (network, rate-limit, missing ticker) are caught and surface either as `null` metric values (computation continues with missing data) or as an error state in the UI (`state.stage === "error"`). No error is silently swallowed — missing fundamental data is displayed as `—` in the UI rather than treated as zero.

---

## 9. Architecture Decisions

### ADR-1: No routing library

**Context:** The app has two tabs with no deep-linking requirement.
**Decision:** Tab state is managed with `useState<"research" | "portfolio">`. No `react-router` or similar.
**Consequence:** URL does not reflect active tab. Acceptable for a single-user personal tool. Revisit if the number of views grows.

### ADR-2: fundamentals-timeseries API over quoteSummary

**Context:** Yahoo Finance's `quoteSummary` (`v10` API) requires a crumb token extracted from a prior HTML page request. Automating this from the browser requires maintaining a session, which breaks in production without a backend proxy.
**Decision:** Use the `fundamentals-timeseries` API (`/ws/fundamentals-timeseries/v1/finance/timeseries`) which is accessible without authentication.
**Consequence:** Some fields available in `quoteSummary` (dividend yield, payout ratio, recommendation mean) are not available in the timeseries endpoint. These metrics show as missing for affected stocks. The EV/EBITDA calculation uses operating income as a proxy for EBITDA.

### ADR-3: CORS proxy in production via corsproxy.io

**Context:** Yahoo Finance does not set `Access-Control-Allow-Origin` headers. Fetching from the browser in production fails without a proxy.
**Decision:** Use `corsproxy.io` as a pass-through CORS proxy for production requests. No API key or account required.
**Consequence:** Dependency on a third-party service. If `corsproxy.io` becomes unavailable, data fetching in production breaks. Mitigation: the `CORS_PROXY` constant is a single string in `utils/research.ts` and `utils/prices.ts` — easy to swap.

### ADR-4: No build-time data fetching

**Context:** Pre-fetching prices at build time would enable true static serving with no runtime API calls.
**Decision:** All data is fetched at runtime by the browser.
**Consequence:** Fresh data on every run (always up-to-date). No stale build artifacts. Trade-off: first meaningful render requires several seconds of API latency.

### ADR-5: Scoring engine ported to TypeScript (not compiled from Python)

**Context:** The scoring logic exists in `finance/scoring.py`. Options were: (a) compile Python to WASM, (b) call a Python microservice, (c) manually port to TypeScript.
**Decision:** Manual TypeScript port.
**Consequence:** Two implementations to keep in sync. Mitigated by the shared test suite and clearly named band constants. Benefit: zero WASM overhead, no external service dependency, full TypeScript type checking.

---

## 10. Risks and Technical Debt

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Yahoo Finance changes API shape or authentication | Medium | High — data fetching breaks entirely | Watch for breakage; CORS_PROXY and API URLs are single-point changes |
| corsproxy.io unavailability | Low | High — production data fetching breaks | Swap `CORS_PROXY` constant; or add VITE_CORS_PROXY environment variable |
| Normalization bands become stale | Medium | Low — scores shift but model still works | Re-derive bands periodically from `finance/benchmark.py` and update `METRIC_BANDS_FALLBACK` |
| fundamentals-timeseries missing critical fields | Medium | Medium — categories score as neutral when key metrics are absent | Already handled: missing metrics excluded from averages; displayed as `—` |
| Scoring.ts / scoring.py drift | Low | Medium — research tool and Python reports disagree | Test suite covers key computations; changes to scoring.py should be mirrored in scoring.ts |
| No persistent state | — | Low — user must re-enter tickers each session | Acceptable for current use pattern; URL params or localStorage could address this |
