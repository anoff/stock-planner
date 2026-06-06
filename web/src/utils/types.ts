/** A single trade parsed from a Rakuten or DAB bank CSV. */
export interface Trade {
  date: Date;
  tickerCode: string;
  name: string;
  yfTicker: string;
  qty: number;
  price: number;
  amount: number;
  side: "buy" | "sell";
  /** True for investment-trust (投資信託) trades. The qty is in 口 (trust units)
   *  and amount is in JPY, so qty × proxy-price would be nonsensical.
   *  Valuation must use the proxy ticker's return ratio instead. */
  isFund?: boolean;
  /** Base currency of the amount and price fields.
   *  Rakuten trades (JP stocks, US stocks, funds): "JPY" (default when absent).
   *  DAB bank trades: "EUR" — amounts are already converted to EUR by the broker. */
  currency?: "JPY" | "EUR";
}

/** Aggregated position for one security. */
export interface Position {
  tickerCode: string;
  name: string;
  yfTicker: string;
  totalQty: number;
  avgCost: number;
  /** Proportional cost of the remaining (currently held) shares. */
  totalCost: number;
  /** Realized P&L from shares already sold within this holding round.
   *  realizedPnl = sellProceeds − (soldQty / totalBuyQty) × totalBuyCost
   *  Zero for positions with no partial sells. */
  realizedPnl: number;
  currentPrice: number;
  currentValue: number;
  firstBuyDate: Date;
  lastBuyDate: Date;
  /** Inherited from trades — true when this is an investment-trust proxy position. */
  isFund?: boolean;
}

/** Position enriched with performance metrics. */
export interface PositionMetrics extends Position {
  totalReturn: number;
  daysHeld: number;
  cagr: number;
  ret1m: number | null;
  ret6m: number | null;
  bmRetBuy: number | null;
  bmCagr: number | null;
  bmRet1m: number | null;
  bmRet6m: number | null;
  alphaCagr: number | null;
  alpha1m: number | null;
  alpha6m: number | null;
  signal: string;
  fuzzyScore: number;
}

/** Daily price record from Yahoo Finance. */
export interface PriceRecord {
  date: Date;
  close: number;
}

/** Price history for a ticker. */
export type PriceHistory = PriceRecord[];

/** Map of ticker to price history. */
export type PriceData = Record<string, PriceHistory>;

/** A position that has been completely sold and is no longer in the portfolio. */
export interface ClosedPosition {
  tickerCode: string;
  name: string;
  yfTicker: string;
  totalBuyCost: number;
  totalSellProceeds: number;
  firstBuyDate: Date;
  lastSellDate: Date;
  buyDates: Date[];
  sellDates: Date[];
  totalReturn: number;
  daysHeld: number;
  cagr: number;
}

/**
 * A single realized event — either the final sell of a fully-closed holding round
 * or an individual partial-sell trade while the position is still active.
 *
 * One row is emitted per sell transaction so that multi-leg exits appear as
 * separate rows with their own cost basis, proceeds, and benchmark comparison.
 */
export interface RealizedEntry {
  tickerCode: string;
  name: string;
  yfTicker: string;
  /** "full" = this sell closed the entire holding round (qty → 0).
   *  "partial" = shares were sold but the position remains open (or this was
   *  one of several sells before the final closure). */
  type: "full" | "partial";
  /** First buy date of the holding round this sell belongs to. */
  firstBuyDate: Date;
  /** Date of this specific sell transaction. */
  sellDate: Date;
  /** Calendar days from firstBuyDate to sellDate (min 1). */
  daysHeld: number;
  /** Proportional cost basis attributed to the sold shares (average-cost method). */
  cost: number;
  /** Proceeds received from this sell trade. */
  proceeds: number;
  /** proceeds − cost */
  realizedPnl: number;
  /** (proceeds − cost) / cost */
  totalReturn: number;
  /** Annualized return (CAGR) over the holding period. */
  cagr: number;
  /** Benchmark CAGR over the same period (firstBuyDate → sellDate). Null when
   *  price history doesn't cover the period. */
  bmCagr: number | null;
  /** cagr − bmCagr */
  alphaCagr: number | null;
}

/** Available benchmark options for reference comparison. Used by both Research and Rakuten Analysis tabs. */
export const BENCHMARK_OPTIONS: { ticker: string; name: string }[] = [
  { ticker: "ACWI",      name: "MSCI All Country (ACWI)" },
  { ticker: "^GSPC",     name: "S&P 500" },
  { ticker: "^N225",     name: "Nikkei 225" },
  { ticker: "1306.T",    name: "TOPIX ETF (1306.T)" },
  { ticker: "^STOXX50E", name: "Euro Stoxx 50" },
  { ticker: "^FTSE",     name: "FTSE 100" },
];
