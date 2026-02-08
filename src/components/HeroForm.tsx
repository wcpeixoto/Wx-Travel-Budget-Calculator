import CityAutocomplete from './CityAutocomplete';
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  BedDoubleIcon,
  CarIcon,
  LuggageIcon,
  PlaneTakeoffIcon,
  ShieldCheckIcon,
  TicketIcon,
  UtensilsCrossedIcon,
} from './CostTileIcons';
import TotalCostDisplay from './TotalCostDisplay';
import type { IncludeCategoryTotals, IncludeCosts, MealsPreferenceEstimate, TripFormState } from '../types';
import { formatMoney } from '../utils/format';

type Props = {
  form: TripFormState;
  onChange: (next: TripFormState) => void;
  onCalculate: () => void;
  isLoading: boolean;
  error: string;
  canCalculate: boolean;
  locationErrors: { origin: string; destination: string };
  estimatedTotal: number | null;
  categoryTotals: IncludeCategoryTotals;
  mealsPreferenceEstimate: MealsPreferenceEstimate;
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
  categoryTotals,
  mealsPreferenceEstimate,
}: Props) {
  const adultOptions = ['1', '2', '3', '4', '5', '6+'] as const;
  const kidOptions = ['0', '1', '2', '3', '4+'] as const;
  const totalTravelers = form.adults + form.kids;
  const hasEstimate = typeof estimatedTotal === 'number' && Number.isFinite(estimatedTotal);
  const [isMealsControlOpen, setIsMealsControlOpen] = useState(false);
  const [headcountEditor, setHeadcountEditor] = useState<{ field: 'adults' | 'kids' } | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 719px)').matches : false,
  );
  const mealsTileRef = useRef<HTMLDivElement>(null);
  const mealsPanelRef = useRef<HTMLDivElement>(null);
  const mealsAdjustButtonRef = useRef<HTMLButtonElement>(null);
  const headcountPanelRef = useRef<HTMLDivElement>(null);
  const headcountTriggerRef = useRef<HTMLButtonElement | null>(null);
  const costTiles: Array<{ key: keyof IncludeCosts; label: string; icon: ComponentType<{ size?: number }> }> = [
    { key: 'lodging', label: 'Lodging', icon: BedDoubleIcon },
    { key: 'meals', label: 'Meals', icon: UtensilsCrossedIcon },
    { key: 'rideshareTaxi', label: 'Uber/Taxi', icon: CarIcon },
    { key: 'rentalCar', label: 'Rental car', icon: CarIcon },
    { key: 'activities', label: 'Activities', icon: TicketIcon },
    { key: 'baggageFees', label: 'Baggage fees', icon: LuggageIcon },
    { key: 'airportAccess', label: 'Airport ride / parking', icon: PlaneTakeoffIcon },
    { key: 'travelInsurance', label: 'Travel insurance', icon: ShieldCheckIcon },
  ];

  useEffect(() => {
    function onResize() {
      setIsMobileViewport(window.matchMedia('(max-width: 719px)').matches);
    }
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isMealsControlOpen) return;

    function handlePointer(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (mealsPanelRef.current?.contains(target)) return;
      if (mealsTileRef.current?.contains(target)) return;
      setIsMealsControlOpen(false);
      mealsAdjustButtonRef.current?.focus();
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMealsControlOpen(false);
        mealsAdjustButtonRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMealsControlOpen]);

  useEffect(() => {
    if (!isMealsControlOpen || !isMobileViewport) return;
    const panel = mealsPanelRef.current;
    if (!panel) return;

    const focusable = panel.querySelectorAll<HTMLElement>('button, input, [href], [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    function handleTab(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    panel.addEventListener('keydown', handleTab);
    return () => panel.removeEventListener('keydown', handleTab);
  }, [isMealsControlOpen, isMobileViewport]);

  useEffect(() => {
    if (!headcountEditor) return;

    function handlePointer(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (headcountPanelRef.current?.contains(target)) return;
      if (headcountTriggerRef.current?.contains(target)) return;
      setHeadcountEditor(null);
      headcountTriggerRef.current?.focus();
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setHeadcountEditor(null);
        headcountTriggerRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [headcountEditor]);

  function toggleIncludeCost(key: keyof IncludeCosts) {
    onChange({
      ...form,
      includeCosts: {
        ...form.includeCosts,
        [key]: !form.includeCosts[key],
      },
    });
  }

  function selectedAdultChipLabel(value: number) {
    if (value >= 6) return '6+';
    return String(Math.max(1, value));
  }

  function selectedKidChipLabel(value: number) {
    if (value >= 4) return '4+';
    return String(Math.max(0, value));
  }

  function openHeadcountEditor(field: 'adults' | 'kids', trigger: HTMLButtonElement) {
    headcountTriggerRef.current = trigger;
    setHeadcountEditor({ field });
  }

  function handleAdultChipSelect(label: (typeof adultOptions)[number], trigger: HTMLButtonElement) {
    if (label === '6+') {
      const nextAdults = Math.max(6, form.adults);
      onChange({ ...form, adults: nextAdults });
      openHeadcountEditor('adults', trigger);
      return;
    }
    onChange({ ...form, adults: Number(label) });
  }

  function handleKidChipSelect(label: (typeof kidOptions)[number], trigger: HTMLButtonElement) {
    if (label === '4+') {
      const nextKids = Math.max(4, form.kids);
      onChange({ ...form, kids: nextKids });
      openHeadcountEditor('kids', trigger);
      return;
    }
    onChange({ ...form, kids: Number(label) });
  }

  function handleChipGroupArrows(
    event: ReactKeyboardEvent<HTMLDivElement>,
    field: 'adults' | 'kids',
  ) {
    const horizontal = event.key === 'ArrowRight' || event.key === 'ArrowLeft';
    if (!horizontal) return;
    event.preventDefault();

    const options = field === 'adults' ? adultOptions : kidOptions;
    const currentLabel = field === 'adults' ? selectedAdultChipLabel(form.adults) : selectedKidChipLabel(form.kids);
    const currentIndex = Math.max(0, options.findIndex((option) => option === currentLabel));
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = Math.min(options.length - 1, Math.max(0, currentIndex + direction));
    const nextOption = options[nextIndex];
    const target = event.currentTarget.querySelector<HTMLButtonElement>(`button[data-option="${nextOption}"]`);
    target?.focus();
    if (target) {
      if (field === 'adults') handleAdultChipSelect(nextOption as (typeof adultOptions)[number], target);
      else handleKidChipSelect(nextOption as (typeof kidOptions)[number], target);
    }
  }

  function scrollToBreakdown() {
    document.getElementById('cost-breakdown')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  function adjustHeadcount(field: 'adults' | 'kids', delta: number) {
    const current = field === 'adults' ? form.adults : form.kids;
    const min = field === 'adults' ? 6 : 4;
    const nextValue = Math.max(min, current + delta);
    onChange({ ...form, [field]: nextValue });
  }

  function renderMealsControlContent() {
    return (
      <>
        <div className="meals-control-head">
          <h3>Eating out or cooking in?</h3>
          <strong className={`meals-control-total ${!form.includeCosts.meals ? 'is-excluded' : ''}`}>
            {mealsPreferenceEstimate.total === null ? '—' : formatMoney(mealsPreferenceEstimate.total)}
          </strong>
        </div>
        <div className="meals-preference">
          <div className="meals-preference-labels">
            <span>
              Eating out:{' '}
              {mealsPreferenceEstimate.eatingOutTotal === null ? '—' : formatMoney(mealsPreferenceEstimate.eatingOutTotal)}
            </span>
            <span>
              Cooking in:{' '}
              {mealsPreferenceEstimate.cookingInTotal === null ? '—' : formatMoney(mealsPreferenceEstimate.cookingInTotal)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={form.mealsPreference}
            aria-label="Meals preference from eating out to cooking in"
            onChange={(event) => onChange({ ...form, mealsPreference: Number(event.target.value) })}
          />
          <div className="meals-percentages">
            <span>{mealsPreferenceEstimate.eatingOutPercent}%</span>
            <span>{mealsPreferenceEstimate.cookingInPercent}%</span>
          </div>
          <div className="meals-include-row">
            <span>Include/Exclude meals</span>
            <button
              type="button"
              className={`switch ${form.includeCosts.meals ? 'is-on' : ''}`}
              role="switch"
              aria-checked={form.includeCosts.meals}
              aria-label="Include meals in total"
              onClick={() => toggleIncludeCost('meals')}
            >
              <span className="switch-knob" />
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <section className="hero card">
      <p className="eyebrow">Plan with confidence</p>
      <h1>Wx Travel Budget Calculator</h1>
      <p className="hero-subtitle hero-subtitle-small">Live prices when available. Smart estimates when they’re not.</p>

      <div className="hero-grid">
        <div className="route-mode-card">
          <div className="route-mode-grid">
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
                  onClick={() => onChange({ ...form, tripType: 'road_trip' })}
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
          </div>
        </div>

        <div className="trip-details-card">
          <p className="trip-details-title">Trip details</p>
          <div className="trip-details-grid">
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

            <div className="field headcount-field">
              <span>How many adults?</span>
              <div
                className="headcount-chips"
                role="radiogroup"
                aria-label="Adults"
                onKeyDown={(event) => handleChipGroupArrows(event, 'adults')}
              >
                {adultOptions.map((label) => {
                  const selected = selectedAdultChipLabel(form.adults) === label;
                  return (
                    <button
                      key={label}
                      type="button"
                      data-option={label}
                      className={`headcount-chip ${selected ? 'is-selected' : ''}`}
                      role="radio"
                      aria-checked={selected}
                      onClick={(event) => handleAdultChipSelect(label, event.currentTarget)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {form.adults >= 6 ? <small className="headcount-helper">Adults: {form.adults}</small> : null}
              {headcountEditor?.field === 'adults' && !isMobileViewport ? (
                <div
                  className="headcount-editor is-popover"
                  role="dialog"
                  aria-label="Enter number of adults"
                  ref={headcountPanelRef}
                >
                  <div className="headcount-editor-head">
                    <h3>Enter number of adults</h3>
                    <button
                      type="button"
                      className="headcount-done"
                      onClick={() => {
                        setHeadcountEditor(null);
                        headcountTriggerRef.current?.focus();
                      }}
                    >
                      Done
                    </button>
                  </div>
                  <div className="headcount-stepper">
                    <button type="button" aria-label="Decrease" onClick={() => adjustHeadcount('adults', -1)}>
                      -
                    </button>
                    <div className="headcount-value" aria-live="polite">
                      {form.adults}
                    </div>
                    <button type="button" aria-label="Increase" onClick={() => adjustHeadcount('adults', 1)}>
                      +
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="field headcount-field">
              <span>Any kids?</span>
              <div
                className="headcount-chips"
                role="radiogroup"
                aria-label="Kids under 12"
                onKeyDown={(event) => handleChipGroupArrows(event, 'kids')}
              >
                {kidOptions.map((label) => {
                  const selected = selectedKidChipLabel(form.kids) === label;
                  return (
                    <button
                      key={label}
                      type="button"
                      data-option={label}
                      className={`headcount-chip ${selected ? 'is-selected' : ''}`}
                      role="radio"
                      aria-checked={selected}
                      onClick={(event) => handleKidChipSelect(label, event.currentTarget)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {form.kids >= 4 ? <small className="headcount-helper">Kids: {form.kids}</small> : null}
              {headcountEditor?.field === 'kids' && !isMobileViewport ? (
                <div
                  className="headcount-editor is-popover align-right"
                  role="dialog"
                  aria-label="Enter number of kids"
                  ref={headcountPanelRef}
                >
                  <div className="headcount-editor-head">
                    <h3>Enter number of kids</h3>
                    <button
                      type="button"
                      className="headcount-done"
                      onClick={() => {
                        setHeadcountEditor(null);
                        headcountTriggerRef.current?.focus();
                      }}
                    >
                      Done
                    </button>
                  </div>
                  <div className="headcount-stepper">
                    <button type="button" aria-label="Decrease" onClick={() => adjustHeadcount('kids', -1)}>
                      -
                    </button>
                    <div className="headcount-value" aria-live="polite">
                      {form.kids}
                    </div>
                    <button type="button" aria-label="Increase" onClick={() => adjustHeadcount('kids', 1)}>
                      +
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="costs-card">
        <p className="section-kicker">Click an item to add/remove it. You can fine-tune costs after we calculate your total.</p>
        <div className="cost-tiles" role="group" aria-label="Include these costs">
          {costTiles.map((tile) => {
            const Icon = tile.icon;
            const selected = form.includeCosts[tile.key];
            const isMealsTile = tile.key === 'meals';
            const amount = categoryTotals[tile.key];
            const hasAmount = typeof amount === 'number' && Number.isFinite(amount);
            const amountText = hasAmount ? formatMoney(amount) : '—';
            return (
              <div
                key={tile.key}
                className={`cost-tile ${selected ? 'is-selected' : ''} ${
                  isMealsTile && isMealsControlOpen && !isMobileViewport ? 'is-overlay-anchor' : ''
                }`}
                role={isMealsTile ? 'button' : 'checkbox'}
                aria-checked={isMealsTile ? undefined : selected}
                aria-expanded={isMealsTile ? isMealsControlOpen : undefined}
                aria-haspopup={isMealsTile ? 'dialog' : undefined}
                tabIndex={0}
                aria-label={`${tile.label}. ${selected ? 'Included' : 'Not included'}. ${hasAmount ? amountText : 'Needs details'}`}
                onClick={() => (isMealsTile ? setIsMealsControlOpen(true) : toggleIncludeCost(tile.key))}
                onKeyDown={(event) => {
                  if (event.key === ' ' || event.key === 'Enter') {
                    event.preventDefault();
                    if (isMealsTile) {
                      setIsMealsControlOpen(true);
                    } else {
                      toggleIncludeCost(tile.key);
                    }
                  }
                }}
                ref={isMealsTile ? mealsTileRef : undefined}
              >
                <div className="cost-tile-main">
                  <span className="cost-tile-text">
                    <Icon size={18} aria-hidden="true" />
                    <span className="cost-tile-label">{tile.label}</span>
                  </span>
                  <span className="cost-tile-meta">
                    <span className={`cost-tile-amount ${!selected && hasAmount ? 'is-excluded' : ''}`}>{amountText}</span>
                    {isMealsTile ? (
                      <button
                        ref={mealsAdjustButtonRef}
                        type="button"
                        className="cost-tile-adjust"
                        aria-label="Adjust meals preference"
                        onClick={(event) => {
                          event.stopPropagation();
                          setIsMealsControlOpen(true);
                        }}
                      >
                        Adjust
                      </button>
                    ) : null}
                    {!selected && hasAmount ? (
                      <small className="cost-tile-note">Not included</small>
                    ) : !hasAmount ? (
                      <small className="cost-tile-note">Needs details</small>
                    ) : null}
                  </span>
                </div>

                {isMealsTile && isMealsControlOpen && !isMobileViewport ? (
                  <div
                    className="meals-control-surface is-popover"
                    role="dialog"
                    aria-label="Meals preference"
                    ref={mealsPanelRef}
                  >
                    {renderMealsControlContent()}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {isMealsControlOpen ? (
        <>
          {isMobileViewport ? <div className="meals-sheet-overlay" /> : null}
          {isMobileViewport ? (
            <div
              className="meals-control-surface is-sheet"
              role="dialog"
              aria-label="Meals preference"
              ref={mealsPanelRef}
            >
              {renderMealsControlContent()}
            </div>
          ) : null}
        </>
      ) : null}

      {headcountEditor ? (
        <>
          {isMobileViewport ? <div className="meals-sheet-overlay" /> : null}
          {isMobileViewport ? (
            <div
              className="headcount-editor is-sheet"
              role="dialog"
              aria-label={headcountEditor.field === 'adults' ? 'Enter number of adults' : 'Enter number of kids'}
              ref={headcountPanelRef}
            >
              <div className="headcount-editor-head">
                <h3>{headcountEditor.field === 'adults' ? 'Enter number of adults' : 'Enter number of kids'}</h3>
                <button
                  type="button"
                  className="headcount-done"
                  onClick={() => {
                    setHeadcountEditor(null);
                    headcountTriggerRef.current?.focus();
                  }}
                >
                  Done
                </button>
              </div>
              <div className="headcount-stepper">
                <button
                  type="button"
                  aria-label="Decrease"
                  onClick={() => adjustHeadcount(headcountEditor.field, -1)}
                >
                  -
                </button>
                <div className="headcount-value" aria-live="polite">
                  {headcountEditor.field === 'adults' ? form.adults : form.kids}
                </div>
                <button
                  type="button"
                  aria-label="Increase"
                  onClick={() => adjustHeadcount(headcountEditor.field, 1)}
                >
                  +
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

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
