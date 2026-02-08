import type { AdvancedOverrides, TripFormState } from '../types';

export const DEFAULT_OVERRIDES: AdvancedOverrides = {
  hotelNightly: 210,
  mealAdultPerDay: 62,
  mealKidPerDay: 42,
  activitiesAdultPerDay: 55,
  activitiesKidPerDay: 35,
  insurancePercent: 5,
  baggageFeePerTraveler: 60,
  airportFoodPerTravelerTravelDay: 24,
  miscFeesFlat: 55,
  homeAirportTotalOverride: null,
  flightsTotalOverride: null,
  baggageTotalOverride: null,
  lodgingTotalOverride: null,
  localTransportTotalOverride: null,
  foodTotalOverride: null,
  activitiesTotalOverride: null,
  miscFeesTotalOverride: null,
  insuranceTotalOverride: null,
  roadTripDistanceMiles: null,
  roadTripMpg: 26,
  roadTripGasPricePerGallon: 3.8,
  roadTripTollsAndParking: 45,
  roadTripWearPerMile: 0.12,
};

const today = new Date();
const depart = new Date(today);
depart.setDate(today.getDate() + 14);
const ret = new Date(depart);
ret.setDate(depart.getDate() + 7);

export const DEFAULT_FORM_STATE: TripFormState = {
  origin: {
    displayText: 'Virginia Beach, VA',
    resolved: {
      type: 'city',
      label: 'Virginia Beach, VA',
      cityName: 'Virginia Beach',
      country: 'United States',
      lat: 36.8529,
      lon: -75.978,
      primaryIata: 'ORF',
      alternateIata: ['PHF', 'RIC'],
      source: 'dataset',
    },
  },
  destination: {
    displayText: 'Rio de Janeiro',
    resolved: {
      type: 'city',
      label: 'Rio de Janeiro (All airports)',
      cityName: 'Rio de Janeiro',
      country: 'Brazil',
      lat: -22.9068,
      lon: -43.1729,
      primaryIata: 'GIG',
      alternateIata: ['SDU'],
      source: 'dataset',
    },
  },
  tripType: 'flight',
  durationMode: 'exact',
  departDate: depart.toISOString().slice(0, 10),
  returnDate: ret.toISOString().slice(0, 10),
  lengthDays: 7,
  lengthNights: 6,
  adults: 2,
  kids: 0,
  mealsPreference: 45,
  includeCosts: {
    airportAccess: false,
    baggageFees: false,
    lodging: true,
    rideshareTaxi: true,
    rentalCar: false,
    meals: true,
    activities: false,
    travelInsurance: false,
  },
  bufferPercent: 12,
  overrides: DEFAULT_OVERRIDES,
};

export const CACHE_TTL_MS = 1000 * 60 * 30;
