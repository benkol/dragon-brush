import * as THREE from 'three';

let gradient: THREE.DataTexture | null = null;

/** Three-step ramp for a soft cel-shaded look. */
function gradientMap() {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
    gradient.minFilter = THREE.NearestFilter;
    gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return gradient;
}

export function toon(color: THREE.ColorRepresentation, extra: THREE.MeshToonMaterialParameters = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), ...extra });
}

/** Shiny material for metal/gems/lenses. */
export function shiny(color: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.25, ...extra });
}

export function mesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  pos: [number, number, number] = [0, 0, 0],
  scale?: [number, number, number],
  rot?: [number, number, number],
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  if (scale) m.scale.set(...scale);
  if (rot) m.rotation.set(...rot);
  return m;
}

export const sphere = (r: number, seg = 24) => new THREE.SphereGeometry(r, seg, Math.max(8, Math.round(seg * 0.75)));
export const cone = (r: number, h: number, seg = 16) => new THREE.ConeGeometry(r, h, seg);
export const cyl = (rt: number, rb: number, h: number, seg = 20) => new THREE.CylinderGeometry(rt, rb, h, seg);

/** Frees GPU memory of everything under `obj`. */
export function disposeDeep(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}

export function star2d(outer: number, inner: number, points = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

export function heart2d(size: number) {
  const s = new THREE.Shape();
  const k = size;
  s.moveTo(0, -0.9 * k);
  s.bezierCurveTo(-0.2 * k, -0.6 * k, -1 * k, -0.2 * k, -0.9 * k, 0.35 * k);
  s.bezierCurveTo(-0.8 * k, 0.9 * k, -0.15 * k, 0.9 * k, 0, 0.4 * k);
  s.bezierCurveTo(0.15 * k, 0.9 * k, 0.8 * k, 0.9 * k, 0.9 * k, 0.35 * k);
  s.bezierCurveTo(1 * k, -0.2 * k, 0.2 * k, -0.6 * k, 0, -0.9 * k);
  return s;
}

export const extrude = (shape: THREE.Shape, depth: number) =>
  new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: depth * 0.4, bevelThickness: depth * 0.4, bevelSegments: 2 });
