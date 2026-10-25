import { useState, useEffect } from 'react';
import './App.css';

const TARGET_DATE = new Date('2026-12-06T00:00:00').getTime();

function pad2(n) {
  return String(n).padStart(2, '0');
}

export default function App() {

  const isExpired = remaining.days === 0 && remaining.hours === 0 && remaining.minutes === 0 && remaining.seconds === 0;

  return (
    <div className="countdown-container">
      <header className="countdown-header">
        <h1>Countdown</h1>
        <p>Đến ngày 6/12/2026</p>
      </header>
      <div className="countdown-grid">
        <div className="countdown-card">
          <span className="countdown-value">{isExpired ? '00' : remaining.days}</span>
          <span className="countdown-label">Ngày</span>
        </div>
        <div className="countdown-card">
          <span className="countdown-value">{isExpired ? '00' : remaining.hours}</span>
          <span className="countdown-label">Giờ</span>
        </div>
        <div className="countdown-card">
          <span className="countdown-value">{isExpired ? '00' : remaining.minutes}</span>
          <span className="countdown-label">Phút</span>
        </div>
        <div className="countdown-card">
          <span className="countdown-value">{isExpired ? '00' : remaining.seconds}</span>
          <span className="countdown-label">Giây</span>
        </div>
      </div>
      <button className="countdown-btn" onClick={() => setIsRunning(!isRunning)}>
        {isExpired ? 'Bắt đầu lại' : isRunning ? 'Dừng' : 'Bắt đầu'}
      </button>
      {isExpired && remaining.days === 0 && remaining.hours === 0 && remaining.minutes === 0 && remaining.seconds === 0 && (
        <p className="countdown-expired">Đã đến ngày 6/12/2026 🎉</p>
      )}
    </div>
  );
}

