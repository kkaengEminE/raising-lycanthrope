import * as THREE from 'three';
import type { AnimationManager } from './AnimationManager';

/**
 * 프로토타입용 절차적 애니메이션 클립.
 * 실제 Mixamo 클립이 GLB 로 도착하면 registerClip() 으로 자연스럽게 교체된다.
 *
 * 모든 클립은 weight (0..1) 로 transform delta 를 곱한다 — 크로스페이드 안전.
 */

const TMP_QUAT = new THREE.Quaternion();
const TMP_EULER = new THREE.Euler();

export function registerStandardClips(anim: AnimationManager): void {
  // ---- IDLE ----
  anim.registerProcedural('idle', (ctx) => {
    const bob = Math.sin(ctx.globalTime * 1.4) * 0.04;
    ctx.root.position.y = lerp(ctx.root.position.y, bob, ctx.weight);
    const head = ctx.mounts.get('head_top');
    if (head) {
      head.rotation.y = lerp(head.rotation.y, Math.sin(ctx.globalTime * 0.9) * 0.05, ctx.weight);
    }
    // 손 마운트 살짝 흔들림
    const handL = ctx.mounts.get('hand_l');
    const handR = ctx.mounts.get('hand_r');
    const sway = Math.sin(ctx.globalTime * 1.2) * 0.04;
    if (handL) handL.rotation.x = lerp(handL.rotation.x, sway, ctx.weight);
    if (handR) handR.rotation.x = lerp(handR.rotation.x, -sway, ctx.weight);
  }, 'loop');

  // ---- WALK ----
  anim.registerProcedural('walk', (ctx) => {
    // 발자국 보빙 (걷는 박자)
    const step = Math.abs(Math.sin(ctx.globalTime * 6.5)) * 0.08;
    const bob = step + Math.sin(ctx.globalTime * 1.4) * 0.02;
    ctx.root.position.y = lerp(ctx.root.position.y, bob, ctx.weight);

    // 좌우 흔들림
    const lean = Math.sin(ctx.globalTime * 6.5) * 0.06;
    const targetRoll = lean;
    // 현재 root.rotation.z 에 weight 비율로 lean 적용 (다른 회전축은 PlayerController 가 yaw 담당)
    ctx.root.rotation.z = lerp(ctx.root.rotation.z, targetRoll, ctx.weight);

    // 손 앞뒤 진자
    const handL = ctx.mounts.get('hand_l');
    const handR = ctx.mounts.get('hand_r');
    const swing = Math.sin(ctx.globalTime * 6.5) * 0.5;
    if (handL) handL.rotation.x = lerp(handL.rotation.x, swing, ctx.weight);
    if (handR) handR.rotation.x = lerp(handR.rotation.x, -swing, ctx.weight);
  }, 'loop');

  // ---- ATTACK SWING (right-hand quick rotate) ----
  anim.registerProcedural('attack_swing', (ctx) => {
    const handR = ctx.mounts.get('hand_r');
    if (!handR) return;
    const t = Math.min(1, ctx.localTime / 0.35); // 0..1 over 350ms
    // ease out cubic
    const eased = 1 - Math.pow(1 - t, 3);
    const swingAngle = eased * Math.PI * 0.8 - 0.2;
    TMP_EULER.set(0, 0, -swingAngle);
    TMP_QUAT.setFromEuler(TMP_EULER);
    handR.quaternion.slerp(TMP_QUAT, ctx.weight);

    // 캐릭터 살짝 앞으로 기울임
    ctx.root.rotation.x = lerp(ctx.root.rotation.x, eased * 0.15, ctx.weight);
  }, 'once', 0.4);

  // ---- HIT REACT ----
  anim.registerProcedural('hit_react', (ctx) => {
    const t = Math.min(1, ctx.localTime / 0.25);
    const shake = Math.sin(t * Math.PI * 6) * (1 - t) * 0.08;
    ctx.root.rotation.z = lerp(ctx.root.rotation.z, shake, ctx.weight);
  }, 'once', 0.3);

  // ---- TRANSFORM (변신 중 전체 캐릭터 펄스) ----
  anim.registerProcedural('transform', (ctx) => {
    const t = Math.min(1, ctx.localTime / 1.2);
    const pulse = Math.sin(t * Math.PI) * 0.18;
    const scale = 1 + pulse;
    ctx.root.scale.setScalar(lerp(ctx.root.scale.x, scale, ctx.weight));
    ctx.root.rotation.y += 0.05 * ctx.weight; // 가벼운 회전
  }, 'once', 1.2);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
