import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../auth/AppProvider';
import { LangButton, Screen } from '../ui/ui';
import KidForm from './KidForm';
import { DragonImg } from '../ui/Preview';
import { countedToday, dragonLevel, effectiveStreak } from '../rewards/scoring';

export default function KidsScreen() {
  const { kids, kidsReady } = useApp();
  const { t } = useTranslation();
  const nav = useNavigate();
  const [adding, setAdding] = useState(false);
  const now = Date.now();

  return (
    <Screen className="kids">
      <header className="kids-header">
        <LangButton />
        <button className="chip chip-btn" onClick={() => nav('/parent')}>
          👨‍👩‍👧 {t('kids.parentArea')}
        </button>
      </header>
      <h1 className="page-title">{t('kids.title')}</h1>

      <div className="kid-grid">
        {kids.map((k) => (
          <button key={k.id} className="kid-card" style={{ ['--kid' as string]: k.avatarColor }} onClick={() => nav(`/kid/${k.id}`)}>
            <DragonImg className="kid-dragon" equipped={k.equipped} level={dragonLevel(k.dragonXp[k.equipped.dragon] ?? 0)} />
            <strong>{k.name}</strong>
            <span className="kid-stats">
              <span>⭐ {k.points}</span>
              <span>🔥 {effectiveStreak(k, now)}</span>
            </span>
            <span className="today-dots" aria-label={t('kids.today', { count: countedToday(k, now) })}>
              {[0, 1].map((i) => (
                <i key={i} className={i < countedToday(k, now) ? 'on' : ''} />
              ))}
            </span>
          </button>
        ))}
        <button className="kid-card add" onClick={() => setAdding(true)}>
          <span className="plus">+</span>
          <strong>{t('kids.add')}</strong>
        </button>
      </div>
      {kidsReady && kids.length === 0 && <p className="muted center">{t('kids.empty')}</p>}
      {adding && <KidForm onClose={() => setAdding(false)} />}
    </Screen>
  );
}
