import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../auth/AppProvider';
import { useKid } from '../kids/useKid';
import { PointsChip, Screen, TopBar } from '../ui/ui';
import { ACHIEVEMENTS } from './achievements';

export default function StickersScreen() {
  const kid = useKid();
  const { kidsReady } = useApp();
  const { t } = useTranslation();
  if (!kid) return kidsReady ? <Navigate to="/" replace /> : null;
  const have = ACHIEVEMENTS.filter((a) => kid.achievements.includes(a.id)).length;

  return (
    <Screen className="stickers">
      <TopBar back={`/kid/${kid.id}`} title={t('stickers.title')} right={<PointsChip points={kid.points} />} />
      <p className="hint">{t('stickers.progress', { have, total: ACHIEVEMENTS.length })}</p>
      <div className="sticker-grid">
        {ACHIEVEMENTS.map((a, i) => {
          const got = kid.achievements.includes(a.id);
          return (
            <div key={a.id} className={`sticker ${got ? 'got' : ''}`} style={{ ['--tilt' as string]: `${((i * 37) % 11) - 5}deg` }}>
              <span className="sticker-emoji">{got ? a.emoji : '?'}</span>
              <strong>{got ? t(`achievements.${a.id}.name`) : '???'}</strong>
              <small>{t(`achievements.${a.id}.desc`)}</small>
            </div>
          );
        })}
      </div>
    </Screen>
  );
}
