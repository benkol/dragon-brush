// The app is made for a phone (front camera, held or on a stand), so on a
// computer we say so once per visit. It can still be used there.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './ui';

const KEY = 'dragonbrush.desktopNoticeSeen';

/** A mouse and no touch screen: a desktop or laptop. */
function isDesktop() {
  try {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches && !navigator.maxTouchPoints;
  } catch {
    return false;
  }
}

function seen() {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export default function DesktopNotice() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(() => isDesktop() && !seen());
  if (!open) return null;

  const close = () => {
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      // Shows again next load; that's fine.
    }
    setOpen(false);
  };

  return (
    <Modal onClose={close}>
      <div className="stack center desktop-notice">
        <span className="big-emoji">📱🐲</span>
        <h2>{t('desktop.title')}</h2>
        <p>{t('desktop.body')}</p>
        {/* Made by scripts/make-qr.mjs; points to the app. */}
        <img className="desktop-qr" src="/qr.svg" alt={t('desktop.qrAlt')} width={180} height={180} />
        <p className="muted small">{t('desktop.scan')}</p>
        <p className="desktop-url" dir="ltr">
          dragon-brush.web.app
        </p>
        <button className="btn btn-primary" onClick={close}>
          {t('desktop.continue')}
        </button>
      </div>
    </Modal>
  );
}
