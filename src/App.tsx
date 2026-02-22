import { useEffect, useMemo, useState } from 'react';
import AdvancedOverrides from './components/AdvancedOverrides';
import BreakdownTable from './components/BreakdownTable';
import HeroForm from './components/HeroForm';
import PriceSourcesPanel from './components/PriceSourcesPanel';
import ResultsSummary from './components/ResultsSummary';
import SkeletonResults from './components/SkeletonResults';
import { resolveLocationInput, runResolverDevChecks } from './services/locationService';
import {
  calculateTripBudget,
  calculateTripBudgetDerived,
  estimateIncludeCategoryTotals,
  estimateMealsPreference,
} from './services/pricingService';
import type { CalculationResult, LiveEstimateBasis, LiveEstimateSnapshot, MealsPreferenceEstimate, TripFormState } from './types';
import { getCachedResult, makeCacheKey, setCachedResult } from './utils/cache';
import { DEFAULT_FORM_STATE } from './utils/constants';
import { daysBetween } from './utils/date';
import { copyShareLink, decodeFormFromUrl } from './utils/share';

export default function App() {
  function getLiveSignature(value: TripFormState): string {
    return JSON.stringify({
      origin: value.origin.resolved?.primaryIata || value.origin.displayText.trim(),
      destination: value.destination.resolved?.primaryIata || value.destination.displayText.trim(),
      tripType: value.tripType,
      durationMode: value.durationMode,
      departDate: value.departDate,
      returnDate: value.returnDate,
      lengthDays: value.lengthDays,
      lengthNights: value.lengthNights,
    });
  }

  const [form, setForm] = useState<TripFormState>(DEFAULT_FORM_STATE);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [hasManualCalculation, setHasManualCalculation] = useState(false);
  const [liveSnapshot, setLiveSnapshot] = useState<LiveEstimateSnapshot | null>(null);
  const [liveSnapshotBasis, setLiveSnapshotBasis] = useState<LiveEstimateBasis | null>(null);
  const [lastLiveSignature, setLastLiveSignature] = useState('');
  const [locationErrors, setLocationErrors] = useState<{ origin: string; destination: string }>({
    origin: '',
    destination: '',
  });
  const selectionReady = Boolean(form.origin.resolved?.primaryIata) && Boolean(form.destination.resolved?.primaryIata);
  const hasTypedLocations = Boolean(form.origin.displayText.trim()) && Boolean(form.destination.displayText.trim());
  const canCalculate = hasTypedLocations && !locationErrors.origin && !locationErrors.destination;
  const categoryTotals = useMemo(() => estimateIncludeCategoryTotals(form), [form]);
  const mealsPreferenceEstimate: MealsPreferenceEstimate = useMemo(() => estimateMealsPreference(form), [form]);

  const currentLiveSignature = useMemo(() => getLiveSignature(form), [form]);

  useEffect(() => {
    const fromUrl = decodeFormFromUrl();
    if (fromUrl) {
      setForm(fromUrl);
    }
  }, []);

  useEffect(() => {
    void runResolverDevChecks();
  }, []);

  useEffect(() => {
    if (form.durationMode === 'exact') {
      const days = daysBetween(form.departDate, form.returnDate);
      if (days !== form.lengthDays || days !== form.lengthNights) {
        setForm((prev) => ({ ...prev, lengthDays: days, lengthNights: days }));
      }
    }
  }, [form.durationMode, form.departDate, form.returnDate, form.lengthDays, form.lengthNights]);

  function applyDerivedCalculation(nextForm: TripFormState) {
    const useSnapshot = hasManualCalculation && liveSnapshot && liveSnapshotBasis && currentLiveSignature === lastLiveSignature;
    const derived = calculateTripBudgetDerived(
      nextForm,
      useSnapshot ? liveSnapshot : undefined,
      useSnapshot ? liveSnapshotBasis : undefined,
    );
    setResult(derived);
    setStatus(
      useSnapshot
        ? 'Updated from your latest settings.'
        : 'Updated estimate. Click Calculate trip cost to refresh live prices.',
    );
  }

  useEffect(() => {
    if (!hasManualCalculation || loading) return;
    if (form.adults + form.kids <= 0) return;
    if (!form.origin.displayText.trim() || !form.destination.displayText.trim()) return;

    const timeout = setTimeout(() => {
      applyDerivedCalculation(form);
    }, 220);

    return () => clearTimeout(timeout);
  }, [form, hasManualCalculation, loading, liveSnapshot, liveSnapshotBasis, lastLiveSignature, currentLiveSignature]);

  async function runCalculation(forceRefresh = false, sourceForm?: TripFormState, mode: 'manual' | 'auto' = 'manual') {
    let activeForm = sourceForm ?? form;
    const nextLocationErrors = { origin: '', destination: '' };

    if (activeForm.origin.displayText.trim() && !activeForm.origin.resolved?.primaryIata) {
      const resolvedOrigin = await resolveLocationInput(activeForm.origin);
      if (resolvedOrigin?.resolved?.primaryIata) {
        activeForm = { ...activeForm, origin: resolvedOrigin };
      } else {
        nextLocationErrors.origin = "Choose a place from the list for 'Leaving from'.";
      }
    }

    if (activeForm.destination.displayText.trim() && !activeForm.destination.resolved?.primaryIata) {
      const resolvedDestination = await resolveLocationInput(activeForm.destination);
      if (resolvedDestination?.resolved?.primaryIata) {
        activeForm = { ...activeForm, destination: resolvedDestination };
      } else {
        nextLocationErrors.destination = "Choose a place from the list for 'Going to'.";
      }
    }

    setForm(activeForm);
    setLocationErrors(nextLocationErrors);

    if (nextLocationErrors.origin || nextLocationErrors.destination) {
      setError(nextLocationErrors.origin || nextLocationErrors.destination);
      return;
    }

    if (activeForm.adults + activeForm.kids <= 0) {
      setError('Please set origin, destination, and at least one traveler.');
      return;
    }
    if (!activeForm.origin.resolved?.primaryIata) {
      setError("Choose a place from the list for 'Leaving from'.");
      return;
    }
    if (!activeForm.destination.resolved?.primaryIata) {
      setError("Choose a place from the list for 'Going to'.");
      return;
    }
    if (activeForm.durationMode === 'exact') {
      const depart = new Date(`${activeForm.departDate}T00:00:00`);
      const ret = new Date(`${activeForm.returnDate}T00:00:00`);
      if (!activeForm.departDate || !activeForm.returnDate || Number.isNaN(depart.getTime()) || Number.isNaN(ret.getTime()) || ret <= depart) {
        setError('Check your dates and try again.');
        return;
      }
    } else if (!activeForm.lengthDays || activeForm.lengthDays <= 0) {
      setError('Enter a trip length (days).');
      return;
    }

    setLoading(true);
    setError('');
    if (mode === 'manual') {
      setStatus('');
    }

    if (mode === 'auto') {
      applyDerivedCalculation(activeForm);
      setLoading(false);
      return;
    }

    const key = makeCacheKey(activeForm);
    if (!forceRefresh) {
      const cached = getCachedResult(key);
      if (cached) {
        setResult(cached);
        setLiveSnapshot(cached.estimates);
        setLiveSnapshotBasis({
          adults: cached.form.adults,
          kids: cached.form.kids,
          days: cached.days,
          nights: cached.nights,
        });
        setLastLiveSignature(getLiveSignature(activeForm));
        setHasManualCalculation(true);
        setLoading(false);
        setStatus('Loaded cached pricing (up to 30 minutes old).');
        return;
      }
    }

    try {
      const calculated = await calculateTripBudget(activeForm);
      setResult(calculated);
      setCachedResult(key, calculated);
      setLiveSnapshot(calculated.estimates);
      setLiveSnapshotBasis({
        adults: calculated.form.adults,
        kids: calculated.form.kids,
        days: calculated.days,
        nights: calculated.nights,
      });
      setLastLiveSignature(getLiveSignature(activeForm));
      setHasManualCalculation(true);
      if (calculated.flightSource.type === 'heuristic' || calculated.lodgingSource.type === 'heuristic') {
        setStatus('Couldn’t fetch live prices right now — using estimates.');
      } else {
        setStatus(forceRefresh ? 'Pricing refreshed.' : 'New pricing calculated.');
      }
    } catch {
      setError('Couldn’t fetch live prices right now — using estimates.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="bg-orb bg-orb-a" />
      <div className="bg-orb bg-orb-b" />
      <div className="container">
        <HeroForm
          form={form}
          onChange={(next) => {
            const originChanged =
              next.origin.displayText !== form.origin.displayText ||
              next.origin.resolved?.primaryIata !== form.origin.resolved?.primaryIata;
            const destinationChanged =
              next.destination.displayText !== form.destination.displayText ||
              next.destination.resolved?.primaryIata !== form.destination.resolved?.primaryIata;

            if (originChanged && locationErrors.origin) {
              setLocationErrors((prev) => ({ ...prev, origin: '' }));
            }
            if (destinationChanged && locationErrors.destination) {
              setLocationErrors((prev) => ({ ...prev, destination: '' }));
            }
            setForm(next);
          }}
          onCalculate={() => runCalculation(false)}
          isLoading={loading}
          error={error}
          canCalculate={canCalculate}
          locationErrors={locationErrors}
          estimatedTotal={result?.breakdown.total ?? null}
          categoryTotals={categoryTotals}
          mealsPreferenceEstimate={mealsPreferenceEstimate}
        />

        <AdvancedOverrides
          form={form}
          onChange={setForm}
          onCalculate={() => runCalculation(false)}
          isLoading={loading || !canCalculate}
        />

        {status && <p className="status-pill">{status}</p>}

        {loading && <SkeletonResults />}

        {!loading && result && (
          <>
            <ResultsSummary
              result={result}
              form={form}
              onBufferChange={(percent) => {
                const next = { ...form, bufferPercent: percent };
                setForm(next);
              }}
              onPrint={() => window.print()}
              onShareLink={() => {
                copyShareLink(form)
                  .then(() => setStatus('Share link copied to clipboard.'))
                  .catch(() => setError('Could not copy share link.'));
              }}
            />

            <BreakdownTable result={result} />
            <PriceSourcesPanel result={result} />
          </>
        )}
      </div>
    </main>
  );
}
