import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp, useFamilyId } from '../auth/AppProvider';
import { Modal } from '../ui/ui';

/** Deletes the parent's account, and the family's data if no other parent shares it. */
export default function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const { repo, family, user } = useApp();
  const fid = useFamilyId();
  const { t } = useTranslation();
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const needsPassword = repo.deleteNeedsPassword();
  const others = (family?.members ?? []).filter((m) => m !== user?.uid).map((m) => family?.memberNames[m] ?? '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await repo.deleteAccount(fid, needsPassword ? password : undefined);
      nav('/', { replace: true });
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      setError(code.includes('wrong-password') || code.includes('invalid-credential') ? t('deleteAccount.wrongPassword') : t('common.error'));
      setBusy(false);
    }
  };

  return (
    <Modal onClose={busy ? undefined : onClose}>
      <form className="stack" onSubmit={submit}>
        <h2>⚠️ {t('deleteAccount.title')}</h2>
        <p>{others.length > 0 ? t('deleteAccount.shared', { names: others.join(', ') }) : t('deleteAccount.alone')}</p>
        {needsPassword && (
          <input type="password" placeholder={t('login.password')} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        )}
        {!needsPassword && repo.mode === 'firebase' && <p className="muted small">{t('deleteAccount.google')}</p>}
        <label className="toggle-row">
          <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} />
          <span>{t('deleteAccount.sure')}</span>
        </label>
        {error && <p className="error">{error}</p>}
        <div className="row">
          <span className="grow" />
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-danger" disabled={!sure || busy}>
            {busy ? t('deleteAccount.deleting') : t('deleteAccount.confirm')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
