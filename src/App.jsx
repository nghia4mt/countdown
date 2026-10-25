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

    useEffect(() => {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = TARGET_DATE - now;
        if (distance <= 0) {
          setRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
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
    }, []);

  const isExpired = remaining.days === 0 && remaining.hours === 0 && remaining.minutes === 0 && remaining.seconds === 0;

  const items = [
    { value: remaining.days, label: 'Ngày', color: '#ff6b9d' },
    { value: remaining.hours, label: 'Giờ', color: '#c084fc' },
    { value: remaining.minutes, label: 'Phút', color: '#fbbf24' },
    { value: remaining.seconds, label: 'Giây', color: '#34d399' },
  ];

  return (
    <div className="countdown-container">
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className={`confetti-piece c${i % 6}`} style={{ '--i': i }} />
        ))}
      </div>

      <header className="countdown-header">
        <div className="countdown-badge">
          <span className="badge-dot" />
          <span>Sinh nhật vui vẻ!</span>
        </div>
        <h1 className="countdown-title">Đếm ngược sinh nhật 🎂</h1>
        <p className="countdown-subtitle">06/12/2003 - 06/12/2026</p>
      </header>

      <div className="countdown-grid">
        {items.map((item, i) => (
          <div
            className="countdown-card"
            key={item.label}
            style={{ '--accent-color': item.color, '--delay': `${i * 0.1}s` }}
          >
            <span className="countdown-value">
              {isExpired ? '00' : pad2(item.value)}
            </span>
            <span className="countdown-label">{item.label}</span>
          </div>
        ))}
      </div>

      {isExpired && (
        <p className="countdown-expired">Chúc mừng sinh nhật! 🎉🎂🎈</p>
      )}
    </div>
  );
}
