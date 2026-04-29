import { describe, it, expect } from "vitest";
import { aggregatePositions, calculateMetrics, computeClosedPositions } from "../utils/metrics";
import type { Trade, PriceData } from "../utils/types";

describe("aggregatePositions", () => {
  it("aggregates multiple trades for the same ticker", () => {
    const trades: Trade[] = [
      {
        date: new Date("2024-06-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 100,
        price: 1500,
        amount: 150000,
        side: "buy",
      },
      {
        date: new Date("2024-09-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 50,
        price: 1600,
        amount: 80000,
        side: "buy",
      },
    ];

    const now = new Date();
    const priceData: PriceData = {
      "7267.T": [
        { date: new Date("2024-06-01"), close: 1500 },
        { date: now, close: 1700 },
      ],
    };

    const positions = aggregatePositions(trades, priceData);
    expect(positions).toHaveLength(1);
    expect(positions[0].yfTicker).toBe("7267.T");
    expect(positions[0].totalQty).toBe(150);
    expect(positions[0].totalCost).toBe(230000);
    expect(positions[0].currentPrice).toBe(1700);
    expect(positions[0].currentValue).toBe(255000); // 150 * 1700
  });

  it("skips positions without current price", () => {
    const trades: Trade[] = [
      {
        date: new Date("2024-06-01"),
        tickerCode: "9999",
        name: "Unknown",
        yfTicker: "9999.T",
        qty: 100,
        price: 1000,
        amount: 100000,
        side: "buy",
      },
    ];

    const priceData: PriceData = {}; // No price data

    const positions = aggregatePositions(trades, priceData);
    expect(positions).toHaveLength(0);
  });

  it("excludes fully closed (sold) positions from active positions", () => {
    const trades: Trade[] = [
      {
        date: new Date("2024-06-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 100,
        price: 1500,
        amount: 150000,
        side: "buy",
      },
      {
        date: new Date("2024-12-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 100,
        price: 1800,
        amount: 180000,
        side: "sell",
      },
    ];

    const now = new Date();
    const priceData: PriceData = {
      "7267.T": [{ date: now, close: 1900 }],
    };

    const positions = aggregatePositions(trades, priceData);
    expect(positions).toHaveLength(0); // Fully sold, not in active positions
  });

  it("adjusts cost for partially sold positions", () => {
    const trades: Trade[] = [
      {
        date: new Date("2024-06-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 200,
        price: 1500,
        amount: 300000,
        side: "buy",
      },
      {
        date: new Date("2024-12-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 100,
        price: 1800,
        amount: 180000,
        side: "sell",
      },
    ];

    const now = new Date();
    const priceData: PriceData = {
      "7267.T": [{ date: now, close: 1900 }],
    };

    const positions = aggregatePositions(trades, priceData);
    expect(positions).toHaveLength(1);
    expect(positions[0].totalQty).toBe(100); // 200 - 100 remaining
    expect(positions[0].totalCost).toBeCloseTo(150000); // 50% of 300000
  });

  it("uses only post-reentry trades for cost basis after full exit and rebuy", () => {
    // Round 1: buy 100 @ 1500, sell 100 @ 1800 (closed round)
    // Round 2 (active): buy 50 @ 2000
    const trades: Trade[] = [
      {
        date: new Date("2023-01-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 100,
        price: 1500,
        amount: 150000,
        side: "buy",
      },
      {
        date: new Date("2023-06-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 100,
        price: 1800,
        amount: 180000,
        side: "sell",
      },
      {
        date: new Date("2024-01-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 50,
        price: 2000,
        amount: 100000,
        side: "buy",
      },
    ];

    const now = new Date();
    const priceData: PriceData = {
      "7267.T": [{ date: now, close: 2200 }],
    };

    const positions = aggregatePositions(trades, priceData);
    expect(positions).toHaveLength(1);
    expect(positions[0].totalQty).toBe(50);
    // Cost basis must reflect ONLY the re-entry buy, not blended with old round
    expect(positions[0].totalCost).toBeCloseTo(100000);
    expect(positions[0].avgCost).toBeCloseTo(2000);
    // firstBuyDate must be the re-entry date, not the original buy date
    expect(positions[0].firstBuyDate.getFullYear()).toBe(2024);
  });
});

describe("computeClosedPositions", () => {
  it("identifies fully closed positions", () => {
    const trades: Trade[] = [
      {
        date: new Date("2024-01-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 100,
        price: 1500,
        amount: 150000,
        side: "buy",
      },
      {
        date: new Date("2024-06-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 100,
        price: 1800,
        amount: 180000,
        side: "sell",
      },
    ];

    const closed = computeClosedPositions(trades);
    expect(closed).toHaveLength(1);
    expect(closed[0].yfTicker).toBe("7267.T");
    expect(closed[0].totalReturn).toBeCloseTo(0.2); // (180000 - 150000) / 150000
    expect(closed[0].buyDates).toHaveLength(1);
    expect(closed[0].sellDates).toHaveLength(1);
  });

  it("does not include still-open positions", () => {
    const trades: Trade[] = [
      {
        date: new Date("2024-01-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 100,
        price: 1500,
        amount: 150000,
        side: "buy",
      },
    ];

    const closed = computeClosedPositions(trades);
    expect(closed).toHaveLength(0);
  });

  it("emits the closed round but not the active round for buy-sell-rebuy", () => {
    const trades: Trade[] = [
      // Round 1 (closed): buy 100 @ 1500, sell 100 @ 1800
      {
        date: new Date("2023-01-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 100,
        price: 1500,
        amount: 150000,
        side: "buy",
      },
      {
        date: new Date("2023-06-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 100,
        price: 1800,
        amount: 180000,
        side: "sell",
      },
      // Round 2 (active): buy 50 @ 2000 — must NOT appear in closed positions
      {
        date: new Date("2024-01-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 50,
        price: 2000,
        amount: 100000,
        side: "buy",
      },
    ];

    const closed = computeClosedPositions(trades);
    expect(closed).toHaveLength(1);
    expect(closed[0].yfTicker).toBe("7267.T");
    expect(closed[0].totalBuyCost).toBeCloseTo(150000);
    expect(closed[0].totalSellProceeds).toBeCloseTo(180000);
    expect(closed[0].totalReturn).toBeCloseTo(0.2); // +20%
    // firstBuyDate must be round-1 buy, not the round-2 buy
    expect(closed[0].firstBuyDate.getFullYear()).toBe(2023);
    expect(closed[0].lastSellDate.getFullYear()).toBe(2023);
  });

  it("emits two separate closed rounds for a ticker exited twice", () => {
    const trades: Trade[] = [
      // Round 1: buy 100 @ 1000, sell 100 @ 1200
      {
        date: new Date("2022-01-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 100,
        price: 1000,
        amount: 100000,
        side: "buy",
      },
      {
        date: new Date("2022-06-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 100,
        price: 1200,
        amount: 120000,
        side: "sell",
      },
      // Round 2: buy 80 @ 1500, sell 80 @ 1400 (loss)
      {
        date: new Date("2023-01-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 80,
        price: 1500,
        amount: 120000,
        side: "buy",
      },
      {
        date: new Date("2023-09-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 80,
        price: 1400,
        amount: 112000,
        side: "sell",
      },
    ];

    const closed = computeClosedPositions(trades);
    expect(closed).toHaveLength(2);

    // Sorted most-recent first
    const round2 = closed[0];
    const round1 = closed[1];

    expect(round1.totalBuyCost).toBeCloseTo(100000);
    expect(round1.totalSellProceeds).toBeCloseTo(120000);
    expect(round1.totalReturn).toBeCloseTo(0.2);
    expect(round1.firstBuyDate.getFullYear()).toBe(2022);

    expect(round2.totalBuyCost).toBeCloseTo(120000);
    expect(round2.totalSellProceeds).toBeCloseTo(112000);
    expect(round2.totalReturn).toBeCloseTo(-0.0667, 2); // ~-6.7%
    expect(round2.firstBuyDate.getFullYear()).toBe(2023);
  });

  it("handles partial sells within a round before full exit", () => {
    // buy 100, sell 40, sell 60 → one closed round (two sell trades)
    const trades: Trade[] = [
      {
        date: new Date("2024-01-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 100,
        price: 1000,
        amount: 100000,
        side: "buy",
      },
      {
        date: new Date("2024-06-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 40,
        price: 1200,
        amount: 48000,
        side: "sell",
      },
      {
        date: new Date("2024-09-01"),
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        qty: 60,
        price: 1300,
        amount: 78000,
        side: "sell",
      },
    ];

    const closed = computeClosedPositions(trades);
    expect(closed).toHaveLength(1);
    expect(closed[0].totalBuyCost).toBeCloseTo(100000);
    expect(closed[0].totalSellProceeds).toBeCloseTo(126000); // 48000 + 78000
    expect(closed[0].totalReturn).toBeCloseTo(0.26);
    expect(closed[0].sellDates).toHaveLength(2);
  });
});

describe("calculateMetrics", () => {
  it("calculates CAGR and returns for positions", () => {
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const positions = [
      {
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        totalQty: 100,
        avgCost: 1500,
        totalCost: 150000,
        currentPrice: 1650,
        currentValue: 165000,
        firstBuyDate: oneYearAgo,
        lastBuyDate: oneYearAgo,
      },
    ];

    const priceData: PriceData = {
      "7267.T": [
        { date: oneYearAgo, close: 1500 },
        { date: sixMonthsAgo, close: 1550 },
        { date: oneMonthAgo, close: 1620 },
        { date: now, close: 1650 },
      ],
      "^GSPC": [
        { date: oneYearAgo, close: 4500 },
        { date: sixMonthsAgo, close: 4700 },
        { date: oneMonthAgo, close: 4800 },
        { date: now, close: 4900 },
      ],
    };

    const metrics = calculateMetrics(positions, priceData);
    expect(metrics).toHaveLength(1);

    const m = metrics[0];
    expect(m.totalReturn).toBeCloseTo(0.1, 1); // ~10%
    expect(m.cagr).toBeDefined();
    expect(m.ret1m).toBeDefined();
    expect(m.ret6m).toBeDefined();
    expect(m.alphaCagr).toBeDefined();
    expect(m.signal).toBeDefined();
    expect(typeof m.fuzzyScore).toBe("number");
  });

  it("uses provided benchmark ticker", () => {
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const positions = [
      {
        tickerCode: "7267",
        name: "Honda",
        yfTicker: "7267.T",
        totalQty: 100,
        avgCost: 1500,
        totalCost: 150000,
        currentPrice: 1650,
        currentValue: 165000,
        firstBuyDate: oneYearAgo,
        lastBuyDate: oneYearAgo,
      },
    ];

    const priceData: PriceData = {
      "7267.T": [
        { date: oneYearAgo, close: 1500 },
        { date: now, close: 1650 },
      ],
      "1306.T": [
        { date: oneYearAgo, close: 2000 },
        { date: now, close: 2200 },
      ],
    };

    const metrics = calculateMetrics(positions, priceData, "1306.T");
    expect(metrics).toHaveLength(1);
    expect(metrics[0].bmCagr).toBeDefined();
    expect(metrics[0].alphaCagr).toBeDefined();
  });
});
