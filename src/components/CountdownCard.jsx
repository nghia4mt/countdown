import { Odometer } from './Odometer.jsx';
import './CountdownCard.css';

/**
 * One segment of the countdown slab: the digits are the character, the unit
 * dot + label sit on the bottom row. The group label is the only readable
 * copy — the rollers and the visual label are decorative.
 *
 * @param {{ unit: string, label: string, value: number, isExpired?: boolean }} props
 */
export function CountdownCard({ unit, label, value, isExpired = false }) {
  const ariaLabel = isExpired
    ? `${value} ${label.toLowerCase()}, đã đến ngày`
    : `${value} ${label.toLowerCase()}`;

  return (
    <div
      className={`cc${isExpired ? ' cc--expired' : ''}`}
      data-unit={unit}
      data-state={isExpired ? 'expired' : 'running'}
      role="group"
      aria-label={ariaLabel}
    >
      <span className="cc__digits" aria-hidden="true">
        <Odometer value={value} digits={2} />
      </span>

      <span className="cc__label" aria-hidden="true">
        {label}
      </span>
    </div>
  );
}
