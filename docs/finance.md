# Financial Methodology

This document explains the investment thinking, assumptions, and mathematical model behind how Stock Planner evaluates stocks. It is intended for anyone who wants to understand or challenge the scoring logic rather than just accept the output.

---

## 1. Investment Philosophy

The goal is not to beat professional fund managers — it is to make personal investment decisions more consistent and less emotionally driven.

Human investors reliably make a small set of recurring mistakes: holding losers too long because selling feels like admitting a mistake, selling winners too early because a gain feels fragile, concentrating positions in familiar names, and acting on news or tips rather than underlying business performance. A quantitative scoring model does not eliminate judgment, but it provides a stable baseline that is unaffected by mood, recent news, or the anchoring effect of what you paid for a stock.

The model here is built around three principles:

**Transparency over accuracy.** Every intermediate score is shown alongside the raw metric value. You can disagree with any individual number and override the signal with your own judgment. The model is a starting point, not a verdict.

**Multiple perspectives.** No single metric tells you whether a stock is worth buying. A cheap stock (low P/E) may be cheap because the business is deteriorating. A fast-growing stock may be priced for perfection with no margin of safety. The model deliberately combines fundamental quality, financial health, growth trajectory, and price momentum to avoid over-reliance on any one lens.

**Relative performance.** Stocks are not evaluated in absolute terms but against a benchmark you choose. A stock that returns 8% per year sounds decent — unless the benchmark returned 15%. Alpha (outperformance over the benchmark) is the primary lens for portfolio decisions, not raw return.

---

## 2. The Five-Category Scoring Model

Each stock is scored from 0 to 100 across five categories. The categories and their weights in the final score are:

| Category | Weight | Rationale |
|---|---|---|
| **Growth** | 25% | Growth is the primary driver of long-term compounding. A business that is not growing faster than inflation will eventually lose real value. |
| **Momentum** | 25% | Price momentum captures market consensus about near-term prospects. Sustained underperformance relative to the benchmark is a warning signal regardless of fundamentals. |
| **Quality** | 20% | Profitable, capital-efficient businesses survive downturns and compound returns over time. Margin and return metrics separate businesses that generate real cash from those that report accounting profits. |
| **Valuation** | 15% | Paying too much for even a good business destroys returns. Valuation is weighted lower than growth because overpaying for high-quality businesses is a smaller error than holding low-quality ones. |
| **Health** | 15% | Balance sheet stress can make otherwise good businesses uninvestable during recessions. Debt and liquidity metrics act as a floor — a highly leveraged business can be fine until it isn't. |

The weights reflect a long-term equity orientation. They are not dynamically adjusted for market conditions. A more conservative investor would reasonably increase the weight on Health and Valuation.

### How category scores are computed

Each category contains a set of individual metrics. For each metric:

1. The raw value is fetched from Yahoo Finance (fundamental data) or computed from price history (momentum).
2. It is linearly normalized to a 0–100 score using bands derived from MSCI ACWI constituents. A score of 0 represents the bottom of the observed range; 100 represents the top.
3. Missing metrics are excluded. The category score is the average of available sub-scores (not set to zero for missing data).

The final score is a weighted average of the five category scores.

---

## 3. Individual Metrics

### Valuation

Valuation metrics answer: *how much are you paying per unit of business value?* Lower is better for all three.

| Metric | Formula | Normalization band | Notes |
|---|---|---|---|
| **P/E (trailing)** | Price ÷ trailing 12-month EPS | 5× – 40× (lower → higher score) | Negative P/E (loss-making) is treated as missing and excluded. |
| **Price / Book** | Market cap ÷ book equity | 0.5× – 8× (lower → higher score) | Useful for capital-intensive businesses; less meaningful for asset-light tech. |
| **EV / EBITDA** | Enterprise value ÷ EBITDA | 3× – 25× (lower → higher score) | Capital-structure neutral. EBITDA is approximated as operating income. |

### Quality

Quality metrics answer: *is this a well-run, profitable business?* Higher is better for all except payout ratio.

| Metric | Formula | Normalization band | Notes |
|---|---|---|---|
| **Return on Equity** | Net income ÷ shareholders' equity | 0% – 30% | Measures how efficiently management uses shareholder capital. |
| **Operating Margin** | Operating income ÷ revenue | 0% – 35% | Persistent operating leverage distinguishes pricing power from commodity businesses. |
| **Gross Margin** | Gross profit ÷ revenue | 0% – 70% | High gross margins fund R&D and marketing without equity dilution. |
| **Dividend Yield** | Annual dividend ÷ price | 0% – 6% | A signal of capital allocation discipline. Zero is not penalized — some growth businesses legitimately reinvest everything. |
| **Payout Ratio** | Dividends ÷ earnings | 0 – 100% (lower → higher score) | A very high payout ratio signals limited reinvestment capacity or an unsustainable dividend. |

### Health

Health metrics answer: *can this business survive a downturn?*

| Metric | Formula | Normalization band | Notes |
|---|---|---|---|
| **Debt / Equity** | Total debt ÷ shareholders' equity × 100 | 0% – 200% (lower → higher score) | Reported as a percentage by Yahoo Finance. Above 500% triggers a veto rule (see §5). |
| **Current Ratio** | Current assets ÷ current liabilities | 0.5 – 3.0 | Below 1.0 means the business cannot cover short-term obligations from liquid assets. |
| **FCF Yield** | Free cash flow ÷ market cap | 0% – 10% | Cash returned per dollar of market value. The most reliable single profitability signal. |

### Growth

Growth metrics answer: *is the business expanding faster than the economy?*

| Metric | Formula | Normalization band | Notes |
|---|---|---|---|
| **Quarterly Earnings Growth** | (Recent quarter net income − same quarter 1Y ago) ÷ |prior year| | −20% – +30% | Year-over-year comparison avoids seasonal distortion. |
| **Revenue Growth** | (Recent quarter revenue − same quarter 1Y ago) ÷ |prior year| | −10% – +30% | Revenue growth without earnings growth is a warning sign. |
| **Analyst Recommendation** | Mean recommendation score (1 = Strong Buy, 5 = Strong Sell) | 1 – 5 (inverted) | Aggregated consensus from sell-side analysts. Imperfect but captures information not visible in historical data. |

### Momentum

Momentum metrics answer: *what is the market saying about this stock right now?* All are price-based and computed from Yahoo Finance historical data rather than from fundamental reports.

| Metric | Formula | Normalization band | Notes |
|---|---|---|---|
| **Alpha (best window)** | CAGR(stock) − CAGR(benchmark) over the longest available window (5Y → 3Y → 1Y) | −10 pp – +15 pp | Long-term alpha is the primary momentum signal. Positive alpha means the stock has compounded faster than the index. |
| **Alpha 6M** | 6-month stock return − 6-month benchmark return | −15 pp – +15 pp | Short-term alpha identifies whether the outperformance trend is still intact. |
| **CAGR (best window)** | Annualized return over the longest available window | −5% – +25% | Absolute compounding rate, benchmark-independent. |
| **Return 6M** | Price change over the past 6 months | −15% – +20% | Captures medium-term trend direction. |
| **Return 1M** | Price change over the past 1 month | −10% – +10% | Short-term pulse; high volatility makes this the least reliable individual input. |

---

## 4. Normalization and Scoring Bands

All metrics are linearly mapped onto a 0–100 scale using lower and upper band values:

$$\text{score} = \frac{v - \text{low}}{\text{high} - \text{low}} \times 100 \quad \text{(clamped to [0, 100])}$$

For inverted metrics (where lower raw value is better, e.g. P/E): $\text{score} = 100 - \text{score}$

The band values represent the typical range of the MSCI ACWI index constituents. A stock at the band midpoint scores 50 (neutral). A stock at or above the top of the band scores 100.

Bands are intentionally conservative — they do not clip at extremes within the ACWI universe. A stock that is genuinely exceptional (e.g. 40% gross margins in a low-margin industry) can still score near 100.

When a metric is missing (Yahoo Finance does not report it, or the value is infinite or NaN), the metric is excluded from the category average rather than counted as a zero. This means categories with more missing data have higher uncertainty in their scores.

---

## 5. Signal System and Veto Rules

### Score-to-signal mapping

The final weighted score maps directly to a signal:

| Score range | Signal | Interpretation |
|---|---|---|
| > 85 | **STRONG_BUY** | High conviction — strong across most dimensions |
| 70 – 85 | **BUY** | Solid fundamentals and positive momentum |
| 50 – 70 | **HOLD** | Acceptable but no compelling reason to add |
| 35 – 50 | **SELL** | Underperforming on balance — consider reducing |
| < 35 | **STRONG_SELL** | Weak across multiple dimensions — avoid |

### Veto rules

Certain extreme conditions override the score-based signal to a more severe one, regardless of other metrics:

| Condition | Forced signal | Rationale |
|---|---|---|
| Debt/Equity > 500% | STRONG_SELL | Extreme leverage creates existential risk in any rate or credit environment |
| Negative P/E **and** negative FCF | SELL | A loss-making, cash-burning business has no floor without external financing |
| Long-term alpha < −5 pp **and** 6M alpha < 0 | SELL | Persistent, worsening underperformance — the market is consistently disagreeing with the fundamental thesis |

Vetoes only move the signal to a more severe outcome; they never upgrade a HOLD or SELL to a BUY.

---

## 6. CAGR and Alpha Methodology

### CAGR (Compound Annual Growth Rate)

$$\text{CAGR} = \left(1 + \text{total return}\right)^{1/\text{years}} - 1$$

Where `total return` is the ratio of the ending price to the starting price minus 1, and `years` is the exact number of calendar years (including fractional years) in the measurement window.

Look-back windows used: 1 year, 3 years, 5 years. If price history is shorter than a window, that window's CAGR is reported as missing.

### Alpha

$$\alpha = \text{CAGR(stock)} - \text{CAGR(benchmark)}$$

Alpha is computed independently for each time window and is denominated in percentage points per year. A stock with a 5-year CAGR of 18% against a benchmark CAGR of 12% has an alpha of +6 pp.

Alpha is benchmark-relative, so the choice of benchmark matters. US stocks should generally be compared against the S&P 500 (`^GSPC`). Japanese stocks against TOPIX (`1306.T`). For a global portfolio the MSCI ACWI (`ACWI`) is a more appropriate benchmark.

### Fuzzy portfolio signal (Rakuten Analysis tab)

The portfolio analysis tab uses a different signal engine that is designed for positions you already hold. It combines three inputs into a single action signal:

$$\text{score} = (0.45 \times S_\alpha + 0.35 \times S_\text{CAGR} + 0.20 \times S_\text{6M}) \times \text{confidence}$$

Where each $S$ is a normalized sub-score for alpha since purchase, CAGR since purchase, and 6-month return respectively.

**Confidence** ramps linearly from 0 to 1 as holding time grows from 0 to ~8 months. Positions held less than ~3 months show "Too Early." This prevents strong signals from short, volatile holding periods.

| Signal | Condition |
|---|---|
| **Hold** | Strong performer — keep it |
| **Take Profit** | CAGR > 25% but 6M momentum fading — consider realizing gains |
| **Buy More** | Fundamentals acceptable, recent dip — potential averaging opportunity |
| **Watch** | Mixed signals — monitor |
| **Sell** | Sustained underperformance — cut losses |

---

## 7. Assumptions and Limitations

**Single benchmark.** All tickers in a research session share one benchmark. For sessions mixing US and Japanese stocks the benchmark choice is a compromise.

**No currency conversion.** Prices are shown in each stock's native currency. Alpha figures across different currency areas reflect price returns only, not currency-adjusted returns.

**Trailing data.** All fundamental metrics are trailing (past performance). They are proxies for the future, not guarantees. A business that earned well in the past may not continue to do so.

**Data completeness.** Yahoo Finance does not report all metrics for all stocks. Categories with many missing sub-scores carry higher uncertainty. The score is still computed from available data and can be misleading if a critical metric (e.g. Debt/Equity for a leveraged business) is missing.

**Normalization band calibration.** The band values are fixed constants calibrated against MSCI ACWI constituents at a point in time. Market-level valuation shifts (e.g. a prolonged period of high P/E multiples across the index) are not reflected. A stock with a P/E of 30× may score poorly against a band of 5–40× even when the market median is 28×.

**Not financial advice.** The model outputs a score and a signal. Whether to act is a judgment that depends on your full portfolio context, tax situation, time horizon, and risk tolerance — none of which the model knows.
