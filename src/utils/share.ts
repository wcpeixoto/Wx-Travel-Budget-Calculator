import type { LocationInputState, ResolvedLocation, TripFormState } from '../types';
import { DEFAULT_FORM_STATE } from './constants';

function isResolvedLocation(input: unknown): input is ResolvedLocation {
  if (!input || typeof input !== 'object') {
    return false;
  }

  return (
    'type' in input &&
    'label' in input &&
    'cityName' in input &&
    'country' in input &&
    'lat' in input &&
    'lon' in input &&
    'primaryIata' in input
  );
}

function normalizeLocationInput(input: unknown): LocationInputState {
  if (input && typeof input === 'object' && 'displayText' in input) {
    const candidate = input as { displayText?: string; resolved?: unknown };
    return {
      displayText: candidate.displayText || '',
      resolved: isResolvedLocation(candidate.resolved) ? candidate.resolved : null,
    };
  }

  if (input && typeof input === 'object' && 'label' in input && 'iata' in input) {
    const legacy = input as { label?: string; iata?: string; country?: string };
    const code = legacy.iata || '';
    return {
      displayText: legacy.label || code,
      resolved: code
        ? {
            type: 'airport',
            label: legacy.label || code,
            cityName: legacy.label || code,
            country: legacy.country || '',
            lat: 0,
            lon: 0,
            primaryIata: code,
            alternateIata: [],
            source: 'dataset',
          }
        : null,
    };
  }

  if (typeof input === 'string') {
    return {
      displayText: input,
      resolved: null,
    };
  }

  return {
    displayText: '',
    resolved: null,
  };
}

export function encodeFormToUrl(form: TripFormState): string {
  const url = new URL(window.location.href);
  url.searchParams.set('trip', btoa(JSON.stringify(form)));
  return url.toString();
}

export function decodeFormFromUrl(): TripFormState | null {
  const url = new URL(window.location.href);
  const encoded = url.searchParams.get('trip');
  if (!encoded) return null;

  try {
    const parsed = JSON.parse(atob(encoded)) as TripFormState & {
      originCode?: string;
      destinationCode?: string;
      origin?: unknown;
      destination?: unknown;
    };

    const origin = normalizeLocationInput(parsed.origin);
    const destination = normalizeLocationInput(parsed.destination);

    if (!origin.resolved && parsed.originCode) {
      origin.resolved = {
        type: 'airport',
        label: parsed.originCode,
        cityName: parsed.originCode,
        country: '',
        lat: 0,
        lon: 0,
        primaryIata: parsed.originCode,
        alternateIata: [],
        source: 'dataset',
      };
      origin.displayText = origin.displayText || parsed.originCode;
    }

    if (!destination.resolved && parsed.destinationCode) {
      destination.resolved = {
        type: 'airport',
        label: parsed.destinationCode,
        cityName: parsed.destinationCode,
        country: '',
        lat: 0,
        lon: 0,
        primaryIata: parsed.destinationCode,
        alternateIata: [],
        source: 'dataset',
      };
      destination.displayText = destination.displayText || parsed.destinationCode;
    }

    return {
      ...DEFAULT_FORM_STATE,
      ...parsed,
      origin,
      destination,
      overrides: {
        ...DEFAULT_FORM_STATE.overrides,
        ...parsed.overrides,
      },
    };
  } catch {
    return null;
  }
}

export async function copyShareLink(form: TripFormState): Promise<string> {
  const link = encodeFormToUrl(form);
  await navigator.clipboard.writeText(link);
  return link;
}

export async function copyPriceWatchConfig(form: TripFormState): Promise<string> {
  const payload = {
    app: 'Wx Travel Budget Calculator',
    createdAt: new Date().toISOString(),
    watch: {
      origin: form.origin,
      destination: form.destination,
      tripType: form.tripType,
      durationMode: form.durationMode,
      departDate: form.departDate,
      returnDate: form.returnDate,
      lengthDays: form.lengthDays,
      travelers: {
        adults: form.adults,
        kids: form.kids,
      },
      features: {
        airportTransport: form.includeAirportTransport,
        insurance: form.includeInsurance,
        activities: form.includeActivities,
        localTransport: form.includeLocalTransport,
      },
    },
  };

  const text = JSON.stringify(payload, null, 2);
  await navigator.clipboard.writeText(text);
  return text;
}
