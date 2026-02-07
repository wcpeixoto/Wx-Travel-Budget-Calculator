import { useEffect, useState } from 'react';
import AdvancedOverrides from './components/AdvancedOverrides';
import BreakdownTable from './components/BreakdownTable';
import HeroForm from './components/HeroForm';
import PriceSourcesPanel from './components/PriceSourcesPanel';
import ResultsSummary from './components/ResultsSummary';
import SkeletonResults from './components/SkeletonResults';
import { resolveLocationInput, runResolverDevChecks } from './services/locationService';
import { calculateTripBudget } from './services/pricingService';
import type { CalculationResult, TripFormState } from './types';
import { getCachedResult, makeCacheKey, setCachedResult } from './utils/cache';
import { DEFAULT_FORM_STATE } from './utils/constants';
import { exportResultCsv } from './utils/csv';
import { daysBetween } from './utils/date';
import { copyShareLink, decodeFormFromUrl } from './utils/share';

export default function App() {
  const [form, setForm] = useState<TripFormState>(DEFAULT_FORM_STATE);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [locationErrors, setLocationErrors] = useState<{ origin: string; destination: string }>({
    origin: '',
    destination: '',
  });
  const selectionReady = Boolean(form.origin.resolved?.primaryIata) && Boolean(form.destination.resolved?.primaryIata);
  const hasTypedLocations = Boolean(form.origin.displayText.trim()) && Boolean(form.destination.displayText.trim());
  const canCalculate = hasTypedLocations && !locationErrors.origin && !locationErrors.destination;

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

  async function runCalculation(forceRefresh = false, sourceForm?: TripFormState) {
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
    setStatus('');

    const key = makeCacheKey(activeForm);
    if (!forceRefresh) {
      const cached = getCachedResult(key);
      if (cached) {
        setResult(cached);
        setLoading(false);
        setStatus('Loaded cached pricing (up to 30 minutes old).');
        return;
      }
    }

    try {
      const calculated = await calculateTripBudget(activeForm);
      setResult(calculated);
      setCachedResult(key, calculated);
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
                void runCalculation(true, next);
              }}
              onExportCsv={() => exportResultCsv(result)}
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
