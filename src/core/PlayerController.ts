import * as THREE from 'three';
import { input } from './Input';
import type { Character } from './Character';

export interface PlayerControllerOptions {
  character: Character;
  camera: THREE.PerspectiveCamera;
  /** 이동 속도 (units/sec). */
  speed?: number;
  /** 캐릭터가 움직일 수 있는 영역 (XZ 사각형 bounds). */
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** 카메라가 캐릭터를 따라가는 강도 (0=정지, 1=즉시). 0.04~0.08 권장. */
  cameraFollowStrength?: number;
}

const TMP_QUAT = new THREE.Quaternion();
const TMP_EULER = new THREE.Euler(0, 0, 0, 'YXZ');

/**
 * WASD/화살표 키로 캐릭터 이동 + 카메라 소프트 팔로우.
 *
 * 카메라는 캐릭터 위치 기준 상대 오프셋을 유지하면서
 * lerp 로 부드럽게 따라간다 — 픽셀 미감을 위해 정수 픽셀 스냅 적용 가능.
 *
 * 회전: 이동 방향으로 캐릭터 yaw 를 부드럽게 회전.
 * 정지 시 yaw 유지 (관성).
 */
export class PlayerController {
  private character: Character;
  private camera: THREE.PerspectiveCamera;
  private speed: number;
  private bounds: NonNullable<PlayerControllerOptions['bounds']>;
  private followStrength: number;
  private cameraOffset: THREE.Vector3;
  private cameraTarget = new THREE.Vector3();
  private moving = false;
  private targetYaw = 0;
  private currentYaw = 0;

  constructor(opts: PlayerControllerOptions) {
    this.character = opts.character;
    this.camera = opts.camera;
    this.speed = opts.speed ?? 3.5;
    this.bounds = opts.bounds ?? { minX: -10, maxX: 10, minZ: -10, maxZ: 8 };
    this.followStrength = opts.cameraFollowStrength ?? 0.08;
    // 부팅 시 카메라가 캐릭터 기준 어느 방향에 있는지 기록 — 그 오프셋을 평생 유지.
    this.cameraOffset = this.camera.position.clone().sub(this.character.group.position);
    this.cameraTarget.copy(this.character.group.position);
    input.attach();
  }

  isMoving(): boolean {
    return this.moving;
  }

  setEnabled(enabled: boolean): void {
    if (!enabled) input.detach();
    else input.attach();
  }

  update(dt: number): void {
    const move = input.getMoveVector();
    this.moving = move.x !== 0 || move.z !== 0;

    const root = this.character.group;
    if (this.moving) {
      root.position.x += move.x * this.speed * dt;
      root.position.z += move.z * this.speed * dt;
      root.position.x = THREE.MathUtils.clamp(root.position.x, this.bounds.minX, this.bounds.maxX);
      root.position.z = THREE.MathUtils.clamp(root.position.z, this.bounds.minZ, this.bounds.maxZ);

      // 이동 방향으로 yaw — atan2(x, z) 는 +Z 가 "후방" 일 때 적합 (카메라가 +Z 쪽).
      this.targetYaw = Math.atan2(move.x, move.z);
    }

    // yaw 부드럽게 lerp
    const yawDelta = wrapAngle(this.targetYaw - this.currentYaw);
    this.currentYaw += yawDelta * Math.min(1, dt * 12);
    TMP_EULER.set(0, this.currentYaw + Math.PI, 0); // +π — 캐릭터 정면이 -Z 향하도록
    TMP_QUAT.setFromEuler(TMP_EULER);
    root.quaternion.slerp(TMP_QUAT, Math.min(1, dt * 8));

    // 애니메이션 — 이동 시 walk, 정지 시 idle
    const anim = this.character.animation;
    const cur = anim.getCurrent();
    if (this.moving && cur !== 'walk' && cur !== 'attack_swing' && cur !== 'transform' && cur !== 'hit_react') {
      anim.play('walk', { fadeIn: 0.18 });
    } else if (!this.moving && cur === 'walk') {
      anim.play('idle', { fadeIn: 0.2 });
    }

    // 카메라 소프트 팔로우 — 캐릭터 위치 + 고정 오프셋
    this.cameraTarget.copy(root.position).add(this.cameraOffset);
    this.camera.position.lerp(this.cameraTarget, this.followStrength);
    this.camera.lookAt(root.position.x, 1.0, root.position.z);
  }

  dispose(): void {
    input.detach();
  }
}

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
