import CityAutocomplete from './CityAutocomplete';
import TotalCostDisplay from './TotalCostDisplay';
import type { TripFormState } from '../types';

type Props = {
  form: TripFormState;
  onChange: (next: TripFormState) => void;
  onCalculate: () => void;
  isLoading: boolean;
  error: string;
  canCalculate: boolean;
  locationErrors: { origin: string; destination: string };
  estimatedTotal: number | null;
};

export default function HeroForm({
  form,
  onChange,
  onCalculate,
  isLoading,
  error,
  canCalculate,
  locationErrors,
  estimatedTotal,
}: Props) {
  const totalTravelers = form.adults + form.kids;
  const hasEstimate = typeof estimatedTotal === 'number' && Number.isFinite(estimatedTotal);

  function scrollToBreakdown() {
    document.getElementById('cost-breakdown')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  return (
    <section className="hero card">
      <p className="eyebrow">Plan with confidence</p>
      <h1>Wx Travel Budget Calculator</h1>
      <p className="hero-subtitle hero-subtitle-small">Live prices when available. Smart estimates when they’re not.</p>

      <div className="hero-grid">
        <CityAutocomplete
          label="Leaving from"
          value={form.origin}
          onChange={(origin) => onChange({ ...form, origin })}
          showAirportHelper={form.tripType === 'flight'}
          errorText={locationErrors.origin}
        />
        <CityAutocomplete
          label="Going to"
          value={form.destination}
          onChange={(destination) => onChange({ ...form, destination })}
          showAirportHelper={form.tripType === 'flight'}
          errorText={locationErrors.destination}
        />

        <div className="field">
          <span>How are you traveling?</span>
          <div className="segmented">
            <button
              type="button"
              className={form.tripType === 'flight' ? 'active' : ''}
              onClick={() => onChange({ ...form, tripType: 'flight' })}
            >
              Flight
            </button>
            <button
              type="button"
              className={form.tripType === 'road_trip' ? 'active' : ''}
              onClick={() =>
                onChange({
                  ...form,
                  tripType: 'road_trip',
                  includeAirportTransport: false,
                })
              }
            >
              Road trip
            </button>
          </div>
        </div>

        <div className="field">
          <span>When are you traveling?</span>
          <div className="segmented">
            <button
              type="button"
              className={form.durationMode === 'exact' ? 'active' : ''}
              onClick={() => onChange({ ...form, durationMode: 'exact' })}
            >
              Exact dates
            </button>
            <button
              type="button"
              className={form.durationMode === 'length' ? 'active' : ''}
              onClick={() => onChange({ ...form, durationMode: 'length' })}
            >
              Just the length
            </button>
          </div>
        </div>

        {form.durationMode === 'exact' ? (
          <>
            <label className="field">
              <span>Depart</span>
              <input
                type="date"
                value={form.departDate}
                onChange={(e) => onChange({ ...form, departDate: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Return</span>
              <input
                type="date"
                value={form.returnDate}
                onChange={(e) => onChange({ ...form, returnDate: e.target.value })}
              />
            </label>
          </>
        ) : (
          <>
            <label className="field">
              <span>
                Trip length
                <small>{form.lengthDays} days</small>
              </span>
              <input
                type="range"
                min={2}
                max={30}
                value={form.lengthDays}
                onChange={(e) => {
                  const days = Number(e.target.value);
                  onChange({ ...form, lengthDays: days, lengthNights: Math.max(1, days - 1) });
                }}
              />
            </label>
            <label className="field">
              <span>Nights</span>
              <input
                type="number"
                min={1}
                max={30}
                value={form.lengthNights}
                onChange={(e) => onChange({ ...form, lengthNights: Number(e.target.value) || 1 })}
              />
            </label>
          </>
        )}

        <label className="field">
          <span>Adults: {form.adults}</span>
          <input
            type="range"
            min={0}
            max={10}
            value={form.adults}
            onChange={(e) => onChange({ ...form, adults: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>Kids (under 12): {form.kids}</span>
          <input
            type="range"
            min={0}
            max={10}
            value={form.kids}
            onChange={(e) => onChange({ ...form, kids: Number(e.target.value) })}
          />
        </label>
      </div>

      <p className="section-kicker">Include these costs</p>
      <div className="toggle-grid">
        <label>
          <input
            type="checkbox"
            checked={form.includeAirportTransport}
            disabled={form.tripType === 'road_trip'}
            onChange={(e) => onChange({ ...form, includeAirportTransport: e.target.checked })}
          />
          To / from airport
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.includeInsurance}
            onChange={(e) => onChange({ ...form, includeInsurance: e.target.checked })}
          />
          Travel insurance
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.includeActivities}
            onChange={(e) => onChange({ ...form, includeActivities: e.target.checked })}
          />
          Activities & attractions
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.includeLocalTransport}
            onChange={(e) => onChange({ ...form, includeLocalTransport: e.target.checked })}
          />
          Local transportation
        </label>
      </div>

      <div className="cta-row">
        <div className="cta-main">
          <button
            className="primary-btn cta-calc-btn"
            type="button"
            disabled={isLoading || !canCalculate || totalTravelers === 0}
            onClick={onCalculate}
          >
            {isLoading ? 'Calculating...' : 'Calculate trip cost'}
          </button>

          <div className="trip-cost-wrap">
            <TotalCostDisplay estimatedTotal={estimatedTotal} />
            <button
              type="button"
              className="breakdown-link"
              disabled={!hasEstimate}
              onClick={scrollToBreakdown}
            >
              View cost breakdown ↓
            </button>
          </div>
        </div>

        {!canCalculate && totalTravelers > 0 && <p className="inline-error">Select a suggested place/airport for both fields.</p>}
        {totalTravelers === 0 && <p className="inline-error">Add at least one traveler.</p>}
        {!!error && <p className="inline-error">{error}</p>}
      </div>
    </section>
  );
}
