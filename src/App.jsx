import { useEffect, useRef, useState } from 'react';
import { BackgroundFX } from './components/BackgroundFX.jsx';
import { Celebration } from './components/Celebration.jsx';
import { CountdownGrid } from './components/CountdownGrid.jsx';
import { ProgressRail } from './components/ProgressRail.jsx';
import { useCountdown } from './hooks/useCountdown.js';
import {
  BIRTHDAY_AGE,
  BIRTH_LABEL,
  TARGET_LABEL,
  TARGET_MS,
  TARGET_SLASH_LABEL,
  formatRemaining,
} from './lib/countdown.js';
import './App.css';

export default function App() {
  const { remaining, progress, isExpired } = useCountdown(TARGET_MS);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const celebratedRef = useRef(false);

  useEffect(() => {
    if (!isExpired || celebratedRef.current) return;
    celebratedRef.current = true;
    setIsCelebrating(true);
  }, [isExpired]);

  const state = isExpired ? 'expired' : 'running';
  const statusText = isExpired ? 'Sinh nhật vui vẻ' : 'Đang đếm ngược';

  return (
    <div className="app">
      <BackgroundFX
        celebrating={isCelebrating}
        expired={isExpired}
        tick={remaining.minutes}
      />

      <main className="stage">
        <header className="hero">
          <p className="hero__badge" data-state={state}>
            <span className="hero__pulse" aria-hidden="true" />
            {statusText}
          </p>

          <p className="hero__eyebrow">Đếm ngược sinh nhật</p>

          <h1 className="hero__title">{TARGET_LABEL}</h1>

          <p className="hero__sub">
            {isExpired
              ? `Chúc mừng sinh nhật! Hôm nay tròn ${BIRTHDAY_AGE} tuổi.`
              : `${BIRTH_LABEL} → ${TARGET_SLASH_LABEL} · Tuổi ${BIRTHDAY_AGE}`}
          </p>

          <p className="sr-only" role="status" aria-live="off">
            {isExpired
              ? `Đã đến ngày 06 tháng 12 năm 2026 — sinh nhật lần thứ ${BIRTHDAY_AGE}.`
              : `Còn lại ${formatRemaining(remaining)}.`}
          </p>
        </header>

        <CountdownGrid remaining={remaining} isExpired={isExpired} />

        <ProgressRail progress={progress} isExpired={isExpired} />

        {isExpired ? (
          <div className="actions" data-celebrating={isCelebrating ? '' : undefined}>
            <button type="button" className="btn btn--primary" onClick={() => setIsCelebrating(true)}>
              <span className="btn__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
                </svg>
              </span>
              Xem lại khoảnh khắc
            </button>
          </div>
        ) : null}

        <p className="footnote">
          <span>GMT+7 · Asia/Bangkok</span>
          <span className="footnote__dot" aria-hidden="true" />
          <span>{isExpired ? 'Đã đến đích' : 'Đồng bộ mỗi phút'}</span>
        </p>
      </main>

      <Celebration open={isCelebrating} onDismiss={() => setIsCelebrating(false)} />
    </div>
  );
}
