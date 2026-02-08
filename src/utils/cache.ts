import { CACHE_TTL_MS } from './constants';
import type { CalculationResult, TripFormState } from '../types';

const memoryCache = new Map<string, { ts: number; result: CalculationResult }>();
const STORAGE_KEY = 'wx_trip_budget_cache_v2';

export function makeCacheKey(form: TripFormState): string {
  return JSON.stringify({
    o: form.origin.resolved?.primaryIata ?? form.origin.displayText,
    d: form.destination.resolved?.primaryIata ?? form.destination.displayText,
    tt: form.tripType,
    m: form.durationMode,
    dd: form.departDate,
    rd: form.returnDate,
    ld: form.lengthDays,
    ln: form.lengthNights,
    a: form.adults,
    k: form.kids,
    ic: form.includeCosts,
    b: form.bufferPercent,
    ov: form.overrides,
  });
}

function loadStorage(): Record<string, { ts: number; result: CalculationResult }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStorage(store: Record<string, { ts: number; result: CalculationResult }>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // no-op
  }
}

export function getCachedResult(key: string): CalculationResult | null {
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.ts < CACHE_TTL_MS) {
    return mem.result;
  }

  const storage = loadStorage();
  const item = storage[key];
  if (item && Date.now() - item.ts < CACHE_TTL_MS) {
    memoryCache.set(key, item);
    return item.result;
  }
  return null;
}

export function setCachedResult(key: string, result: CalculationResult) {
  const item = { ts: Date.now(), result };
  memoryCache.set(key, item);
  const storage = loadStorage();
  storage[key] = item;
  saveStorage(storage);
}
