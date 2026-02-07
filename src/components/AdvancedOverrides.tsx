import type { AdvancedOverrides as Overrides, TripFormState } from '../types';

type Props = {
  form: TripFormState;
  onChange: (next: TripFormState) => void;
  onCalculate: () => void;
  isLoading: boolean;
};

type Field = {
  key: keyof Overrides;
  label: string;
  step?: number;
  optional?: boolean;
};

const ASSUMPTION_FIELDS: Field[] = [
  { key: 'hotelNightly', label: 'Hotel per night (USD)' },
  { key: 'mealAdultPerDay', label: 'Meals per adult/day (USD)' },
  { key: 'mealKidPerDay', label: 'Meals per kid/day (USD)' },
  { key: 'activitiesAdultPerDay', label: 'Activities per adult/day (USD)' },
  { key: 'activitiesKidPerDay', label: 'Activities per kid/day (USD)' },
  { key: 'insurancePercent', label: 'Insurance %', step: 0.5 },
  { key: 'baggageFeePerTraveler', label: 'Baggage fee per traveler (USD)' },
  { key: 'airportFoodPerTravelerTravelDay', label: 'Airport food/traveler/travel day (USD)' },
  { key: 'miscFeesFlat', label: 'Misc flat fees (USD)' },
  { key: 'roadTripDistanceMiles', label: 'Road trip round-trip miles', optional: true },
  { key: 'roadTripMpg', label: 'Road trip MPG' },
  { key: 'roadTripGasPricePerGallon', label: 'Road trip gas price/gal (USD)', step: 0.01 },
  { key: 'roadTripTollsAndParking', label: 'Road trip tolls + parking (USD)' },
  { key: 'roadTripWearPerMile', label: 'Road trip wear per mile (USD)', step: 0.01 },
];

const MANUAL_TOTAL_FIELDS: Field[] = [
  { key: 'homeAirportTotalOverride', label: 'Home-airport total override (USD)', optional: true },
  { key: 'flightsTotalOverride', label: 'Air tickets total override (USD)', optional: true },
  { key: 'baggageTotalOverride', label: 'Baggage total override (USD)', optional: true },
  { key: 'lodgingTotalOverride', label: 'Lodging total override (USD)', optional: true },
  { key: 'localTransportTotalOverride', label: 'Local transport total override (USD)', optional: true },
  { key: 'foodTotalOverride', label: 'Food total override (USD)', optional: true },
  { key: 'activitiesTotalOverride', label: 'Activities total override (USD)', optional: true },
  { key: 'miscFeesTotalOverride', label: 'Misc fees total override (USD)', optional: true },
  { key: 'insuranceTotalOverride', label: 'Insurance total override (USD)', optional: true },
];

function toInputValue(value: number | null): string | number {
  return value === null ? '' : value;
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthMiles = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthMiles * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

function getAutoRoadTripMiles(form: TripFormState): number {
  const origin = form.origin.resolved;
  const destination = form.destination.resolved;
  if (!origin || !destination) return 600;

  const base = haversineMiles(origin.lat, origin.lon, destination.lat, destination.lon);
  return Math.max(1, Math.round(base * 2 * 1.22));
}

export default function AdvancedOverrides({ form, onChange, onCalculate, isLoading }: Props) {
  function updateField(field: Field, rawValue: string) {
    const parsed = rawValue === '' ? null : Number(rawValue);

    onChange({
      ...form,
      overrides: {
        ...form.overrides,
        [field.key]: field.optional ? parsed : parsed ?? 0,
      },
    });
  }

  const autoRoadTripMiles = getAutoRoadTripMiles(form);

  return (
    <details className="card advanced-accordion">
      <summary>Fine-tune your estimate (optional)</summary>
      <p>Adjust daily costs or override totals for more control.</p>

      <h3 className="advanced-title">Assumptions</h3>
      <div className="overrides-grid">
        {ASSUMPTION_FIELDS.map((field) => (
          <label className="field" key={field.key}>
            <span>{field.label}</span>
            <input
              type="number"
              min={0}
              step={field.step ?? 1}
              value={
                field.key === 'roadTripDistanceMiles'
                  ? form.overrides.roadTripDistanceMiles ?? autoRoadTripMiles
                  : toInputValue(form.overrides[field.key] as number | null)
              }
              onChange={(e) => updateField(field, e.target.value)}
            />
          </label>
        ))}
      </div>

      <h3 className="advanced-title">Override totals (optional)</h3>
      <div className="overrides-grid">
        {MANUAL_TOTAL_FIELDS.map((field) => (
          <label className="field" key={field.key}>
            <span>{field.label}</span>
            <input
              type="number"
              min={0}
              step={field.step ?? 1}
              value={toInputValue(form.overrides[field.key] as number | null)}
              placeholder="Use estimate"
              onChange={(e) => updateField(field, e.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="advanced-calc-row">
        <button className="primary-btn" type="button" onClick={onCalculate} disabled={isLoading}>
          {isLoading ? 'Calculating...' : 'Recalculate'}
        </button>
      </div>
    </details>
  );
}
