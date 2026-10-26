// Illustrations for "brush by myself": which part of the mouth to brush
// (shown as in a mirror, like the camera) and which side of the teeth.
import type { Corner } from './gameMachine';
import type { Surface } from './soloMachine';

const TOOTH_W = 30;
const GAP = 4;
/** Front teeth are a bit longer than the back ones. */
const TOOTH_H = [44, 40, 36, 32];

/** Stain spots on a tooth, as fractions of its size; varied per tooth so they look natural. */
const STAINS = [
  [
    [0.3, 0.35, 0.16],
    [0.68, 0.7, 0.12],
  ],
  [
    [0.62, 0.3, 0.13],
    [0.32, 0.72, 0.15],
  ],
  [
    [0.45, 0.5, 0.18],
    [0.75, 0.22, 0.09],
  ],
];

interface MapProps {
  zone: Corner | null;
  surface: Surface;
  /** Zones already brushed. */
  done: Corner[];
  /** 0 → 1 through the current zone: its stains fade as it gets brushed. */
  zoneP: number;
}

/**
 * Front view of an open mouth, split into four zones. Teeth not brushed yet
 * have stains, the zone being brushed has a blue outline and sparkles while
 * its stains fade, and brushed teeth are clean white.
 */
export function MouthMap({ zone, surface, done, zoneP }: MapProps) {
  const teeth = (upper: boolean) =>
    [1, -1].flatMap((side) =>
      TOOTH_H.map((h, i) => {
        const c: Corner = `${upper ? 'T' : 'B'}${side > 0 ? 'R' : 'L'}` as Corner;
        const x = side > 0 ? 152 + i * (TOOTH_W + GAP) : 148 - (i + 1) * TOOTH_W - i * GAP;
        const y = upper ? 40 : 180 - h;
        const now = c === zone;
        const clean = done.includes(c);
        const stains = clean ? 0 : now ? 1 - zoneP : 1;
        const k = (i + (upper ? 0 : 1) + (side > 0 ? 0 : 2)) % STAINS.length;
        return (
          <g key={`${c}${i}`} className={now ? 'tooth-g now' : 'tooth-g'}>
            <rect className={now ? 'tooth now' : 'tooth'} x={x} y={y} width={TOOTH_W} height={h} rx={9} />
            {stains > 0 &&
              STAINS[k].map(([sx, sy, r], j) => (
                <ellipse key={j} className="stain" cx={x + sx * TOOTH_W} cy={y + sy * h} rx={r * TOOTH_W * 1.2} ry={r * h} opacity={stains} />
              ))}
            {now && i % 2 === 0 && <Sparkle x={x + TOOTH_W - 4} y={upper ? y + h - 8 : y + 8} delay={i * 0.25} />}
          </g>
        );
      }),
    );
  return (
    <svg className="mouth-map" viewBox="0 0 300 220" aria-hidden>
      <rect className="lip" x={4} y={6} width={292} height={208} rx={104} />
      <rect className="mouth-in" x={12} y={14} width={276} height={192} rx={96} />
      <rect className="gum" x={10} y={18} width={280} height={26} rx={13} />
      <rect className="gum" x={10} y={176} width={280} height={26} rx={13} />
      <ellipse className={`tongue ${surface === 'tongue' ? 'now' : ''}`} cx={150} cy={152} rx={78} ry={30} />
      {teeth(true)}
      {teeth(false)}
    </svg>
  );
}

/**
 * One tooth seen from the side, with the brush on the cheek side, the
 * tongue side or the chewing part. Upper teeth are flipped upside down, so
 * the chewing part faces down like in the mouth.
 */
export function ToothSide({ surface, upper }: { surface: Surface; upper: boolean }) {
  if (surface === 'tongue') {
    return (
      <svg className="tooth-side" viewBox="0 0 120 120" aria-hidden>
        <path className="tongue now" d="M25 40 Q60 20 95 40 Q100 90 60 105 Q20 90 25 40 Z" />
        <g className="brush-wiggle">
          <Brush x={42} y={48} />
        </g>
      </svg>
    );
  }
  // Brush position for each surface, in the upright tooth's coordinates.
  const at = { outside: { x: 4, y: 52, r: 90 }, inside: { x: 86, y: 52, r: 90 }, tops: { x: 42, y: 4, r: 0 } }[surface];
  return (
    <svg className="tooth-side" viewBox="0 0 120 120" aria-hidden>
      <g transform={upper ? 'matrix(1 0 0 -1 0 120)' : undefined}>
        <rect className="gum" x={22} y={86} width={76} height={26} rx={10} />
        <path className="tooth-shape" d="M34 30 Q34 22 44 22 L76 22 Q86 22 86 30 L84 70 Q82 92 72 98 L48 98 Q38 92 36 70 Z" />
        <path className={`face ${surface === 'outside' ? 'now' : ''}`} d="M34 30 L36 70 Q38 92 48 98" />
        <path className={`face ${surface === 'inside' ? 'now' : ''}`} d="M86 30 L84 70 Q82 92 72 98" />
        <path className={`face ${surface === 'tops' ? 'now' : ''}`} d="M34 30 Q34 22 44 22 L76 22 Q86 22 86 30" />
        <g transform={`translate(${at.x} ${at.y}) rotate(${at.r} 18 8)`}>
          <g className="brush-wiggle">
            <Brush x={0} y={0} />
          </g>
        </g>
      </g>
      {/* Which side is which, upright whatever the tooth's direction. */}
      <text className="side-label" x={13} y={upper ? 114 : 20} textAnchor="middle">
        😊
      </text>
      <text className="side-label" x={107} y={upper ? 114 : 20} textAnchor="middle">
        👅
      </text>
    </svg>
  );
}

/** A twinkling four-point star. */
function Sparkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <path
      className="sparkle"
      style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px` }}
      d={`M${x} ${y - 9} Q${x + 1.5} ${y - 1.5} ${x + 9} ${y} Q${x + 1.5} ${y + 1.5} ${x} ${y + 9} Q${x - 1.5} ${y + 1.5} ${x - 9} ${y} Q${x - 1.5} ${y - 1.5} ${x} ${y - 9} Z`}
    />
  );
}

function Brush({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect className="brush-bristles" x={0} y={0} width={36} height={10} rx={3} />
      <rect className="brush-head" x={-2} y={-8} width={40} height={9} rx={4} />
    </g>
  );
}

/** Countdown ring for the current step. */
export function StepRing({ p, seconds }: { p: number; seconds: number }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  return (
    <div className="step-ring">
      <svg viewBox="0 0 80 80" aria-hidden>
        <circle className="ring-bg" cx={40} cy={40} r={r} />
        <circle className="ring" cx={40} cy={40} r={r} strokeDasharray={circ} strokeDashoffset={circ * p} transform="rotate(-90 40 40)" />
      </svg>
      <span>{seconds}</span>
    </div>
  );
}
