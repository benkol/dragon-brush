import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp, useFamilyId } from '../auth/AppProvider';
import { useKid } from '../kids/useKid';
import { Confetti, Modal, PointsChip, Screen, TopBar, useToast } from '../ui/ui';
import type { CustomReward } from '../data/types';
import { sfx, unlockAudio } from '../game/audio';

/** Kid's view of the real-life prizes a parent created. */
export default function PrizesScreen() {
  const kid = useKid();
  const { repo, rewards, kidsReady } = useApp();
  const fid = useFamilyId();
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState<CustomReward | null>(null);
  const [redeemed, setRedeemed] = useState<CustomReward | null>(null);
  const [toast, showToast] = useToast();
  if (!kid) return kidsReady ? <Navigate to="/" replace /> : null;

  const redeem = async (r: CustomReward) => {
    setConfirming(null);
    unlockAudio();
    try {
      await repo.redeemReward(fid, kid, r);
      sfx.fanfare();
      setRedeemed(r);
    } catch {
      showToast(t('shop.notEnough', { count: r.price - kid.points }));
    }
  };

  return (
    <Screen className="prizes">
      <TopBar back={`/kid/${kid.id}`} title={t('rewards.title')} right={<PointsChip points={kid.points} />} />
      {rewards.length === 0 && <p className="hint">{t('rewards.empty')}</p>}
      <div className="prize-list">
        {rewards.map((r) => (
          <button
            key={r.id}
            className="prize card"
            onClick={() => (kid.points >= r.price ? setConfirming(r) : showToast(t('shop.notEnough', { count: r.price - kid.points })))}
          >
            <span className="prize-emoji">{r.emoji}</span>
            <strong className="grow">{r.title}</strong>
            <span className={`tag price ${kid.points < r.price ? 'short' : ''}`}>⭐ {r.price}</span>
          </button>
        ))}
      </div>
      {confirming && (
        <Modal onClose={() => setConfirming(null)}>
          <div className="stack center">
            <span className="prize-emoji big">{confirming.emoji}</span>
            <h2>{t('rewards.confirm', { price: confirming.price, title: confirming.title })}</h2>
            <div className="row">
              <button className="btn btn-ghost grow" onClick={() => setConfirming(null)}>
                {t('common.cancel')}
              </button>
              <button className="btn btn-primary grow" onClick={() => redeem(confirming)}>
                {t('rewards.redeem')}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {redeemed && (
        <Modal onClose={() => setRedeemed(null)}>
          <Confetti />
          <div className="stack center">
            <span className="prize-emoji huge">{redeemed.emoji}</span>
            <h2>{redeemed.title}</h2>
            <p>{t('rewards.redeemed')}</p>
            <button className="btn btn-primary" onClick={() => setRedeemed(null)}>
              {t('common.done')}
            </button>
          </div>
        </Modal>
      )}
      {toast}
    </Screen>
  );
}
