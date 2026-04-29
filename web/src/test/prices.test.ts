import { describe, it, expect } from "vitest";
import { priceOn, periodReturn } from "../utils/prices";
import type { PriceHistory } from "../utils/types";

describe("priceOn", () => {
  const history: PriceHistory = [
    { date: new Date("2025-01-02"), close: 100 },
    { date: new Date("2025-01-03"), close: 102 },
    { date: new Date("2025-01-06"), close: 105 },
    { date: new Date("2025-01-07"), close: 103 },
  ];

  it("returns exact date close price", () => {
    expect(priceOn(history, new Date("2025-01-03"))).toBe(102);
  });

  it("returns previous close for weekend/holiday", () => {
    // Jan 4 is a Saturday, should return Jan 3 close
    expect(priceOn(history, new Date("2025-01-04"))).toBe(102);
  });

  it("returns null for date before history", () => {
    expect(priceOn(history, new Date("2024-12-31"))).toBeNull();
  });

  it("returns null for empty/undefined history", () => {
    expect(priceOn([], new Date("2025-01-03"))).toBeNull();
    expect(priceOn(undefined, new Date("2025-01-03"))).toBeNull();
  });
});

describe("periodReturn", () => {
  const history: PriceHistory = [
    { date: new Date("2025-01-02"), close: 100 },
    { date: new Date("2025-01-06"), close: 110 },
  ];

  it("calculates correct return", () => {
    const ret = periodReturn(
      history,
      new Date("2025-01-02"),
      new Date("2025-01-06")
    );
    expect(ret).toBeCloseTo(0.1); // 10% return
  });

  it("returns null when prices unavailable", () => {
    const ret = periodReturn(
      history,
      new Date("2024-12-01"),
      new Date("2025-01-06")
    );
    expect(ret).toBeNull();
  });
});
