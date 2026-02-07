export type DurationMode = 'exact' | 'length';
export type TripType = 'flight' | 'road_trip';

export type ResolvedLocation = {
  type: 'airport' | 'city';
  label: string;
  cityName: string;
  country: string;
  lat: number;
  lon: number;
  primaryIata: string;
  alternateIata: string[];
  source: 'dataset' | 'geocode';
};

export type LocationInputState = {
  displayText: string;
  resolved: ResolvedLocation | null;
};

export type TripFormState = {
  origin: LocationInputState;
  destination: LocationInputState;
  tripType: TripType;
  durationMode: DurationMode;
  departDate: string;
  returnDate: string;
  lengthDays: number;
  lengthNights: number;
  adults: number;
  kids: number;
  includeAirportTransport: boolean;
  includeInsurance: boolean;
  includeActivities: boolean;
  includeLocalTransport: boolean;
  bufferPercent: number;
  overrides: AdvancedOverrides;
};

export type AdvancedOverrides = {
  hotelNightly: number;
  mealAdultPerDay: number;
  mealKidPerDay: number;
  activitiesAdultPerDay: number;
  activitiesKidPerDay: number;
  insurancePercent: number;
  baggageFeePerTraveler: number;
  airportFoodPerTravelerTravelDay: number;
  miscFeesFlat: number;
  homeAirportTotalOverride: number | null;
  flightsTotalOverride: number | null;
  baggageTotalOverride: number | null;
  lodgingTotalOverride: number | null;
  localTransportTotalOverride: number | null;
  foodTotalOverride: number | null;
  activitiesTotalOverride: number | null;
  miscFeesTotalOverride: number | null;
  insuranceTotalOverride: number | null;
  roadTripDistanceMiles: number | null;
  roadTripMpg: number;
  roadTripGasPricePerGallon: number;
  roadTripTollsAndParking: number;
  roadTripWearPerMile: number;
};

export type PriceSource = {
  name: string;
  type: 'api' | 'heuristic';
  detail: string;
  updatedAt: string;
};

export type CostBreakdown = {
  homeAirport: number;
  flights: number;
  roadTripTransport: number;
  baggageFees: number;
  lodging: number;
  localTransportation: number;
  food: number;
  activities: number;
  miscFees: number;
  insurance: number;
  subtotal: number;
  buffer: number;
  total: number;
};

export type CalculationResult = {
  key: string;
  form: TripFormState;
  days: number;
  nights: number;
  travelers: number;
  perTraveler: number;
  perDay: number;
  breakdown: CostBreakdown;
  assumptions: string[];
  flightSource: PriceSource;
  lodgingSource: PriceSource;
  googleFlightsUrl: string;
  hotelsUrl: string;
  carRentalsUrl: string;
  generatedAt: string;
};

export type FlightEstimate = {
  totalAdultFare: number;
  totalKidFare: number;
  totalFare: number;
  source: PriceSource;
};

export type LodgingEstimate = {
  nightlyRate: number;
  totalStayCost: number;
  source: PriceSource;
};

export type FlightQuery = {
  originCode: string;
  destinationCode: string;
  departDate: string;
  returnDate: string;
  adults: number;
  kids: number;
  lengthMode: boolean;
  lengthDays: number;
};

export type LodgingQuery = {
  destinationCode: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  kids: number;
  nights: number;
};
