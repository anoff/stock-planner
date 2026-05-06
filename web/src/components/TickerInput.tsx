import { useState, type KeyboardEvent } from 'react';
import { BENCHMARK_OPTIONS } from '../utils/types';

interface Props {
  onSubmit: (tickers: string[], benchmark: string) => void;
  loading?: boolean;
}

export default function TickerInput({ onSubmit, loading = false }: Props) {
  const [tickerText, setTickerText] = useState('');
  const [benchmark, setBenchmark] = useState(BENCHMARK_OPTIONS[0].ticker);

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
            {BENCHMARK_OPTIONS.map((b) => (
              <option key={b.ticker} value={b.ticker}>{b.name}</option>
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
