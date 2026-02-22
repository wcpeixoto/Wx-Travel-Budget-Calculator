import { useEffect, useRef, useState } from 'react';
import type { CalculationResult, TripFormState } from '../types';
import { formatMoney } from '../utils/format';

type Props = {
  result: CalculationResult;
  form: TripFormState;
  onBufferChange: (percent: number) => void;
  onPrint: () => void;
  onShareLink: () => void;
};

export default function ResultsSummary({
  result,
  form,
  onBufferChange,
  onPrint,
  onShareLink,
}: Props) {
  const generatedAt = new Date(result.generatedAt);
  const relativeLabel = getRelativeUpdatedLabel(generatedAt);
  const airbnbUrl = buildAirbnbUrl(form);
  const [staysMenuOpen, setStaysMenuOpen] = useState(false);
  const staysMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!staysMenuRef.current) return;
      if (!staysMenuRef.current.contains(event.target as Node)) {
        setStaysMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setStaysMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <section className="card results-summary">
      <div className="section-head">
        <h2>Your trip estimate</h2>
      </div>
      <p className="results-trust-line">Built from live prices when possible. Otherwise, conservative estimates.</p>

      <div className="summary-cards">
        <article>
          <span>Total trip cost</span>
          <strong>{formatMoney(result.breakdown.total)}</strong>
        </article>
        <article>
          <span>Cost per traveler</span>
          <strong>{formatMoney(result.perTraveler)}</strong>
        </article>
        <article>
          <span>Cost per day</span>
          <strong>{formatMoney(result.perDay)}</strong>
        </article>
      </div>

      <label className="field buffer-field">
        <span>Buffer / contingency: {Math.round(form.bufferPercent)}%</span>
        <input
          type="range"
          min={0}
          max={25}
          step={1}
          value={form.bufferPercent}
          onChange={(e) => onBufferChange(Number(e.target.value))}
        />
      </label>

      <div className="actions-wrap">
        <button type="button" onClick={onPrint}>
          Print
        </button>
        <button type="button" onClick={onShareLink}>
          Share link
        </button>
      </div>

      <div className="explore-prices">
        <p className="explore-prices-label">Explore prices</p>
        <div className="explore-prices-actions">
          <a className="explore-btn" href={result.googleFlightsUrl} target="_blank" rel="noreferrer">
            View Google Flights
          </a>
          <div className="stays-menu" ref={staysMenuRef}>
            <button
              type="button"
              className={`explore-btn ${staysMenuOpen ? 'is-open' : ''}`}
              onClick={() => setStaysMenuOpen((prev) => !prev)}
              aria-expanded={staysMenuOpen}
              aria-haspopup="menu"
            >
              View stays
            </button>
            {staysMenuOpen && (
              <div className="stays-menu-list" role="menu" aria-label="View stays links">
                <a
                  href={result.hotelsUrl}
                  target="_blank"
                  rel="noreferrer"
                  role="menuitem"
                  onClick={() => setStaysMenuOpen(false)}
                >
                  Booking.com
                </a>
                <a
                  href={airbnbUrl}
                  target="_blank"
                  rel="noreferrer"
                  role="menuitem"
                  onClick={() => setStaysMenuOpen(false)}
                >
                  Airbnb
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="results-footnotes">
        <p className="results-fallback-note">Estimates include a buffer for price swings.</p>
        <p className="results-updated-footnote" title={generatedAt.toLocaleString()}>
          Updated {relativeLabel}
        </p>
      </div>
    </section>
  );
}

function buildAirbnbUrl(form: TripFormState) {
  const destination = form.destination.resolved?.cityName || form.destination.displayText;
  const params = new URLSearchParams({
    query: destination,
    checkin: form.departDate,
    checkout: form.returnDate,
    adults: String(form.adults),
    children: String(form.kids),
  });
  return `https://www.airbnb.com/s/homes?${params.toString()}`;
}

function getRelativeUpdatedLabel(timestamp: Date) {
  const diffMs = timestamp.getTime() - Date.now();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (abs < hourMs) {
    const minutes = Math.round(diffMs / minuteMs);
    return rtf.format(minutes, 'minute');
  }

  if (abs < dayMs) {
    const hours = Math.round(diffMs / hourMs);
    return rtf.format(hours, 'hour');
  }

  const days = Math.round(diffMs / dayMs);
  return rtf.format(days, 'day');
}
