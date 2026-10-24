// Sound effects are synthesized with Web Audio, so there are no effect
// files. Voice lines (voice.ts) play through the same context.
let ctx: AudioContext | null = null;
/** Fire/sizzle volume factor; lowered while a voice line plays. */
let duck = 1;
let master: GainNode;
let noise: AudioBuffer;
let fireGain: GainNode | null = null;
let sizzleGain: GainNode | null = null;
let loopSources: AudioBufferSourceNode[] = [];

function makeNoise(c: AudioContext) {
  const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

/** Must be called from a user gesture (iOS). */
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
    noise = makeNoise(ctx);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export const audioContext = () => ctx;

/** Quiets the fire so a voice line can be heard. */
export function setDuck(on: boolean) {
  duck = on ? 0.3 : 1;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slideTo?: number) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  o.connect(g).connect(master);
  o.start(start);
  o.stop(start + dur + 0.05);
}

function noiseBurst(start: number, dur: number, freq: number, vol: number, q = 1) {
  if (!ctx) return;
  const s = ctx.createBufferSource();
  s.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  s.connect(f).connect(g).connect(master);
  s.start(start, Math.random());
  s.stop(start + dur + 0.05);
}

function loop(filterType: BiquadFilterType, freq: number, q: number): GainNode | null {
  if (!ctx) return null;
  const s = ctx.createBufferSource();
  s.buffer = noise;
  s.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = filterType;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = 0;
  s.connect(f).connect(g).connect(master);
  s.start();
  loopSources.push(s);
  return g;
}

/** Starts the continuous fire/sizzle loops (silent until enabled). */
export function startLoops() {
  if (!ctx || fireGain) return;
  fireGain = loop('lowpass', 700, 0.8);
  sizzleGain = loop('highpass', 4500, 0.5);
}

export function stopLoops() {
  loopSources.forEach((s) => s.stop());
  loopSources = [];
  fireGain = sizzleGain = null;
}

export function setFire(on: boolean, sizzling: boolean) {
  if (!ctx) return;
  const t = ctx.currentTime;
  fireGain?.gain.setTargetAtTime(on ? 0.55 * duck : 0, t, 0.05);
  sizzleGain?.gain.setTargetAtTime(sizzling ? 0.12 * duck : 0, t, 0.08);
}

export const sfx = {
  countdown(n: number) {
    if (!ctx) return;
    tone(n > 0 ? 660 : 990, ctx.currentTime, 0.18, 'triangle', 0.35);
  },
  go() {
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(880, t, 0.12, 'square', 0.15);
    tone(1320, t + 0.1, 0.25, 'square', 0.15);
  },
  newTarget() {
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(500, t, 0.12, 'sine', 0.25, 900);
    tone(900, t + 0.1, 0.1, 'sine', 0.2);
  },
  chomp() {
    if (!ctx) return;
    const t = ctx.currentTime + 0.55;
    tone(160, t, 0.12, 'square', 0.3, 60);
    noiseBurst(t, 0.12, 1800, 0.5, 0.7);
    for (let i = 1; i <= 3; i++) {
      tone(220, t + i * 0.22, 0.08, 'sine', 0.15, 120);
      noiseBurst(t + i * 0.22, 0.06, 2500, 0.2, 0.7);
    }
  },
  yuck() {
    if (!ctx) return;
    const t = ctx.currentTime + 0.7;
    tone(300, t, 0.4, 'sawtooth', 0.12, 120);
  },
  fanfare() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    const times = [0, 0.12, 0.24, 0.36, 0.56, 0.68, 0.8];
    notes.forEach((n, i) => {
      tone(n, t + times[i], i === notes.length - 1 ? 0.9 : 0.2, 'triangle', 0.28);
      tone(n * 2, t + times[i], 0.15, 'sine', 0.08);
    });
    for (let i = 0; i < 12; i++) tone(1800 + Math.random() * 1600, t + 1 + i * 0.07, 0.1, 'sine', 0.06);
  },
  pop() {
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(600, t, 0.12, 'sine', 0.3, 1200);
    tone(1200, t + 0.08, 0.15, 'triangle', 0.15);
  },
};
