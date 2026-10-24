import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp, useFamilyId } from '../auth/AppProvider';
import { useKid } from '../kids/useKid';
import { Confetti, Modal } from '../ui/ui';
import { DEBUG, DEBUG_ROUND_SECONDS } from '../config';
import type { Kid, SessionResult } from '../data/types';
import { CameraFaceSource, DebugFaceSource, type FaceSource } from './faceTracker';
import { GameRunner, HINT_AFTER_MS, NO_CAMERA_AFTER_MS, type HudState } from './runner';
import { loadVoice, setVoiceEnabled, voiceEnabled, type VoiceLine } from './voice';
import { reportError } from '../errors';
import { birthdayWeekYear, HOLIDAY_EMOJI, holidayToday, withCostume } from '../rewards/seasons';
import { CORNER_ORDER, DEFAULT_CONFIG } from './gameMachine';
import { unlockAudio } from './audio';
import { settingsFor } from './difficulty';
import { tuningEnabled } from './tuningPref';
import TuningOverlay from './TuningOverlay';
import { applySession, type SessionOutcome, WINGS_LEVEL } from '../rewards/scoring';
import { ACHIEVEMENTS } from '../rewards/achievements';
import { itemNameKey } from '../rewards/catalog';

type Stage = 'intro' | 'loading' | 'denied' | 'error' | 'play' | 'saving' | 'summary';

const cfg = DEBUG && DEBUG_ROUND_SECONDS ? { ...DEFAULT_CONFIG, roundMs: DEBUG_ROUND_SECONDS * 1000 } : DEFAULT_CONFIG;

export default function BrushScreen() {
  const kid = useKid();
  const { kidsReady } = useApp();
  if (!kid) return kidsReady ? <Navigate to="/" replace /> : null;
  // Snapshot the kid so a sync mid-game doesn't restart the scene.
  return <BrushGame kid={kid} />;
}

function BrushGame({ kid: initialKid }: { kid: Kid }) {
  const [kid] = useState(initialKid);
  const { repo, user } = useApp();
  const fid = useFamilyId();
  const { t } = useTranslation();
  const nav = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aimRef = useRef<HTMLDivElement>(null);
  const runnerRef = useRef<GameRunner | null>(null);
  const sourceRef = useRef<FaceSource | null>(null);
  const [stage, setStage] = useState<Stage>('intro');
  const [hud, setHud] = useState<HudState | null>(null);
  const [outcome, setOutcome] = useState<SessionOutcome | null>(null);
  const [quitting, setQuitting] = useState(false);
  const [noCamera, setNoCamera] = useState(false);
  const usesCamera = !DEBUG;
  const bg = kid.equipped.bg.split('.')[1];

  const teardown = useCallback(() => {
    runnerRef.current?.stop();
    runnerRef.current = null;
    sourceRef.current?.close();
    sourceRef.current = null;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((tr) => tr.stop());
  }, []);

  useEffect(() => teardown, [teardown]);

  useEffect(() => {
    const onVis = () => runnerRef.current?.setPaused(document.hidden || quitting);
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [quitting]);

  const save = useCallback(
    async (result: SessionResult) => {
      setStage('saving');
      const by = user ? { uid: user.uid, name: user.displayName } : undefined;
      const o = await repo.updateKid(fid, kid.id, (k) => {
        const out = applySession(k, by ? { ...result, by } : result);
        return { stats: out.stats, result: out, session: out.record };
      });
      return o;
    },
    [repo, fid, kid.id, user],
  );

  const onFinished = useCallback(
    async (result: SessionResult) => {
      try {
        const o = await save(result);
        setOutcome(o);
        setStage('summary');
      } catch (e) {
        reportError(e, 'brush-save');
        setStage('error');
      }
    },
    [save],
  );

  const start = async () => {
    unlockAudio();
    // Loads in parallel with the camera; errors just mean no voice clips.
    const voiceReady = loadVoice().catch(() => {});
    setStage('loading');
    try {
      let source: FaceSource;
      if (usesCamera) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        source = await CameraFaceSource.create(v);
      } else {
        source = new DebugFaceSource(rootRef.current!, settingsFor(kid.difficulty));
      }
      sourceRef.current = source;
      const runner = new GameRunner({
        container: rootRef.current!,
        canvas: canvasRef.current!,
        source,
        // Holiday or birthday outfit for the day, in slots the kid left empty.
        kid: { ...kid, equipped: withCostume(kid.equipped, Date.now(), kid.birthday) },
        greeting: greetingFor(kid, Date.now()),
        cfg,
        debug: DEBUG,
        tuning: tuningEnabled(),
        onHud: setHud,
        // Easy mode: move the "where the fire lands" marker every frame,
        // directly, so it follows the head smoothly.
        onAim: (p, fireOn) => {
          const el = aimRef.current;
          const root = rootRef.current;
          if (!el || !root) return;
          el.hidden = !p;
          if (!p) return;
          const m = 24;
          const x = Math.min(root.clientWidth - m, Math.max(m, p.x));
          const y = Math.min(root.clientHeight - m, Math.max(m, p.y));
          el.style.transform = `translate(${x}px, ${y}px)`;
          el.classList.toggle('firing', fireOn);
        },
        onFinished,
      });
      runnerRef.current = runner;
      await voiceReady;
      runner.start();
      setStage('play');
    } catch (e) {
      const name = (e as { name?: string }).name;
      const denied = name === 'NotAllowedError' || name === 'SecurityError';
      // A parent saying no to the camera isn't a bug; anything else is.
      if (!denied) reportError(e, 'brush-start');
      setStage(denied ? 'denied' : 'error');
    }
  };

  const playWithoutCamera = () => {
    runnerRef.current?.playWithoutCamera();
    sourceRef.current?.close();
    sourceRef.current = null;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((tr) => tr.stop());
    setNoCamera(true);
  };

  const stopEarly = async () => {
    const r = runnerRef.current;
    setQuitting(false);
    if (r) {
      const result = r.result(false);
      teardown();
      await save(result).catch(() => {});
    }
    nav(`/kid/${kid.id}`);
  };

  const done = () => {
    teardown();
    nav(`/kid/${kid.id}`);
  };

  const playing = stage === 'play';
  return (
    <div ref={rootRef} className={`brush ${bg !== 'camera' ? `bg-${bg} has-bg` : 'cam-bg'} ${DEBUG ? 'debug' : ''} ${noCamera ? 'no-cam' : ''}`}>
      <video ref={videoRef} className="cam" playsInline muted />
      <canvas ref={canvasRef} className="stage3d" />
      <div ref={aimRef} className="aim-marker" hidden aria-hidden>
        <span />
      </div>

      {playing && hud && <Hud hud={hud} onQuit={() => setQuitting(true)} onNoCamera={playWithoutCamera} />}
      {(hud?.phase === 'celebrate' || stage === 'saving' || stage === 'summary') && <Confetti count={120} />}

      {stage === 'intro' && (
        <div className="overlay">
          <div className="card stack center">
            <span className="big-emoji bob">🐲</span>
            <p>{t('brush.startHint')}</p>
            {DEBUG && <p className="notice small">{t('brush.debug')}</p>}
            <button className="btn btn-brush" onClick={start}>
              {t('brush.start')}
            </button>
            <button className="link-btn" onClick={() => nav(`/kid/${kid.id}`)}>
              {t('common.back')}
            </button>
          </div>
        </div>
      )}
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
            <button className="link-btn" onClick={() => nav(`/kid/${kid.id}`)}>
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
      {stage === 'summary' && outcome && <Summary outcome={outcome} onDone={done} />}

      {quitting && (
        <Modal onClose={() => setQuitting(false)}>
          <div className="stack center">
            <h2>{t('brush.quitTitle')}</h2>
            <p>{t('brush.quitBody')}</p>
            <button className="btn btn-primary" onClick={() => setQuitting(false)}>
              {t('brush.keepGoing')}
            </button>
            <button className="btn btn-ghost" onClick={stopEarly}>
              {t('brush.finishLater')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Birthday wishes win over a holiday greeting. */
function greetingFor(kid: Kid, now: number): VoiceLine | undefined {
  if (birthdayWeekYear(kid.birthday, now) !== null) return 'birthday';
  const h = holidayToday(now);
  return h ? (`hol_${h.holiday}` as VoiceLine) : undefined;
}

/** Speaker toggle for the spoken instructions (remembered on this phone). */
function VoiceButton() {
  const { t } = useTranslation();
  const [on, setOn] = useState(voiceEnabled);
  return (
    <button
      className="icon-btn dark"
      aria-pressed={on}
      aria-label={t('voiceSettings.toggle')}
      onClick={() => {
        setVoiceEnabled(!on);
        setOn(!on);
      }}
    >
      {on ? '🔊' : '🔇'}
    </button>
  );
}

function Hud({ hud, onQuit, onNoCamera }: { hud: HudState; onQuit: () => void; onNoCamera: () => void }) {
  const { t } = useTranslation();
  const r = hud.targetR;
  const circ = 2 * Math.PI * (r - 8);
  const aiming = hud.phase === 'aiming';

  return (
    <div className="hud">
      <div className="hud-top">
        <button className="icon-btn dark" onClick={onQuit} aria-label={t('brush.quit')}>
          ✕
        </button>
        <VoiceButton />
        <div className="total-bar">
          <div style={{ width: `${hud.total * 100}%` }} />
        </div>
        <div className="round-dots">
          {CORNER_ORDER.map((c, i) => (
            <i key={c} className={i < hud.round || hud.phase === 'celebrate' ? 'done' : i === hud.round && hud.phase !== 'ready' && hud.phase !== 'countdown' ? 'now' : ''} />
          ))}
        </div>
      </div>

      {hud.phase === 'ready' && (
        <div className="hud-msg" style={{ top: hud.head.y - 140 }}>
          {hud.faceVisible ? t('brush.lookStraight') : t('brush.findFace')}
        </div>
      )}
      {hud.phase === 'countdown' && hud.countdown > 0 && (
        <div key={hud.countdown} className="countdown" style={{ left: hud.head.x, top: hud.head.y }}>
          {hud.countdown}
        </div>
      )}
      {!hud.faceVisible && hud.phase !== 'ready' && hud.phase !== 'celebrate' && <div className="hud-msg center-msg">{t('brush.where')} 👀</div>}
      {hud.noFaceMs > HINT_AFTER_MS && (
        <div className="no-face-help">
          <div className="hud-hint">📱↔️ {t('brush.fartherHint')}</div>
          {hud.noFaceMs > NO_CAMERA_AFTER_MS && (
            <button className="btn btn-primary no-camera-btn" onClick={onNoCamera}>
              {t('brush.noCamera')}
            </button>
          )}
        </div>
      )}
      {hud.noCamera && hud.phase !== 'celebrate' && hud.phase !== 'done' && <div className="auto-pill">🔥 {t('brush.autoOn')}</div>}

      {aiming && hud.target && (
        <div className={`target ${hud.hitting ? 'hit' : 'idle'}`} style={{ left: hud.target.x, top: hud.target.y, width: r * 2, height: r * 2 }}>
          <svg viewBox={`0 0 ${r * 2} ${r * 2}`}>
            <circle className="ring-bg" cx={r} cy={r} r={r - 8} />
            <circle
              className="ring"
              cx={r}
              cy={r}
              r={r - 8}
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - hud.burn)}
              transform={`rotate(-90 ${r} ${r})`}
            />
          </svg>
          <span className="secs">{hud.secondsLeft}</span>
        </div>
      )}
      {aiming && !hud.hitting && hud.faceVisible && <div className="aim-label">{t('brush.aimHere')}</div>}
      {aiming && hud.target && !hud.hitting && hud.faceVisible && (
        <div
          className="arrow"
          style={{
            left: hud.head.x,
            top: hud.head.y,
            transform: `translate(-50%, -50%) rotate(${Math.atan2(hud.target.y - hud.head.y, hud.target.x - hud.head.x)}rad) translateX(110px)`,
          }}
        >
          ➜
        </div>
      )}
      {hud.tuning && !hud.noCamera && hud.noFaceMs <= HINT_AFTER_MS && <TuningOverlay t={hud.tuning} />}
      {hud.debug && <div className="debug-line">{hud.debug}</div>}
    </div>
  );
}

function Summary({ outcome, onDone }: { outcome: SessionOutcome; onDone: () => void }) {
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
