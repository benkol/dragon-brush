import { useTranslation } from 'react-i18next';
import { LangButton, Screen, TopBar } from './ui/ui';

const SECTIONS = ['camera', 'stored', 'who', 'errors', 'notDone', 'google', 'device', 'delete', 'kids'] as const;

/** Plain-language privacy note. Open to everyone, signed in or not. */
export default function PrivacyScreen() {
  const { t } = useTranslation();
  return (
    <Screen className="privacy">
      <TopBar back="/" title={t('privacy.title')} right={<LangButton />} />
      <section className="card privacy-short">
        <span className="big-emoji">📷🔒</span>
        <strong>{t('privacy.short')}</strong>
      </section>
      {SECTIONS.map((s) => (
        <section key={s} className="card">
          <h2>{t(`privacy.${s}.title`)}</h2>
          <ul className="how">
            {(t(`privacy.${s}.points`, { returnObjects: true }) as string[]).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ))}
      <p className="muted small center">{t('privacy.updated')}</p>
    </Screen>
  );
}
