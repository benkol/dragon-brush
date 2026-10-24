import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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

const TABS = ['account', 'kids', 'family', 'prizes', 'points'] as const;
type Tab = (typeof TABS)[number];

export default function ParentScreen() {
  const { rewards } = useApp();
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [toast, showToast] = useToast();
  // The tab is in the address so "back" from a kid's history returns to it;
  // invite links (?join=) open the Family tab.
  const asked = params.get('tab') as Tab | null;
  const tab: Tab = asked && TABS.includes(asked) ? asked : params.has('join') ? 'family' : 'kids';
  const pending = rewards.reduce((n, r) => n + r.redemptions.filter((x) => !x.given).length, 0);

  const select = (next: Tab) => {
    params.set('tab', next);
    setParams(params, { replace: true });
  };

  return (
    <Screen className="parent">
      <TopBar back="/" title={t('parent.title')} right={<LangButton />} />
      <div className="tabs parent-tabs" role="tablist">
        {TABS.map((id) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => select(id)}>
            {t(`parentTabs.${id}`)}
            {id === 'prizes' && pending > 0 && <span className="tab-badge">{pending}</span>}
          </button>
        ))}
      </div>

      {tab === 'account' && <AccountTab />}
      {tab === 'kids' && <KidsTab onToast={showToast} />}
      {tab === 'family' && <FamilySection onToast={showToast} />}
      {tab === 'prizes' && <PrizesTab />}
      {tab === 'points' && <PointsTab />}
      {toast}
    </Screen>
  );
}

function AccountTab() {
  const { repo, user } = useApp();
  const { t } = useTranslation();
  const nav = useNavigate();
  const [tuning, setTuning] = useState(tuningEnabled);
  const [voice, setVoice] = useState(voiceEnabled);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
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
        <h2>📱 {t('parent.thisPhone')}</h2>
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
      {deleting && <DeleteAccountModal onClose={() => setDeleting(false)} />}
    </>
  );
}

function KidsTab({ onToast }: { onToast: (text: string) => void }) {
  const { repo, kids } = useApp();
  const fid = useFamilyId();
  const { t } = useTranslation();
  const nav = useNavigate();
  const [editing, setEditing] = useState<Kid | null>(null);
  const [logging, setLogging] = useState<Kid | null>(null);

  /** Lost tooth or dentist visit: a surprise the kid opens next time. */
  const logMoment = async (k: Kid, kind: 'toothFairy' | 'dentist') => {
    if (!confirm(t(`moments.${kind}Confirm`, { name: k.name }))) return;
    const r = await repo.updateKid(fid, k.id, (kid) => {
      const out = (kind === 'toothFairy' ? applyToothFairy : applyDentist)(kid, Date.now());
      return { stats: 'error' in out ? kid : out.stats, result: out };
    });
    onToast('error' in r ? t(`moments.${kind}TooSoon`) : t('moments.done', { name: k.name }));
  };

  return (
    <>
      {kids.length === 0 && <p className="muted center">{t('kids.empty')}</p>}
      {kids.map((k) => (
        <section key={k.id} className="card parent-kid" style={{ ['--kid' as string]: k.avatarColor }}>
          <div className="parent-kid-head">
            <span className="dot" />
            {/* <bdi> keeps a Hebrew name and the points from mixing up. */}
            <bdi className="parent-kid-name">{k.name}</bdi>
            <span className="chip chip-points small">⭐ {k.points}</span>
          </div>

          <div className="parent-kid-actions">
            <button className="btn btn-small btn-primary" onClick={() => setLogging(k)}>
              🪥 {t('parent.logBrushFull')}
            </button>
            <button className="btn btn-small btn-ghost" onClick={() => nav(`/parent/history/${k.id}`)}>
              📅 {t('history.short')}
            </button>
            <button className="btn btn-small btn-ghost" onClick={() => setEditing(k)}>
              ✏️ {t('common.edit')}
            </button>
          </div>

          <div className="parent-kid-setting">
            <span className="muted small">{t('difficulty.label')}</span>
            <div className="seg" role="radiogroup" aria-label={t('difficulty.label')}>
              {DIFFICULTIES.map((d) => (
                <button key={d} role="radio" aria-checked={k.difficulty === d} className={k.difficulty === d ? 'on' : ''} onClick={() => repo.setDifficulty(fid, k.id, d)}>
                  {t(`difficulty.${d}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="parent-kid-setting">
            <span className="muted small">{t('moments.label')}</span>
            <div className="row">
              <button className="btn btn-small btn-ghost" onClick={() => logMoment(k, 'toothFairy')}>
                🧚 {t('moments.tooth')}
              </button>
              <button className="btn btn-small btn-ghost" onClick={() => logMoment(k, 'dentist')}>
                🦷 {t('moments.dentist')}
              </button>
            </div>
          </div>
        </section>
      ))}
      <p className="muted small">{t('difficulty.help')}</p>
      {editing && <KidForm kid={editing} onClose={() => setEditing(null)} />}
      {logging && <LogBrushModal kid={logging} onClose={() => setLogging(null)} onDone={onToast} />}
    </>
  );
}

function PrizesTab() {
  const { repo, rewards } = useApp();
  const fid = useFamilyId();
  const { t, i18n } = useTranslation();
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🍦');
  const [price, setPrice] = useState(200);

  const addReward = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || price <= 0) return;
    await repo.addReward(fid, { title: title.trim(), emoji: emoji.trim() || '🎁', price });
    setTitle('');
  };

  const pending = rewards.flatMap((r) => r.redemptions.map((x, i) => ({ r, x, i })).filter(({ x }) => !x.given));
  const date = (ms: number) => new Date(ms).toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <>
      <section className="card">
        <h2>🎁 {t('parent.toGive')}</h2>
        <p className="muted small">{t('parent.toGiveHelp')}</p>
        {pending.length === 0 && <p className="muted">{t('parent.noneToGive')}</p>}
        {pending.map(({ r, x, i }) => (
          <div key={`${r.id}-${i}`} className="list-row">
            <span className="prize-emoji">{r.emoji}</span>
            <div className="grow">
              <strong>{r.title}</strong>
              <div className="muted small">
                <bdi>{x.kidName}</bdi> · {date(x.at)}
              </div>
            </div>
            <button className="btn btn-small btn-primary" onClick={() => repo.markRewardGiven(fid, r, i)}>
              {t('parent.markGiven')}
            </button>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>📋 {t('parent.rewards')}</h2>
        <p className="muted small">{t('parent.rewardsHelp')}</p>
        {rewards.map((r) => (
          <div key={r.id} className="list-row">
            <span className="prize-emoji">{r.emoji}</span>
            <strong className="grow">{r.title}</strong>
            <span className="chip chip-points small">⭐ {r.price}</span>
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
    </>
  );
}

function PointsTab() {
  const { t } = useTranslation();
  const how = t('parent.how', { returnObjects: true }) as string[];
  return (
    <section className="card">
      <h2>{t('parent.howTitle')}</h2>
      <ul className="how">
        {how.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
