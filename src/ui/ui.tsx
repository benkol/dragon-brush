import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toggleLanguage } from '../i18n/i18n';

export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`screen ${className}`}>{children}</div>;
}

export function TopBar({ title, back, right }: { title?: ReactNode; back?: string; right?: ReactNode }) {
  const nav = useNavigate();
  const { t } = useTranslation();
  return (
    <header className="topbar">
      {back ? (
        <button className="icon-btn" onClick={() => nav(back)} aria-label={t('common.back')}>
          <span className="flip-rtl">←</span>
        </button>
      ) : (
        <span className="icon-spacer" />
      )}
      <h1>{title}</h1>
      <div className="topbar-right">{right ?? <span className="icon-spacer" />}</div>
    </header>
  );
}

export function PointsChip({ points }: { points: number }) {
  return (
    <span className="chip chip-points">
      <span aria-hidden>⭐</span> {points}
    </span>
  );
}

export function LangButton() {
  const { t } = useTranslation();
  return (
    <button className="chip chip-btn" onClick={toggleLanguage}>
      {t('common.language')}
    </button>
  );
}

export function Modal({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
        {children}
      </div>
    </div>
  );
}

export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 1800);
    return () => clearTimeout(id);
  }, [text, onDone]);
  return <div className="toast">{text}</div>;
}

export function Confetti({ count = 90 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        dur: 2.2 + Math.random() * 1.8,
        color: ['#ff5fa2', '#ffd23f', '#4fc3ff', '#7dff5a', '#ff8c42', '#b07cff'][i % 6],
        rot: Math.random() * 360,
        w: 6 + Math.random() * 8,
      })),
    [count],
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            background: p.color,
            width: p.w,
            height: p.w * 1.6,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function useToast() {
  const [text, setText] = useState<string | null>(null);
  const node = text ? <Toast text={text} onDone={() => setText(null)} /> : null;
  return [node, setText] as const;
}

export const AVATAR_COLORS = ['#ff6b5b', '#ffb347', '#ffd23f', '#6fd36f', '#4fc3ff', '#7b5cff', '#ff7fc8', '#4fd1c5'];
