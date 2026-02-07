import type { CalculationResult } from '../types';

type Props = {
  result: CalculationResult;
};

export default function PriceSourcesPanel({ result }: Props) {
  return (
    <details className="card includes-accordion">
      <summary>What’s included</summary>
      <p className="includes-helper">How these numbers were built</p>

      <div className="sources-grid">
        <article>
          <h3>Flights</h3>
          <p>{result.flightSource.name}</p>
          <small>
            {result.flightSource.type.toUpperCase()} · {result.flightSource.detail}
          </small>
          <small>Last updated: {new Date(result.flightSource.updatedAt).toLocaleString()}</small>
        </article>
        <article>
          <h3>Lodging</h3>
          <p>{result.lodgingSource.name}</p>
          <small>
            {result.lodgingSource.type.toUpperCase()} · {result.lodgingSource.detail}
          </small>
          <small>Last updated: {new Date(result.lodgingSource.updatedAt).toLocaleString()}</small>
        </article>
      </div>

      <div className="assumptions">
        <h3>What’s included</h3>
        <ul>
          {result.assumptions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}
