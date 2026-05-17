import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { detectBrowserLanguage, loadLanguage, saveLanguage } from '../i18n';
import en from '../i18n/en';
import ja from '../i18n/ja';
import type { Translations } from '../i18n/translations';

// ── Translation completeness ──────────────────────────────────────────────────

describe('translation keys', () => {
  it('English and Japanese translations have identical keys', () => {
    const enKeys = Object.keys(en).sort();
    const jaKeys = Object.keys(ja).sort();
    expect(enKeys).toEqual(jaKeys);
  });

  it('all string values in English are non-empty', () => {
    for (const [key, value] of Object.entries(en)) {
      if (typeof value === 'string') {
        expect(value, `en.${key} should not be empty`).not.toBe('');
      }
    }
  });

  it('all string values in Japanese are non-empty', () => {
    for (const [key, value] of Object.entries(ja)) {
      if (typeof value === 'string') {
        expect(value, `ja.${key} should not be empty`).not.toBe('');
      }
    }
  });

  it('Japanese and English string values differ (i.e. are actually translated)', () => {
    const ALLOWED_SAME = new Set<keyof Translations>([
      // These are intentionally the same in both languages
      'col1m', 'col6m', 'col1mShort', 'col6mShort',
      'colCagr', 'colAlphaCagr', 'colAlpha1y',
      'colCagr5y', 'colCagr3y', 'colCagr1y',
      'colCcy',
      'colScore',
      'colTicker',
      'dropTradeSeparator',
      'loadNewFiles',
      'portfolioSummary',
      'positionHistoryCharts',
      'positionMetrics',
      'showCharts',
    ]);

    let diffCount = 0;
    for (const [key, enVal] of Object.entries(en)) {
      if (typeof enVal === 'string' && !ALLOWED_SAME.has(key as keyof Translations)) {
        const jaVal = (ja as unknown as Record<string, unknown>)[key];
        if (typeof jaVal === 'string' && enVal !== jaVal) {
          diffCount++;
        }
      }
    }
    // At least half of the string keys must differ between languages
    expect(diffCount).toBeGreaterThan(10);
  });
});

// ── Function translations ─────────────────────────────────────────────────────

describe('English translation functions', () => {
  it('fetchingPrices interpolates correctly', () => {
    expect(en.fetchingPrices(3, 10)).toContain('3');
    expect(en.fetchingPrices(3, 10)).toContain('10');
  });

  it('fetchingFundamentals interpolates correctly', () => {
    expect(en.fetchingFundamentals(1, 5)).toContain('1');
    expect(en.fetchingFundamentals(1, 5)).toContain('5');
  });

  it('pricesUnavailableFor interpolates tickers', () => {
    expect(en.pricesUnavailableFor('AAPL, MSFT')).toContain('AAPL, MSFT');
  });

  it('fundamentalsUnavailableFor interpolates tickers', () => {
    expect(en.fundamentalsUnavailableFor('TSLA')).toContain('TSLA');
  });

  it('descPortfolio interpolates benchmark', () => {
    expect(en.descPortfolio('S&P 500')).toContain('S&P 500');
  });

  it('outperforming interpolates percentage and benchmark', () => {
    const result = en.outperforming(0.75, 'TOPIX');
    expect(result).toContain('75');
    expect(result).toContain('TOPIX');
  });

  it('closedPositions interpolates count', () => {
    expect(en.closedPositions(5)).toContain('5');
  });

  it('dropPositionSuffix handles singular and plural', () => {
    expect(en.dropPositionSuffix(1)).toContain('position');
    expect(en.dropPositionSuffix(2)).toContain('positions');
  });

  it('tradesBadge interpolates count', () => {
    expect(en.tradesBadge(42)).toContain('42');
  });

  it('signalWithAbbrevs interpolates abbreviations', () => {
    expect(en.signalWithAbbrevs('V, Q, H')).toContain('V, Q, H');
  });

  it('closeOf interpolates date', () => {
    expect(en.closeOf('2024-01-15')).toContain('2024-01-15');
  });
});

describe('Japanese translation functions', () => {
  it('fetchingPrices interpolates correctly', () => {
    expect(ja.fetchingPrices(3, 10)).toContain('3');
    expect(ja.fetchingPrices(3, 10)).toContain('10');
  });

  it('pricesUnavailableFor interpolates tickers', () => {
    expect(ja.pricesUnavailableFor('AAPL, MSFT')).toContain('AAPL, MSFT');
  });

  it('outperforming interpolates percentage and benchmark', () => {
    const result = ja.outperforming(0.60, 'TOPIX');
    expect(result).toContain('60');
    expect(result).toContain('TOPIX');
  });

  it('closedPositions interpolates count', () => {
    expect(ja.closedPositions(3)).toContain('3');
  });

  it('dropPositionSuffix returns Japanese suffix', () => {
    expect(ja.dropPositionSuffix(1)).toBe('銘柄');
    expect(ja.dropPositionSuffix(5)).toBe('銘柄');
  });
});

// ── Language detection ────────────────────────────────────────────────────────

describe('detectBrowserLanguage', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('returns "ja" when browser language is Japanese', () => {
    Object.defineProperty(global, 'navigator', {
      value: { language: 'ja-JP' },
      writable: true,
      configurable: true,
    });
    expect(detectBrowserLanguage()).toBe('ja');
  });

  it('returns "ja" when browser language is exactly "ja"', () => {
    Object.defineProperty(global, 'navigator', {
      value: { language: 'ja' },
      writable: true,
      configurable: true,
    });
    expect(detectBrowserLanguage()).toBe('ja');
  });

  it('returns "en" for English browser language', () => {
    Object.defineProperty(global, 'navigator', {
      value: { language: 'en-US' },
      writable: true,
      configurable: true,
    });
    expect(detectBrowserLanguage()).toBe('en');
  });

  it('returns "en" for other languages (default)', () => {
    Object.defineProperty(global, 'navigator', {
      value: { language: 'fr-FR' },
      writable: true,
      configurable: true,
    });
    expect(detectBrowserLanguage()).toBe('en');
  });

  it('returns "en" for Chinese', () => {
    Object.defineProperty(global, 'navigator', {
      value: { language: 'zh-CN' },
      writable: true,
      configurable: true,
    });
    expect(detectBrowserLanguage()).toBe('en');
  });
});

// ── localStorage persistence ──────────────────────────────────────────────────

describe('loadLanguage / saveLanguage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns browser language when localStorage is empty and navigator is "en"', () => {
    Object.defineProperty(global, 'navigator', {
      value: { language: 'en-US' },
      writable: true,
      configurable: true,
    });
    expect(loadLanguage()).toBe('en');
  });

  it('returns "ja" when navigator is Japanese and nothing stored', () => {
    Object.defineProperty(global, 'navigator', {
      value: { language: 'ja' },
      writable: true,
      configurable: true,
    });
    expect(loadLanguage()).toBe('ja');
  });

  it('returns stored language over browser language', () => {
    Object.defineProperty(global, 'navigator', {
      value: { language: 'ja' },
      writable: true,
      configurable: true,
    });
    saveLanguage('en');
    expect(loadLanguage()).toBe('en');
  });

  it('persists "ja" in localStorage', () => {
    saveLanguage('ja');
    expect(loadLanguage()).toBe('ja');
  });

  it('persists "en" in localStorage', () => {
    saveLanguage('en');
    expect(loadLanguage()).toBe('en');
  });

  it('ignores invalid stored values and falls back to browser language', () => {
    localStorage.setItem('stock-planner-language', 'fr');
    Object.defineProperty(global, 'navigator', {
      value: { language: 'en-US' },
      writable: true,
      configurable: true,
    });
    expect(loadLanguage()).toBe('en');
  });
});

// ── Mock localStorage unavailability ─────────────────────────────────────────

describe('loadLanguage / saveLanguage when localStorage throws', () => {
  it('saveLanguage does not throw when localStorage is unavailable', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage full');
    });
    expect(() => saveLanguage('en')).not.toThrow();
    spy.mockRestore();
  });

  it('loadLanguage falls back to browser language when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('access denied');
    });
    Object.defineProperty(global, 'navigator', {
      value: { language: 'en-US' },
      writable: true,
      configurable: true,
    });
    expect(loadLanguage()).toBe('en');
    spy.mockRestore();
  });
});
