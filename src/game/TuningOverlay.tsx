import { useTranslation } from 'react-i18next';
import type { TuningReadout } from './runner';

/**
 * Live readout for a parent picking a difficulty: where the fire lands, how
 * far the head turns compared with what's needed, and the mouth meter with
 * its on/off thresholds.
 */
export default function TuningOverlay({ t: r }: { t: TuningReadout }) {
  const { t } = useTranslation();
  const pct = (v: number) => `${Math.round(Math.min(1, Math.max(0, v)) * 100)}%`;
  const turn = (have: number, need: number) => (
    <span className={Math.abs(have) >= need ? 'ok' : ''}>
      {Math.round(Math.abs(have))}° / {Math.round(need)}°
    </span>
  );

  return (
    <>
      <div className="tuning-aim" style={{ left: r.aim.x, top: r.aim.y }} />
      <div className="tuning-panel" dir="ltr">
        <div className="tuning-row">
          <span>↔ {t('tuning.turn')}</span>
          {turn(r.yaw, r.needYaw)}
        </div>
        <div className="tuning-row">
          <span>↕ {t('tuning.tilt')}</span>
          {turn(r.pitch, r.needPitch)}
        </div>
        <div className="tuning-row">
          <span>👄 {t('tuning.mouth')}</span>
          <span className={r.jaw > r.jawOn ? 'ok' : ''}>{pct(r.jaw)}</span>
        </div>
        <div className="tuning-meter">
          <div className="fill" style={{ width: pct(r.jaw) }} />
          <i className="on" style={{ left: pct(r.jawOn) }} />
          <i className="off" style={{ left: pct(r.jawOff) }} />
        </div>
      </div>
    </>
  );
}
