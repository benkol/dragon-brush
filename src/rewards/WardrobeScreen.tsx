import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp, useFamilyId } from '../auth/AppProvider';
import { useKid } from '../kids/useKid';
import { PointsChip, Screen, TopBar } from '../ui/ui';
import { CATALOG, itemNameKey, WARDROBE_SLOTS } from './catalog';
import type { Slot } from '../data/types';
import ItemArt from './ItemArt';
import { DragonImg } from '../ui/Preview';
import { dragonLevel } from './scoring';
import { newAchievements } from './achievements';

export default function WardrobeScreen() {
  const kid = useKid();
  const { repo, kidsReady } = useApp();
  const fid = useFamilyId();
  const { t } = useTranslation();
  const [slot, setSlot] = useState<Slot>('dragon');
  if (!kid) return kidsReady ? <Navigate to="/" replace /> : null;

  const owned = CATALOG.filter((i) => i.category === slot && kid.owned.includes(i.id));

  const equip = (id: string) =>
    repo.updateKid(fid, kid.id, (k) => {
      const stats = { ...k, equipped: { ...k.equipped, [slot]: id } };
      stats.achievements = [...stats.achievements, ...newAchievements(stats)];
      return { stats, result: null };
    });

  const level = (id: string) => dragonLevel(kid.dragonXp[id] ?? 0);

  return (
    <Screen className="wardrobe">
      <TopBar back={`/kid/${kid.id}`} title={t('wardrobe.title')} right={<PointsChip points={kid.points} />} />
      <div className={`hero small bg-${kid.equipped.bg.split('.')[1]}`}>
        <DragonImg className="hero-dragon bob" equipped={kid.equipped} level={level(kid.equipped.dragon)} />
        <span className="fire-tag">
          <ItemArt id={kid.equipped.fire} />
          <ItemArt id={kid.equipped.food} />
        </span>
      </div>
      <div className="tabs" role="tablist">
        {WARDROBE_SLOTS.map((s) => (
          <button key={s} role="tab" aria-selected={s === slot} className={`tab ${s === slot ? 'on' : ''}`} onClick={() => setSlot(s)}>
            {t(`cat.${s}`)}
          </button>
        ))}
      </div>
      <div className="item-grid">
        {owned.map((item) => {
          const on = kid.equipped[slot] === item.id;
          return (
            <button key={item.id} className={`item-card ${on ? 'equipped' : ''}`} onClick={() => equip(item.id)} aria-pressed={on}>
              <ItemArt id={item.id} wearer={kid.equipped} />
              <span className="item-name">{t(itemNameKey(item.id))}</span>
              {slot === 'dragon' && <span className="tag">{t('kidHome.level', { level: level(item.id) })}</span>}
              {on && <span className="tag owned">✓ {t('wardrobe.wearing')}</span>}
            </button>
          );
        })}
      </div>
    </Screen>
  );
}
