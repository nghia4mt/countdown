import './CountdownGrid.css';
import { CountdownCard } from './CountdownCard.jsx';

const UNITS = [
  { unit: 'days', label: 'Ngày' },
  { unit: 'hours', label: 'Giờ' },
  { unit: 'minutes', label: 'Phút' },
];

/**
 * One glass slab holding the three odometer segments, days → minutes,
 * separated by hairline rules. The slab itself is the group, so assistive
 * technology gets one "Thời gian còn lại" landmark around the readings.
 *
 * @param {{ remaining: { days: number, hours: number, minutes: number },
 *   isExpired?: boolean }} props
 */
export function CountdownGrid({ remaining, isExpired }) {
  return (
    <div className="cg" role="group" aria-label="Thời gian còn lại">
      <div className="cg__grid">
        {UNITS.map((item) => (
          <CountdownCard
            key={item.unit}
            unit={item.unit}
            label={item.label}
            value={remaining[item.unit]}
            isExpired={isExpired}
          />
        ))}
      </div>
    </div>
  );
}
