import { describe, it, expect } from 'vitest';
import { rawNum, rawStr, parseFundamentalsTimeSeries } from '../utils/research';

describe('rawNum', () => {
  it('returns null for null/undefined', () => {
    expect(rawNum(null)).toBeNull();
    expect(rawNum(undefined)).toBeNull();
  });

  it('extracts plain numbers', () => {
    expect(rawNum(26.6)).toBeCloseTo(26.6);
    expect(rawNum(0)).toBe(0);
    expect(rawNum(-5.3)).toBeCloseTo(-5.3);
  });

  it('extracts { raw, fmt } wrapper objects', () => {
    expect(rawNum({ raw: 26.6, fmt: '26.60' })).toBeCloseTo(26.6);
    expect(rawNum({ raw: 0.0086, fmt: '0.86%' })).toBeCloseTo(0.0086);
  });

  it('returns null for non-finite numbers', () => {
    expect(rawNum(NaN)).toBeNull();
    expect(rawNum(Infinity)).toBeNull();
    expect(rawNum({ raw: NaN })).toBeNull();
  });

  it('returns null for unrecognised types', () => {
    expect(rawNum('not a number')).toBeNull();
    expect(rawNum({ fmt: '26.60' })).toBeNull(); // no raw key
  });
});

describe('rawStr', () => {
  it('returns string values', () => {
    expect(rawStr('hello')).toBe('hello');
  });

  it('returns fallback for non-strings', () => {
    expect(rawStr(null)).toBe('');
    expect(rawStr(undefined, 'default')).toBe('default');
    expect(rawStr(123)).toBe('');
  });
});

// ── parseFundamentalsTimeSeries ───────────────────────────────────────────────

/**
 * Mock fundamentalsTimeSeries response matching Yahoo Finance API format.
 * Simulates MSFT-like data with trailing TTM + quarterly balance sheet.
 */
function buildMockTimeSeries() {
  const now = Math.floor(Date.now() / 1000);
  const q1 = now - 90 * 86400;
  const q2 = now - 180 * 86400;
  const q3 = now - 270 * 86400;
  const q4 = now - 360 * 86400;
  const q5 = now - 450 * 86400;

  return {
    timeseries: {
      result: [
        {
          meta: { type: ['trailingNetIncome'] },
          timestamp: [now],
          trailingNetIncome: [{ reportedValue: { raw: 72000000000 } }],
        },
        {
          meta: { type: ['trailingTotalRevenue'] },
          timestamp: [now],
          trailingTotalRevenue: [{ reportedValue: { raw: 220000000000 } }],
        },
        {
          meta: { type: ['trailingOperatingIncome'] },
          timestamp: [now],
          trailingOperatingIncome: [{ reportedValue: { raw: 100000000000 } }],
        },
        {
          meta: { type: ['trailingGrossProfit'] },
          timestamp: [now],
          trailingGrossProfit: [{ reportedValue: { raw: 150000000000 } }],
        },
        {
          meta: { type: ['trailingDilutedEPS'] },
          timestamp: [now],
          trailingDilutedEPS: [{ reportedValue: { raw: 9.65 } }],
        },
        {
          meta: { type: ['trailingFreeCashFlow'] },
          timestamp: [now],
          trailingFreeCashFlow: [{ reportedValue: { raw: 53000000000 } }],
        },
        {
          meta: { type: ['quarterlyStockholdersEquity'] },
          timestamp: [q1],
          quarterlyStockholdersEquity: [{ reportedValue: { raw: 200000000000 } }],
        },
        {
          meta: { type: ['quarterlyTotalDebt'] },
          timestamp: [q1],
          quarterlyTotalDebt: [{ reportedValue: { raw: 60000000000 } }],
        },
        {
          meta: { type: ['quarterlyCurrentAssets'] },
          timestamp: [q1],
          quarterlyCurrentAssets: [{ reportedValue: { raw: 150000000000 } }],
        },
        {
          meta: { type: ['quarterlyCurrentLiabilities'] },
          timestamp: [q1],
          quarterlyCurrentLiabilities: [{ reportedValue: { raw: 100000000000 } }],
        },
        {
          meta: { type: ['quarterlyOrdinarySharesNumber'] },
          timestamp: [q1],
          quarterlyOrdinarySharesNumber: [{ reportedValue: { raw: 7500000000 } }],
        },
        {
          meta: { type: ['quarterlyCashAndCashEquivalents'] },
          timestamp: [q1],
          quarterlyCashAndCashEquivalents: [{ reportedValue: { raw: 20000000000 } }],
        },
        // Quarterly net income for YoY growth (5 quarters: current + 4 prior)
        {
          meta: { type: ['quarterlyNetIncome'] },
          timestamp: [q5, q4, q3, q2, q1],
          quarterlyNetIncome: [
            { reportedValue: { raw: 14000000000 } },
            { reportedValue: { raw: 15000000000 } },
            { reportedValue: { raw: 16000000000 } },
            { reportedValue: { raw: 17000000000 } },
            { reportedValue: { raw: 20000000000 } },  // most recent
          ],
        },
        // Quarterly revenue for YoY growth
        {
          meta: { type: ['quarterlyTotalRevenue'] },
          timestamp: [q5, q4, q3, q2, q1],
          quarterlyTotalRevenue: [
            { reportedValue: { raw: 48000000000 } },
            { reportedValue: { raw: 50000000000 } },
            { reportedValue: { raw: 52000000000 } },
            { reportedValue: { raw: 55000000000 } },
            { reportedValue: { raw: 60000000000 } },  // most recent
          ],
        },
      ],
    },
  };
}

describe('parseFundamentalsTimeSeries', () => {
  it('computes financial ratios from timeseries data + price', () => {
    const mockData = buildMockTimeSeries();
    const currentPrice = 420; // Simulated MSFT-like price

    const info = parseFundamentalsTimeSeries(mockData, 'MSFT', currentPrice);

    expect(info).not.toBeNull();
    expect(info!.longName).toBe('MSFT');

    // trailingPE = price / dilutedEPS = 420 / 9.65 ≈ 43.5
    expect(info!.trailingPE).toBeCloseTo(43.5, 0);

    // marketCap = shares * price = 7.5B * 420 = 3.15T
    expect(info!.marketCap).toBeCloseTo(3150000000000, -9);

    // priceToBook = marketCap / equity = 3.15T / 200B ≈ 15.75
    expect(info!.priceToBook).toBeCloseTo(15.75, 0);

    // returnOnEquity = netIncome / equity = 72B / 200B = 0.36
    expect(info!.returnOnEquity).toBeCloseTo(0.36);

    // operatingMargins = opIncome / revenue = 100B / 220B ≈ 0.4545
    expect(info!.operatingMargins).toBeCloseTo(0.4545, 2);

    // grossMargins = grossProfit / revenue = 150B / 220B ≈ 0.6818
    expect(info!.grossMargins).toBeCloseTo(0.6818, 2);

    // debtToEquity = (debt / equity) * 100 = (60B / 200B) * 100 = 30
    expect(info!.debtToEquity).toBeCloseTo(30);

    // currentRatio = currentAssets / currentLiab = 150B / 100B = 1.5
    expect(info!.currentRatio).toBeCloseTo(1.5);

    // freeCashflow = 53B
    expect(info!.freeCashflow).toBeCloseTo(53000000000);

    // earningsQuarterlyGrowth: most recent Q (20B) vs ~year-ago Q (14B) → (20-14)/14 ≈ 0.4286
    expect(info!.earningsQuarterlyGrowth).toBeCloseTo(0.4286, 2);

    // revenueGrowth: most recent Q (60B) vs ~year-ago Q (48B) → (60-48)/48 = 0.25
    expect(info!.revenueGrowth).toBeCloseTo(0.25);
  });

  it('returns null for empty response', () => {
    expect(parseFundamentalsTimeSeries({}, 'X', 100)).toBeNull();
    expect(parseFundamentalsTimeSeries({ timeseries: { result: [] } }, 'X', 100)).toBeNull();
  });

  it('handles missing price gracefully (price-dependent metrics are null)', () => {
    const mockData = buildMockTimeSeries();
    const info = parseFundamentalsTimeSeries(mockData, 'TEST', null);

    expect(info).not.toBeNull();
    // Price-dependent metrics should be null
    expect(info!.trailingPE).toBeNull();
    expect(info!.priceToBook).toBeNull();
    expect(info!.marketCap).toBeNull();
    expect(info!.enterpriseToEbitda).toBeNull();

    // Non-price metrics should still work
    expect(info!.returnOnEquity).toBeCloseTo(0.36);
    expect(info!.operatingMargins).toBeCloseTo(0.4545, 2);
    expect(info!.currentRatio).toBeCloseTo(1.5);
    expect(info!.freeCashflow).toBeCloseTo(53000000000);
  });

  it('handles partial data (missing modules)', () => {
    const partialData = {
      timeseries: {
        result: [
          {
            meta: { type: ['trailingNetIncome'] },
            timestamp: [Math.floor(Date.now() / 1000)],
            trailingNetIncome: [{ reportedValue: { raw: 10000000 } }],
          },
        ],
      },
    };

    const info = parseFundamentalsTimeSeries(partialData, 'PARTIAL', 50);
    expect(info).not.toBeNull();
    // Most derived metrics will be null due to missing data
    expect(info!.trailingPE).toBeNull(); // no EPS
    expect(info!.returnOnEquity).toBeNull(); // no equity
    expect(info!.operatingMargins).toBeNull(); // no revenue
    expect(info!.freeCashflow).toBeNull(); // no FCF data
  });

  it('handles null reportedValue entries in timeseries', () => {
    const now = Math.floor(Date.now() / 1000);
    const data = {
      timeseries: {
        result: [
          {
            meta: { type: ['trailingFreeCashFlow'] },
            timestamp: [now - 86400, now],
            trailingFreeCashFlow: [null, { reportedValue: { raw: 5000000 } }],
          },
        ],
      },
    };

    const info = parseFundamentalsTimeSeries(data, 'TEST', null);
    expect(info).not.toBeNull();
    expect(info!.freeCashflow).toBe(5000000);
  });
});
