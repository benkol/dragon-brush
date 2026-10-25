// "Brush by myself": the phone stands in front of the kid, the dragon
// brushes along, and big pictures show where to brush and for how long.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp, useFamilyId } from '../auth/AppProvider';
import { useKid } from '../kids/useKid';
import { Confetti } from '../ui/ui';
import { DEBUG, DEBUG_ROUND_SECONDS } from '../config';
import type { Kid, SessionResult } from '../data/types';
import type { FaceSource } from './faceTracker';
import { SoloRunner, type SoloHud } from './soloRunner';
import { SOLO_CONFIG } from './soloMachine';
import { CORNER_ORDER } from './gameMachine';
import { loadVoice } from './voice';
import { reportError } from '../errors';
import { withCostume } from '../rewards/seasons';
import { unlockAudio } from './audio';
import { applySession, type SessionOutcome } from '../rewards/scoring';
import { BrushStages, greetingFor, NoFaceHelp, openFaceSource, QuitModal, stopCamera, VoiceButton, type Stage } from './brushShared';
import { MouthMap, StepRing, ToothSide } from './MouthMap';

const cfg = DEBUG && DEBUG_ROUND_SECONDS ? { ...SOLO_CONFIG, zoneMs: DEBUG_ROUND_SECONDS * 1000 } : SOLO_CONFIG;

export default function SoloBrushScreen() {
  const kid = useKid();
  const { kidsReady } = useApp();
  if (!kid) return kidsReady ? <Navigate to="/" replace /> : null;
  return <SoloGame kid={kid} />;
}

function SoloGame({ kid: initialKid }: { kid: Kid }) {
  const [kid] = useState(initialKid);
  const { repo, user } = useApp();
  const fid = useFamilyId();
  const { t } = useTranslation();
  const nav = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runnerRef = useRef<SoloRunner | null>(null);
  const sourceRef = useRef<FaceSource | null>(null);
  const [stage, setStage] = useState<Stage>('intro');
  const [hud, setHud] = useState<SoloHud | null>(null);
  const [outcome, setOutcome] = useState<SessionOutcome | null>(null);
  const [quitting, setQuitting] = useState(false);
  const [noCamera, setNoCamera] = useState(false);
  const bg = kid.equipped.bg.split('.')[1];

  const teardown = useCallback(() => {
    runnerRef.current?.stop();
    runnerRef.current = null;
    sourceRef.current?.close();
    sourceRef.current = null;
    stopCamera(videoRef.current);
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
      return repo.updateKid(fid, kid.id, (k) => {
        const out = applySession(k, by ? { ...result, by } : result);
        return { stats: out.stats, result: out, session: out.record };
      });
    },
    [repo, fid, kid.id, user],
  );

  const onFinished = useCallback(
    async (result: SessionResult) => {
      try {
        setOutcome(await save(result));
        setStage('summary');
      } catch (e) {
        reportError(e, 'solo-save');
        setStage('error');
      }
    },
    [save],
  );

  const start = async () => {
    unlockAudio();
    const voiceReady = loadVoice().catch(() => {});
    setStage('loading');
    try {
      const source = await openFaceSource(!DEBUG, videoRef.current!, rootRef.current!, kid);
      sourceRef.current = source;
      const runner = new SoloRunner({
        container: rootRef.current!,
        canvas: canvasRef.current!,
        source,
        kid: { ...kid, equipped: withCostume(kid.equipped, Date.now(), kid.birthday) },
        greeting: greetingFor(kid, Date.now()),
        cfg,
        debug: DEBUG,
        onHud: setHud,
        onFinished,
      });
      runnerRef.current = runner;
      await voiceReady;
      runner.start();
      setStage('play');
    } catch (e) {
      const name = (e as { name?: string }).name;
      const denied = name === 'NotAllowedError' || name === 'SecurityError';
      if (!denied) reportError(e, 'solo-start');
      setStage(denied ? 'denied' : 'error');
    }
  };

  const playWithoutCamera = () => {
    runnerRef.current?.playWithoutCamera();
    sourceRef.current?.close();
    sourceRef.current = null;
    stopCamera(videoRef.current);
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

  return (
    <div ref={rootRef} className={`brush solo ${bg !== 'camera' ? `bg-${bg} has-bg` : 'cam-bg'} ${DEBUG ? 'debug' : ''} ${noCamera ? 'no-cam' : ''}`}>
      <video ref={videoRef} className="cam" playsInline muted />
      <canvas ref={canvasRef} className="stage3d" />

      {stage === 'play' && hud && <SoloHudView hud={hud} onQuit={() => setQuitting(true)} onNoCamera={playWithoutCamera} />}
      {(hud?.phase === 'celebrate' || stage === 'saving' || stage === 'summary') && <Confetti count={120} />}

      {stage === 'intro' && (
        <div className="overlay">
          <div className="card stack center">
            <span className="big-emoji bob">🪥🐲</span>
            <h2>{t('solo.title')}</h2>
            <p>{t('solo.startHint')}</p>
            <ul className="solo-tips">
              <li>🫛 {t('solo.pea')}</li>
              <li>🌀 {t('solo.circles')}</li>
            </ul>
            {DEBUG && <p className="notice small">{t('brush.debug')}</p>}
            <button className="btn btn-brush" onClick={start}>
              {t('solo.start')}
            </button>
            <button className="link-btn" onClick={() => nav(`/kid/${kid.id}`)}>
              {t('common.back')}
            </button>
          </div>
        </div>
      )}
      <BrushStages stage={stage} kidId={kid.id} outcome={outcome} onDone={done} />
      {quitting && <QuitModal onKeepGoing={() => setQuitting(false)} onStop={stopEarly} />}
    </div>
  );
}

function SoloHudView({ hud, onQuit, onNoCamera }: { hud: SoloHud; onQuit: () => void; onNoCamera: () => void }) {
  const { t } = useTranslation();
  const { step } = hud;
  const brushing = hud.phase === 'brushing';
  const finished = hud.phase === 'spit' || hud.phase === 'celebrate' || hud.phase === 'done';
  // Zones before the current one are done; all of them once the tongue starts.
  const done = finished ? CORNER_ORDER : CORNER_ORDER.slice(0, brushing ? step.round : 0);

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
            <i key={c} className={done.includes(c) ? 'done' : brushing && i === step.round ? 'now' : ''} />
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
      {brushing && !hud.present && <div className="hud-msg center-msg">⏸ {t('solo.away')} 👀</div>}
      <NoFaceHelp noFaceMs={hud.noFaceMs} onNoCamera={onNoCamera} />
      {hud.noCamera && !finished && <div className="auto-pill">⏱️ {t('solo.autoOn')}</div>}

      {hud.phase === 'spit' && (
        <div className="solo-panel spit pop-in">
          <span className="big-emoji">💦🚫🚰</span>
          <strong>{t('solo.spit')}</strong>
        </div>
      )}
      {(brushing || hud.phase === 'countdown') && (
        <div key={hud.stepIndex} className={`solo-panel ${hud.present ? '' : 'paused'}`}>
          <div className="solo-title">
            <strong>{step.zone ? t(`solo.zone.${step.zone}`) : t('solo.surface.tongue')}</strong>
            {step.zone && <span>{t(`solo.surface.${step.surface}`)}</span>}
            {step.tip && <small>☝️ {t('solo.tipFront')}</small>}
          </div>
          <div className="solo-pics">
            <MouthMap zone={step.zone} surface={step.surface} done={done} />
            <div className="solo-side">
              <ToothSide surface={step.surface} upper={step.zone?.startsWith('T') ?? false} />
              <StepRing p={hud.stepP} seconds={hud.secondsLeft} />
            </div>
          </div>
        </div>
      )}
      {hud.debug && <div className="debug-line">{hud.debug}</div>}
    </div>
  );
}
