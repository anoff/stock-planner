import { useState, type KeyboardEvent } from 'react';
import { BENCHMARK_OPTIONS } from '../utils/types';
import { useLanguage } from '../i18n';

interface Props {
  onSubmit: (tickers: string[], benchmark: string) => void;
  loading?: boolean;
}

export default function TickerInput({ onSubmit, loading = false }: Props) {
  const [tickerText, setTickerText] = useState('');
  const [benchmark, setBenchmark] = useState(BENCHMARK_OPTIONS[0].ticker);
  const { t } = useLanguage();

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
            {t.labelTickers}
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
            {t.labelBenchmark}
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
          {loading ? t.analyzing : t.analyze}
        </button>
      </div>
      <p className="ticker-input-hint">
        {t.tickerInputHint}
      </p>
    </div>
  );
}
