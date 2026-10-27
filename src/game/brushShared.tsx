// Pieces shared by the aiming game and "brush by myself".
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Kid } from '../data/types';
import { Modal } from '../ui/ui';
import { useApp, useFamilyId } from '../auth/AppProvider';
import { reportError } from '../errors';
import { HINT_AFTER_MS, NO_CAMERA_AFTER_MS } from './runner';
import { CameraFaceSource, DebugFaceSource, type FaceSource } from './faceTracker';
import { setVoiceEnabled, voiceEnabled, type VoiceLine } from './voice';
import { birthdayWeekYear, HOLIDAY_EMOJI, holidayToday } from '../rewards/seasons';
import { settingsFor } from './difficulty';
import { type SessionOutcome, WINGS_LEVEL } from '../rewards/scoring';
import { ACHIEVEMENTS } from '../rewards/achievements';
import { itemNameKey } from '../rewards/catalog';

export type Stage = 'intro' | 'loading' | 'denied' | 'error' | 'play' | 'saving' | 'summary';

/** Loading, camera problems, saving and the summary. */
export function BrushStages({ stage, kidId, outcome, onDone }: { stage: Stage; kidId: string; outcome: SessionOutcome | null; onDone: () => void }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  return (
    <>
      {stage === 'loading' && (
        <div className="overlay">
          <div className="spinner" />
          <p className="overlay-text">{t('brush.camLoading')}</p>
        </div>
      )}
      {(stage === 'denied' || stage === 'error') && (
        <div className="overlay">
          <div className="card stack center">
            <span className="big-emoji">📷</span>
            <h2>{stage === 'denied' ? t('brush.camDenied') : t('common.error')}</h2>
            {stage === 'denied' && <p>{t('brush.camDeniedHelp')}</p>}
            <button className="btn btn-primary" onClick={() => location.reload()}>
              {t('brush.tryAgain')}
            </button>
            <button className="link-btn" onClick={() => nav(`/kid/${kidId}`)}>
              {t('common.back')}
            </button>
          </div>
        </div>
      )}
      {stage === 'saving' && (
        <div className="overlay clear">
          <p className="overlay-text">{t('brush.saving')}</p>
        </div>
      )}
      {stage === 'summary' && outcome && <Summary outcome={outcome} onDone={onDone} />}
    </>
  );
}

export function QuitModal({ onKeepGoing, onStop }: { onKeepGoing: () => void; onStop: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal onClose={onKeepGoing}>
      <div className="stack center">
        <h2>{t('brush.quitTitle')}</h2>
        <p>{t('brush.quitBody')}</p>
        <button className="btn btn-primary" onClick={onKeepGoing}>
          {t('brush.keepGoing')}
        </button>
        <button className="btn btn-ghost" onClick={onStop}>
          {t('brush.finishLater')}
        </button>
      </div>
    </Modal>
  );
}

/** "Hold the phone farther" after a while without a face, then the no-camera offer. */
export function NoFaceHelp({ noFaceMs, onNoCamera }: { noFaceMs: number; onNoCamera: () => void }) {
  const { t } = useTranslation();
  if (noFaceMs <= HINT_AFTER_MS) return null;
  return (
    <div className="no-face-help">
      <div className="hud-hint">📱↔️ {t('brush.fartherHint')}</div>
      {noFaceMs > NO_CAMERA_AFTER_MS && (
        <button className="btn btn-primary no-camera-btn" onClick={onNoCamera}>
          {t('brush.noCamera')}
        </button>
      )}
    </div>
  );
}

/** Front camera + face tracker, or the pointer-driven debug face. */
export async function openFaceSource(useCamera: boolean, video: HTMLVideoElement, root: HTMLElement, kid: Kid): Promise<FaceSource> {
  if (!useCamera) return new DebugFaceSource(root, settingsFor(kid.difficulty));
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  return CameraFaceSource.create(video);
}

export function stopCamera(video: HTMLVideoElement | null) {
  const stream = video?.srcObject as MediaStream | null;
  stream?.getTracks().forEach((tr) => tr.stop());
}

/** Birthday wishes win over a holiday greeting. */
export function greetingFor(kid: Kid, now: number): VoiceLine | undefined {
  if (birthdayWeekYear(kid.birthday, now) !== null) return 'birthday';
  const h = holidayToday(now);
  return h ? (`hol_${h.holiday}` as VoiceLine) : undefined;
}

/** Speaker toggle for the spoken instructions, saved as this kid's setting. */
export function VoiceButton({ kidId }: { kidId: string }) {
  const { t } = useTranslation();
  const { repo } = useApp();
  const fid = useFamilyId();
  const [on, setOn] = useState(voiceEnabled);
  return (
    <button
      className="icon-btn dark"
      aria-pressed={on}
      aria-label={t('voiceSettings.toggle')}
      onClick={() => {
        setVoiceEnabled(!on);
        setOn(!on);
        repo.setKidVoice(fid, kidId, !on).catch((e) => reportError(e, 'kid-voice'));
      }}
    >
      {on ? '🔊' : '🔇'}
    </button>
  );
}

export function Summary({ outcome, onDone }: { outcome: SessionOutcome; onDone: () => void }) {
  const { t } = useTranslation();
  const o = outcome;
  const extra: string[] = [];
  if (o.hatched) extra.push(`🐣 ${t('summary.hatched', { name: t(itemNameKey(o.hatched)) })}`);
  if (o.levelUp) {
    extra.push(`⬆️ ${t('summary.levelUp', { name: t(itemNameKey(o.levelUp.dragon)), level: o.levelUp.level })}`);
    if (o.levelUp.level === WINGS_LEVEL) extra.push(`🪽 ${t('summary.wings')}`);
  }
  if (o.goldUnlocked) extra.push(t('summary.goldUnlocked'));
  if (o.weeklyDone) extra.push(`🏆 ${t('summary.weekly')}`);
  if (o.birthday) extra.push(`🎂 ${t(o.birthday.hat ? 'summary.birthdayHat' : 'summary.birthday')}`);
  if (o.anniversary) extra.push(`🥇 ${t(o.anniversary.cake ? 'summary.anniversaryCake' : 'summary.anniversary', { count: o.anniversary.years })}`);
  if (o.holiday) extra.push(`${HOLIDAY_EMOJI[o.holiday]} ${t('summary.holiday', { holiday: t(`holidayName.${o.holiday}`) })}`);
  if (o.shieldUsed) extra.push(t('summary.shieldUsed'));
  if (o.shieldEarned) extra.push(t('summary.shieldEarned'));

  return (
    <div className="overlay">
      <div className="card summary stack center pop-in">
        <span className="big-emoji">🦷✨</span>
        <h2>{t('summary.title')}</h2>
        {o.record.counted ? (
          <ul className="bonus-list">
            {o.record.bonuses.map((b) => (
              <li key={b.key}>
                <span>{t(`bonus.${b.key}`, b.values)}</span>
                <strong>+{b.points}</strong>
              </li>
            ))}
            <li className="total">
              <span>{t('summary.total')}</span>
              <strong>⭐ {o.record.pointsAwarded}</strong>
            </li>
          </ul>
        ) : (
          <p>{t(`summary.notCounted.${o.notCountedReason}`)}</p>
        )}
        <p className="streak-line">🔥 {t('summary.streak', { count: o.stats.streak })}</p>
        {extra.map((x) => (
          <p key={x} className="extra">
            {x}
          </p>
        ))}
        {o.newAchievements.length > 0 && (
          <div className="new-stickers">
            <strong>{t('summary.newStickers')}</strong>
            <div className="row center">
              {o.newAchievements.map((id) => (
                <span key={id} className="sticker mini got">
                  <span className="sticker-emoji">{ACHIEVEMENTS.find((a) => a.id === id)?.emoji}</span>
                  <small>{t(`achievements.${id}.name`)}</small>
                </span>
              ))}
            </div>
          </div>
        )}
        <button className="btn btn-primary" onClick={onDone}>
          {t('common.done')}
        </button>
      </div>
    </div>
  );
}
