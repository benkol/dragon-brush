import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp, useFamilyId } from '../auth/AppProvider';
import { formatInviteCode, JoinError, normalizeInviteCode } from '../data/repo';
import type { Invite } from '../data/types';
import { DEMO_MODE } from '../config';

/** Parents in this family, inviting another parent, and joining another family. */
export default function FamilySection({ onToast }: { onToast: (text: string) => void }) {
  const { repo, user, family, kids, refreshFamily } = useApp();
  const fid = useFamilyId();
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [code, setCode] = useState(params.get('join') ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (DEMO_MODE || !user) {
    return (
      <section className="card">
        <h2>{t('family.title')}</h2>
        <p className="muted small">{t('family.demo')}</p>
      </section>
    );
  }

  const members = family?.members ?? [user.uid];
  const nameOf = (uid: string) => family?.memberNames[uid] || t('family.parent');
  const time = (ms: number) => new Date(ms).toLocaleString(i18n.language, { weekday: 'short', hour: 'numeric', minute: '2-digit' });

  const makeInvite = async () => {
    setBusy(true);
    try {
      setInvite(await repo.createInvite(fid, user));
    } catch {
      onToast(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const share = async (inv: Invite) => {
    const url = `${location.origin}/parent?join=${inv.code}`;
    const text = t('family.shareText', { code: formatInviteCode(inv.code) });
    try {
      if (navigator.share) await navigator.share({ title: t('app.title'), text, url });
      else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        onToast(t('family.copied'));
      }
    } catch {
      // Share sheet dismissed.
    }
  };

  const join = async (e: FormEvent) => {
    e.preventDefault();
    const c = normalizeInviteCode(code);
    if (c.length !== 8) {
      setError(t('family.errors.invalid'));
      return;
    }
    if (kids.length > 0 && !confirm(t('family.joinSwitchWarning'))) return;
    setBusy(true);
    setError('');
    try {
      await repo.joinFamily(user, c);
      setCode('');
      params.delete('join');
      setParams(params, { replace: true });
      onToast(t('family.joined'));
      refreshFamily();
    } catch (err) {
      setError(t(`family.errors.${err instanceof JoinError ? err.code : 'invalid'}`));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (uid: string) => {
    const self = uid === user.uid;
    if (!confirm(self ? t('family.leaveConfirm') : t('family.removeConfirm', { name: nameOf(uid) }))) return;
    try {
      await repo.removeMember(fid, uid);
      if (self) refreshFamily();
    } catch {
      onToast(t('common.error'));
    }
  };

  return (
    <section className="card">
      <h2>{t('family.title')}</h2>
      <p className="muted small">{t('family.help')}</p>

      {members.map((uid) => (
        <div key={uid} className="list-row">
          <span className="prize-emoji">🧑</span>
          <strong className="grow">
            {nameOf(uid)} {uid === user.uid && <span className="muted small">({t('family.you')})</span>}
          </strong>
          {members.length > 1 && (
            <button className="btn btn-small btn-ghost" onClick={() => remove(uid)}>
              {uid === user.uid ? t('family.leave') : t('family.remove')}
            </button>
          )}
        </div>
      ))}

      {invite ? (
        <div className="invite stack center">
          <span className="muted small">{t('family.inviteCode')}</span>
          <strong className="invite-code" dir="ltr">
            {formatInviteCode(invite.code)}
          </strong>
          <span className="muted small">{t('family.inviteExpires', { time: time(invite.expiresAt) })}</span>
          <button className="btn btn-primary" onClick={() => share(invite)}>
            📤 {t('family.share')}
          </button>
        </div>
      ) : (
        <button className="btn btn-primary" disabled={busy} onClick={makeInvite}>
          ➕ {t('family.invite')}
        </button>
      )}

      <form className="join-form" onSubmit={join}>
        <strong>{t('family.joinTitle')}</strong>
        <p className="muted small">{t('family.joinHelp')}</p>
        <div className="row">
          <input
            className="grow invite-input"
            dir="ltr"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ABCD-EFGH"
            autoCapitalize="characters"
            autoComplete="off"
            aria-label={t('family.joinTitle')}
          />
          <button className="btn btn-small btn-primary" disabled={busy || !code.trim()}>
            {t('family.join')}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>
    </section>
  );
}
