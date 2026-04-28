import * as THREE from 'three';
import type { EnemyManager } from './EnemyManager';

export interface SlideCombatOptions {
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  enemies: EnemyManager;
  damagePerSwipe?: number;
  slashRadius?: number;
  /** 슬래시가 적중했을 때 외부 알림 — Character 가 attack_swing 클립을 재생할 수 있게. */
  onSlash?: (start: THREE.Vector3, end: THREE.Vector3, hitCount: number) => void;
}

interface ActiveTrail {
  line: THREE.Line;
  positions: THREE.Vector3[];
  startTime: number;
  duration: number;
}

const GROUND_Y = 1.0; // 슬라이드 궤적이 그라운드보다 살짝 위 평면에서 펼쳐진다

/**
 * 마우스/터치 드래그 → 화면상의 궤적을 월드 평면(y=GROUND_Y)에 투영해 슬라이드 공격.
 * 시작/끝 점만으로 직선 데미지 판정 (최소 길이 0.5 단위 이상 시 발화).
 */
type ResolvedOptions = Required<Omit<SlideCombatOptions, 'onSlash'>> & Pick<SlideCombatOptions, 'onSlash'>;

export class SlideCombat {
  private opts: ResolvedOptions;
  private active = false;
  private down = false;
  private start = new THREE.Vector3();
  private current = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -GROUND_Y);
  private trails: ActiveTrail[] = [];
  private clock = new THREE.Clock();
  private trailVisuals: THREE.Group;

  constructor(options: SlideCombatOptions) {
    this.opts = {
      damagePerSwipe: 22,
      slashRadius: 0.9,
      ...options,
    };
    this.trailVisuals = new THREE.Group();
    this.opts.scene.add(this.trailVisuals);
    this.clock.start();
    this.bind();
  }

  setActive(active: boolean): void {
    this.active = active;
    if (!active) this.cancelTrail();
  }

  setDamage(damage: number): void {
    this.opts.damagePerSwipe = damage;
  }

  private bind(): void {
    const c = this.opts.canvas;
    c.addEventListener('pointerdown', this.onDown);
    c.addEventListener('pointermove', this.onMove);
    c.addEventListener('pointerup', this.onUp);
    c.addEventListener('pointercancel', this.onUp);
    c.addEventListener('pointerleave', this.onUp);
  }

  private onDown = (e: PointerEvent): void => {
    if (!this.active) return;
    if (!this.projectToWorld(e.clientX, e.clientY, this.start)) return;
    this.current.copy(this.start);
    this.down = true;
  };

  private onMove = (e: PointerEvent): void => {
    if (!this.active || !this.down) return;
    this.projectToWorld(e.clientX, e.clientY, this.current);
  };

  private onUp = (): void => {
    if (!this.down) return;
    this.down = false;
    if (!this.active) return;
    const length = this.start.distanceTo(this.current);
    if (length < 0.5) return;
    const hits = this.opts.enemies.applySlashDamage(this.start, this.current, this.opts.damagePerSwipe, this.opts.slashRadius);
    this.spawnTrail(this.start.clone(), this.current.clone());
    this.opts.onSlash?.(this.start.clone(), this.current.clone(), hits.length);
  };

  private cancelTrail(): void {
    this.down = false;
  }

  private projectToWorld(clientX: number, clientY: number, out: THREE.Vector3): boolean {
    const rect = this.opts.canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.opts.camera);
    return this.raycaster.ray.intersectPlane(this.plane, out) !== null;
  }

  private spawnTrail(start: THREE.Vector3, end: THREE.Vector3): void {
    const positions: THREE.Vector3[] = [start.clone(), end.clone()];
    const geom = new THREE.BufferGeometry().setFromPoints(positions);
    const mat = new THREE.LineBasicMaterial({
      color: 0xfff0b0,
      transparent: true,
      opacity: 0.95,
      linewidth: 4,
      depthTest: false,
    });
    const line = new THREE.Line(geom, mat);
    line.renderOrder = 100;
    this.trailVisuals.add(line);
    this.trails.push({
      line,
      positions,
      startTime: this.clock.getElapsedTime(),
      duration: 0.45,
    });
  }

  update(): void {
    const t = this.clock.getElapsedTime();
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const trail = this.trails[i];
      const dt = (t - trail.startTime) / trail.duration;
      const mat = trail.line.material as THREE.LineBasicMaterial;
      mat.opacity = 0.95 * Math.max(0, 1 - dt);
      if (dt >= 1) {
        this.trailVisuals.remove(trail.line);
        (trail.line.geometry as THREE.BufferGeometry).dispose();
        mat.dispose();
        this.trails.splice(i, 1);
      }
    }

    // 현재 드래그 중인 트레일 미리보기 (라이브)
    if (this.down) {
      this.renderLivePreview();
    } else {
      this.removeLivePreview();
    }
  }

  private liveLine: THREE.Line | null = null;
  private renderLivePreview(): void {
    const points = [this.start, this.current];
    if (!this.liveLine) {
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: 0x9bb5ff,
        transparent: true,
        opacity: 0.55,
        depthTest: false,
      });
      this.liveLine = new THREE.Line(geom, mat);
      this.liveLine.renderOrder = 99;
      this.trailVisuals.add(this.liveLine);
    } else {
      (this.liveLine.geometry as THREE.BufferGeometry).setFromPoints(points);
    }
  }
  private removeLivePreview(): void {
    if (!this.liveLine) return;
    this.trailVisuals.remove(this.liveLine);
    (this.liveLine.geometry as THREE.BufferGeometry).dispose();
    (this.liveLine.material as THREE.Material).dispose();
    this.liveLine = null;
  }

  dispose(): void {
    const c = this.opts.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointercancel', this.onUp);
    c.removeEventListener('pointerleave', this.onUp);
    this.trailVisuals.removeFromParent();
    this.removeLivePreview();
    for (const t of this.trails) {
      (t.line.geometry as THREE.BufferGeometry).dispose();
      (t.line.material as THREE.Material).dispose();
    }
    this.trails = [];
  }
}
