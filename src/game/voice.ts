// Spoken instructions. Plays pre-recorded clips from /voice/<lang>/<id>.mp3
// (made with `npm run voice`), and falls back to the phone's built-in voice
// for any line without a clip. The on-screen text stays either way.
import i18n from '../i18n/i18n';
import { audioContext, setDuck } from './audio';
import type { VoiceLine } from './voiceLines';

export type { VoiceLine };

const KEY = 'dragonbrush.voice';

export function voiceEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

export function setVoiceEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // Not persisted; applies to this session only.
  }
  if (!on) stopVoice();
  enabled = on;
}

let enabled = voiceEnabled();
let lang: 'en' | 'he' = 'en';
const clips = new Map<string, AudioBuffer>();
let current: { stop(): void; priority: number } | null = null;
const lastSaid = new Map<string, number>();

const langOf = (l: string): 'en' | 'he' => (l.startsWith('he') ? 'he' : 'en');

/**
 * Loads the clips for the current language. Call after unlockAudio() (from
 * the Start tap) so the audio context exists. Missing clips are fine.
 */
export async function loadVoice() {
  enabled = voiceEnabled();
  lang = langOf(i18n.language);
  const ctx = audioContext();
  // iOS only lets speech start from a tap; this silent line unlocks it.
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch {
    // No speech synthesis.
  }
  if (!ctx) return;
  let ids: string[] = [];
  try {
    const r = await fetch('/voice/manifest.json');
    if (r.ok && (r.headers.get('content-type') ?? '').includes('json')) ids = ((await r.json())[lang] as string[]) ?? [];
  } catch {
    // No generated clips yet.
  }
  await Promise.all(
    ids
      .filter((id) => !clips.has(`${lang}/${id}`))
      .map(async (id) => {
        try {
          const data = await (await fetch(`/voice/${lang}/${id}.mp3`)).arrayBuffer();
          clips.set(`${lang}/${id}`, await ctx.decodeAudioData(data));
        } catch {
          // This line falls back to the built-in voice.
        }
      }),
  );
}

function hasBuiltInVoice() {
  try {
    const voices = speechSynthesis.getVoices();
    // Voices load lazily on some browsers; assume English exists meanwhile.
    if (voices.length === 0) return lang === 'en';
    return voices.some((v) => v.lang.toLowerCase().startsWith(lang));
  } catch {
    return false;
  }
}

function speakBuiltIn(text: string, onEnd: () => void) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'he' ? 'he-IL' : 'en-US';
  u.rate = 1.05;
  u.pitch = 1.25;
  u.onend = onEnd;
  u.onerror = onEnd;
  speechSynthesis.speak(u);
  return { stop: () => speechSynthesis.cancel() };
}

export interface SayOptions {
  /** Higher interrupts lower; equal or lower is dropped while something plays. */
  priority?: number;
  /** Don't repeat the same line within this long. */
  cooldownMs?: number;
  /** Always cut off whatever is playing (e.g. 3-2-1). */
  interrupt?: boolean;
  /** If something is playing, say this right after it instead of dropping it. */
  queue?: boolean;
}

/** One line waiting for the current one to finish (newest wins). */
let pending: { id: VoiceLine; opts: SayOptions } | null = null;

/** Returns true if the line started (or was queued), false if it was skipped. */
export function say(id: VoiceLine, opts: SayOptions = {}): boolean {
  const { priority = 1, cooldownMs = 0, interrupt = false, queue = false } = opts;
  if (!enabled) return false;
  const now = performance.now();
  if (cooldownMs && now - (lastSaid.get(id) ?? -Infinity) < cooldownMs) return false;
  if (current) {
    if (!interrupt && current.priority >= priority) {
      if (!queue) return false;
      pending = { id, opts: { ...opts, queue: false } };
      return true;
    }
    const old = current;
    current = null;
    old.stop();
  }
  lastSaid.set(id, now);

  const done = () => {
    if (current === playing) {
      current = null;
      setDuck(false);
      if (pending) {
        const next = pending;
        pending = null;
        say(next.id, next.opts);
      }
    }
  };
  let playing: { stop(): void; priority: number } | null = null;

  const ctx = audioContext();
  const buf = clips.get(`${lang}/${id}`);
  if (ctx && buf) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 1.4;
    src.connect(g).connect(ctx.destination);
    src.onended = done;
    src.start();
    playing = { priority, stop: () => src.stop() };
  } else if (hasBuiltInVoice()) {
    try {
      // Prefer the pronunciation text (Hebrew with niqqud) when there is one.
      const text = i18n.exists(`voiceTts.${id}`) ? i18n.t(`voiceTts.${id}`) : i18n.t(`voice.${id}`);
      playing = { priority, ...speakBuiltIn(text, done) };
    } catch {
      return false;
    }
  } else {
    return false;
  }
  current = playing;
  setDuck(true);
  return true;
}

export function stopVoice() {
  pending = null;
  const old = current;
  current = null;
  old?.stop();
  setDuck(false);
}
