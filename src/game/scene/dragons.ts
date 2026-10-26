// Procedural cute dragons. Every dragon is built from the same rig so any
// hat, glasses or necklace fits any dragon.
import * as THREE from 'three';
import { cone, cyl, mesh, sphere, toon } from './toon';
import { WINGS_LEVEL } from '../../rewards/scoring';

type Horns = 'curved' | 'ice' | 'nubs' | 'unicorn' | 'crown';
type Ears = 'fin' | 'leaf' | 'round';

interface DragonDef {
  body: string;
  belly: string;
  horn: string;
  spike: string;
  pupil?: string;
  /** Glowing pupils (Shadow). */
  glow?: boolean;
  horns: Horns;
  ears: Ears;
  baby?: boolean;
  spots?: string;
}

export const DRAGONS: Record<string, DragonDef> = {
  'dragon.ember': { body: '#ff6b5b', belly: '#ffd38a', horn: '#fff1c9', spike: '#ffb347', horns: 'curved', ears: 'fin' },
  'dragon.frost': { body: '#7ec8ff', belly: '#eaf7ff', horn: '#ffffff', spike: '#bfe8ff', horns: 'ice', ears: 'fin' },
  'dragon.leafy': { body: '#6fd36f', belly: '#e6ffb3', horn: '#a0703c', spike: '#2e9e4f', horns: 'nubs', ears: 'leaf' },
  'dragon.sparkle': { body: '#ffa6d8', belly: '#fff0fa', horn: '#ffd84d', spike: '#b48cff', horns: 'unicorn', ears: 'round' },
  'dragon.shadow': { body: '#4b3a73', belly: '#9a85d6', horn: '#d9d0ff', spike: '#7b5cc4', pupil: '#ffe066', glow: true, horns: 'curved', ears: 'fin' },
  'dragon.gold': { body: '#ffcf3f', belly: '#fff3b8', horn: '#ffffff', spike: '#ff9f1c', horns: 'crown', ears: 'fin' },
  'dragon.pip': { body: '#4fd1c5', belly: '#d8fff9', horn: '#ffffff', spike: '#2bb3a6', horns: 'nubs', ears: 'round', baby: true },
  'dragon.mochi': { body: '#fff0d6', belly: '#ffffff', horn: '#c58b5a', spike: '#f4b183', horns: 'nubs', ears: 'round', baby: true, spots: '#e8a86e' },
  'dragon.bubbles': { body: '#c3a6ff', belly: '#f3ecff', horn: '#ffffff', spike: '#8fd3ff', horns: 'curved', ears: 'round', baby: true },
};

export interface Rig {
  root: THREE.Group;
  head: THREE.Group;
  jaw: THREE.Group;
  eyes: THREE.Group[];
  pupils: THREE.Object3D[];
  cheeks: THREE.MeshToonMaterial[];
  wings: THREE.Group[];
  /** The fangs' shared material, and the fangs (for sparkles). */
  teeth: THREE.MeshToonMaterial;
  fangs: THREE.Mesh[];
  anchors: { hat: THREE.Object3D; glasses: THREE.Object3D; neck: THREE.Object3D; mouth: THREE.Object3D };
  /** 0 = closed, 1 = wide open. Moves the jaw and sizes the mouth inside. */
  setJawOpen(open: number): void;
}

/** Jaw rotation (radians) when wide open. */
const JAW_MAX = 0.75;

function buildHorns(head: THREE.Group, def: DragonDef) {
  const mat = toon(def.horn);
  const add = (m: THREE.Mesh) => head.add(m);
  switch (def.horns) {
    case 'curved':
      for (const s of [-1, 1]) {
        const g = new THREE.Group();
        g.position.set(0.42 * s, 0.78, -0.25);
        g.rotation.set(-0.5, 0, -0.45 * s);
        g.add(mesh(cone(0.17, 0.42), mat, [0, 0.18, 0]));
        const tip = mesh(cone(0.1, 0.32), mat, [0.06 * s, 0.45, -0.08], undefined, [-0.6, 0, -0.3 * s]);
        g.add(tip);
        head.add(g);
      }
      break;
    case 'ice':
      for (const s of [-1, 1])
        for (let i = 0; i < 3; i++)
          add(mesh(cone(0.09 - i * 0.015, 0.55 - i * 0.12), mat, [s * (0.3 + i * 0.18), 0.85 - i * 0.12, -0.25 - i * 0.1], undefined, [-0.4, 0, -s * (0.25 + i * 0.25)]));
      break;
    case 'nubs':
      for (const s of [-1, 1]) add(mesh(cone(0.13, 0.22), mat, [0.38 * s, 0.92, -0.1], undefined, [-0.2, 0, -0.3 * s]));
      break;
    case 'unicorn': {
      const horn = new THREE.Group();
      horn.position.set(0, 0.92, 0.3);
      horn.rotation.x = 0.45;
      horn.add(mesh(cone(0.14, 0.75, 24), toon(def.horn, { emissive: '#664400', emissiveIntensity: 0.15 }), [0, 0.35, 0]));
      // Spiral ridge rings.
      for (let i = 0; i < 4; i++) horn.add(mesh(new THREE.TorusGeometry(0.12 - i * 0.025, 0.018, 6, 16), mat, [0, 0.1 + i * 0.15, 0], undefined, [Math.PI / 2, 0, i * 0.3]));
      head.add(horn);
      for (const s of [-1, 1]) add(mesh(cone(0.08, 0.2), toon(def.spike), [0.45 * s, 0.85, -0.2], undefined, [-0.2, 0, -0.4 * s]));
      break;
    }
    case 'crown':
      for (let i = 0; i < 5; i++) {
        const a = -0.9 + (i / 4) * 1.8;
        add(mesh(cone(0.09, i === 2 ? 0.45 : 0.32), mat, [Math.sin(a) * 0.55, 0.88 + Math.cos(a) * 0.05, -0.15 - Math.abs(Math.sin(a)) * 0.1], undefined, [-0.2, 0, -a * 0.5]));
      }
      break;
  }
}

function buildEars(head: THREE.Group, def: DragonDef) {
  const mat = toon(def.spike);
  for (const s of [-1, 1]) {
    switch (def.ears) {
      case 'fin': {
        const ear = mesh(cone(0.22, 0.6, 12), mat, [1.08 * s, 0.25, -0.15], [1, 1, 0.35], [0, 0.3 * s, -1.25 * s]);
        head.add(ear);
        break;
      }
      case 'leaf': {
        const leaf = mesh(sphere(0.3, 16), toon('#3fbf5f'), [1.05 * s, 0.3, -0.1], [1.3, 0.55, 0.2], [0, 0.3 * s, 0.5 * s]);
        head.add(leaf);
        head.add(mesh(cyl(0.015, 0.015, 0.6, 6), toon('#2a8a44'), [1.05 * s, 0.3, -0.06], undefined, [0, 0, Math.PI / 2 - 0.5 * s]));
        break;
      }
      case 'round':
        head.add(mesh(sphere(0.22, 16), mat, [0.95 * s, 0.55, -0.15], [1, 1, 0.5], [0, 0.4 * s, 0]));
        break;
    }
  }
}

function buildWings(def: DragonDef): THREE.Group[] {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.6, 0.9, 1.4, 1.1);
  shape.quadraticCurveTo(1.25, 0.7, 1.45, 0.45);
  shape.quadraticCurveTo(1.1, 0.35, 1.2, 0.0);
  shape.quadraticCurveTo(0.8, 0.05, 0.75, -0.3);
  shape.quadraticCurveTo(0.4, -0.1, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false });
  const mat = toon(def.spike, { side: THREE.DoubleSide });
  return [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.45 * s, -1.0, -0.75);
    const w = new THREE.Mesh(geo, mat);
    w.scale.set(s, 1, 1);
    w.rotation.y = 0.35 * s;
    pivot.add(w);
    return pivot;
  });
}

export function buildDragon(id: string, level = 1): Rig {
  const def = DRAGONS[id] ?? DRAGONS['dragon.ember'];
  const body = toon(def.body);
  const belly = toon(def.belly);

  const root = new THREE.Group();
  const head = new THREE.Group();
  root.add(head);

  // Neck and chest.
  root.add(mesh(cyl(0.55, 0.75, 1.3), body, [0, -1.15, -0.35]));
  root.add(mesh(sphere(0.5), belly, [0, -1.1, -0.05], [1, 1.2, 0.55]));
  const neck = new THREE.Object3D();
  neck.position.set(0, -0.95, -0.35);
  root.add(neck);

  // Skull and snout.
  head.add(mesh(sphere(1, 32), body, [0, 0, 0], [1.15, 1, 1.05]));
  head.add(mesh(sphere(0.62, 28), body, [0, -0.2, 0.68], [1.1, 0.62, 0.85]));
  // Forehead patch.
  head.add(mesh(sphere(0.35, 20), belly, [0, 0.62, 0.62], [1.2, 0.5, 0.45], [-0.5, 0, 0]));
  for (const s of [-1, 1]) head.add(mesh(sphere(0.065, 10), toon('#5a2a2a'), [0.2 * s, -0.08, 1.22], [1, 0.7, 0.6]));

  // Mouth inside. Starts small enough to hide behind the closed jaw;
  // setJawOpen grows it as the jaw drops.
  const mouthInside = mesh(sphere(0.5, 20), toon('#7a1830'), [0, -0.45, 0.6], [1.0, 0.2, 0.72]);
  head.add(mouthInside);
  // Little fangs, sharing one material so they can be stained and cleaned.
  const teeth = toon('#ffffff');
  const fangs = [-1, 1].map((s) => mesh(cone(0.06, 0.14, 8), teeth, [0.22 * s, -0.5, 1.02], undefined, [Math.PI, 0, 0]));
  head.add(...fangs);

  const jaw = new THREE.Group();
  jaw.position.set(0, -0.42, 0.1);
  // Body-colored and tucked under the snout so it reads as part of the head.
  jaw.add(mesh(sphere(0.55, 24), body, [0, -0.12, 0.45], [1, 0.32, 0.85]));
  jaw.add(mesh(sphere(0.28, 16), toon('#ff7b93'), [0, 0.02, 0.45], [1, 0.3, 0.9]));
  head.add(jaw);

  const mouth = new THREE.Object3D();
  mouth.position.set(0, -0.45, 1.15);
  head.add(mouth);

  // Eyes.
  const eyeR = def.baby ? 0.4 : 0.35;
  const eyes: THREE.Group[] = [];
  const pupils: THREE.Object3D[] = [];
  const pupilMat = def.glow
    ? new THREE.MeshBasicMaterial({ color: def.pupil ?? '#ffe066' })
    : toon(def.pupil ?? '#2b2140');
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(0.44 * s, 0.24, 0.7);
    eye.rotation.y = 0.18 * s;
    eye.add(mesh(sphere(eyeR, 24), toon('#ffffff')));
    const pupil = new THREE.Group();
    // A flattened disc sitting proud of the eyeball surface (no z-fighting).
    pupil.add(mesh(sphere(eyeR * 0.6, 20), pupilMat, [0, 0, eyeR * 0.9], [1, 1.1, 0.35]));
    pupil.add(mesh(sphere(eyeR * 0.18, 10), new THREE.MeshBasicMaterial({ color: '#ffffff' }), [eyeR * 0.2, eyeR * 0.25, eyeR * 1.1], [1, 1, 0.5]));
    eye.add(pupil);
    head.add(eye);
    eyes.push(eye);
    pupils.push(pupil);
  }

  // Blushing cheeks.
  const cheeks: THREE.MeshToonMaterial[] = [];
  for (const s of [-1, 1]) {
    const mat = toon('#ff7fa0', { transparent: true, opacity: 0.35 });
    cheeks.push(mat);
    head.add(mesh(sphere(0.16, 16), mat, [0.7 * s, -0.18, 0.62], [1, 0.6, 0.35], [0, 0.6 * s, 0]));
  }

  if (def.spots) {
    const spot = toon(def.spots);
    [[0.5, 0.6, 0.55], [-0.6, 0.45, 0.6], [0.1, 0.9, 0.3], [-0.85, -0.1, 0.4]].forEach(([x, y, z]) =>
      head.add(mesh(sphere(0.16, 12), spot, [x, y, z], [1, 1, 0.4], [0, Math.atan2(x, z), 0])),
    );
  }

  buildHorns(head, def);
  buildEars(head, def);

  // Back spikes run down from the top of the head to the neck.
  const spikeMat = toon(def.spike);
  for (let i = 0; i < 4; i++) {
    const a = 0.3 + i * 0.38;
    head.add(mesh(cone(0.12 - i * 0.012, 0.32 - i * 0.03), spikeMat, [0, Math.cos(a) * 1.0, -Math.sin(a) * 1.05], undefined, [-a, 0, 0]));
  }

  const wings = level >= WINGS_LEVEL ? buildWings(def) : [];
  wings.forEach((w) => root.add(w));

  const hat = new THREE.Object3D();
  hat.position.set(0, 0.9, 0.05);
  head.add(hat);
  const glasses = new THREE.Object3D();
  glasses.position.set(0, 0.22, 1.08);
  head.add(glasses);

  // Bigger dragon as it levels up; babies stay a bit smaller.
  const s = (def.baby ? 0.9 : 1) * (1 + Math.min(level - 1, 9) * 0.025);
  root.scale.setScalar(s);

  const setJawOpen = (open: number) => {
    const o = Math.min(1, Math.max(0, open));
    jaw.rotation.x = o * JAW_MAX;
    mouthInside.scale.y = 0.2 + 0.4 * o;
    mouthInside.position.y = -0.45 - 0.1 * o;
  };

  return { root, head, jaw, eyes, pupils, cheeks, wings, teeth, fangs, anchors: { hat, glasses, neck, mouth }, setJawOpen };
}
