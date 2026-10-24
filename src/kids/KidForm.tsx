import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp, useFamilyId } from '../auth/AppProvider';
import type { Kid } from '../data/types';
import { AVATAR_COLORS, Modal } from '../ui/ui';

export default function KidForm({ kid, onClose }: { kid?: Kid; onClose: () => void }) {
  const { repo } = useApp();
  const fid = useFamilyId();
  const { t } = useTranslation();
  const [name, setName] = useState(kid?.name ?? '');
  const [color, setColor] = useState(kid?.avatarColor ?? AVATAR_COLORS[0]);
  const [birthday, setBirthday] = useState(kid?.birthday ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const profile = { name: name.trim(), avatarColor: color, birthday: birthday || null };
      if (kid) await repo.editKid(fid, kid.id, profile);
      else await repo.addKid(fid, profile);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!kid || !confirm(t('kidForm.deleteConfirm', { name: kid.name }))) return;
    await repo.deleteKid(fid, kid.id);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <h2>{t(kid ? 'kidForm.editTitle' : 'kidForm.addTitle')}</h2>
        <label className="field">
          <span>{t('kidForm.name')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={24} required />
        </label>
        <label className="field">
          <span>
            🎂 {t('kidForm.birthday')} <span className="muted small">({t('kidForm.optional')})</span>
          </span>
          <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
        </label>
        <div className="field">
          <span>{t('kidForm.color')}</span>
          <div className="swatches">
            {AVATAR_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`swatch ${c === color ? 'on' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>
        </div>
        <div className="row">
          {kid && (
            <button type="button" className="btn btn-danger" onClick={remove}>
              {t('common.delete')}
            </button>
          )}
          <span className="grow" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
