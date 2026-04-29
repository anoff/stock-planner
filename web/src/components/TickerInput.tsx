import { useState, type KeyboardEvent } from 'react';

interface Props {
  onSubmit: (tickers: string[], benchmark: string) => void;
  loading?: boolean;
}

const BENCHMARKS = [
  { value: 'ACWI',       label: 'ACWI (Global)' },
  { value: '^GSPC',      label: 'S&P 500' },
  { value: '^STOXX50E',  label: 'Euro Stoxx 50' },
  { value: '^N225',      label: 'Nikkei 225' },
  { value: '^FTSE',      label: 'FTSE 100' },
];

export default function TickerInput({ onSubmit, loading = false }: Props) {
  const [tickerText, setTickerText] = useState('');
  const [benchmark, setBenchmark] = useState('ACWI');

  function handleSubmit() {
    const tickers = tickerText
      .split(/[,\s]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    if (tickers.length === 0) return;
    onSubmit(tickers, benchmark);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit();
  }

  return (
    <div className="ticker-input-form">
      <div className="ticker-input-row">
        <div className="ticker-input-group">
          <label htmlFor="tickers" className="ticker-input-label">
            Tickers
          </label>
          <input
            id="tickers"
            type="text"
            className="ticker-input"
            placeholder="MSFT, AAPL, 7011.T, RHM.DE"
            value={tickerText}
            onChange={(e) => setTickerText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            spellCheck={false}
          />
        </div>

        <div className="ticker-input-group ticker-benchmark-group">
          <label htmlFor="benchmark" className="ticker-input-label">
            Benchmark
          </label>
          <select
            id="benchmark"
            className="ticker-select"
            value={benchmark}
            onChange={(e) => setBenchmark(e.target.value)}
            disabled={loading}
          >
            {BENCHMARKS.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>

        <button
          className="ticker-submit-btn"
          onClick={handleSubmit}
          disabled={loading || tickerText.trim() === ''}
        >
          {loading ? 'Loading…' : 'Analyze'}
        </button>
      </div>
      <p className="ticker-input-hint">
        Comma or space separated Yahoo Finance tickers. Fetches 5 years of price history
        plus fundamental data.
      </p>
    </div>
  );
}
