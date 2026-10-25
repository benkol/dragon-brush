import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp, useFamilyId } from '../auth/AppProvider';
import { useKid } from '../kids/useKid';
import { Screen, TopBar } from '../ui/ui';
import type { SessionRecord } from '../data/types';
import { dayKey } from '../rewards/dates';
import { groupByDay, kindOf, monthGrid, monthRange, monthSummary } from './history';

const KIND_ICON = { app: '🐲', solo: '🪥', noCamera: '📷', manual: '✍️' } as const;

/** A calendar of a kid's brushes: in the app or logged by a parent, and by whom. */
export default function HistoryScreen() {
  const kid = useKid();
  const { repo, kidsReady } = useApp();
  const fid = useFamilyId();
  const { t, i18n } = useTranslation();
  const today = dayKey(Date.now());
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);
  const [sessions, setSessions] = useState<SessionRecord[] | null>(null);

  useEffect(() => {
    if (!kid) return;
    setSessions(null);
    const [from, to] = monthRange(month.y, month.m);
    return repo.watchSessions(fid, kid.id, from, to, setSessions);
  }, [repo, fid, kid?.id, month.y, month.m]);

  const byDay = useMemo(() => groupByDay(sessions ?? []), [sessions]);
  if (!kid) return kidsReady ? <Navigate to="/parent" replace /> : null;

  const summary = monthSummary(sessions ?? []);
  const grid = monthGrid(month.y, month.m);
  const lang = i18n.language;
  const monthName = new Date(month.y, month.m, 1).toLocaleDateString(lang, { month: 'long', year: 'numeric' });
  // Sunday-first weekday initials in the current language (Jan 4, 2026 was a Sunday).
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2026, 0, 4 + i).toLocaleDateString(lang, { weekday: 'narrow' }));
  const shift = (delta: number) =>
    setMonth(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const time = (ms: number) => new Date(ms).toLocaleTimeString(lang, { hour: 'numeric', minute: '2-digit' });
  const dayDetail = byDay[selected] ?? [];

  return (
    <Screen className="history">
      <TopBar back="/parent?tab=kids" title={t('history.title', { name: kid.name })} />

      <div className="card">
        <div className="month-nav">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label={t('history.prev')}>
            <span className="flip-rtl">‹</span>
          </button>
          <strong>{monthName}</strong>
          <button className="icon-btn" onClick={() => shift(1)} aria-label={t('history.next')}>
            <span className="flip-rtl">›</span>
          </button>
        </div>
        <div className="month-summary">
          <span>🪥 {t('history.brushes', { count: summary.brushes })}</span>
          <span>🌟 {t('history.fullDays', { count: summary.fullDays })}</span>
          <span>✍️ {t('history.logged', { count: summary.logged })}</span>
          <span>⭐ {summary.points}</span>
        </div>

        <div className="cal" role="grid">
          {weekdays.map((w, i) => (
            <span key={`w${i}`} className="cal-head">
              {w}
            </span>
          ))}
          {grid.map((day, i) => {
            if (!day) return <span key={`e${i}`} />;
            const list = byDay[day] ?? [];
            const full = list.filter((s) => s.counted).length >= 2;
            const future = day > today;
            return (
              <button
                key={day}
                className={`cal-day ${full ? 'full' : ''} ${day === today ? 'today' : ''} ${day === selected ? 'sel' : ''} ${future ? 'future' : ''}`}
                onClick={() => setSelected(day)}
                disabled={future}
                aria-pressed={day === selected}
              >
                <span className="cal-num">{Number(day.slice(8))}</span>
                <span className="cal-dots">
                  {list.slice(0, 4).map((s, j) => (
                    <i key={j} className={s.counted ? kindOf(s) : s.completed ? 'nopoints' : 'stopped'} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <div className="cal-legend">
          <span>
            <i className="app" /> {t('history.kind.app')}
          </span>
          <span>
            <i className="solo" /> {t('history.kind.solo')}
          </span>
          <span>
            <i className="noCamera" /> {t('history.kind.noCamera')}
          </span>
          <span>
            <i className="manual" /> {t('history.kind.manual')}
          </span>
          <span>
            <i className="nopoints" /> {t('history.noPointsShort')}
          </span>
        </div>
      </div>

      <section className="card">
        <h2>{new Date(`${selected}T12:00:00`).toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        {sessions === null && <p className="muted">{t('common.loading')}</p>}
        {sessions !== null && dayDetail.length === 0 && <p className="muted">{t('history.none')}</p>}
        {dayDetail.map((s, i) => (
          <div key={i} className="list-row history-row">
            <span className="prize-emoji">{KIND_ICON[kindOf(s)]}</span>
            <div className="grow">
              <strong>
                {time(s.endedAt)} · {t(`history.kind.${kindOf(s)}`)}
              </strong>
              <div className="muted small">
                {s.by ? t(s.manual ? 'history.loggedBy' : 'history.withParent', { name: s.by.name }) : t('history.byUnknown')}
              </div>
            </div>
            <span className={`tag ${s.counted ? 'owned' : ''}`}>
              {s.counted ? `⭐ +${s.pointsAwarded}` : s.completed ? t('history.noPoints') : t('history.stopped')}
            </span>
          </div>
        ))}
      </section>
    </Screen>
  );
}
