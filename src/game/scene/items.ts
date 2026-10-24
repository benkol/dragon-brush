// Procedural accessories and foods. Each builder returns a group positioned
// relative to its rig anchor (hat: top of head, glasses: in front of the eyes,
// necklace: around the neck).
import * as THREE from 'three';
import { cone, cyl, extrude, heart2d, mesh, shiny, sphere, star2d, toon } from './toon';

const GOLD = '#ffc43d';

function stripes(a: string, b: string, n = 6) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? b : a;
    g.fillRect(0, (i * 64) / n, 64, 64 / n + 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function dots(bg: string, colors: string[]) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 9; i++) {
    g.fillStyle = colors[i % colors.length];
    g.beginPath();
    g.arc((i % 3) * 21 + 10 + ((i / 3) | 0) * 5, ((i / 3) | 0) * 21 + 10, 4.5, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildHat(id: string): THREE.Group | null {
  const g = new THREE.Group();
  switch (id) {
    case 'hat.party': {
      g.add(mesh(cone(0.38, 0.85, 24), toon('#ffffff', { map: stripes('#ff5fa2', '#4fc3ff', 8) }), [0, 0.42, 0]));
      g.add(mesh(sphere(0.12), toon('#ffe14d'), [0, 0.88, 0]));
      g.rotation.z = -0.25;
      g.position.x = 0.15;
      break;
    }
    case 'hat.cap': {
      const blue = toon('#2f6fff');
      g.add(mesh(new THREE.SphereGeometry(0.62, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), blue, [0, -0.05, 0]));
      g.add(mesh(cyl(0.5, 0.5, 0.04, 24), blue, [0, -0.04, 0.55], [1, 1, 0.8]));
      g.add(mesh(sphere(0.07), toon('#ffffff'), [0, 0.57, 0]));
      g.rotation.x = -0.12;
      break;
    }
    case 'hat.chef': {
      const white = toon('#ffffff');
      g.add(mesh(cyl(0.42, 0.42, 0.35, 24), white, [0, 0.12, 0]));
      [[0, 0.5, 0], [0.25, 0.42, 0.1], [-0.25, 0.42, 0.1], [0.12, 0.45, -0.22], [-0.15, 0.45, -0.2]].forEach(([x, y, z]) =>
        g.add(mesh(sphere(0.28), white, [x, y, z])),
      );
      break;
    }
    case 'hat.pirate': {
      const black = toon('#2a2a35');
      g.add(mesh(cyl(0.72, 0.72, 0.06, 3), black, [0, 0.05, 0], [1, 1, 0.75], [0, Math.PI, 0]));
      g.add(mesh(new THREE.SphereGeometry(0.48, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), black, [0, 0.05, 0]));
      g.add(mesh(sphere(0.1), toon('#ffffff'), [0, 0.28, 0.42]));
      for (const s of [-1, 1]) g.add(mesh(cyl(0.02, 0.02, 0.18, 6), toon('#ffffff'), [0, 0.22, 0.44], undefined, [0, 0, s * 0.8]));
      break;
    }
    case 'hat.wizard': {
      const purple = toon('#6a4bd8');
      g.add(mesh(cyl(0.7, 0.7, 0.05, 32), purple, [0, 0.03, 0]));
      const tip = new THREE.Group();
      tip.add(mesh(cone(0.42, 1.25, 24), purple, [0, 0.65, 0]));
      tip.rotation.z = -0.15;
      g.add(tip);
      const starGeo = extrude(star2d(0.11, 0.05), 0.02);
      [[0.15, 0.5, 0.3], [-0.12, 0.85, 0.2], [0.05, 0.25, 0.4]].forEach(([x, y, z]) => g.add(mesh(starGeo, toon('#ffe14d'), [x, y, z])));
      break;
    }
    case 'hat.viking': {
      g.add(mesh(new THREE.SphereGeometry(0.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), shiny('#b8c2cc'), [0, -0.08, 0]));
      g.add(mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 32), shiny('#9a7b3c'), [0, -0.06, 0], undefined, [Math.PI / 2, 0, 0]));
      const ivory = toon('#fff4d6');
      for (const s of [-1, 1]) {
        const horn = mesh(new THREE.TorusGeometry(0.35, 0.09, 8, 16, Math.PI * 0.6), ivory, [0.55 * s, 0.15, 0], [s, 1, 1], [0, 0, -0.3]);
        g.add(horn);
      }
      break;
    }
    case 'hat.crown': {
      const gold = shiny(GOLD);
      g.add(mesh(cyl(0.45, 0.42, 0.28, 24, ), gold, [0, 0.1, 0]));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.add(mesh(cone(0.08, 0.25, 8), gold, [Math.sin(a) * 0.42, 0.36, Math.cos(a) * 0.42]));
        g.add(mesh(sphere(0.045, 10), shiny(i % 2 ? '#ff3b6b' : '#3bc6ff'), [Math.sin(a) * 0.45, 0.12, Math.cos(a) * 0.45]));
      }
      break;
    }
    case 'hat.witch': {
      const black = toon('#2d2245');
      g.add(mesh(cyl(0.78, 0.78, 0.05, 32), black, [0, 0.03, 0]));
      g.add(mesh(cyl(0.3, 0.44, 0.55, 24), black, [0, 0.3, 0]));
      g.add(mesh(cyl(0.45, 0.45, 0.1, 24), toon('#9b5de5'), [0, 0.1, 0]));
      g.add(mesh(new THREE.BoxGeometry(0.16, 0.13, 0.05), shiny('#ffc43d'), [0, 0.1, 0.45]));
      // The droopy tip.
      const tip = new THREE.Group();
      tip.position.set(0, 0.56, 0);
      tip.rotation.z = -0.5;
      tip.add(mesh(cone(0.3, 0.6, 24), black, [0, 0.28, 0]));
      g.add(tip);
      break;
    }
    case 'hat.dreidel': {
      const blue = toon('#3b82f6');
      const gold = shiny('#ffc43d');
      g.add(mesh(cone(0.3, 0.3, 4), blue, [0, 0.12, 0], undefined, [Math.PI, Math.PI / 4, 0]));
      g.add(mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), blue, [0, 0.47, 0], undefined, [0, Math.PI / 4, 0]));
      g.add(mesh(new THREE.BoxGeometry(0.44, 0.05, 0.44), gold, [0, 0.69, 0], undefined, [0, Math.PI / 4, 0]));
      g.add(mesh(cyl(0.05, 0.05, 0.3, 10), gold, [0, 0.85, 0]));
      g.add(mesh(extrude(star2d(0.1, 0.045, 6), 0.02), toon('#ffffff'), [0, 0.47, 0.3]));
      g.rotation.z = -0.15;
      g.scale.setScalar(1.4);
      break;
    }
    case 'hat.birthday': {
      g.add(mesh(cone(0.36, 0.75, 24), toon('#ffffff', { map: dots('#ff7fc8', ['#ffe14d', '#4fc3ff', '#ffffff']) }), [0, 0.38, 0]));
      g.add(mesh(new THREE.TorusGeometry(0.34, 0.05, 8, 24), toon('#ffe14d'), [0, 0.04, 0], undefined, [Math.PI / 2, 0, 0]));
      // A candle on top.
      g.add(mesh(cyl(0.035, 0.035, 0.2, 10), toon('#ffffff', { map: stripes('#4fc3ff', '#ffffff', 6) }), [0, 0.85, 0]));
      g.add(mesh(sphere(0.05, 10), new THREE.MeshBasicMaterial({ color: '#ffb020' }), [0, 0.99, 0], [0.8, 1.4, 0.8]));
      g.rotation.z = 0.2;
      g.position.x = -0.12;
      break;
    }
    case 'hat.flag': {
      // A Simchat Torah flag on a stick, with an apple on top.
      g.add(mesh(cyl(0.025, 0.025, 1.0, 8), toon('#c89b6d'), [0.2, 0.45, 0], undefined, [0, 0, -0.2]));
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 48;
      const x = c.getContext('2d')!;
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, 64, 48);
      x.fillStyle = '#2f6fff';
      x.fillRect(0, 6, 64, 6);
      x.fillRect(0, 36, 64, 6);
      x.font = 'bold 20px sans-serif';
      x.textAlign = 'center';
      x.fillText('✡', 32, 31);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      g.add(mesh(new THREE.BoxGeometry(0.5, 0.36, 0.01), toon('#ffffff', { map: tex }), [0.53, 0.72, 0], undefined, [0, 0, -0.2]));
      g.add(mesh(sphere(0.08, 12), toon('#e8343a'), [0.31, 0.98, 0]));
      break;
    }
    case 'hat.leaves':
    case 'hat.flowers': {
      // A ring sitting on top of the head, tipped forward so it shows from the front.
      const leaves = id === 'hat.leaves';
      g.add(mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 32), toon(leaves ? '#7a5230' : '#4caf50'), [0, 0.1, 0], undefined, [Math.PI / 2, 0, 0]));
      const colors = leaves ? ['#3fbf5f', '#2e9e4f', '#7ddc5a'] : ['#ff7fc8', '#ffffff', '#ffd23f', '#b07cff'];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const pos: [number, number, number] = [Math.sin(a) * 0.5, 0.16, Math.cos(a) * 0.5];
        if (leaves) g.add(mesh(sphere(0.17, 10), toon(colors[i % 3]), pos, [0.55, 0.3, 1.4], [0.6, a, 0]));
        else {
          g.add(mesh(sphere(0.15, 12), toon(colors[i % colors.length]), pos, [1, 0.6, 1]));
          g.add(mesh(sphere(0.055, 8), toon('#ffb020'), [pos[0], pos[1] + 0.08, pos[2]]));
        }
      }
      g.rotation.x = 0.35;
      break;
    }
    case 'hat.hammer': {
      // The squeaky plastic hammer, resting on the head.
      const head = new THREE.Group();
      head.position.set(0, 0.25, 0);
      head.rotation.z = Math.PI / 2;
      head.add(mesh(cyl(0.2, 0.2, 0.55, 20), toon('#e8344e')));
      for (const s of [-1, 1]) head.add(mesh(cyl(0.21, 0.21, 0.08, 20), toon('#ffd23f'), [0, 0.3 * s, 0]));
      g.add(head);
      g.add(mesh(cyl(0.06, 0.06, 0.8, 10), toon('#2f6fff'), [0.25, 0.55, -0.1], undefined, [0.2, 0, -0.9]));
      break;
    }
    case 'hat.beanie': {
      const knit = toon('#ffffff', { map: stripes('#2f9df4', '#ffffff', 8) });
      g.add(mesh(new THREE.SphereGeometry(0.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), knit, [0, -0.05, 0], [1, 1.1, 1]));
      g.add(mesh(cyl(0.62, 0.62, 0.16, 28), toon('#2f9df4'), [0, -0.02, 0]));
      g.add(mesh(sphere(0.16, 12), toon('#ffffff'), [0, 0.66, 0]));
      break;
    }
    default:
      return null;
  }
  return g;
}

/** Next New Year's year: late in the year that's next year. */
function comingYear() {
  const d = new Date();
  return d.getMonth() >= 9 ? d.getFullYear() + 1 : d.getFullYear();
}

export function buildGlasses(id: string): THREE.Group | null {
  const g = new THREE.Group();
  const lensMat = (color: string, opacity: number) => new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.1 });
  switch (id) {
    case 'glasses.round': {
      const frame = toon('#2b2140');
      for (const s of [-1, 1]) {
        g.add(mesh(new THREE.TorusGeometry(0.29, 0.04, 8, 28), frame, [0.42 * s, 0, 0]));
        g.add(mesh(new THREE.CircleGeometry(0.28, 24), lensMat('#bfe9ff', 0.25), [0.42 * s, 0, -0.01]));
      }
      g.add(mesh(cyl(0.025, 0.025, 0.25, 6), frame, [0, 0.04, 0], undefined, [0, 0, Math.PI / 2]));
      break;
    }
    case 'glasses.sun': {
      const dark = shiny('#15151f', { metalness: 0.3, roughness: 0.15 });
      for (const s of [-1, 1]) g.add(mesh(cyl(0.3, 0.3, 0.05, 24), dark, [0.42 * s, 0, 0], [1.15, 1, 0.85], [Math.PI / 2, 0, 0]));
      g.add(mesh(new THREE.BoxGeometry(1.5, 0.06, 0.05), toon('#15151f'), [0, 0.2, 0]));
      break;
    }
    case 'glasses.heart': {
      const geo = extrude(heart2d(0.3), 0.04);
      for (const s of [-1, 1]) g.add(mesh(geo, toon('#ff4f9a'), [0.42 * s, 0, 0]));
      g.add(mesh(cyl(0.025, 0.025, 0.2, 6), toon('#ff4f9a'), [0, 0.05, 0.02], undefined, [0, 0, Math.PI / 2]));
      break;
    }
    case 'glasses.star': {
      const geo = extrude(star2d(0.36, 0.17), 0.04);
      for (const s of [-1, 1]) g.add(mesh(geo, toon('#ffd23f'), [0.42 * s, 0, 0], undefined, [0, 0, s * 0.1]));
      break;
    }
    case 'glasses.monocle': {
      g.add(mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 28), shiny(GOLD), [0.42, 0, 0]));
      g.add(mesh(new THREE.CircleGeometry(0.29, 24), lensMat('#e8f7ff', 0.3), [0.42, 0, -0.01]));
      const chain = new THREE.CatmullRomCurve3([new THREE.Vector3(0.66, -0.2, 0), new THREE.Vector3(0.8, -0.6, -0.1), new THREE.Vector3(0.75, -0.95, -0.3)]);
      g.add(mesh(new THREE.TubeGeometry(chain, 16, 0.012, 5), shiny(GOLD)));
      break;
    }
    case 'glasses.mask': {
      // Masquerade mask: a wide shape with two eye holes, gold trim and a feather.
      const s = new THREE.Shape();
      s.moveTo(-0.85, 0.1);
      s.bezierCurveTo(-0.8, 0.4, -0.2, 0.42, 0, 0.18);
      s.bezierCurveTo(0.2, 0.42, 0.8, 0.4, 0.85, 0.1);
      s.bezierCurveTo(0.8, -0.3, 0.25, -0.38, 0, -0.12);
      s.bezierCurveTo(-0.25, -0.38, -0.8, -0.3, -0.85, 0.1);
      for (const x of [-0.42, 0.42]) {
        const hole = new THREE.Path();
        hole.absellipse(x, 0.03, 0.2, 0.15, 0, Math.PI * 2, false, 0);
        s.holes.push(hole);
      }
      g.add(mesh(extrude(s, 0.03), toon('#8b5cf6')));
      for (const x of [-0.42, 0.42]) g.add(mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 24), shiny(GOLD), [x, 0.03, 0.05], [1, 0.75, 1]));
      const feather = mesh(sphere(0.12, 12), toon('#ff5fa2'), [0.82, 0.42, 0], [0.6, 2.6, 0.25], [0, 0, -0.5]);
      g.add(feather);
      break;
    }
    case 'glasses.newyear': {
      // Gold star glasses with the coming year above them.
      const geo = extrude(star2d(0.33, 0.16), 0.04);
      for (const s of [-1, 1]) g.add(mesh(geo, toon('#ffd23f'), [0.42 * s, 0, 0], undefined, [0, 0, s * 0.15]));
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 96;
      const x = c.getContext('2d')!;
      x.font = 'bold 84px sans-serif';
      x.textAlign = 'center';
      x.lineJoin = 'round';
      x.fillStyle = '#ffd23f';
      x.strokeStyle = '#ff5fa2';
      x.lineWidth = 12;
      x.strokeText(String(comingYear()), 128, 82);
      x.fillText(String(comingYear()), 128, 82);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      g.add(mesh(new THREE.PlaneGeometry(1.2, 0.45), new THREE.MeshBasicMaterial({ map: tex, transparent: true }), [0, 0.5, 0.1]));
      break;
    }
    default:
      return null;
  }
  return g;
}

export function buildNecklace(id: string): THREE.Group | null {
  const g = new THREE.Group();
  // Neck anchor is the neck center; the neck front is about +0.6 z.
  switch (id) {
    case 'necklace.chain': {
      const gold = shiny(GOLD);
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        g.add(mesh(new THREE.TorusGeometry(0.07, 0.022, 6, 12), gold, [Math.sin(a) * 0.68, -0.08 * Math.cos(a) - 0.05, Math.cos(a) * 0.62], undefined, [0, a + (i % 2) * Math.PI / 2, 0]));
      }
      g.add(mesh(cyl(0.16, 0.16, 0.05, 24), gold, [0, -0.32, 0.66], undefined, [Math.PI / 2, 0, 0]));
      g.add(mesh(extrude(star2d(0.1, 0.045), 0.02), toon('#ffffff'), [0, -0.32, 0.7]));
      break;
    }
    case 'necklace.bowtie': {
      const red = toon('#e8344e');
      for (const s of [-1, 1]) g.add(mesh(cone(0.18, 0.3, 4), red, [0.15 * s, -0.05, 0.7], [1, 1, 0.5], [0, 0, (s * Math.PI) / 2]));
      g.add(mesh(sphere(0.08), red, [0, -0.05, 0.72]));
      break;
    }
    case 'necklace.scarf': {
      const mat = toon('#ffffff', { map: stripes('#ff4d4d', '#ffffff', 10) });
      g.add(mesh(new THREE.TorusGeometry(0.66, 0.16, 12, 32), mat, [0, 0, 0], [1, 1, 0.9], [Math.PI / 2 + 0.1, 0, 0]));
      g.add(mesh(new THREE.BoxGeometry(0.28, 0.6, 0.1), mat, [0.3, -0.35, 0.7], undefined, [0.2, 0, 0.15]));
      break;
    }
    case 'necklace.lei': {
      const colors = ['#ff5fa2', '#ffd23f', '#ff8c42', '#ffffff', '#b07cff'];
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        g.add(mesh(sphere(0.1, 10), toon(colors[i % colors.length]), [Math.sin(a) * 0.7, -0.1 * Math.cos(a) - 0.05, Math.cos(a) * 0.66], [1, 1, 0.7]));
      }
      break;
    }
    case 'necklace.flag': {
      // An Israeli flag worn as a cape, tied at the front.
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 96;
      const x = c.getContext('2d')!;
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, 128, 96);
      x.fillStyle = '#0038b8';
      x.fillRect(0, 10, 128, 12);
      x.fillRect(0, 74, 128, 12);
      x.strokeStyle = '#0038b8';
      x.lineWidth = 4;
      for (const flip of [1, -1]) {
        x.beginPath();
        x.moveTo(64, 48 - 18 * flip);
        x.lineTo(80, 48 + 9 * flip);
        x.lineTo(48, 48 + 9 * flip);
        x.closePath();
        x.stroke();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const cape = new THREE.CylinderGeometry(0.75, 1.0, 1.1, 24, 1, true, Math.PI * 0.55, Math.PI * 0.9);
      g.add(mesh(cape, toon('#ffffff', { map: tex, side: THREE.DoubleSide }), [0, -0.5, -0.05]));
      g.add(mesh(sphere(0.09, 10), toon('#0038b8'), [0, -0.02, 0.66]));
      break;
    }
    case 'necklace.fairywings': {
      // Sparkly tooth-fairy wings on the back.
      const wing = new THREE.Shape();
      wing.moveTo(0, 0);
      wing.bezierCurveTo(0.3, 0.9, 1.1, 1.0, 0.9, 0.35);
      wing.bezierCurveTo(1.0, 0.1, 0.8, -0.5, 0.35, -0.55);
      wing.bezierCurveTo(0.15, -0.5, 0.05, -0.2, 0, 0);
      const geo = new THREE.ExtrudeGeometry(wing, { depth: 0.02, bevelEnabled: false });
      const mats = ['#ffc6ec', '#c6e8ff'].map((col) => new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.75, roughness: 0.2, metalness: 0.3, side: THREE.DoubleSide }));
      // Big enough to peek out on both sides of the head.
      for (const s of [-1, 1]) {
        const w = mesh(geo, mats[s > 0 ? 0 : 1], [0.4 * s, 0.25, -0.7], [s * 1.7, 1.7, 1], [0, 0.35 * s, 0]);
        g.add(w);
        for (let i = 0; i < 6; i++) g.add(mesh(sphere(0.05, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), [s * (0.9 + i * 0.18), 0.7 - (i % 2) * 0.5, -0.7]));
      }
      break;
    }
    case 'necklace.medal': {
      g.add(mesh(new THREE.TorusGeometry(0.66, 0.035, 6, 32), toon('#2f6fff'), [0, -0.02, 0], [1, 1, 0.95], [Math.PI / 2 + 0.3, 0, 0]));
      g.add(mesh(cyl(0.2, 0.2, 0.05, 28), shiny(GOLD), [0, -0.45, 0.62], undefined, [Math.PI / 2 - 0.2, 0, 0]));
      g.add(mesh(extrude(star2d(0.12, 0.05), 0.02), toon('#fff3b0'), [0, -0.45, 0.66], undefined, [-0.2, 0, 0]));
      break;
    }
    default:
      return null;
  }
  return g;
}

// ---------------------------------------------------------------------------
// Foods

export interface Food {
  group: THREE.Group;
  /** Burns from its base color toward toasted/charred. */
  setBurn(b: number): void;
  /** Dragon makes a face when eating it. */
  yucky: boolean;
  /** Melts (ice cream, snowball) instead of toasting. */
  melts: boolean;
}

const MARSH_STAGES = ['#fffaf2', '#f6d48a', '#c77b30', '#4a2c1a'].map((c) => new THREE.Color(c));
const CHAR = new THREE.Color('#3a2414');

function marshmallowColor(b: number, out: THREE.Color) {
  const t = Math.min(0.999, Math.max(0, b)) * (MARSH_STAGES.length - 1) * 0.85;
  const i = Math.floor(t);
  return out.copy(MARSH_STAGES[i]).lerp(MARSH_STAGES[i + 1], t - i);
}

export function buildFood(id: string): Food {
  const g = new THREE.Group();
  const toastables: { mat: THREE.MeshToonMaterial; base: THREE.Color; marsh: boolean }[] = [];
  const t = (color: string, marsh = false) => {
    const m = toon(color);
    toastables.push({ mat: m, base: new THREE.Color(color), marsh });
    return m;
  };

  // Skewer, pointing down-outward; DragonScene rotates the food so it points to the screen edge.
  g.add(mesh(cyl(0.035, 0.035, 1.6, 6), toon('#c89b6d'), [0, -0.95, 0]));

  switch (id) {
    case 'food.sausage':
      g.add(mesh(new THREE.CapsuleGeometry(0.22, 0.6, 8, 16), t('#d0654a'), [0, 0.05, 0]));
      break;
    case 'food.corn': {
      const kernels = document.createElement('canvas');
      kernels.width = kernels.height = 64;
      const c = kernels.getContext('2d')!;
      c.fillStyle = '#e8b923';
      c.fillRect(0, 0, 64, 64);
      c.fillStyle = '#ffdf5d';
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) c.beginPath(), c.arc(x * 8 + 4, y * 8 + 4, 3.2, 0, 7), c.fill();
      const tex = new THREE.CanvasTexture(kernels);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(3, 3);
      tex.colorSpace = THREE.SRGBColorSpace;
      const m = toon('#ffffff', { map: tex });
      toastables.push({ mat: m, base: new THREE.Color('#ffffff'), marsh: false });
      g.add(mesh(new THREE.CapsuleGeometry(0.24, 0.55, 8, 16), m, [0, 0.1, 0]));
      for (const s of [-1, 1]) g.add(mesh(sphere(0.25, 12), toon('#6cc04a'), [0.15 * s, -0.3, 0], [0.5, 1.4, 0.3], [0, 0, 0.5 * s]));
      break;
    }
    case 'food.apple':
      g.add(mesh(sphere(0.38, 24), t('#e8343a'), [0, 0.05, 0], [1, 0.92, 1]));
      g.add(mesh(cyl(0.025, 0.025, 0.18, 6), toon('#6b4226'), [0, 0.45, 0]));
      g.add(mesh(sphere(0.1, 10), toon('#4caf50'), [0.1, 0.48, 0], [1.4, 0.4, 0.7]));
      break;
    case 'food.smore': {
      const cracker = t('#d9a35f');
      g.add(mesh(new THREE.BoxGeometry(0.7, 0.1, 0.55), cracker, [0, -0.2, 0]));
      g.add(mesh(new THREE.BoxGeometry(0.62, 0.08, 0.5), toon('#5b3420'), [0, -0.11, 0]));
      g.add(mesh(cyl(0.3, 0.3, 0.3, 20), t('#fffaf2', true), [0, 0.08, 0]));
      g.add(mesh(new THREE.BoxGeometry(0.7, 0.1, 0.55), cracker, [0, 0.28, 0], undefined, [0, 0, 0.08]));
      break;
    }
    case 'food.pizza': {
      const tri = new THREE.Shape();
      tri.moveTo(0, -0.45);
      tri.lineTo(-0.42, 0.4);
      tri.lineTo(0.42, 0.4);
      tri.closePath();
      g.add(mesh(extrude(tri, 0.06), t('#ffd23f'), [0, 0, -0.03]));
      g.add(mesh(new THREE.CapsuleGeometry(0.07, 0.8, 6, 12), t('#d9a35f'), [0, 0.42, 0.03], undefined, [0, 0, Math.PI / 2]));
      [[0, 0.12], [-0.14, 0.25], [0.15, 0.24], [0, -0.15]].forEach(([x, y]) =>
        g.add(mesh(cyl(0.07, 0.07, 0.03, 14), t('#c8323a'), [x, y, 0.08], undefined, [Math.PI / 2, 0, 0])),
      );
      break;
    }
    case 'food.pumpkin': {
      const orange = t('#ff8c1a');
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.add(mesh(sphere(0.3, 16), orange, [Math.sin(a) * 0.14, 0, Math.cos(a) * 0.14], [0.75, 0.9, 0.75]));
      }
      g.add(mesh(cyl(0.05, 0.07, 0.18, 8), toon('#5b7a2a'), [0, 0.3, 0], undefined, [0, 0, 0.3]));
      g.add(mesh(sphere(0.09, 10), toon('#6cc04a'), [0.12, 0.3, 0], [1.4, 0.35, 0.8]));
      break;
    }
    case 'food.sufganiya': {
      g.add(mesh(sphere(0.38, 24), t('#e0a050'), [0, 0, 0], [1, 0.65, 1]));
      // Powdered sugar and a jam dot sitting on top.
      g.add(mesh(sphere(0.3, 20), toon('#ffffff'), [0, 0.19, 0], [1, 0.25, 1]));
      g.add(mesh(sphere(0.09, 12), toon('#d4183a'), [0, 0.26, 0.04], [1, 0.6, 1]));
      break;
    }
    case 'food.hamantash': {
      const tri = (r: number) => {
        const s = new THREE.Shape();
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
          if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        s.closePath();
        return s;
      };
      g.add(mesh(extrude(tri(0.42), 0.1), t('#e3b26b'), [0, 0, -0.05]));
      g.add(mesh(extrude(tri(0.22), 0.06), toon('#3b1f3a'), [0, 0, 0.06]));
      break;
    }
    case 'food.matzah': {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const x = c.getContext('2d')!;
      x.fillStyle = '#f2dca8';
      x.fillRect(0, 0, 64, 64);
      x.fillStyle = '#b98a4a';
      for (let row = 4; row < 64; row += 10) for (let col = 3; col < 64; col += 5) x.fillRect(col, row, 1.5, 1.5);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const m = toon('#ffffff', { map: tex });
      toastables.push({ mat: m, base: new THREE.Color('#ffffff'), marsh: false });
      g.add(mesh(new THREE.BoxGeometry(0.75, 0.75, 0.05), m));
      break;
    }
    case 'food.pomegranate': {
      g.add(mesh(sphere(0.36, 24), t('#c0182c'), [0, 0, 0], [1, 0.95, 1]));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        g.add(mesh(cone(0.05, 0.14, 6), toon('#8a1020'), [Math.sin(a) * 0.08, 0.38, Math.cos(a) * 0.08], undefined, [Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4]));
      }
      break;
    }
    case 'food.broccoli': {
      g.add(mesh(cyl(0.1, 0.14, 0.45, 10), t('#9ccc65'), [0, -0.1, 0]));
      [[0, 0.3, 0], [0.2, 0.2, 0.05], [-0.2, 0.2, 0.05], [0.1, 0.25, -0.15], [-0.1, 0.32, 0.15]].forEach(([x, y, z]) =>
        g.add(mesh(sphere(0.2, 12), t('#2e7d32'), [x, y, z])),
      );
      break;
    }
    case 'food.etrog':
      g.add(mesh(sphere(0.32, 20), t('#f2d43a'), [0, 0, 0], [0.85, 1.2, 0.85]));
      g.add(mesh(cone(0.04, 0.12, 8), toon('#7a5230'), [0, 0.42, 0]));
      break;
    case 'food.driedfruit':
      g.add(mesh(sphere(0.2, 14), t('#e8913a'), [0, -0.25, 0], [1, 0.45, 1]));
      g.add(mesh(new THREE.CapsuleGeometry(0.1, 0.22, 6, 12), t('#6b3a1f'), [0, 0.02, 0], undefined, [0, 0, Math.PI / 2]));
      g.add(mesh(sphere(0.18, 14), t('#7b3f6e'), [0, 0.3, 0], [1, 1.1, 1]));
      break;
    case 'food.kebab':
      ['#8a4a2a', '#e8343a', '#8a4a2a', '#5bbf4a', '#8a4a2a', '#f3e6c8'].forEach((col, i) =>
        g.add(
          i % 2 === 0
            ? mesh(sphere(0.16, 12), t(col), [0, -0.35 + i * 0.16, 0], [1.1, 0.75, 1])
            : mesh(new THREE.BoxGeometry(0.22, 0.07, 0.2), t(col), [0, -0.35 + i * 0.16, 0], undefined, [0, i, 0]),
        ),
      );
      g.add(mesh(cyl(0.025, 0.025, 1.0, 6), toon('#c89b6d'), [0, 0, 0]));
      break;
    case 'food.potato':
      // Potato in foil, opened at the top.
      g.add(mesh(sphere(0.34, 16), toon('#d7dbe2', { emissive: '#8a96a8', emissiveIntensity: 0.25 }), [0, -0.05, 0], [1, 0.75, 0.85]));
      g.add(mesh(sphere(0.25, 16), t('#d8b26a'), [0, 0.12, 0], [1, 0.45, 0.8]));
      break;
    case 'food.blintz':
      g.add(mesh(new THREE.CapsuleGeometry(0.16, 0.45, 8, 16), t('#f3d98a'), [0, 0, 0], undefined, [0, 0, Math.PI / 2]));
      g.add(mesh(sphere(0.14, 12), toon('#ffffff'), [0, 0.15, 0], [1.6, 0.5, 1]));
      for (const x of [-0.12, 0.12]) g.add(mesh(sphere(0.07, 10), toon('#e8343a'), [x, 0.22, 0], [1, 1.2, 1]));
      break;
    case 'food.icecream':
      g.add(mesh(cone(0.2, 0.5, 16), toon('#d9a35f', { map: stripes('#d9a35f', '#c58b4a', 8) }), [0, -0.2, 0], undefined, [Math.PI, 0, 0]));
      g.add(mesh(sphere(0.22, 16), toon('#ff9ec7'), [0, 0.1, 0]));
      g.add(mesh(sphere(0.19, 16), toon('#fff4e0'), [0, 0.32, 0]));
      g.add(mesh(sphere(0.06, 10), toon('#d4183a'), [0, 0.52, 0]));
      break;
    case 'food.watermelon': {
      const wedge = (r: number, color: string) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.14, 24, 1, false, 0, Math.PI), toon(color));
      const rind = wedge(0.46, '#2e9e4f');
      rind.rotation.x = Math.PI / 2;
      const flesh = wedge(0.4, '#ff4d5e');
      flesh.rotation.x = Math.PI / 2;
      flesh.position.z = 0.012;
      g.add(rind, flesh);
      [[0.15, 0.15], [-0.12, 0.2], [0.02, 0.28], [-0.22, 0.08], [0.25, 0.06]].forEach(([x, y]) =>
        g.add(mesh(sphere(0.025, 6), toon('#1f1f1f'), [x, y, 0.09], [0.7, 1.2, 0.5])),
      );
      g.children.slice(1).forEach((c) => (c.position.y -= 0.12));
      break;
    }
    case 'food.snowball':
      g.add(mesh(sphere(0.34, 20), toon('#f4fbff', { emissive: '#bfe6ff', emissiveIntensity: 0.2 }), [0, 0, 0]));
      break;
    case 'food.cake': {
      g.add(mesh(cyl(0.34, 0.34, 0.3, 24), toon('#fff3e0'), [0, -0.05, 0]));
      g.add(mesh(cyl(0.35, 0.35, 0.1, 24), toon('#ff8fc4'), [0, 0.13, 0]));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.add(mesh(sphere(0.045, 8), toon('#d4183a'), [Math.sin(a) * 0.25, 0.2, Math.cos(a) * 0.25]));
      }
      g.add(mesh(cyl(0.03, 0.03, 0.18, 8), toon('#ffffff', { map: stripes('#ffd23f', '#ffffff', 6) }), [0, 0.3, 0]));
      g.add(mesh(sphere(0.045, 8), new THREE.MeshBasicMaterial({ color: '#ffb020' }), [0, 0.42, 0], [0.8, 1.4, 0.8]));
      break;
    }
    default:
      // Marshmallow.
      g.add(mesh(cyl(0.36, 0.36, 0.62, 28), t('#fffaf2', true), [0, 0, 0]));
      g.add(mesh(sphere(0.36, 28), t('#fffaf2', true), [0, 0.3, 0], [1, 0.18, 1]));
      g.add(mesh(sphere(0.36, 28), t('#fffaf2', true), [0, -0.3, 0], [1, 0.18, 1]));
  }

  // Everything but the skewer goes into `body`, so melting can squash it.
  const body = new THREE.Group();
  g.children.slice(1).forEach((c) => body.add(c));
  g.add(body);
  const melts = MELTING.has(id);

  const tmp = new THREE.Color();
  return {
    group: g,
    yucky: id === 'food.broccoli',
    melts,
    setBurn(b) {
      if (melts) {
        // Melts into a puddle instead of toasting.
        body.scale.set(1 + 0.3 * b, 1 - 0.65 * b, 1 + 0.3 * b);
        body.position.y = -0.2 * b;
        return;
      }
      for (const x of toastables) {
        if (x.marsh) x.mat.color.copy(marshmallowColor(b, tmp));
        else x.mat.color.copy(x.base).lerp(CHAR, b * 0.55);
      }
    },
  };
}

/** Foods that melt in the fire instead of toasting. */
const MELTING = new Set(['food.icecream', 'food.snowball']);

// ---------------------------------------------------------------------------
// Fire palettes

export interface FirePalette {
  core: THREE.Color;
  mid: THREE.Color;
  outer: THREE.Color;
  rainbow?: boolean;
  sparkles?: boolean;
  /** Sparkle color (0..1 hue); random when unset. */
  sparkHue?: number;
}

const pal = (core: string, mid: string, outer: string, extra: Partial<FirePalette> = {}): FirePalette => ({
  core: new THREE.Color(core),
  mid: new THREE.Color(mid),
  outer: new THREE.Color(outer),
  ...extra,
});

export const FIRE: Record<string, FirePalette> = {
  'fire.classic': pal('#fff6c2', '#ffae2b', '#ff3d1f'),
  'fire.blue': pal('#e8fbff', '#4fc3ff', '#1f4dff'),
  'fire.green': pal('#f2ffe0', '#7dff5a', '#1fa83a'),
  'fire.purple': pal('#ffe8ff', '#d07bff', '#6a1fff'),
  'fire.sparkles': pal('#ffffff', '#ffd84d', '#ff8a1f', { sparkles: true }),
  'fire.rainbow': pal('#ffffff', '#ff4d4d', '#4d79ff', { rainbow: true }),
  'fire.bonfire': pal('#fff1b0', '#ff7a1a', '#b81d0c', { sparkles: true, sparkHue: 0.07 }),
  'fire.bluewhite': pal('#ffffff', '#9ad0ff', '#0038b8'),
  'fire.leafy': pal('#f6ffe0', '#8fe35a', '#2e9e4f', { sparkles: true, sparkHue: 0.3 }),
  'fire.fireworks': pal('#ffffff', '#ff4d4d', '#4d79ff', { rainbow: true, sparkles: true }),
};
