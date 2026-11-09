import { Odometer } from './Odometer.jsx';
import './CountdownCard.css';

/**
 * One glass odometer card: gradient digits and a unit watermark.
 *
 * Deliberately static: the card is not interactive, so it carries no pointer
 * handlers and no hover styling. The only motion left is the one-shot
 * `cc-enter` entrance, staggered through `--cc-i`.
 *
 * @param {{ unit: string, label: string, value: number, accent: string,
 *   index?: number, isExpired?: boolean }} props
 */
export function CountdownCard({
  unit,
  label,
  value,
  accent,
  index = 0,
  isExpired = false,
}) {
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
      style={{ '--accent': accent, '--cc-i': String(index) }}
    >
      <span className="cc__aura" aria-hidden="true" />
      <span className="cc__ghost" aria-hidden="true">
        {unit.slice(0, 1).toUpperCase()}
      </span>
      <span className="cc__edge" aria-hidden="true" />

      <span className="cc__digits" aria-hidden="true">
        <Odometer value={value} digits={2} />
      </span>

      <span className="cc__label" aria-hidden="true">
        {label}
      </span>
    </div>
  );
}
