/** A single trade parsed from a Rakuten CSV. */
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
}

/** Aggregated position for one security. */
export interface Position {
  tickerCode: string;
  name: string;
  yfTicker: string;
  totalQty: number;
  avgCost: number;
  totalCost: number;
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

/** Available benchmark options for reference comparison. Used by both Research and Rakuten Analysis tabs. */
export const BENCHMARK_OPTIONS: { ticker: string; name: string }[] = [
  { ticker: "ACWI",      name: "MSCI All Country (ACWI)" },
  { ticker: "^GSPC",     name: "S&P 500" },
  { ticker: "^N225",     name: "Nikkei 225" },
  { ticker: "1306.T",    name: "TOPIX ETF (1306.T)" },
  { ticker: "^STOXX50E", name: "Euro Stoxx 50" },
  { ticker: "^FTSE",     name: "FTSE 100" },
];
