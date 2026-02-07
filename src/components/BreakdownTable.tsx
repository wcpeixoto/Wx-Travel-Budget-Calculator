import type { CalculationResult } from '../types';
import { formatMoney } from '../utils/format';

type Props = {
  result: CalculationResult;
};

const ROWS: Array<{ key: keyof CalculationResult['breakdown']; label: string }> = [
  { key: 'homeAirport', label: 'Home ↔ airport' },
  { key: 'flights', label: 'Flights' },
  { key: 'roadTripTransport', label: 'Road trip transport' },
  { key: 'baggageFees', label: 'Baggage fees' },
  { key: 'lodging', label: 'Lodging' },
  { key: 'localTransportation', label: 'Local transportation' },
  { key: 'food', label: 'Food + airport food' },
  { key: 'activities', label: 'Activities' },
  { key: 'miscFees', label: 'Misc fees / charges' },
  { key: 'insurance', label: 'Travel insurance' },
  { key: 'subtotal', label: 'Subtotal' },
  { key: 'buffer', label: 'Buffer' },
  { key: 'total', label: 'Total' },
];

export default function BreakdownTable({ result }: Props) {
  const safeDays = Math.max(1, result.days);

  return (
    <section className="card" id="cost-breakdown">
      <div className="section-head">
        <h2>Breakdown</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Cost/day</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const rawTotal = result.breakdown[row.key];
              const total = Number.isFinite(rawTotal) ? rawTotal : 0;
              const perDay = total / safeDays;
              return (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td>{formatMoney(perDay)}</td>
                  <td>{formatMoney(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
