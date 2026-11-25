import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from './AppProvider';
import { LangButton, Screen } from '../ui/ui';
import { aboutUrl, DEMO_MODE, RECAPTCHA_SITE_KEY } from '../config';
import { DragonImg } from '../ui/Preview';
import { DEFAULT_EQUIPPED } from '../rewards/catalog';

export default function LoginScreen() {
  const { repo } = useApp();
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      const code = (e as { code?: string }).code;
      setError(code ? code.replace('auth/', '').replace(/-/g, ' ') : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (DEMO_MODE) run(() => repo.signInDemo(name));
    else if (mode === 'signIn') run(() => repo.signInWithEmail(email, password));
    else run(() => repo.signUpWithEmail(name, email, password));
  };

  return (
    <Screen className="login">
      <div className="login-lang">
        <LangButton />
      </div>
      <DragonImg className="login-dragon bob" equipped={{ ...DEFAULT_EQUIPPED, hat: 'hat.party' }} level={1} />
      <h1 className="logo">{t('app.title')}</h1>
      <p className="tagline">{t('login.tagline')}</p>

      <div className="card login-card">
        <p className="muted small">{t('login.parentOnly')}</p>
        {DEMO_MODE ? (
          <form onSubmit={submit} className="stack">
            <p className="notice">{t('login.demoNote')}</p>
            <input placeholder={t('login.name')} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            <button className="btn btn-primary" disabled={busy}>
              {t('login.demoStart')}
            </button>
          </form>
        ) : (
          <>
            <button className="btn btn-white" disabled={busy} onClick={() => run(() => repo.signInWithGoogle())}>
              <span className="g-logo">G</span> {t('login.google')}
            </button>
            <div className="divider">{t('login.or')}</div>
            <form onSubmit={submit} className="stack">
              {mode === 'signUp' && (
                <input placeholder={t('login.name')} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
              )}
              <input type="email" placeholder={t('login.email')} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              <input
                type="password"
                placeholder={t('login.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                minLength={6}
                required
              />
              <button className="btn btn-primary" disabled={busy}>
                {t(mode === 'signIn' ? 'login.signIn' : 'login.signUp')}
              </button>
            </form>
            <button className="link-btn" onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}>
              {t(mode === 'signIn' ? 'login.toSignUp' : 'login.toSignIn')}
            </button>
          </>
        )}
        {error && <p className="error">{error}</p>}
      </div>
      <p className="muted small center">
        📷🔒 {t('privacy.short')}{' '}
        <Link to="/privacy">{t('privacy.link')}</Link>
      </p>
      <p className="muted small center">
        <a href={aboutUrl(i18n.language)} target="_blank" rel="noopener">
          🐲 {t('about.whatIs')}
        </a>
      </p>
      {RECAPTCHA_SITE_KEY && <p className="recaptcha-note">{t('privacy.recaptcha')}</p>}
    </Screen>
  );
}
