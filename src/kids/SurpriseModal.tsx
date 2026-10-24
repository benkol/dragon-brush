import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp, useFamilyId } from '../auth/AppProvider';
import type { Kid } from '../data/types';
import { Confetti, Modal } from '../ui/ui';
import { sfx, unlockAudio } from '../game/audio';
import { loadVoice, say } from '../game/voice';
import { DragonImg } from '../ui/Preview';
import { dragonLevel, TOOTH_FAIRY_WINGS } from '../rewards/scoring';

/**
 * A wrapped present the kid opens: the tooth fairy's visit or a dentist
 * bravery chest, logged by a parent.
 */
export default function SurpriseModal({ kid }: { kid: Kid }) {
  const { repo } = useApp();
  const fid = useFamilyId();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const s = kid.surprise!;

  const reveal = async () => {
    unlockAudio();
    sfx.fanfare();
    setOpen(true);
    await loadVoice().catch(() => {});
    say(s.kind, { priority: 3 });
  };

  const close = () => repo.updateKid(fid, kid.id, (k) => ({ stats: { ...k, surprise: null }, result: null }));

  const level = dragonLevel(kid.dragonXp[kid.equipped.dragon] ?? 0);
  return (
    <Modal>
      {open && <Confetti />}
      {!open ? (
        <div className="stack center">
          <span className="prize-emoji huge wobble">🎁</span>
          <h2>{t('surprise.title', { name: kid.name })}</h2>
          <button className="btn btn-primary" onClick={reveal}>
            {t('surprise.open')}
          </button>
        </div>
      ) : (
        <div className="stack center pop-in">
          {s.wings ? (
            <DragonImg className="art big-art" equipped={{ ...kid.equipped, necklace: TOOTH_FAIRY_WINGS }} level={level} />
          ) : (
            <span className="prize-emoji huge">{s.kind === 'toothFairy' ? '🧚' : '🦷'}</span>
          )}
          <h2>{t(`surprise.${s.kind}`)}</h2>
          <p>{t(s.wings ? 'surprise.wings' : `surprise.${s.kind}Text`)}</p>
          <p className="streak-line">⭐ +{s.points}</p>
          <button className="btn btn-primary" onClick={close}>
            {t('surprise.yay')}
          </button>
        </div>
      )}
    </Modal>
  );
}
