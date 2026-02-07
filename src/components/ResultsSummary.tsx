import type { CalculationResult, TripFormState } from '../types';
import { formatMoney } from '../utils/format';

type Props = {
  result: CalculationResult;
  form: TripFormState;
  onBufferChange: (percent: number) => void;
  onExportCsv: () => void;
  onShareLink: () => void;
};

export default function ResultsSummary({
  result,
  form,
  onBufferChange,
  onExportCsv,
  onShareLink,
}: Props) {
  return (
    <section className="card results-summary">
      <div className="section-head">
        <h2>Your trip estimate</h2>
        <p>Last calculated: {new Date(result.generatedAt).toLocaleString()}</p>
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
        <button type="button" onClick={onExportCsv}>
          Export CSV
        </button>
        <button type="button" onClick={onShareLink}>
          Share link
        </button>
      </div>

      <div className="verify-links">
        <a href={result.googleFlightsUrl} target="_blank" rel="noreferrer">
          View flight options
        </a>
        <a href={result.hotelsUrl} target="_blank" rel="noreferrer">
          View stays
        </a>
        <a href={result.carRentalsUrl} target="_blank" rel="noreferrer">
          View car rentals
        </a>
      </div>
      <p className="results-fallback-note">Estimates include a buffer for price swings.</p>
    </section>
  );
}
