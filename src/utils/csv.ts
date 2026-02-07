import type { CalculationResult } from '../types';

export function exportResultCsv(result: CalculationResult) {
  const originCode = result.form.origin.resolved?.primaryIata ?? 'N/A';
  const destinationCode = result.form.destination.resolved?.primaryIata ?? 'N/A';

  const rows = [
    ['Metric', 'Value'],
    ['Origin', `${result.form.origin.displayText} (${originCode})`],
    ['Destination', `${result.form.destination.displayText} (${destinationCode})`],
    ['Days', String(result.days)],
    ['Nights', String(result.nights)],
    ['Travelers', String(result.travelers)],
    ['Total Cost', result.breakdown.total.toFixed(2)],
    ['Cost Per Traveler', result.perTraveler.toFixed(2)],
    ['Cost Per Day', result.perDay.toFixed(2)],
    ['Home-Airport', result.breakdown.homeAirport.toFixed(2)],
    ['Flights', result.breakdown.flights.toFixed(2)],
    ['Road Trip Transport', result.breakdown.roadTripTransport.toFixed(2)],
    ['Baggage', result.breakdown.baggageFees.toFixed(2)],
    ['Lodging', result.breakdown.lodging.toFixed(2)],
    ['Local Transportation', result.breakdown.localTransportation.toFixed(2)],
    ['Food', result.breakdown.food.toFixed(2)],
    ['Activities', result.breakdown.activities.toFixed(2)],
    ['Misc Fees', result.breakdown.miscFees.toFixed(2)],
    ['Insurance', result.breakdown.insurance.toFixed(2)],
    ['Buffer', result.breakdown.buffer.toFixed(2)],
    ['Google Flights Link', result.googleFlightsUrl],
    ['Hotels Link', result.hotelsUrl],
  ];

  const csv = rows
    .map((row) =>
      row
        .map((v) => {
          const safe = String(v).replace(/"/g, '""');
          return `"${safe}"`;
        })
        .join(','),
    )
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wx-travel-budget.csv';
  a.click();
  URL.revokeObjectURL(url);
}
