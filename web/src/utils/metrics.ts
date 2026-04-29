import type {
  Trade,
  Position,
  PositionMetrics,
  PriceData,
  ClosedPosition,
} from "./types";
import { resolveFundTicker } from "./csv";
import { priceOn, periodReturn } from "./prices";

export const DEFAULT_BENCHMARK_TICKER = "^GSPC";

// ── Trade replay ────────────────────────────────────────────────

interface ReplayResult {
  /** Trades belonging to the current (still-open) holding round. Null when the
   *  position is fully closed with no subsequent re-entry. */
  activeRound: Trade[] | null;
  /** One entry per completed round (bought → fully sold). A single ticker can
   *  have multiple rounds when the investor exits and re-enters. */
  closedRounds: Trade[][];
}

/**
 * Groups trades by ticker (resolving fund proxy tickers), sorts each group
 * chronologically, then replays them to identify distinct holding rounds.
 *
 * A new round starts whenever the running share count reaches zero (full exit),
 * so a buy-sell-rebuy sequence yields one closed round and one active round
 * instead of being merged into a single average cost basis.
 */
function replayTrades(trades: Trade[]): Map<string, ReplayResult> {
  // Step 1: resolve tickers and group
  const grouped = new Map<string, Trade[]>();

  for (const trade of trades) {
    let t: Trade = { ...trade };

    if (!t.yfTicker) {
      const mapping = resolveFundTicker(t.name);
      if (mapping) {
        t = { ...t, yfTicker: mapping.proxyTicker, name: mapping.shortName };
      } else {
        continue;
      }
    }

    const key = t.yfTicker;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(t);
  }

  // Step 2: chronological replay per ticker
  const results = new Map<string, ReplayResult>();

  for (const [yfTicker, group] of grouped) {
    const sorted = [...group].sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningQty = 0;
    let currentRound: Trade[] = [];
    const closedRounds: Trade[][] = [];

    for (const trade of sorted) {
      currentRound.push(trade);
      runningQty += trade.side === "buy" ? trade.qty : -trade.qty;

      // Full exit detected (epsilon handles floating-point imprecision)
      if (runningQty < 0.001) {
        closedRounds.push(currentRound);
        currentRound = [];
        runningQty = 0;
      }
    }

    results.set(yfTicker, {
      activeRound: currentRound.length > 0 ? currentRound : null,
      closedRounds,
    });
  }

  return results;
}

/**
 * Aggregate trades into active positions (one per unique yf_ticker).
 * Uses chronological replay so that a buy-sell-rebuy sequence correctly
 * uses only the latest round's trades for cost basis and holding-period
 * calculations, rather than blending all historical purchases.
 */
export function aggregatePositions(
  trades: Trade[],
  priceData: PriceData
): Position[] {
  const now = new Date();
  const replay = replayTrades(trades);
  const positions: Position[] = [];

  for (const [yfTicker, { activeRound }] of replay) {
    if (!activeRound || activeRound.length === 0) continue;

    const buys = activeRound.filter((t) => t.side === "buy");
    const sells = activeRound.filter((t) => t.side === "sell");

    const totalBuyQty = buys.reduce((sum, t) => sum + t.qty, 0);
    const totalSellQty = sells.reduce((sum, t) => sum + t.qty, 0);
    const remainingQty = totalBuyQty - totalSellQty;

    if (remainingQty <= 0) continue;

    const totalBuyCost = buys.reduce((sum, t) => sum + t.amount, 0);
    // Proportional cost for the remaining shares within this round
    const totalCost = totalBuyQty > 0 ? (remainingQty / totalBuyQty) * totalBuyCost : 0;
    const avgCost = remainingQty > 0 ? totalCost / remainingQty : 0;

    const firstBuyDate = new Date(Math.min(...buys.map((t) => t.date.getTime())));
    const lastBuyDate = new Date(Math.max(...buys.map((t) => t.date.getTime())));

    const history = priceData[yfTicker];
    const currentPrice = priceOn(history, now);
    if (currentPrice == null) continue;

    positions.push({
      tickerCode: buys[0].tickerCode,
      name: buys[0].name,
      yfTicker,
      totalQty: remainingQty,
      avgCost,
      totalCost,
      currentPrice,
      currentValue: remainingQty * currentPrice,
      firstBuyDate,
      lastBuyDate,
    });
  }

  return positions;
}

/**
 * Compute fully-closed positions.
 *
 * Returns one ClosedPosition per holding round — so a ticker that was bought,
 * fully sold, then repurchased and sold again will appear as two separate rows,
 * each with its own dates, cost basis, and return metrics.
 */
export function computeClosedPositions(trades: Trade[]): ClosedPosition[] {
  const replay = replayTrades(trades);
  const closed: ClosedPosition[] = [];

  for (const [yfTicker, { closedRounds }] of replay) {
    for (const round of closedRounds) {
      const buys = round.filter((t) => t.side === "buy");
      const sells = round.filter((t) => t.side === "sell");

      if (buys.length === 0 || sells.length === 0) continue;

      const totalBuyCost = buys.reduce((sum, t) => sum + t.amount, 0);
      const totalSellProceeds = sells.reduce((sum, t) => sum + t.amount, 0);

      const buyDates = buys.map((t) => t.date).sort((a, b) => a.getTime() - b.getTime());
      const sellDates = sells.map((t) => t.date).sort((a, b) => a.getTime() - b.getTime());

      const firstBuyDate = buyDates[0];
      const lastSellDate = sellDates[sellDates.length - 1];

      const daysHeld = Math.max(
        1,
        Math.floor((lastSellDate.getTime() - firstBuyDate.getTime()) / (1000 * 60 * 60 * 24))
      );

      const totalReturn = totalBuyCost > 0 ? (totalSellProceeds - totalBuyCost) / totalBuyCost : 0;
      const rawCagr = Math.pow(1 + totalReturn, 365 / daysHeld) - 1;
      const cagr = Math.max(-9.99, Math.min(9.99, rawCagr));

      closed.push({
        tickerCode: buys[0].tickerCode,
        name: buys[0].name,
        yfTicker,
        totalBuyCost,
        totalSellProceeds,
        firstBuyDate,
        lastSellDate,
        buyDates,
        sellDates,
        totalReturn,
        daysHeld,
        cagr,
      });
    }
  }

  // Most recently closed first
  return closed.sort((a, b) => b.lastSellDate.getTime() - a.lastSellDate.getTime());
}

/** Cap a CAGR value to ±999% to avoid extreme display values. */
function capCagr(val: number): number {
  return Math.max(-9.99, Math.min(9.99, val));
}

/**
 * Signal weights and bands (matches lib.py).
 */
const SIGNAL_WEIGHTS = [0.45, 0.35, 0.2] as const;
const ALPHA_BAND: [number, number] = [-0.15, 0.15];
const CAGR_BAND: [number, number] = [-0.05, 0.2];
const TREND_BAND: [number, number] = [-0.15, 0.1];

const SCORE_HOLD = 0.3;
const SCORE_SELL = -0.3;
const SCORE_BUY_MORE = -0.05;
const TAKE_PROFIT_CAGR = 0.25;
const TAKE_PROFIT_6M = 0.03;

const CONFIDENCE_LOW_MONTHS = 3;
const CONFIDENCE_FULL_MONTHS = 8;

function confidence(months: number): number {
  if (months < CONFIDENCE_LOW_MONTHS) {
    return months / CONFIDENCE_FULL_MONTHS;
  } else if (months < CONFIDENCE_FULL_MONTHS) {
    return (
      0.4 +
      0.6 *
      ((months - CONFIDENCE_LOW_MONTHS) /
        (CONFIDENCE_FULL_MONTHS - CONFIDENCE_LOW_MONTHS))
    );
  }
  return 1.0;
}

function fuzzyClamp(x: number, lo: number, hi: number): number {
  if (hi === lo) return x >= hi ? 1.0 : 0.0;
  return Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
}

function score(val: number, bad: number, good: number): number {
  return Math.max(-1, Math.min(1, 2 * fuzzyClamp(val, bad, good) - 1));
}

function computeSignal(
  monthsHeld: number,
  alphaCagr: number | null,
  cagr: number,
  ret6m: number | null
): { signal: string; fuzzyScore: number } {
  const a = alphaCagr ?? 0;
  const c = cagr;
  const r6 = ret6m ?? 0;

  const conf = confidence(monthsHeld);

  const sAlpha = score(a, ALPHA_BAND[0], ALPHA_BAND[1]);
  const sCagr = score(c, CAGR_BAND[0], CAGR_BAND[1]);
  const sTrend = score(r6, TREND_BAND[0], TREND_BAND[1]);

  const raw =
    SIGNAL_WEIGHTS[0] * sAlpha +
    SIGNAL_WEIGHTS[1] * sCagr +
    SIGNAL_WEIGHTS[2] * sTrend;
  const fuzzyScore = raw * conf;

  if (conf < 0.25) return { signal: "⏳ Too Early", fuzzyScore };
  if (conf >= 0.5 && c > TAKE_PROFIT_CAGR && r6 < TAKE_PROFIT_6M)
    return { signal: "🟣 Take Profit", fuzzyScore };
  if (fuzzyScore > SCORE_HOLD) return { signal: "🟢 Hold", fuzzyScore };
  if (fuzzyScore < SCORE_SELL) return { signal: "🔴 Sell", fuzzyScore };
  if (fuzzyScore < SCORE_BUY_MORE)
    return { signal: "🔵 Buy More", fuzzyScore };
  return { signal: "🟡 Watch", fuzzyScore };
}

/**
 * Calculate performance metrics for each position.
 */
export function calculateMetrics(
  positions: Position[],
  priceData: PriceData,
  benchmarkTicker: string = DEFAULT_BENCHMARK_TICKER
): PositionMetrics[] {
  const now = new Date();
  const date1m = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const date6m = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  const bmHistory = priceData[benchmarkTicker];

  return positions
    .map((pos) => {
      const history = priceData[pos.yfTicker];
      const daysHeld = Math.floor(
        (now.getTime() - pos.firstBuyDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysHeld <= 0 || pos.totalCost <= 0) return null;

      const totalReturn =
        (pos.currentValue - pos.totalCost) / pos.totalCost;
      const rawCagr =
        Math.pow(pos.currentValue / pos.totalCost, 365 / daysHeld) - 1;
      const cagr = capCagr(rawCagr);

      const ret1m = periodReturn(history, date1m, now);
      const ret6m = periodReturn(history, date6m, now);

      // Benchmark returns
      const bmRetBuy = periodReturn(bmHistory, pos.firstBuyDate, now);
      const bmRet1m = periodReturn(bmHistory, date1m, now);
      const bmRet6m = periodReturn(bmHistory, date6m, now);

      let bmCagr: number | null = null;
      let alphaCagr: number | null = null;
      if (bmRetBuy != null) {
        const rawBmCagr = Math.pow(1 + bmRetBuy, 365 / daysHeld) - 1;
        bmCagr = capCagr(rawBmCagr);
        alphaCagr = cagr - bmCagr;
      }

      const alpha1m =
        ret1m != null && bmRet1m != null ? ret1m - bmRet1m : null;
      const alpha6m =
        ret6m != null && bmRet6m != null ? ret6m - bmRet6m : null;

      const monthsHeld = daysHeld / 30.44;
      const { signal, fuzzyScore } = computeSignal(
        monthsHeld,
        alphaCagr,
        cagr,
        ret6m
      );

      return {
        ...pos,
        totalReturn,
        daysHeld,
        cagr,
        ret1m,
        ret6m,
        bmRetBuy: bmRetBuy ?? null,
        bmCagr,
        bmRet1m,
        bmRet6m,
        alphaCagr,
        alpha1m,
        alpha6m,
        signal,
        fuzzyScore,
      } satisfies PositionMetrics;
    })
    .filter((m): m is PositionMetrics => m !== null);
}

/** Get the default benchmark ticker. */
export function getBenchmarkTicker(): string {
  return DEFAULT_BENCHMARK_TICKER;
}
