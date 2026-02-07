import { formatMoney } from '../utils/format';

type Props = {
  estimatedTotal: number | null;
};

export default function TotalCostDisplay({ estimatedTotal }: Props) {
  const hasEstimate = typeof estimatedTotal === 'number' && Number.isFinite(estimatedTotal);

  return (
    <div className={`trip-cost-card ${hasEstimate ? '' : 'is-placeholder'}`} aria-live="polite">
      <div className="trip-cost-line">
        <span>Estimated total</span>
        <strong>{hasEstimate ? formatMoney(estimatedTotal) : '—'}</strong>
      </div>
    </div>
  );
}
