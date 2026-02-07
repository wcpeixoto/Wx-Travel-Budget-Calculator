import airportsJson from '../data/airports.json';
import type { LocationInputState, ResolvedLocation } from '../types';

type AirportRecord = {
  iata: string;
  name: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  airportType: 'medium_airport' | 'large_airport';
  importance: number;
  international: boolean;
};

type CityGroup = {
  key: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
  airports: AirportRecord[];
};

export type AutocompleteSuggestion = {
  id: string;
  group: 'city' | 'airport';
  primaryLabel: string;
  secondaryLabel: string;
  resolved: ResolvedLocation;
  rank: number;
  weight: number;
};

type GeocodeResult = {
  id?: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  feature_code?: string;
};

const AIRPORTS = (airportsJson as AirportRecord[])
  .filter((item) => item.iata && (item.airportType === 'large_airport' || item.airportType === 'medium_airport'));

const AIRPORT_BY_CODE = new Map(AIRPORTS.map((airport) => [airport.iata.toUpperCase(), airport]));
const CITY_GROUPS = buildCityGroups(AIRPORTS);

const US_STATE_NAMES: Record<string, string> = {
  NY: 'New York',
  NJ: 'New Jersey',
  VA: 'Virginia',
  DC: 'District of Columbia',
  MD: 'Maryland',
  GA: 'Georgia',
  IL: 'Illinois',
  CA: 'California',
  WA: 'Washington',
  MA: 'Massachusetts',
  FL: 'Florida',
  CO: 'Colorado',
  TX: 'Texas',
  NV: 'Nevada',
  HI: 'Hawaii',
  NM: 'New Mexico',
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeLookupText(value: string): string {
  return normalize(value)
    .replace(/\(all airports\)/g, '')
    .replace(/[(),]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stateLabel(stateCodeOrName: string, country: string): string {
  if (country !== 'United States') return stateCodeOrName;
  return US_STATE_NAMES[stateCodeOrName.toUpperCase()] ?? stateCodeOrName;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earth = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

function rankMatch(query: string, ...fields: string[]): number {
  if (!query) return 0;
  const nFields = fields.map(normalize);
  if (nFields.some((f) => f.startsWith(query))) return 0;
  if (nFields.some((f) => f.includes(query) || query.includes(f))) return 1;
  return 9;
}

function airportWeight(airport: AirportRecord): number {
  const intlBoost = airport.international ? 180 : 0;
  const sizeBoost = airport.airportType === 'large_airport' ? 250 : 120;
  return airport.importance + intlBoost + sizeBoost;
}

function cityWeight(city: CityGroup): number {
  return city.airports.reduce((sum, airport) => sum + airportWeight(airport), 0);
}

function buildCityGroups(airports: AirportRecord[]): CityGroup[] {
  const grouped = new Map<string, AirportRecord[]>();
  for (const airport of airports) {
    const key = `${normalize(airport.city)}|${normalize(airport.state)}|${normalize(airport.country)}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(airport);
  }

  return Array.from(grouped.entries()).map(([key, cityAirports]) => {
    const airportsSorted = [...cityAirports].sort((a, b) => airportWeight(b) - airportWeight(a));
    const lat = cityAirports.reduce((sum, airport) => sum + airport.lat, 0) / cityAirports.length;
    const lon = cityAirports.reduce((sum, airport) => sum + airport.lng, 0) / cityAirports.length;
    const [top] = airportsSorted;

    return {
      key,
      city: top.city,
      state: top.state,
      country: top.country,
      lat,
      lon,
      airports: airportsSorted,
    };
  });
}

function nearestCommercialAirports(lat: number, lon: number, limit = 3): AirportRecord[] {
  return AIRPORTS
    .map((airport) => ({ airport, distanceKm: haversineKm(lat, lon, airport.lat, airport.lng) }))
    .sort((a, b) => {
      const isLargeA = a.airport.airportType === 'large_airport' ? 0 : 1;
      const isLargeB = b.airport.airportType === 'large_airport' ? 0 : 1;
      if (isLargeA !== isLargeB) return isLargeA - isLargeB;
      return a.distanceKm - b.distanceKm;
    })
    .slice(0, limit)
    .map((item) => item.airport);
}

function buildResolvedAirport(airport: AirportRecord, source: 'dataset' | 'geocode' = 'dataset'): ResolvedLocation {
  return {
    type: 'airport',
    label: `${airport.name} (${airport.iata})`,
    cityName: airport.city,
    country: airport.country,
    lat: airport.lat,
    lon: airport.lng,
    primaryIata: airport.iata,
    alternateIata: [],
    source,
  };
}

function buildResolvedCity(
  label: string,
  cityName: string,
  country: string,
  lat: number,
  lon: number,
  preferredCodes: string[] = [],
  source: 'dataset' | 'geocode',
): ResolvedLocation | null {
  const candidateAirports = (preferredCodes.length
    ? preferredCodes
        .map((code) => AIRPORT_BY_CODE.get(code.toUpperCase()))
        .filter((airport): airport is AirportRecord => Boolean(airport))
    : nearestCommercialAirports(lat, lon, 3));

  if (!candidateAirports.length) return null;

  const [primary, ...alt] = candidateAirports;
  return {
    type: 'city',
    label,
    cityName,
    country,
    lat,
    lon,
    primaryIata: primary.iata,
    alternateIata: alt.map((item) => item.iata).slice(0, 2),
    source,
  };
}

export function getLocalSuggestions(queryText: string, maxSuggestions = 6): AutocompleteSuggestion[] {
  const query = normalizeLookupText(queryText);
  const airportSuggestions: AutocompleteSuggestion[] = AIRPORTS
    .map((airport) => {
      const rank = rankMatch(
        query,
        airport.name,
        airport.city,
        airport.iata,
        airport.state,
        stateLabel(airport.state, airport.country),
      );
      return {
        id: `airport-${airport.iata}`,
        group: 'airport' as const,
        primaryLabel: `${airport.name} (${airport.iata})`,
        secondaryLabel: `${airport.iata} · ${airport.country}`,
        resolved: buildResolvedAirport(airport),
        rank,
        weight: airportWeight(airport),
      };
    })
    .filter((item) => !query || item.rank < 9);

  const citySuggestions = CITY_GROUPS
    .map((city) => {
      const state = stateLabel(city.state, city.country);
      const cityLabel = city.country === 'United States' ? `${city.city}, ${city.state}` : city.city;
      const isMetro = city.airports.length >= 2;
      const primaryCode = city.airports[0]?.iata ?? '';
      const resolved = buildResolvedCity(
        isMetro ? `${cityLabel} (All airports)` : cityLabel,
        city.city,
        city.country,
        city.lat,
        city.lon,
        city.airports.map((airport) => airport.iata),
        'dataset',
      );
      if (!resolved) return null;

      return {
        id: `city-${city.key}`,
        group: 'city' as const,
        primaryLabel: isMetro ? `${cityLabel} (All airports)` : cityLabel,
        secondaryLabel: `${primaryCode} · ${city.country}`,
        resolved,
        rank: rankMatch(query, city.city, city.state, state, city.country),
        weight: cityWeight(city),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => !query || item.rank < 9)

  return [...citySuggestions, ...airportSuggestions]
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (a.group !== b.group) return a.group === 'city' ? -1 : 1;
      if (a.weight !== b.weight) return b.weight - a.weight;
      return a.primaryLabel.localeCompare(b.primaryLabel);
    })
    .slice(0, maxSuggestions);
}

function isCityLike(featureCode?: string): boolean {
  if (!featureCode) return true;
  return featureCode.startsWith('PPL') || featureCode.startsWith('ADM');
}

export async function getGeocodeSuggestions(queryText: string, maxSuggestions = 5): Promise<AutocompleteSuggestion[]> {
  const query = normalizeLookupText(queryText);
  if (query.length < 2) return [];

  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=${Math.min(8, maxSuggestions)}&language=en&format=json`,
    );
    if (!res.ok) return [];

    const json = (await res.json()) as { results?: GeocodeResult[] };
    const items = Array.isArray(json.results) ? json.results : [];

    return items
      .filter((item) => isCityLike(item.feature_code))
      .flatMap((item) => {
        const label = item.admin1 ? `${item.name}, ${item.admin1}` : item.name;
        const resolved = buildResolvedCity(label, item.name, item.country, item.latitude, item.longitude, [], 'geocode');
        if (!resolved) return [];

        return [{
          id: `geo-${item.id ?? `${item.name}-${item.latitude}-${item.longitude}`}`,
          group: 'city' as const,
          primaryLabel: label,
          secondaryLabel: `${resolved.primaryIata} · ${item.country}`,
          resolved,
          rank: rankMatch(query, item.name, item.admin1 ?? '', item.country),
          weight: 600,
        }];
      })
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return b.weight - a.weight;
      })
      .slice(0, maxSuggestions);
  } catch {
    return [];
  }
}

export function mergeSuggestions(local: AutocompleteSuggestion[], geocoded: AutocompleteSuggestion[], max = 6): AutocompleteSuggestion[] {
  const merged = [...geocoded, ...local]
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (a.group !== b.group) return a.group === 'city' ? -1 : 1;
      if (a.weight !== b.weight) return b.weight - a.weight;
      return a.primaryLabel.localeCompare(b.primaryLabel);
    });

  const deduped: AutocompleteSuggestion[] = [];
  const seen = new Set<string>();
  for (const item of merged) {
    const key = `${item.group}:${normalize(item.primaryLabel)}:${item.resolved.primaryIata}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
    if (deduped.length >= max) break;
  }

  return deduped;
}

export async function resolveLocationInput(input: LocationInputState): Promise<LocationInputState | null> {
  const displayText = input.displayText.trim();
  if (!displayText) return null;

  if (input.resolved?.primaryIata) {
    return input;
  }

  const query = normalizeLookupText(displayText);

  const exactCode = AIRPORT_BY_CODE.get(query.toUpperCase());
  if (exactCode) {
    return {
      displayText,
      resolved: buildResolvedAirport(exactCode),
    };
  }

  const localBest = getLocalSuggestions(query, 1)[0];
  if (localBest?.resolved?.primaryIata) {
    return {
      displayText,
      resolved: localBest.resolved,
    };
  }

  const geo = await getGeocodeSuggestions(query, 1);
  if (!geo.length) return null;

  return {
    displayText,
    resolved: geo[0].resolved,
  };
}

export function getAirportDisplayName(iataCode: string): string {
  const airport = AIRPORT_BY_CODE.get(iataCode.toUpperCase());
  return airport?.name ?? iataCode.toUpperCase();
}

export async function runResolverDevChecks(): Promise<void> {
  if (!import.meta.env.DEV) return;
  const [virginia, albuquerque] = await Promise.all([
    resolveLocationInput({ displayText: 'Virginia Beach', resolved: null }),
    resolveLocationInput({ displayText: 'Albuquerque', resolved: null }),
  ]);

  console.info('[resolver-check]', {
    virginiaBeachPrimary: virginia?.resolved?.primaryIata,
    albuquerquePrimary: albuquerque?.resolved?.primaryIata,
  });
}
