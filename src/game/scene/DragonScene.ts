import * as THREE from 'three';
import type { Equipped } from '../../data/types';
import type { Corner } from '../gameMachine';
import type { Point } from '../aim';
import type { Rig } from './dragons';
import { buildDressedDragon } from './dress';
import { buildFood, FIRE, type Food } from './items';
import { Particles } from './fire';
import { cyl, disposeDeep, mesh, toon } from './toon';
import type { Surface } from '../soloMachine';

/** What the dragon brushes in "brush by myself" mode. */
export interface BrushPose {
  zone: Corner | null;
  surface: Surface;
}

/** A chunky kid toothbrush; the pivot is at the bristles, the handle runs along +x. */
function buildToothbrush() {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.07, 0.07, 1.3), toon('#4fc3f7'), [0.75, 0, 0], undefined, [0, 0, Math.PI / 2]));
  g.add(mesh(new THREE.BoxGeometry(0.34, 0.12, 0.14), toon('#4fc3f7'), [0.05, 0, 0]));
  g.add(mesh(new THREE.BoxGeometry(0.3, 0.1, 0.16), toon('#ffffff'), [0.05, 0, -0.12]));
  return g;
}

/** Fang color before brushing, matching the stains on the mouth map. */
const STAINED = new THREE.Color('#c9a25e');
const CLEAN = new THREE.Color('#ffffff');
const SHINE_S = 2.2;

/** Mouth opening for each surface, so the dragon shows how to reach it. */
const BRUSH_JAW: Record<Surface, number> = { outside: 0.05, inside: 0.5, tops: 0.45, tongue: 0.75 };

export interface SceneFrame {
  faceVisible: boolean;
  /** Head pose relative to neutral, screen space (mirrored), radians. */
  yaw: number;
  pitch: number;
  roll: number;
  /** 0 (closed) → 1 (wide open). */
  jaw: number;
  /** Face center in normalized screen coords (0..1, mirrored). */
  faceX: number;
  faceY: number;
  fireOn: boolean;
  /** Where the fire lands, in CSS px. */
  aim: Point | null;
  burn: number;
  hitting: boolean;
}

const FOV = 40;
const CAM_Z = 12;
const FOOD_Z = 1.2;
const EAT_S = 1.4;
const FIRE_RATE = 200;

const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);

export class DragonScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  private holder = new THREE.Group();
  private rig: Rig;
  private food: Food;
  private foodHolder = new THREE.Group();
  private foodHome = new THREE.Vector3();
  private fire: Particles;
  private smoke = new Particles(160, 'smoke');
  private sparks = new Particles(220, 'spark');
  private w = 1;
  private h = 1;
  private halfW = 1;
  private halfH = 1;
  private baseScale = 1;
  /** Share of the view's height the head may take (the game leaves room for the targets). */
  private fill = 0.3;
  private t = 0;
  private jawOpen = 0;
  private fireAcc = 0;
  private smokeAcc = 0;
  private sparkAcc = 0;
  private blinkIn = 2;
  private blinkT = -1;
  private eatT = -1;
  private eatFrom = new THREE.Vector3();
  private celebrateT = -1;
  private brush: THREE.Group | null = null;
  private brushPose: BrushPose | null = null;
  /** Teeth being cleaned in "brush by myself" (they shine when the dragon celebrates). */
  private cleaning = false;
  private shineAcc = 0;
  private v1 = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private v3 = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, equipped: Equipped, level: number) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.camera.position.set(0, 0, CAM_Z);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#ffd9c2', 1.7));
    const sun = new THREE.DirectionalLight('#ffffff', 2.2);
    sun.position.set(3, 5, 8);
    this.scene.add(sun);

    this.rig = buildDressedDragon(equipped, level);
    this.holder.add(this.rig.root);
    this.scene.add(this.holder);

    this.food = buildFood(equipped.food);
    this.foodHolder.add(this.food.group);
    this.foodHolder.visible = false;
    this.scene.add(this.foodHolder);

    this.fire = new Particles(700, 'fire', FIRE[equipped.fire] ?? FIRE['fire.classic']);
    this.scene.add(this.smoke.points, this.fire.points, this.sparks.points);
  }

  /** A bigger dragon when it has the view to itself ("brush by myself"). */
  setFill(fill: number) {
    this.fill = fill;
    this.resize(this.w, this.h);
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.halfH = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z;
    this.halfW = this.halfH * this.camera.aspect;
    // Head is ~2.6 units wide (with ears) and ~2.4 tall with neck.
    this.baseScale = Math.min((this.halfW * 2 * 0.6) / 2.6, (this.halfH * 2 * this.fill) / 2.2);
    const scale = (h * this.renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    [this.fire, this.smoke, this.sparks].forEach((p) => p.setScale(scale));
  }

  screenToWorld(p: Point, z = 0, out = new THREE.Vector3()) {
    out.set((p.x / this.w) * 2 - 1, -(p.y / this.h) * 2 + 1, 0.5).unproject(this.camera);
    out.sub(this.camera.position).normalize();
    const t = (z - this.camera.position.z) / out.z;
    return out.multiplyScalar(t).add(this.camera.position);
  }

  worldToScreen(v: THREE.Vector3): Point {
    const p = v.clone().project(this.camera);
    return { x: ((p.x + 1) / 2) * this.w, y: ((1 - p.y) / 2) * this.h };
  }

  /** Screen position of the dragon's face, for the countdown overlay. */
  headScreen(): Point {
    this.rig.head.getWorldPosition(this.v1);
    return this.worldToScreen(this.v1);
  }

  /** Shows fresh food at a corner, or hides it. */
  setTarget(corner: Corner | null, pos: Point | null) {
    if (!corner || !pos) {
      this.foodHolder.visible = false;
      return;
    }
    this.screenToWorld(pos, FOOD_Z, this.foodHome);
    this.foodHolder.position.copy(this.foodHome);
    this.foodHolder.scale.setScalar(this.baseScale * 0.85);
    this.food.setBurn(0);
    // Skewer points out toward the screen edge.
    const dx = corner.endsWith('R') ? 1 : -1;
    const dy = corner.startsWith('T') ? 0.4 : -0.4;
    this.food.group.rotation.set(0, 0, Math.atan2(dx, -dy));
    this.foodHolder.visible = true;
    this.eatT = -1;
  }

  playEat() {
    this.eatT = 0;
    this.eatFrom.copy(this.foodHolder.position);
  }

  celebrate() {
    this.celebrateT = 0;
    this.foodHolder.visible = false;
    this.setBrushing(null);
  }

  /** 0 = stained fangs, 1 = clean. */
  setTeethClean(p: number) {
    this.cleaning = true;
    this.rig.teeth.color.copy(STAINED).lerp(CLEAN, Math.min(1, Math.max(0, p)));
  }

  /** Sparkles on clean fangs and a glow pulse while celebrating. */
  private shine(dt: number) {
    const on = this.cleaning && this.celebrateT >= 0 && this.celebrateT < SHINE_S;
    this.rig.teeth.emissive.setScalar(on ? 0.35 * Math.abs(Math.sin(this.celebrateT * 7)) : 0);
    if (!on) return;
    this.shineAcc += 40 * dt;
    const vel = this.v3;
    while (this.shineAcc >= 1) {
      this.shineAcc -= 1;
      const fang = this.rig.fangs[Math.floor(Math.random() * this.rig.fangs.length)];
      fang.getWorldPosition(this.v2);
      vel.set(Math.random() - 0.5, Math.random() * 0.8, 0.5).multiplyScalar(1.6);
      // Light blue, like the sparkles on the map.
      this.sparks.emit(this.v2, vel, 0.45 + Math.random() * 0.3, 0.55 + (Math.random() - 0.5) * 0.05);
    }
  }

  /** The dragon brushes along with the kid (null puts the brush away). */
  setBrushing(pose: BrushPose | null) {
    this.brushPose = pose;
    if (pose && !this.brush) {
      this.brush = buildToothbrush();
      this.rig.head.add(this.brush);
    }
    if (this.brush) this.brush.visible = !!pose;
  }

  /** Places the brush on the zone (head space; +x is screen right) and scrubs in small circles. */
  private moveBrush() {
    const b = this.brush;
    const p = this.brushPose;
    if (!b || !p) return;
    const side = p.zone ? (p.zone.endsWith('R') ? 1 : -1) : 0;
    const upper = p.zone?.startsWith('T') ?? false;
    const deep = p.surface === 'outside' ? 0 : p.surface === 'tongue' ? 0.35 : 0.25;
    const y = p.surface === 'tongue' ? -0.62 : upper ? -0.33 : -0.6;
    const circle = this.t * 2 * Math.PI * 2.2;
    b.position.set(side * 0.38 + Math.cos(circle) * 0.05, y + Math.sin(circle) * 0.05, 1.2 - deep);
    // The handle sticks out toward the zone's side; for the tongue, straight out and down.
    b.rotation.set(0, side < 0 ? Math.PI : 0, side === 0 ? -Math.PI / 2.4 : upper ? 0.12 : -0.12);
    if (side === 0) b.rotation.y = -Math.PI / 2;
  }

  frame(f: SceneFrame, dt: number) {
    this.t += dt;
    const rig = this.rig;
    const eating = this.eatT >= 0;
    const celebrating = this.celebrateT >= 0;
    if (eating) this.eatT += dt;
    if (celebrating) this.celebrateT += dt;
    const eatP = eating ? Math.min(1, this.eatT / EAT_S) : 0;
    const chewing = eating && eatP > 0.43;

    // --- Head pose ---------------------------------------------------------
    let yaw = f.yaw * 1.15;
    let pitch = f.pitch * 1.15;
    let roll = f.roll;
    if (!f.faceVisible && !celebrating) {
      yaw = Math.sin(this.t * 1.6) * 0.45;
      pitch = 0.1;
      roll = 0;
    }
    if (celebrating) {
      const c = this.celebrateT;
      yaw = Math.sin(c * 6) * 0.3;
      roll = Math.sin(c * 6) * 0.22;
      pitch = 0.2 + Math.abs(Math.sin(c * 12)) * 0.1;
    }
    if (chewing && this.food.yucky) yaw += Math.sin(this.t * 40) * 0.12;
    const k = damp(18, dt);
    rig.head.rotation.y += (yaw - rig.head.rotation.y) * k;
    rig.head.rotation.x += (-pitch - rig.head.rotation.x) * k;
    rig.head.rotation.z += (roll - rig.head.rotation.z) * k;
    rig.root.rotation.y = rig.head.rotation.y * 0.25;

    // --- Jaw ---------------------------------------------------------------
    let jaw = f.faceVisible ? f.jaw : 0;
    if (this.brushPose) jaw = BRUSH_JAW[this.brushPose.surface];
    this.moveBrush();
    if (eating) jaw = eatP < 0.43 ? Math.min(1, eatP * 4) : 0.12 + 0.18 * Math.abs(Math.sin((eatP - 0.43) * 28));
    if (celebrating) jaw = 0.35 + 0.2 * Math.abs(Math.sin(this.celebrateT * 8));
    this.jawOpen += (jaw - this.jawOpen) * damp(30, dt);
    rig.setJawOpen(this.jawOpen);

    // --- Eyes: blink, squint, look at the target -----------------------------
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blinkT = 0;
      this.blinkIn = 2.5 + Math.random() * 3;
    }
    let eyeY = 1;
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      eyeY = this.blinkT < 0.07 ? 1 - this.blinkT / 0.07 : Math.min(1, (this.blinkT - 0.07) / 0.07);
      eyeY = Math.max(0.08, eyeY);
      if (this.blinkT > 0.14) this.blinkT = -1;
    }
    if (chewing && this.food.yucky) eyeY = 0.3;
    if (celebrating) eyeY = 0.55 + 0.45 * Math.abs(Math.cos(this.celebrateT * 3));
    rig.eyes.forEach((e) => (e.scale.y = eyeY));
    const look = f.aim ? { x: (f.aim.x / this.w - 0.5) * 2, y: (f.aim.y / this.h - 0.5) * 2 } : { x: 0, y: 0 };
    rig.pupils.forEach((p) => {
      p.rotation.y += (look.x * 0.35 - p.rotation.y) * damp(10, dt);
      p.rotation.x += (look.y * 0.3 - p.rotation.x) * damp(10, dt);
    });
    const blush = celebrating || chewing ? 0.85 : 0.35;
    rig.cheeks.forEach((m) => (m.opacity += (blush - m.opacity) * damp(5, dt)));

    rig.wings.forEach((w, i) => {
      const s = i === 0 ? -1 : 1;
      const speed = celebrating ? 14 : 2.2;
      w.rotation.z = s * (0.15 + Math.sin(this.t * speed) * (celebrating ? 0.45 : 0.15));
    });

    // --- Position: follow the face, but stay near the center -----------------
    const fx = f.faceVisible ? (f.faceX - 0.5) * 2 * this.halfW : 0;
    const fy = f.faceVisible ? -(f.faceY - 0.5) * 2 * this.halfH : 0;
    const tx = THREE.MathUtils.clamp(fx * 0.5, -this.halfW * 0.22, this.halfW * 0.22);
    const ty = THREE.MathUtils.clamp(0.25 + fy * 0.4, -this.halfH * 0.15, this.halfH * 0.2);
    let bob = 0;
    if (celebrating) bob = Math.abs(Math.sin(this.celebrateT * 6)) * 0.5;
    this.holder.position.x += (tx - this.holder.position.x) * damp(6, dt);
    this.holder.position.y += (ty + bob - this.holder.position.y) * damp(celebrating ? 20 : 6, dt);
    let squash = 1;
    if (chewing) squash = 1 - 0.06 * Math.abs(Math.sin((eatP - 0.43) * 28));
    this.holder.scale.set(this.baseScale / Math.sqrt(squash), this.baseScale * squash, this.baseScale);

    // --- Fire --------------------------------------------------------------
    rig.anchors.mouth.getWorldPosition(this.v1);
    if (f.fireOn && !eating && !celebrating) {
      const target = f.aim
        ? this.screenToWorld(f.aim, FOOD_Z, this.v2)
        : this.v2.set(0, 0, 1).applyQuaternion(rig.head.getWorldQuaternion(new THREE.Quaternion())).multiplyScalar(6).add(this.v1);
      const dir = this.v3.copy(target).sub(this.v1);
      const dist = dir.length();
      dir.normalize();
      const speed = dist / 0.42;
      this.fireAcc += FIRE_RATE * dt;
      const vel = new THREE.Vector3();
      while (this.fireAcc >= 1) {
        this.fireAcc -= 1;
        vel.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(speed * 0.1).addScaledVector(dir, speed);
        this.fire.emit(this.v1, vel, 0.4 + Math.random() * 0.1, (this.t * 0.4 + Math.random() * 0.15) % 1);
      }
      if (this.fire.palette?.sparkles) {
        this.sparkAcc += 80 * dt;
        while (this.sparkAcc >= 1) {
          this.sparkAcc -= 1;
          const p = this.v1.clone().lerp(target, Math.random());
          vel.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(1.5);
          const hue = this.fire.palette.sparkHue;
          this.sparks.emit(p, vel, 0.5 + Math.random() * 0.4, hue === undefined ? Math.random() : hue + (Math.random() - 0.5) * 0.06);
        }
      }
    }

    // --- Food: burning, smoke, embers, eaten ---------------------------------
    if (this.foodHolder.visible) {
      this.food.setBurn(f.burn);
      if (f.hitting && !eating) {
        const wob = 1 + Math.sin(this.t * 30) * 0.04;
        this.foodHolder.scale.setScalar(this.baseScale * 0.85 * wob);
        this.smokeAcc += (10 + f.burn * 30) * dt;
        while (this.smokeAcc >= 1) {
          this.smokeAcc -= 1;
          this.smoke.emit(this.foodHolder.position, new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.8 + Math.random() * 0.6, 0), 1.2 + Math.random() * 0.6);
        }
        this.sparkAcc += 30 * dt;
        while (this.sparkAcc >= 1) {
          this.sparkAcc -= 1;
          this.sparks.emit(this.foodHolder.position, new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 2), 0.5, 0.08);
        }
      }
      if (eating) {
        if (eatP < 0.43) {
          const p = eatP / 0.43;
          const e = p * p;
          this.foodHolder.position.copy(this.eatFrom).lerp(this.v1, e);
          this.foodHolder.scale.setScalar(this.baseScale * 0.85 * (1 - e * 0.6));
        } else {
          this.foodHolder.visible = false;
        }
      }
    }
    if (eating && eatP >= 1) this.eatT = -1;
    this.shine(dt);

    this.fire.update(dt);
    this.smoke.update(dt);
    this.sparks.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    disposeDeep(this.scene);
    this.fire.dispose();
    this.smoke.dispose();
    this.sparks.dispose();
    this.renderer.dispose();
  }
}
