// GPU point-sprite particles for the fire stream, smoke and sparkles.
import * as THREE from 'three';
import type { FirePalette } from './items';

let spriteTex: THREE.Texture | null = null;
function sprite() {
  if (spriteTex) return spriteTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.75)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  spriteTex = new THREE.CanvasTexture(c);
  return spriteTex;
}

const vert = /* glsl */ `
  attribute float size;
  attribute vec4 color;
  uniform float scale;
  varying vec4 vColor;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * scale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const frag = /* glsl */ `
  uniform sampler2D map;
  varying vec4 vColor;
  void main() {
    vec4 t = texture2D(map, gl_PointCoord);
    gl_FragColor = vec4(vColor.rgb, vColor.a * t.a);
  }
`;

type Kind = 'fire' | 'smoke' | 'spark';

export class Particles {
  readonly points: THREE.Points;
  private pos: Float32Array;
  private col: Float32Array;
  private size: Float32Array;
  private vel: Float32Array;
  private age: Float32Array;
  private life: Float32Array;
  private hue: Float32Array;
  private next = 0;
  private material: THREE.ShaderMaterial;
  private tmp = new THREE.Color();

  constructor(private max: number, private kind: Kind, public palette?: FirePalette) {
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.age = new Float32Array(max).fill(1);
    this.life = new Float32Array(max).fill(1);
    this.hue = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.ShaderMaterial({
      uniforms: { map: { value: sprite() }, scale: { value: 300 } },
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: kind === 'smoke' ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = kind === 'smoke' ? 1 : 2;
  }

  /** Point size scale: depends on viewport height and pixel ratio. */
  setScale(s: number) {
    this.material.uniforms.scale.value = s;
  }

  emit(p: THREE.Vector3, v: THREE.Vector3, life: number, hue = 0) {
    const i = this.next;
    this.next = (this.next + 1) % this.max;
    this.pos.set([p.x, p.y, p.z], i * 3);
    this.vel.set([v.x, v.y, v.z], i * 3);
    this.age[i] = 0;
    this.life[i] = life;
    this.hue[i] = hue;
  }

  update(dt: number) {
    const pal = this.palette;
    for (let i = 0; i < this.max; i++) {
      const a = this.age[i] + dt / this.life[i];
      this.age[i] = a;
      if (a >= 1) {
        this.col[i * 4 + 3] = 0;
        this.size[i] = 0;
        continue;
      }
      const drag = this.kind === 'smoke' ? 0.98 : 0.995;
      for (let k = 0; k < 3; k++) {
        this.vel[i * 3 + k] *= drag;
        this.pos[i * 3 + k] += this.vel[i * 3 + k] * dt;
      }
      let alpha = 1;
      if (this.kind === 'fire' && pal) {
        // White-hot core → mid → outer as it travels.
        if (pal.rainbow) this.tmp.setHSL((this.hue[i] + a * 0.3) % 1, 1, 0.5);
        else if (a < 0.35) this.tmp.copy(pal.core).lerp(pal.mid, a / 0.35);
        else this.tmp.copy(pal.mid).lerp(pal.outer, (a - 0.35) / 0.65);
        // Thin at the mouth, billowing out toward the target. Additive
        // blending saturates quickly, so keep each particle faint.
        alpha = 0.4 * (a < 0.2 ? a / 0.2 : 1 - Math.pow(a, 2));
        this.size[i] = 0.15 + a * 1.1;
      } else if (this.kind === 'smoke') {
        this.vel[i * 3 + 1] += dt * 0.6;
        this.tmp.setRGB(0.45, 0.42, 0.42);
        alpha = 0.45 * (1 - a);
        this.size[i] = 0.5 + a * 1.6;
      } else {
        this.tmp.setHSL(this.hue[i], 1, 0.85);
        alpha = (1 - a) * (0.6 + 0.4 * Math.sin(a * 40));
        this.size[i] = 0.25;
      }
      this.col.set([this.tmp.r, this.tmp.g, this.tmp.b, alpha], i * 4);
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    g.attributes.size.needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
