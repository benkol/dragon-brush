import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../auth/AppProvider';
import { useKid } from './useKid';
import { PointsChip, Screen, TopBar } from '../ui/ui';
import { DragonImg } from '../ui/Preview';
import { countedToday, dragonLevel, EGG_DAYS, effectiveStreak, MAX_COUNTED_PER_DAY, MIN_GAP_MS } from '../rewards/scoring';
import { EGG_DRAGONS } from '../rewards/catalog';
import { weekStatus } from '../rewards/challenges';
import { birthdayWeekYear, HOLIDAY_EMOJI, holidayToday, withCostume } from '../rewards/seasons';
import SurpriseModal from './SurpriseModal';

export default function KidHome() {
  const kid = useKid();
  const { kidsReady } = useApp();
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  if (!kid) return kidsReady ? <Navigate to="/" replace /> : null;

  const now = Date.now();
  const level = dragonLevel(kid.dragonXp[kid.equipped.dragon] ?? 0);
  const today = countedToday(kid, now);
  const streak = effectiveStreak(kid, now);
  const eggsLeft = EGG_DRAGONS.some((d) => !kid.owned.includes(d));
  const week = weekStatus(kid.week, now);
  const birthdayYear = birthdayWeekYear(kid.birthday, now);
  const holiday = holidayToday(now);
  const outfit = withCostume(kid.equipped, now, kid.birthday);
  const nextAt = today === 1 && kid.lastBrushAt && kid.lastBrushAt + MIN_GAP_MS > now ? kid.lastBrushAt + MIN_GAP_MS : null;
  const time = (ms: number) => new Date(ms).toLocaleTimeString(i18n.language, { hour: 'numeric', minute: '2-digit' });

  return (
    <Screen className="kid-home" >
      <TopBar back="/" title={kid.name} right={<PointsChip points={kid.points} />} />

      <div className="hero" style={{ ['--kid' as string]: kid.avatarColor }}>
        <DragonImg className="hero-dragon bob" equipped={outfit} level={level} />
        <span className="level-badge">{t('kidHome.level', { level })}</span>
      </div>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-icon">🔥</span>
          <strong>{streak}</strong>
          <small>{t('kidHome.streak')}</small>
        </div>
        <div className="stat">
          <span className="today-dots big">
            {Array.from({ length: MAX_COUNTED_PER_DAY }, (_, i) => (
              <i key={i} className={i < today ? 'on' : ''} />
            ))}
          </span>
          <small>{t('kids.today', { count: today })}</small>
        </div>
        <div className="stat">
          <span className="stat-icon">🛡️</span>
          <strong>{kid.shields}</strong>
          <small>{t('kidHome.shields')}</small>
        </div>
      </div>

      <button className="btn btn-brush" onClick={() => nav(`/kid/${kid.id}/brush`)}>
        🪥 {t('kidHome.brush')}
      </button>
      {today >= MAX_COUNTED_PER_DAY ? (
        <p className="hint">{t('kidHome.maxToday')}</p>
      ) : nextAt ? (
        <p className="hint">{t('kidHome.nextAt', { time: time(nextAt) })}</p>
      ) : (
        <p className="hint">{t('kidHome.streakHint')}</p>
      )}

      {holiday && (
        <div className="holiday-card card">
          <span className="big-emoji">{HOLIDAY_EMOJI[holiday.holiday]}</span>
          <div className="grow">
            <strong>{t(`holiday.${holiday.holiday}`)}</strong>
            {holiday.day === 0 && <small>{t('holiday.double')}</small>}
          </div>
        </div>
      )}

      {birthdayYear !== null && (
        <div className="birthday-card card">
          <span className="big-emoji wobble">🎂</span>
          <div className="grow">
            <strong>{t('kidHome.birthday', { name: kid.name })}</strong>
            <small>{kid.lastBirthdayYear === birthdayYear ? t('kidHome.birthdayGot') : t('kidHome.birthdayGift')}</small>
          </div>
        </div>
      )}

      <div className={`challenge-card card ${week.done ? 'done' : ''}`}>
        <span className="egg">{week.done ? '🏆' : '🎯'}</span>
        <div className="grow">
          <strong>{t('challenge.title')}</strong>
          <span className="challenge-text">{t(`challenge.${week.challenge.kind}`, { count: week.challenge.goal })}</span>
          <div className="bar">
            <div style={{ width: `${(week.progress / week.challenge.goal) * 100}%` }} />
          </div>
          <small>
            {week.done
              ? t('challenge.done', { points: week.challenge.reward })
              : t('challenge.progress', {
                  have: week.progress,
                  goal: week.challenge.goal,
                  points: week.challenge.reward,
                  left: week.daysLeft === 1 ? t('challenge.lastDay') : t('challenge.daysLeft', { days: week.daysLeft }),
                })}
          </small>
        </div>
      </div>

      <div className="egg-card card">
        <span className={`egg ${eggsLeft ? 'wobble' : ''}`}>{eggsLeft ? '🥚' : '🐣'}</span>
        <div className="grow">
          <strong>{t('kidHome.egg')}</strong>
          {eggsLeft ? (
            <>
              <div className="bar">
                <div style={{ width: `${(kid.eggProgress / EGG_DAYS) * 100}%` }} />
              </div>
              <small>{t('kidHome.eggHint', { count: EGG_DAYS - kid.eggProgress })}</small>
            </>
          ) : (
            <small>{t('kidHome.eggDone')}</small>
          )}
        </div>
      </div>

      <nav className="menu-grid">
        <button className="menu-btn shop" onClick={() => nav(`/kid/${kid.id}/shop`)}>
          <span>🛍️</span>
          {t('kidHome.shop')}
        </button>
        <button className="menu-btn wardrobe" onClick={() => nav(`/kid/${kid.id}/wardrobe`)}>
          <span>🎩</span>
          {t('kidHome.wardrobe')}
        </button>
        <button className="menu-btn stickers" onClick={() => nav(`/kid/${kid.id}/stickers`)}>
          <span>🌟</span>
          {t('kidHome.stickers')}
        </button>
        <button className="menu-btn prizes" onClick={() => nav(`/kid/${kid.id}/rewards`)}>
          <span>🎁</span>
          {t('kidHome.rewards')}
        </button>
      </nav>
      {kid.surprise && <SurpriseModal kid={kid} />}
    </Screen>
  );
}
