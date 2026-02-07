import type {
  CalculationResult,
  FlightEstimate,
  FlightQuery,
  LodgingEstimate,
  LodgingQuery,
  PriceSource,
  TripFormState,
} from '../types';
import { addDays, daysBetween, getNextMonthDate } from '../utils/date';
import { makeCacheKey } from '../utils/cache';

const AMADEUS_BASE = 'https://test.api.amadeus.com';

const DESTINATION_TIER: Record<string, 'budget' | 'mid' | 'premium'> = {
  BKK: 'budget',
  MEX: 'budget',
  CUN: 'mid',
  LIS: 'mid',
  BCN: 'mid',
  ROM: 'mid',
  LON: 'premium',
  NYC: 'premium',
  PAR: 'premium',
  SFO: 'premium',
  SYD: 'premium',
};

const FLIGHT_BASE_BY_TIER = {
  budget: 380,
  mid: 610,
  premium: 920,
};

const HOTEL_NIGHTLY_BY_TIER = {
  budget: 110,
  mid: 185,
  premium: 285,
};

type AmadeusTokenResponse = {
  access_token: string;
};

function nowIso(): string {
  return new Date().toISOString();
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

function safeTier(code: string): 'budget' | 'mid' | 'premium' {
  return DESTINATION_TIER[code] ?? 'mid';
}

function buildGoogleFlightsUrl(form: TripFormState, departDate: string, returnDate: string): string {
  const originCode = form.origin.resolved?.primaryIata || '';
  const destinationCode = form.destination.resolved?.primaryIata || '';
  const route = `${originCode}.${destinationCode}.${departDate}*${destinationCode}.${originCode}.${returnDate}`;
  return `https://www.google.com/travel/flights?hl=en#flt=${encodeURIComponent(route)}`;
}

function buildHotelsUrl(form: TripFormState, checkIn: string, checkOut: string): string {
  const destinationText = form.destination.resolved?.cityName || form.destination.displayText;
  const query = new URLSearchParams({
    ss: destinationText,
    checkin: checkIn,
    checkout: checkOut,
    group_adults: String(form.adults),
    group_children: String(form.kids),
    no_rooms: '1',
  });
  return `https://www.booking.com/searchresults.html?${query.toString()}`;
}

function buildCarRentalsUrl(form: TripFormState, checkIn: string, checkOut: string): string {
  const destinationText = form.destination.resolved?.cityName || form.destination.displayText;
  const params = new URLSearchParams({
    q: `${destinationText} car rentals ${checkIn} ${checkOut}`,
  });
  return `https://www.google.com/search?${params.toString()}`;
}

async function getAmadeusToken(): Promise<string> {
  const clientId = import.meta.env.VITE_AMADEUS_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_AMADEUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing Amadeus credentials');
  }

  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error('Could not fetch Amadeus access token');
  }
  const data = (await res.json()) as AmadeusTokenResponse;
  return data.access_token;
}

async function fetchProxyFlight(query: FlightQuery): Promise<FlightEstimate | null> {
  const proxyBase = import.meta.env.VITE_TRAVEL_PROXY_BASE_URL;
  if (!proxyBase) return null;

  const res = await fetch(`${proxyBase.replace(/\/$/, '')}/flights/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });

  if (!res.ok) return null;

  const data = await res.json();
  return {
    totalAdultFare: Number(data.totalAdultFare ?? data.totalFare ?? 0),
    totalKidFare: Number(data.totalKidFare ?? 0),
    totalFare: Number(data.totalFare ?? 0),
    source: {
      name: data.provider || 'Travel Proxy (Amadeus/Duffel)',
      type: 'api',
      detail: data.detail || 'Live route pricing from configured travel proxy',
      updatedAt: data.updatedAt || nowIso(),
    },
  };
}

async function fetchProxyLodging(query: LodgingQuery): Promise<LodgingEstimate | null> {
  const proxyBase = import.meta.env.VITE_TRAVEL_PROXY_BASE_URL;
  if (!proxyBase) return null;

  const res = await fetch(`${proxyBase.replace(/\/$/, '')}/lodging/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });

  if (!res.ok) return null;

  const data = await res.json();
  return {
    nightlyRate: Number(data.nightlyRate ?? 0),
    totalStayCost: Number(data.totalStayCost ?? 0),
    source: {
      name: data.provider || 'Travel Proxy (Amadeus/Expedia Rapid)',
      type: 'api',
      detail: data.detail || 'Live hotel pricing from configured travel proxy',
      updatedAt: data.updatedAt || nowIso(),
    },
  };
}

async function fetchAmadeusFlight(query: FlightQuery): Promise<FlightEstimate | null> {
  try {
    const token = await getAmadeusToken();

    const datePairs: Array<{ depart: string; ret: string }> = query.lengthMode
      ? [0, 1, 2].map((offset) => {
          const depart = getNextMonthDate(offset + 1, 10);
          const ret = addDays(depart, query.lengthDays);
          return { depart, ret };
        })
      : [{ depart: query.departDate, ret: query.returnDate }];

    const totals: number[] = [];

    for (const pair of datePairs) {
      const params = new URLSearchParams({
        originLocationCode: query.originCode,
        destinationLocationCode: query.destinationCode,
        departureDate: pair.depart,
        returnDate: pair.ret,
        adults: String(Math.max(1, query.adults)),
        nonStop: 'false',
        max: '6',
      });

      if (query.kids > 0) {
        params.set('children', String(query.kids));
      }

      const res = await fetch(`${AMADEUS_BASE}/v2/shopping/flight-offers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) continue;

      const data = (await res.json()) as { data?: Array<{ price?: { grandTotal?: string } }> };
      const offers = data.data ?? [];
      const prices = offers
        .map((offer) => Number(offer.price?.grandTotal || 0))
        .filter((v) => Number.isFinite(v) && v > 0)
        .sort((a, b) => a - b);

      if (prices.length) {
        const sample = prices[Math.min(2, prices.length - 1)];
        totals.push(sample);
      }
    }

    if (!totals.length) return null;

    const median = totals.slice().sort((a, b) => a - b)[Math.floor(totals.length / 2)];
    const kidShare = query.kids > 0 ? 0.78 : 0;
    const adultShare = 1;
    const shareDenominator = query.adults * adultShare + query.kids * kidShare;
    const perUnit = median / Math.max(1, shareDenominator);

    const totalAdultFare = perUnit * query.adults * adultShare;
    const totalKidFare = perUnit * query.kids * kidShare;

    return {
      totalAdultFare,
      totalKidFare,
      totalFare: totalAdultFare + totalKidFare,
      source: {
        name: 'Amadeus Flight Offers API',
        type: 'api',
        detail: query.lengthMode
          ? 'Median sampled across next 3 months for selected trip length'
          : 'Live offer sample for selected exact dates',
        updatedAt: nowIso(),
      },
    };
  } catch {
    return null;
  }
}

async function fetchAmadeusLodging(query: LodgingQuery): Promise<LodgingEstimate | null> {
  try {
    const token = await getAmadeusToken();
    const params = new URLSearchParams({
      cityCode: query.destinationCode,
      checkInDate: query.checkIn,
      checkOutDate: query.checkOut,
      adults: String(Math.max(1, query.adults)),
      roomQuantity: String(Math.max(1, Math.ceil((query.adults + query.kids) / 2))),
      bestRateOnly: 'true',
    });

    const res = await fetch(`${AMADEUS_BASE}/v3/shopping/hotel-offers?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      data?: Array<{ offers?: Array<{ price?: { total?: string } }> }>;
    };

    const totals = (data.data ?? [])
      .flatMap((hotel) => hotel.offers ?? [])
      .map((offer) => Number(offer.price?.total || 0))
      .filter((v) => Number.isFinite(v) && v > 0)
      .sort((a, b) => a - b);

    if (!totals.length) return null;

    const sampled = totals[Math.min(4, totals.length - 1)];
    const nightlyRate = sampled / Math.max(1, query.nights);

    return {
      nightlyRate,
      totalStayCost: sampled,
      source: {
        name: 'Amadeus Hotel Offers API',
        type: 'api',
        detail: 'Live hotel offer sample for destination and stay dates',
        updatedAt: nowIso(),
      },
    };
  } catch {
    return null;
  }
}

function heuristicFlight(query: FlightQuery): FlightEstimate {
  const tier = safeTier(query.destinationCode);
  const tripFactor = query.lengthDays >= 10 ? 1.08 : query.lengthDays <= 4 ? 0.92 : 1;
  const seasonalFactor = 1 + ((new Date().getMonth() % 6) - 2) * 0.03;
  const base = FLIGHT_BASE_BY_TIER[tier] * tripFactor * seasonalFactor;
  const totalAdultFare = base * query.adults;
  const totalKidFare = base * 0.74 * query.kids;
  const totalFare = totalAdultFare + totalKidFare;

  return {
    totalAdultFare,
    totalKidFare,
    totalFare,
    source: {
      name: 'Smart Estimate Model',
      type: 'heuristic',
      detail: 'Route tier baseline + seasonality + traveler mix',
      updatedAt: nowIso(),
    },
  };
}

function heuristicLodging(query: LodgingQuery): LodgingEstimate {
  const tier = safeTier(query.destinationCode);
  const occupancyFactor = Math.max(1, (query.adults + query.kids * 0.7) / 2);
  const nightlyRate = HOTEL_NIGHTLY_BY_TIER[tier] * occupancyFactor;
  return {
    nightlyRate,
    totalStayCost: nightlyRate * query.nights,
    source: {
      name: 'Smart Estimate Model',
      type: 'heuristic',
      detail: 'Destination tier + occupancy factor + stay length',
      updatedAt: nowIso(),
    },
  };
}

export async function getFlightEstimate(query: FlightQuery): Promise<FlightEstimate> {
  const proxy = await fetchProxyFlight(query);
  if (proxy && proxy.totalFare > 0) return proxy;

  const amadeus = await fetchAmadeusFlight(query);
  if (amadeus && amadeus.totalFare > 0) return amadeus;

  return heuristicFlight(query);
}

export async function getLodgingEstimate(query: LodgingQuery): Promise<LodgingEstimate> {
  const proxy = await fetchProxyLodging(query);
  if (proxy && proxy.totalStayCost > 0) return proxy;

  const amadeus = await fetchAmadeusLodging(query);
  if (amadeus && amadeus.totalStayCost > 0) return amadeus;

  return heuristicLodging(query);
}

function buildAssumptions(form: TripFormState, flightSource: PriceSource, lodgingSource: PriceSource): string[] {
  const manualOverrides = [
    ['Home-airport', form.overrides.homeAirportTotalOverride],
    ['Long-distance transport', form.overrides.flightsTotalOverride],
    ['Baggage', form.overrides.baggageTotalOverride],
    ['Lodging', form.overrides.lodgingTotalOverride],
    ['Local transport', form.overrides.localTransportTotalOverride],
    ['Food', form.overrides.foodTotalOverride],
    ['Activities', form.overrides.activitiesTotalOverride],
    ['Misc fees', form.overrides.miscFeesTotalOverride],
    ['Insurance', form.overrides.insuranceTotalOverride],
  ]
    .filter(([, value]) => value !== null)
    .map(([name, value]) => `${name}: ${value}`);

  return [
    `Trip type: ${form.tripType === 'road_trip' ? 'Road trip' : 'Flight'}.`,
    `Adults: ${form.adults}, kids: ${form.kids} (kids meal/activity discounts applied).`,
    `Resolved route: ${form.origin.resolved?.primaryIata ?? '-'} -> ${form.destination.resolved?.primaryIata ?? '-'}.`,
    `Flight source: ${flightSource.name} (${flightSource.type}).`,
    `Lodging source: ${lodgingSource.name} (${lodgingSource.type}).`,
    manualOverrides.length ? `Manual cost overrides active for ${manualOverrides.join(', ')}.` : 'No manual category overrides applied.',
    form.tripType === 'road_trip'
      ? `Road trip model uses distance (${form.overrides.roadTripDistanceMiles ?? 'auto'} miles), MPG ${form.overrides.roadTripMpg}, gas ${form.overrides.roadTripGasPricePerGallon}/gal, tolls/parking ${form.overrides.roadTripTollsAndParking}.`
      : 'Flight model uses live API fares when available, then smart estimate fallback.',
    `Length mode uses sampled median pricing over upcoming months when live API is available.`,
    `Nights set to ${form.lengthNights} in length mode or derived from exact dates.`,
  ];
}

export async function calculateTripBudget(form: TripFormState): Promise<CalculationResult> {
  const originCode = form.origin.resolved?.primaryIata;
  const destinationCode = form.destination.resolved?.primaryIata;
  if (!originCode || !destinationCode) {
    throw new Error('Missing resolved airport codes');
  }

  const days = form.durationMode === 'exact' ? daysBetween(form.departDate, form.returnDate) : form.lengthDays;
  const nights = form.durationMode === 'exact' ? Math.max(1, days) : Math.max(1, form.lengthNights);

  const dep = form.durationMode === 'exact' ? form.departDate : getNextMonthDate(1, 10);
  const ret = form.durationMode === 'exact' ? form.returnDate : addDays(dep, days);

  const lodgingPromise = getLodgingEstimate({
    destinationCode,
    checkIn: dep,
    checkOut: ret,
    adults: form.adults,
    kids: form.kids,
    nights,
  });

  const flightPromise =
    form.tripType === 'flight'
      ? getFlightEstimate({
          originCode,
          destinationCode,
          departDate: dep,
          returnDate: ret,
          adults: form.adults,
          kids: form.kids,
          lengthMode: form.durationMode === 'length',
          lengthDays: days,
        })
      : Promise.resolve<FlightEstimate>({
          totalAdultFare: 0,
          totalKidFare: 0,
          totalFare: 0,
          source: {
            name: 'Road Trip Cost Model',
            type: 'heuristic',
            detail: 'Fuel + wear + tolls/parking estimate from overrides and route distance',
            updatedAt: nowIso(),
          },
        });

  const [flight, lodging] = await Promise.all([flightPromise, lodgingPromise]);

  const manual = form.overrides;
  const travelers = form.adults + form.kids;
  const hasGeo =
    Boolean(form.origin.resolved?.lat) &&
    Boolean(form.origin.resolved?.lon) &&
    Boolean(form.destination.resolved?.lat) &&
    Boolean(form.destination.resolved?.lon);
  const roadDistanceAuto = hasGeo
    ? haversineMiles(
        form.origin.resolved?.lat ?? 0,
        form.origin.resolved?.lon ?? 0,
        form.destination.resolved?.lat ?? 0,
        form.destination.resolved?.lon ?? 0,
      ) *
      2 *
      1.22
    : 600;
  const roadDistanceMiles = manual.roadTripDistanceMiles ?? roadDistanceAuto;
  const fuelCost = (roadDistanceMiles / Math.max(1, manual.roadTripMpg)) * Math.max(0, manual.roadTripGasPricePerGallon);
  const wearCost = roadDistanceMiles * Math.max(0, manual.roadTripWearPerMile);
  const roadTripTransportAuto = fuelCost + wearCost + Math.max(0, manual.roadTripTollsAndParking);

  const airportTransportAuto =
    form.tripType === 'road_trip' ? 0 : form.includeAirportTransport ? 130 + travelers * 18 : 0;
  const baggageFeesAuto = form.tripType === 'road_trip' ? 0 : form.overrides.baggageFeePerTraveler * travelers;
  const localTransportAuto = form.includeLocalTransport ? nights * 45 + travelers * 20 : 0;
  const foodDaily = form.adults * form.overrides.mealAdultPerDay + form.kids * form.overrides.mealKidPerDay;
  const airportFood =
    form.tripType === 'road_trip' ? 0 : travelers * form.overrides.airportFoodPerTravelerTravelDay * 2;
  const food = foodDaily * days + airportFood;
  const activitiesAuto = form.includeActivities
    ? days *
      (form.adults * form.overrides.activitiesAdultPerDay +
        form.kids * form.overrides.activitiesKidPerDay)
    : 0;
  const miscFeesAuto = form.overrides.miscFeesFlat + nights * 12;
  const lodgingAuto = lodging.totalStayCost;

  const airportTransport = manual.homeAirportTotalOverride ?? airportTransportAuto;
  const flightsTotal =
    form.tripType === 'flight'
      ? (manual.flightsTotalOverride ?? flight.totalFare)
      : 0;
  const roadTripTransportTotal =
    form.tripType === 'road_trip'
      ? (manual.flightsTotalOverride ?? roadTripTransportAuto)
      : 0;
  const baggageFees = manual.baggageTotalOverride ?? baggageFeesAuto;
  const lodgingTotal = manual.lodgingTotalOverride ?? lodgingAuto;
  const localTransport = manual.localTransportTotalOverride ?? localTransportAuto;
  const foodTotal = manual.foodTotalOverride ?? food;
  const activities = manual.activitiesTotalOverride ?? activitiesAuto;
  const miscFees = manual.miscFeesTotalOverride ?? miscFeesAuto;

  const subtotalNoInsurance =
    airportTransport +
    flightsTotal +
    roadTripTransportTotal +
    baggageFees +
    lodgingTotal +
    localTransport +
    foodTotal +
    activities +
    miscFees;

  const insuranceAuto = form.includeInsurance ? subtotalNoInsurance * (form.overrides.insurancePercent / 100) : 0;
  const insurance = manual.insuranceTotalOverride ?? insuranceAuto;
  const subtotal = subtotalNoInsurance + insurance;
  const buffer = subtotal * (form.bufferPercent / 100);
  const total = subtotal + buffer;

  const perTraveler = total / Math.max(1, travelers);
  const perDay = total / Math.max(1, days);

  return {
    key: makeCacheKey(form),
    form,
    days,
    nights,
    travelers,
    perTraveler,
    perDay,
    breakdown: {
      homeAirport: airportTransport,
      flights: flightsTotal,
      roadTripTransport: roadTripTransportTotal,
      baggageFees,
      lodging: lodgingTotal,
      localTransportation: localTransport,
      food: foodTotal,
      activities,
      miscFees,
      insurance,
      subtotal,
      buffer,
      total,
    },
    assumptions: buildAssumptions(form, flight.source, lodging.source),
    flightSource: flight.source,
    lodgingSource: lodging.source,
    googleFlightsUrl: buildGoogleFlightsUrl(form, dep, ret),
    hotelsUrl: buildHotelsUrl(form, dep, ret),
    carRentalsUrl: buildCarRentalsUrl(form, dep, ret),
    generatedAt: nowIso(),
  };
}
