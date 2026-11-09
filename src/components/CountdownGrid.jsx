import './CountdownGrid.css';
import { CountdownCard } from './CountdownCard.jsx';

const UNITS = [
  { unit: 'days', label: 'Ngày', accent: 'var(--unit-days)' },
  { unit: 'hours', label: 'Giờ', accent: 'var(--unit-hours)' },
  { unit: 'minutes', label: 'Phút', accent: 'var(--unit-minutes)' },
];

/**
 * The three odometer cards, days → minutes, each with its own accent.
 *
 * @param {{ remaining: { days: number, hours: number, minutes: number },
 *   isExpired?: boolean }} props
 */
export function CountdownGrid({ remaining, isExpired }) {
  return (
    <div className="cg">
      <div className="cg__grid">
        {UNITS.map((item, index) => (
          <CountdownCard
            key={item.unit}
            unit={item.unit}
            label={item.label}
            value={remaining[item.unit]}
            accent={item.accent}
            index={index}
            isExpired={isExpired}
          />
        ))}
      </div>
    </div>
  );
}
