import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp, useFamilyId } from '../auth/AppProvider';
import type { Kid } from '../data/types';
import { Modal } from '../ui/ui';
import { applySession, manualSession, type SessionOutcome } from '../rewards/scoring';

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Lets a parent record a brush that happened today without the app. */
export default function LogBrushModal({ kid, onClose, onDone }: { kid: Kid; onClose: () => void; onDone: (text: string) => void }) {
  const { repo, user } = useApp();
  const fid = useFamilyId();
  const { t } = useTranslation();
  const [time, setTime] = useState(() => hhmm(new Date()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const [h, m] = time.split(':').map(Number);
    const at = new Date();
    at.setHours(h, m, 0, 0);
    if (Number.isNaN(at.getTime()) || at.getTime() > Date.now()) {
      setError(t('parent.logFuture'));
      return;
    }
    setBusy(true);
    try {
      const o: SessionOutcome = await repo.updateKid(fid, kid.id, (k) => {
        const by = user ? { uid: user.uid, name: user.displayName } : undefined;
        const out = applySession(k, { ...manualSession(at.getTime()), ...(by ? { by } : {}) });
        // A rejected log changes nothing; the parent just sees why.
        if (!out.record.counted) return { stats: k, result: out };
        return { stats: out.stats, result: out, session: out.record };
      });
      if (o.record.counted) {
        onDone(t('parent.logged', { points: o.record.pointsAwarded, name: kid.name }));
        onClose();
      } else {
        setError(t(`parent.logNot.${o.notCountedReason}`, { name: kid.name }));
      }
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <h2>🪥 {t('parent.logTitle')}</h2>
        <p className="muted">{t('parent.logHelp', { name: kid.name })}</p>
        <label className="field">
          <span>{t('parent.logTime')}</span>
          <input type="time" value={time} max={hhmm(new Date())} onChange={(e) => setTime(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="row">
          <span className="grow" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {t('parent.logSave')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
