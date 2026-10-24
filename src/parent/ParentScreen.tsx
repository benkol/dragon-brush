import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DeleteAccountModal from './DeleteAccountModal';
import { useTranslation } from 'react-i18next';
import { useApp, useFamilyId } from '../auth/AppProvider';
import { LangButton, Screen, TopBar, useToast } from '../ui/ui';
import KidForm from '../kids/KidForm';
import LogBrushModal from './LogBrushModal';
import FamilySection from './FamilySection';
import type { Kid } from '../data/types';
import { DEMO_MODE } from '../config';
import { DIFFICULTIES } from '../game/difficulty';
import { setTuningEnabled, tuningEnabled } from '../game/tuningPref';
import { setVoiceEnabled, voiceEnabled } from '../game/voice';
import { applyDentist, applyToothFairy } from '../rewards/scoring';

export default function ParentScreen() {
  const { repo, user, kids, rewards } = useApp();
  const fid = useFamilyId();
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const [editing, setEditing] = useState<Kid | null>(null);
  const [logging, setLogging] = useState<Kid | null>(null);
  const [tuning, setTuning] = useState(tuningEnabled);
  const [voice, setVoice] = useState(voiceEnabled);
  const [deleting, setDeleting] = useState(false);
  const [toast, showToast] = useToast();
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🍦');
  const [price, setPrice] = useState(200);

  const addReward = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || price <= 0) return;
    await repo.addReward(fid, { title: title.trim(), emoji: emoji.trim() || '🎁', price });
    setTitle('');
  };

  /** Lost tooth or dentist visit: a surprise the kid opens next time. */
  const logMoment = async (k: Kid, kind: 'toothFairy' | 'dentist') => {
    if (!confirm(t(`moments.${kind}Confirm`, { name: k.name }))) return;
    const r = await repo.updateKid(fid, k.id, (kid) => {
      const out = (kind === 'toothFairy' ? applyToothFairy : applyDentist)(kid, Date.now());
      return { stats: 'error' in out ? kid : out.stats, result: out };
    });
    showToast('error' in r ? t(`moments.${kind}TooSoon`) : t('moments.done', { name: k.name }));
  };

  const pending = rewards.flatMap((r) => r.redemptions.map((x, i) => ({ r, x, i })).filter(({ x }) => !x.given));
  const how = t('parent.how', { returnObjects: true }) as string[];
  const date = (ms: number) => new Date(ms).toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <Screen className="parent">
      <TopBar back="/" title={t('parent.title')} right={<LangButton />} />

      <section className="card">
        <p className="muted">{t('parent.signedInAs', { name: user?.displayName || user?.email })}</p>
        {DEMO_MODE && <p className="notice">{t('login.demoNote')}</p>}
        <button
          className="btn btn-ghost"
          onClick={async () => {
            await repo.signOut();
            nav('/');
          }}
        >
          {t('parent.signOut')}
        </button>
        <div className="row account-links">
          <Link to="/privacy">📷🔒 {t('privacy.link')}</Link>
          <span className="grow" />
          <button className="link-btn danger-link" onClick={() => setDeleting(true)}>
            {t('deleteAccount.open')}
          </button>
        </div>
      </section>

      <section className="card">
        <h2>{t('parent.kids')}</h2>
        {kids.map((k) => (
          <div key={k.id} className="kid-block">
            <div className="list-row">
              <span className="dot" style={{ background: k.avatarColor }} />
              <strong className="grow">{k.name}</strong>
              <span className="muted">⭐ {k.points}</span>
              <button className="btn btn-small btn-primary" onClick={() => setLogging(k)}>
                🪥 {t('parent.logBrush')}
              </button>
              <button className="btn btn-small btn-ghost" onClick={() => nav(`/parent/history/${k.id}`)} aria-label={t('history.open')}>
                📅
              </button>
              <button className="btn btn-small btn-ghost" onClick={() => setEditing(k)}>
                {t('common.edit')}
              </button>
            </div>
            <div className="difficulty-row">
              <span className="muted small">{t('difficulty.label')}</span>
              <div className="seg" role="radiogroup" aria-label={t('difficulty.label')}>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    role="radio"
                    aria-checked={k.difficulty === d}
                    className={k.difficulty === d ? 'on' : ''}
                    onClick={() => repo.setDifficulty(fid, k.id, d)}
                  >
                    {t(`difficulty.${d}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="difficulty-row">
              <span className="muted small">{t('moments.label')}</span>
              <button className="btn btn-small btn-ghost" onClick={() => logMoment(k, 'toothFairy')}>
                🧚 {t('moments.tooth')}
              </button>
              <button className="btn btn-small btn-ghost" onClick={() => logMoment(k, 'dentist')}>
                🦷 {t('moments.dentist')}
              </button>
            </div>
          </div>
        ))}
        <p className="muted small">{t('difficulty.help')}</p>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={voice}
            onChange={(e) => {
              setVoiceEnabled(e.target.checked);
              setVoice(e.target.checked);
            }}
          />
          <span>
            <strong>{t('voiceSettings.toggle')}</strong>
            <span className="muted small">{t('voiceSettings.help')}</span>
          </span>
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={tuning}
            onChange={(e) => {
              setTuningEnabled(e.target.checked);
              setTuning(e.target.checked);
            }}
          />
          <span>
            <strong>{t('tuning.toggle')}</strong>
            <span className="muted small">{t('tuning.toggleHelp')}</span>
          </span>
        </label>
      </section>

      <FamilySection onToast={showToast} />

      <section className="card">
        <h2>{t('parent.toGive')}</h2>
        {pending.length === 0 && <p className="muted">{t('parent.noneToGive')}</p>}
        {pending.map(({ r, x, i }) => (
          <div key={`${r.id}-${i}`} className="list-row">
            <span className="prize-emoji">{r.emoji}</span>
            <div className="grow">
              <strong>{r.title}</strong>
              <div className="muted small">
                {x.kidName} · {date(x.at)}
              </div>
            </div>
            <button className="btn btn-small btn-primary" onClick={() => repo.markRewardGiven(fid, r, i)}>
              {t('parent.markGiven')}
            </button>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>{t('parent.rewards')}</h2>
        <p className="muted small">{t('parent.rewardsHelp')}</p>
        {rewards.map((r) => (
          <div key={r.id} className="list-row">
            <span className="prize-emoji">{r.emoji}</span>
            <strong className="grow">{r.title}</strong>
            <span className="muted">⭐ {r.price}</span>
            <button className="btn btn-small btn-ghost" onClick={() => repo.deleteReward(fid, r.id)} aria-label={t('common.delete')}>
              ✕
            </button>
          </div>
        ))}
        <form className="reward-form" onSubmit={addReward}>
          <input className="emoji-input" value={emoji} onChange={(e) => setEmoji(e.target.value)} aria-label={t('parent.rewardEmoji')} maxLength={4} />
          <input className="grow" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('parent.rewardTitle')} required />
          <input type="number" className="price-input" value={price} min={1} onChange={(e) => setPrice(Number(e.target.value))} aria-label={t('parent.rewardPrice')} />
          <button className="btn btn-small btn-primary">{t('parent.add')}</button>
        </form>
      </section>

      <section className="card">
        <h2>{t('parent.howTitle')}</h2>
        <ul className="how">
          {how.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      {editing && <KidForm kid={editing} onClose={() => setEditing(null)} />}
      {logging && <LogBrushModal kid={logging} onClose={() => setLogging(null)} onDone={showToast} />}
      {deleting && <DeleteAccountModal onClose={() => setDeleting(false)} />}
      {toast}
    </Screen>
  );
}
