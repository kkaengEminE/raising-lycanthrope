import * as THREE from 'three';
import { Enemy, type EnemyKind } from './Enemy';

export interface EnemyKillEvent {
  enemy: Enemy;
  worldPosition: THREE.Vector3;
  goldReward: number;
  karmaDelta: number;
}

export interface EnemyDamagedEvent {
  enemy: Enemy;
  worldPosition: THREE.Vector3;
  damage: number;
}

export interface EnemyHitPlayerEvent {
  enemy: Enemy;
  damage: number;
}

type Listener<T> = (e: T) => void;

export class EnemyManager {
  scene: THREE.Scene;
  private enemies: Enemy[] = [];
  private camera: THREE.PerspectiveCamera;
  private faceCamera = new THREE.Quaternion();

  private killListeners = new Set<Listener<EnemyKillEvent>>();
  private damageListeners = new Set<Listener<EnemyDamagedEvent>>();
  private hitPlayerListeners = new Set<Listener<EnemyHitPlayerEvent>>();

  private playerPos = new THREE.Vector3();
  private spawnTimer = 0;
  private spawnInterval = 2.2;
  private active = false;
  private elapsed = 0;
  private playerHitCooldown = new WeakMap<Enemy, number>();
  private guardianAlive = false;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
  }

  setActive(active: boolean): void {
    this.active = active;
    if (!active) {
      this.clearAll();
    }
  }

  isActive(): boolean {
    return this.active;
  }

  setPlayerPosition(pos: THREE.Vector3): void {
    this.playerPos.copy(pos);
  }

  setSpawnInterval(seconds: number): void {
    this.spawnInterval = seconds;
  }

  spawn(kind: EnemyKind, position: THREE.Vector3): Enemy {
    const e = new Enemy(kind, position);
    this.enemies.push(e);
    this.scene.add(e.group);
    if (kind === 'guardian_ally' || kind === 'guardian_hostile') this.guardianAlive = true;
    return e;
  }

  spawnRandom(): void {
    const kinds: EnemyKind[] = ['wisp', 'imp'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const angle = Math.random() * Math.PI * 2;
    const radius = 6 + Math.random() * 3;
    const pos = new THREE.Vector3(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius - 1.5,
    );
    this.spawn(kind, pos);
  }

  hasGuardian(): boolean {
    return this.guardianAlive;
  }

  /** 슬라이드 궤적과 교차하는 모든 적에 데미지 적용. */
  applySlashDamage(start: THREE.Vector3, end: THREE.Vector3, damage: number, radius = 1.0): Enemy[] {
    const hit: Enemy[] = [];
    const segDir = new THREE.Vector3().subVectors(end, start);
    const segLen = segDir.length();
    if (segLen < 0.001) return hit;
    segDir.normalize();

    for (const e of this.enemies) {
      if (!e.alive) continue;
      const toEnemy = new THREE.Vector3().subVectors(e.group.position, start);
      const proj = THREE.MathUtils.clamp(toEnemy.dot(segDir), 0, segLen);
      const closest = new THREE.Vector3().copy(start).addScaledVector(segDir, proj);
      const dist = closest.distanceTo(e.group.position);
      if (dist <= radius + 0.4) {
        const applied = e.takeDamage(damage);
        const wp = e.group.position.clone();
        wp.y += 1.0;
        for (const cb of this.damageListeners) cb({ enemy: e, worldPosition: wp, damage: applied });
        if (!e.alive) {
          for (const cb of this.killListeners) {
            cb({
              enemy: e,
              worldPosition: e.group.position.clone(),
              goldReward: e.config.goldReward,
              karmaDelta: e.config.karmaOnKill,
            });
          }
        }
        hit.push(e);
      }
    }
    return hit;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.elapsed += dt;

    this.faceCamera.copy(this.camera.quaternion);

    if (this.spawnTimer <= 0 && this.enemies.filter((e) => e.alive).length < 6) {
      this.spawnRandom();
      this.spawnTimer = this.spawnInterval;
    }
    this.spawnTimer = Math.max(0, this.spawnTimer - dt);

    for (const e of this.enemies) {
      e.update(dt, this.elapsed, e.alive ? this.playerPos : null, this.faceCamera);
      if (e.alive) {
        const distToPlayer = e.group.position.distanceTo(this.playerPos);
        if (distToPlayer < 1.2) {
          const cd = this.playerHitCooldown.get(e) ?? 0;
          if (cd <= 0) {
            for (const cb of this.hitPlayerListeners) cb({ enemy: e, damage: e.config.attackDamage });
            this.playerHitCooldown.set(e, 1.0);
          } else {
            this.playerHitCooldown.set(e, cd - dt);
          }
        }
      }
    }

    // 죽은 enemy 정리 (페이드 후 제거)
    this.enemies = this.enemies.filter((e) => {
      if (!e.alive && !e.group.userData.deathTimer) e.group.userData.deathTimer = 0.45;
      if (!e.alive) {
        e.group.userData.deathTimer -= dt;
        e.group.scale.setScalar(Math.max(0.001, e.group.scale.x * (1 - dt * 2.5)));
        e.group.position.y -= dt * 0.6;
        if (e.group.userData.deathTimer <= 0) {
          this.scene.remove(e.group);
          e.dispose();
          if (e.kind === 'guardian_ally' || e.kind === 'guardian_hostile') this.guardianAlive = false;
          return false;
        }
      }
      return true;
    });
  }

  clearAll(): void {
    for (const e of this.enemies) {
      this.scene.remove(e.group);
      e.dispose();
    }
    this.enemies = [];
    this.guardianAlive = false;
  }

  getActiveEnemies(): Enemy[] {
    return this.enemies.filter((e) => e.alive);
  }

  onKill(cb: Listener<EnemyKillEvent>): () => void {
    this.killListeners.add(cb);
    return () => this.killListeners.delete(cb);
  }
  onDamage(cb: Listener<EnemyDamagedEvent>): () => void {
    this.damageListeners.add(cb);
    return () => this.damageListeners.delete(cb);
  }
  onHitPlayer(cb: Listener<EnemyHitPlayerEvent>): () => void {
    this.hitPlayerListeners.add(cb);
    return () => this.hitPlayerListeners.delete(cb);
  }
}
