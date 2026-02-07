# Wx Travel Budget Calculator

A polished, mobile-first travel budgeting web app that estimates all-in trip costs with transparent assumptions, live pricing hooks, and fallback smart estimates.

## Features

- Hero-style planning form with:
- Origin city + destination city autocomplete
- Duration modes: exact dates or length (days + editable nights)
- Adult and kid sliders with traveler validation
- Optional cost toggles (airport transport, insurance, activities, local transport)
- Flyhyer-inspired results cards and premium UI style
- Outputs:
- Total estimated trip cost
- Cost per traveler
- Cost per day
- Itemized cost breakdown
- Buffer/contingency slider (0-25%)
- `Export CSV` and `Share link` (inputs encoded in URL)
- `Verify prices` links for Google Flights + Booking hotel search
- Advanced assumptions accordion for overriding pricing knobs
- Price source panel showing API vs heuristic and timestamps
- Fast UX:
- Debounced autocomplete
- Skeleton loaders
- In-memory + localStorage cache keyed by trip inputs
- Manual cached-price refresh action
- Privacy-friendly price-watch export (copy JSON config; no account/tracking)

## Stack

- React 18
- TypeScript
- Vite

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Start dev server:

```bash
npm run dev
```

4. Build production bundle:

```bash
npm run build
```

## APIs used

### Flights (live pricing)
- Primary integration path: **Amadeus Flight Offers API**
- Optional recommended production path: call via your own backend proxy (`VITE_TRAVEL_PROXY_BASE_URL`) to keep secrets off the client.

### Lodging (live pricing)
- Primary integration path: **Amadeus Hotel Offers API**
- Optional recommended production path: same backend proxy pattern.

### Fallback when live pricing fails
- Uses a transparent **Smart Estimate** model based on destination tier (budget/mid/premium), traveler mix, trip length, and seasonality hints.
- Source panel always labels values as `API` or `HEURISTIC`.

## Environment variables

- `VITE_AMADEUS_CLIENT_ID`: Amadeus self-service client ID.
- `VITE_AMADEUS_CLIENT_SECRET`: Amadeus self-service client secret.
- `VITE_TRAVEL_PROXY_BASE_URL`: optional proxy base URL for secure server-side API calls.

## Data model highlights

- Separate adult vs kid pricing treatment for flights/meals/activities.
- Exact dates mode derives nights from date difference.
- Length mode defaults nights to `days - 1` (editable).
- Includes often-missed categories:
- Home-airport transit + toll/tip style allowance
- Baggage fees
- Local transport
- Airport food on travel days
- Misc fees/service charges
- Insurance and contingency buffer

## ToS and compliance notes

- This app does **not** scrape Google Flights or Booking pages.
- Live pricing is sourced from API integrations (Amadeus or user-provided proxy integrations).
- Google Flights and Booking URLs are provided as user-facing verification links only.

## Suggested production hardening

- Move all third-party API calls to a server/API route.
- Add per-provider rate limiting and retry/backoff.
- Add observability for pricing failures and fallback rates.
