import { useState, useEffect } from 'react';
import './App.css';

const TARGET_DATE = new Date('2026-12-06T00:00:00').getTime();

function pad2(n) {
  return String(n).padStart(2, '0');
}

export default function App() {
  const [remaining, setRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = TARGET_DATE - now;
      if (distance <= 0) {
        setRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsRunning(false);
        return;
      }
      setRemaining({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const isExpired = remaining.days === 0 && remaining.hours === 0 && remaining.minutes === 0 && remaining.seconds === 0;

  return (
    <div className="countdown-container">
      <header className="countdown-header">
        <div className="countdown-badge">
          <span className="badge-dot" />
          <span>Đếm ngược sự kiện</span>
        </div>
        <h1 className="countdown-title">Countdown</h1>
        <p className="countdown-subtitle">Đến ngày 6/12/2026</p>
      </header>

      <div className="countdown-grid">
        {[
          { value: remaining.days, label: 'Ngày', color: '#6c5ce7' },
          { value: remaining.hours, label: 'Giờ', color: '#a29bfe' },
          { value: remaining.minutes, label: 'Phút', color: '#fd79a8' },
          { value: remaining.seconds, label: 'Giây', color: '#ffeaa7' },
        ].map((item, i) => (
          <div className="countdown-card" key={item.label} style={{ '--accent-color': item.color, '--delay': `${i * 0.1}s` }}>
            <span className="countdown-value">
              {isExpired ? '00' : pad2(item.value)}
            </span>
            <span className="countdown-label">{item.label}</span>
          </div>
        ))}
      </div>

      <button className="countdown-btn" onClick={() => setIsRunning(!isRunning)}>
        {isExpired ? 'Bắt đầu lại' : isRunning ? 'Dừng' : 'Bắt đầu'}
      </button>

      {isExpired && (
        <p className="countdown-expired">Đã đến ngày 6/12/2026 🎉</p>
      )}
    </div>
  );
}
