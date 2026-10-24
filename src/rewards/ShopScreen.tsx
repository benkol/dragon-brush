import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp, useFamilyId } from '../auth/AppProvider';
import { useKid } from '../kids/useKid';
import { Modal, PointsChip, Screen, TopBar, useToast } from '../ui/ui';
import { CATALOG, itemNameKey, SHOP_CATEGORIES, type CatalogItem, type Category } from './catalog';
import { applyPurchase, canPurchase } from './scoring';
import { currentSeasons, inSeason, SEASON_EMOJI } from './seasons';
import ItemArt from './ItemArt';
import { sfx, unlockAudio } from '../game/audio';

/** "special" lists the holiday items on sale right now. */
type Tab = Category | 'special';

export default function ShopScreen() {
  const kid = useKid();
  const { repo, kidsReady } = useApp();
  const fid = useFamilyId();
  const { t } = useTranslation();
  const [now] = useState(() => Date.now());
  const seasons = currentSeasons(now);
  const [cat, setCat] = useState<Tab>(seasons.length > 0 ? 'special' : 'hat');
  const [confirming, setConfirming] = useState<CatalogItem | null>(null);
  const [toast, showToast] = useToast();
  if (!kid) return kidsReady ? <Navigate to="/" replace /> : null;

  // Holiday items show only in season (or once owned); everything else always.
  const visible = (i: CatalogItem) => !i.starter && (!i.season || inSeason(i.season, now) || kid.owned.includes(i.id));
  const items = CATALOG.filter((i) => visible(i) && (cat === 'special' ? !!i.season && inSeason(i.season, now) : i.category === cat));
  const tabs: Tab[] = seasons.length > 0 ? ['special', ...SHOP_CATEGORIES] : SHOP_CATEGORIES;

  const buy = async (item: CatalogItem) => {
    setConfirming(null);
    unlockAudio();
    await repo.updateKid(fid, kid.id, (k) => {
      const { stats } = applyPurchase(k, item);
      return { stats, result: null };
    });
    sfx.pop();
    showToast(t('shop.bought'));
  };

  const status = (item: CatalogItem) => {
    if (item.category !== 'shield' && kid.owned.includes(item.id)) return <span className="tag owned">✓ {t('shop.owned')}</span>;
    if (item.unlock?.streak) return <span className="tag locked">🔒 {t('shop.needStreak', { count: item.unlock.streak })}</span>;
    if (item.unlock?.egg) return <span className="tag locked">🥚 {t('shop.fromEgg')}</span>;
    if (item.unlock?.birthday) return <span className="tag locked">🎂 {t('shop.birthdayGift')}</span>;
    if (item.unlock?.toothFairy) return <span className="tag locked">🧚 {t('shop.toothFairyGift')}</span>;
    if (item.unlock?.anniversary) return <span className="tag locked">🥇 {t('shop.anniversaryGift')}</span>;
    return <span className={`tag price ${kid.points < item.price ? 'short' : ''}`}>⭐ {item.price}</span>;
  };

  return (
    <Screen className="shop">
      <TopBar back={`/kid/${kid.id}`} title={t('shop.title')} right={<PointsChip points={kid.points} />} />
      <div className="tabs" role="tablist">
        {tabs.map((c) => (
          <button key={c} role="tab" aria-selected={c === cat} className={`tab ${c === cat ? 'on' : ''} ${c === 'special' ? 'special' : ''}`} onClick={() => setCat(c)}>
            {c === 'special' ? `${seasons.map((s) => SEASON_EMOJI[s]).join('')} ${t('shop.special')}` : t(`cat.${c}`)}
          </button>
        ))}
      </div>
      {cat === 'special' && <p className="hint">{t('shop.specialHint', { holiday: seasons.map((s) => t(`season.${s}`)).join(', ') })}</p>}
      {cat === 'shield' && <p className="hint">{t('shop.shieldsOwned', { count: kid.shields })} 🛡️</p>}
      <div className="item-grid">
        {items.map((item) => {
          const err = canPurchase(kid, item, now);
          const mystery = !!item.unlock?.egg && !kid.owned.includes(item.id);
          const limited = !!item.season && inSeason(item.season, now);
          return (
            <button key={item.id} className={`item-card ${err === 'owned' ? 'is-owned' : ''} ${limited ? 'limited' : ''}`} onClick={() => (err ? err === 'not_enough' && showToast(t('shop.notEnough', { count: item.price - kid.points })) : setConfirming(item))}>
              {limited && <span className="limited-badge">{SEASON_EMOJI[item.season!]} {t('shop.limited')}</span>}
              <ItemArt id={item.id} wearer={kid.equipped} mystery={mystery} />
              <span className="item-name">{mystery ? '???' : t(itemNameKey(item.id))}</span>
              {status(item)}
            </button>
          );
        })}
      </div>
      {confirming && (
        <Modal onClose={() => setConfirming(null)}>
          <div className="stack center">
            <ItemArt id={confirming.id} wearer={kid.equipped} />
            <h2>{t('shop.confirm', { name: t(itemNameKey(confirming.id)), price: confirming.price })}</h2>
            <div className="row">
              <button className="btn btn-ghost grow" onClick={() => setConfirming(null)}>
                {t('common.cancel')}
              </button>
              <button className="btn btn-primary grow" onClick={() => buy(confirming)}>
                {t('shop.buy')}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {toast}
    </Screen>
  );
}
