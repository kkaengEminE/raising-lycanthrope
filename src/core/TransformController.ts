import * as THREE from 'three';
import type { Character } from './Character';
import type { TransformBurst } from '@/vfx/TransformBurst';
import { slotRegistry } from './SlotRegistry';

export type TransformDirection = 'to_night' | 'to_day';

export interface TransformControllerOptions {
  character: Character;
  vfx: TransformBurst;
  totalDuration?: number;
  swapAt?: number;
  flashAt?: number;
  shockwaveAt?: number;
}

interface TransformState {
  active: boolean;
  startTime: number;
  toFormId: string;
  direction: TransformDirection;
  swapped: boolean;
  flashed: boolean;
  shockwaveSpawned: boolean;
  particleSpawned: boolean;
  onComplete?: () => void;
}

const DEFAULT_DURATION = 1.2;
const DEFAULT_SWAP_AT = 0.55;
const DEFAULT_FLASH_AT = 0.55;
const DEFAULT_SHOCKWAVE_AT = 0.7;
const PARTICLE_AT = 0.5;

/**
 * 1.2s 변신 시퀀서.
 *  t=0.0   변신 시작 (애니 클립 재생, 오라 강도 ramp 는 외부에서)
 *  t=0.5   파티클 폭발 (chest_fx 마운트 위치)
 *  t=0.55  풀스크린 플래시 + 모든 슬롯 메시 swap (플래시가 swap 을 가림)
 *  t=0.7   바닥 충격파 링
 *  t=1.2   복귀 (idle 클립 크로스페이드 — 외부에서)
 */
export class TransformController {
  private character: Character;
  private vfx: TransformBurst;
  private duration: number;
  private swapAt: number;
  private flashAt: number;
  private shockwaveAt: number;
  private clock = new THREE.Clock();
  private state: TransformState | null = null;

  constructor(opts: TransformControllerOptions) {
    this.character = opts.character;
    this.vfx = opts.vfx;
    this.duration = opts.totalDuration ?? DEFAULT_DURATION;
    this.swapAt = opts.swapAt ?? DEFAULT_SWAP_AT;
    this.flashAt = opts.flashAt ?? DEFAULT_FLASH_AT;
    this.shockwaveAt = opts.shockwaveAt ?? DEFAULT_SHOCKWAVE_AT;
    this.clock.start();
  }

  isActive(): boolean {
    return this.state?.active ?? false;
  }

  /**
   * 변신 시작. 진행 중이면 무시.
   * direction 은 시각 효과 톤 결정용 (to_night = 보라/푸름, to_day = 따뜻함).
   */
  trigger(toFormId: string, direction: TransformDirection, onComplete?: () => void): boolean {
    if (this.state?.active) return false;
    if (!slotRegistry.getForm(toFormId)) {
      console.warn(`[TransformController] unknown form "${toFormId}"`);
      return false;
    }
    this.state = {
      active: true,
      startTime: this.clock.getElapsedTime(),
      toFormId,
      direction,
      swapped: false,
      flashed: false,
      shockwaveSpawned: false,
      particleSpawned: false,
      onComplete,
    };
    this.character.animation.play('transform', { fadeIn: 0.05 });
    return true;
  }

  /** 즉시 폼 swap (변신 시퀀스 없이) — 디버그용. */
  forceSet(formId: string): void {
    this.character.applyForm(formId);
  }

  update(): void {
    if (!this.state?.active) return;
    const t = (this.clock.getElapsedTime() - this.state.startTime) / this.duration;

    const isNight = this.state.direction === 'to_night';
    const palette = isNight ? PaletteNight : PaletteDay;

    if (!this.state.particleSpawned && t >= PARTICLE_AT) {
      const chestPos = this.getChestWorldPos();
      this.vfx.spawnParticleBurst(chestPos, palette.particle, 80);
      this.state.particleSpawned = true;
    }

    if (!this.state.flashed && t >= this.flashAt) {
      this.vfx.triggerFlash(palette.flash, 0.85, 220);
      this.state.flashed = true;
    }

    if (!this.state.swapped && t >= this.swapAt) {
      this.character.applyForm(this.state.toFormId);
      this.state.swapped = true;
    }

    if (!this.state.shockwaveSpawned && t >= this.shockwaveAt) {
      const footPos = this.getFootWorldPos();
      this.vfx.spawnRingShockwave(footPos, palette.shockwave);
      this.state.shockwaveSpawned = true;
    }

    if (t >= 1) {
      this.state.active = false;
      const cb = this.state.onComplete;
      this.state = null;
      cb?.();
    }
  }

  private getChestWorldPos(): THREE.Vector3 {
    const mount = this.character.mounts.get('chest_fx');
    const pos = new THREE.Vector3();
    if (mount) {
      mount.getWorldPosition(pos);
    } else {
      this.character.group.getWorldPosition(pos);
      pos.y += 1.1;
    }
    return pos;
  }

  private getFootWorldPos(): THREE.Vector3 {
    const pos = new THREE.Vector3();
    this.character.group.getWorldPosition(pos);
    return pos;
  }
}

const PaletteNight = {
  flash: 0xc8b0ff,
  particle: 0x9bb5ff,
  shockwave: 0x9bb5ff,
};

const PaletteDay = {
  flash: 0xfff2c8,
  particle: 0xffd966,
  shockwave: 0xffd966,
};
