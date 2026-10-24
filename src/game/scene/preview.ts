// Renders small still images of dragons and items for shop/wardrobe cards,
// using one shared off-screen renderer.
import * as THREE from 'three';
import type { Equipped } from '../../data/types';
import { DEFAULT_EQUIPPED, ITEMS } from '../../rewards/catalog';
import { buildDressedDragon } from './dress';
import { buildFood, buildGlasses, buildHat, buildNecklace, FIRE } from './items';
import { disposeDeep, sphere, toon, mesh } from './toon';

const SIZE = 256;
let renderer: THREE.WebGLRenderer | null = null;
const cache = new Map<string, string>();

function getRenderer() {
  if (!renderer) {
    const canvas = document.createElement('canvas');
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(SIZE, SIZE, false);
    renderer.setClearColor(0x000000, 0);
  }
  return renderer;
}

function shoot(obj: THREE.Object3D, distance: number, lookY = 0): string {
  const r = getRenderer();
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#ffd9c2', 1.7));
  const sun = new THREE.DirectionalLight('#ffffff', 2.2);
  sun.position.set(3, 5, 8);
  scene.add(sun);
  scene.add(obj);
  const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  cam.position.set(0, lookY + 0.3, distance);
  cam.lookAt(0, lookY, 0);
  r.render(scene, cam);
  const url = r.domElement.toDataURL('image/png');
  disposeDeep(scene);
  return url;
}

export function dragonPreview(equipped: Equipped, level: number): string {
  const key = `d:${JSON.stringify(equipped)}:${level}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const rig = buildDressedDragon(equipped, level);
  rig.head.rotation.set(-0.08, 0.35, 0);
  rig.root.rotation.y = 0.1;
  const url = shoot(rig.root, 7.5, -0.15);
  cache.set(key, url);
  return url;
}

/** A neutral "mannequin" head so accessories are shown in context. */
function mannequin() {
  const g = new THREE.Group();
  g.add(mesh(sphere(1, 28), toon('#f3e6d8'), [0, 0, 0], [1.15, 1, 1.05]));
  return g;
}

export function itemPreview(id: string): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const item = ITEMS[id];
  let url = '';
  const g = new THREE.Group();
  switch (item?.category) {
    case 'dragon':
      url = dragonPreview({ ...DEFAULT_EQUIPPED, dragon: id }, 1);
      break;
    case 'hat': {
      const m = mannequin();
      const hat = buildHat(id);
      if (hat) {
        hat.position.y = 0.9;
        m.add(hat);
      }
      m.rotation.set(0.15, 0.4, 0);
      g.add(m);
      url = shoot(g, 5.2, 0.6);
      break;
    }
    case 'glasses': {
      const gl = buildGlasses(id);
      if (gl) g.add(gl);
      g.rotation.y = 0.3;
      url = shoot(g, 3.2);
      break;
    }
    case 'necklace': {
      const n = buildNecklace(id);
      if (n) g.add(n);
      g.rotation.set(0.5, 0.3, 0);
      url = shoot(g, 3.6, -0.15);
      break;
    }
    case 'food': {
      const f = buildFood(id);
      f.setBurn(0.2);
      f.group.rotation.z = 0.5;
      g.add(f.group);
      url = shoot(g, 3.4, -0.1);
      break;
    }
    case 'fire': {
      const p = FIRE[id];
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        const c = p.rainbow ? new THREE.Color().setHSL(t, 1, 0.6) : p.core.clone().lerp(t < 0.5 ? p.mid : p.outer, t);
        g.add(mesh(sphere(0.18 + t * 0.35, 16), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 - t * 0.4 }), [-1.1 + t * 2.2, Math.sin(t * 6) * 0.15, 0]));
      }
      url = shoot(g, 4.5);
      break;
    }
    default:
      url = '';
  }
  if (url) cache.set(id, url);
  return url;
}
