import * as THREE from 'three';
import type { EnemyManager } from './EnemyManager';
import type { Enemy } from './Enemy';

export interface GuardianInvasionOptions {
  /** karma 값을 가져오는 함수 (-1..+1). */
  getKarma: () => number;
}

/**
 * 카르마 비례로 매 밤마다 가디언 난입 판정.
 * |karma| / 100 * 30% (max 30%) 의 등장 확률을 가지며,
 * karma > 0 → 조력 가디언 (적을 공격)
 * karma < 0 → 적대 가디언 (주인공 추격)
 */
export class GuardianInvasion {
  private opts: GuardianInvasionOptions;
  private enemies: EnemyManager;
  private currentGuardian: Enemy | null = null;
  private rolledThisNight = false;
  private decayTimer = 0;

  constructor(enemies: EnemyManager, opts: GuardianInvasionOptions) {
    this.enemies = enemies;
    this.opts = opts;
  }

  /** 밤 시작 시 호출. 확률 굴림. */
  rollForNight(): void {
    this.rolledThisNight = true;
    const karma = this.opts.getKarma();
    const chance = Math.min(0.3, Math.abs(karma) * 0.3);
    if (Math.random() > chance) return;

    const kind = karma > 0 ? 'guardian_ally' : 'guardian_hostile';
    const angle = Math.random() * Math.PI * 2;
    const radius = 8;
    const pos = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius - 1.5);
    this.currentGuardian = this.enemies.spawn(kind, pos);
  }

  /** 밤 종료 시 호출. 가디언 정리. */
  reset(): void {
    this.rolledThisNight = false;
    this.currentGuardian = null;
  }

  hasRolled(): boolean {
    return this.rolledThisNight;
  }

  hasGuardian(): boolean {
    return this.currentGuardian?.alive ?? false;
  }

  update(dt: number): void {
    if (this.currentGuardian && !this.currentGuardian.alive) {
      // dispose 된 후 reference 제거
      this.decayTimer -= dt;
      if (this.decayTimer <= 0) this.currentGuardian = null;
    } else if (this.currentGuardian) {
      this.decayTimer = 1.0;
    }
  }
}
