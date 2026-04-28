import * as THREE from 'three';
import { createToonCharacterMaterial } from '@/render/shaders/ToonCharacterMaterial';
import { attachOutline } from '@/render/shaders/OutlineMaterial';

export type EnemyKind = 'wisp' | 'imp' | 'guardian_ally' | 'guardian_hostile';

export interface EnemyConfig {
  kind: EnemyKind;
  hp: number;
  goldReward: number;
  karmaOnKill: number;
  speed: number;
  attackDamage: number;
  scale?: number;
}

const ENEMY_PRESETS: Record<EnemyKind, EnemyConfig> = {
  wisp: { kind: 'wisp', hp: 25, goldReward: 8, karmaOnKill: 0.01, speed: 1.4, attackDamage: 4 },
  imp: { kind: 'imp', hp: 60, goldReward: 18, karmaOnKill: 0.02, speed: 1.0, attackDamage: 8 },
  guardian_ally: { kind: 'guardian_ally', hp: 200, goldReward: 0, karmaOnKill: 0, speed: 1.6, attackDamage: 18, scale: 1.4 },
  guardian_hostile: { kind: 'guardian_hostile', hp: 320, goldReward: 240, karmaOnKill: -0.08, speed: 1.5, attackDamage: 22, scale: 1.4 },
};

export class Enemy {
  group: THREE.Group;
  config: EnemyConfig;
  hp: number;
  maxHp: number;
  alive = true;
  kind: EnemyKind;

  private body: THREE.Mesh;
  private hpBar: THREE.Mesh;
  private hpBarBg: THREE.Mesh;
  private hpBarMat: THREE.MeshBasicMaterial;
  private hitFlashTimer = 0;
  private bobSeed = Math.random() * Math.PI * 2;

  constructor(kind: EnemyKind, position: THREE.Vector3) {
    this.kind = kind;
    this.config = { ...ENEMY_PRESETS[kind] };
    this.hp = this.maxHp = this.config.hp;
    this.group = new THREE.Group();
    this.group.position.copy(position);

    const palette = palettesFor(kind);
    const scale = this.config.scale ?? 1;

    const geom = bodyGeometryFor(kind);
    const mat = createToonCharacterMaterial({
      color: palette.base,
      emissive: palette.emissive,
      emissiveIntensity: palette.emissiveIntensity,
      rimColor: palette.rim,
      shadowTint: palette.shadowTint,
      toonBands: 4,
    });
    this.body = new THREE.Mesh(geom, mat);
    this.body.scale.setScalar(scale);
    this.body.position.y = 0.6 * scale;
    attachOutline(this.body, { thickness: 0.03, color: 0x05060f });
    this.group.add(this.body);

    // HP bar (always faces camera via per-frame quaternion update by parent loop)
    const barW = 0.7;
    const barH = 0.06;
    const bgGeom = new THREE.PlaneGeometry(barW, barH);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x1a1224, transparent: true, opacity: 0.85, depthTest: false });
    this.hpBarBg = new THREE.Mesh(bgGeom, bgMat);
    this.hpBarBg.position.set(0, 1.4 * scale, 0);
    this.hpBarBg.renderOrder = 5;
    this.group.add(this.hpBarBg);

    const fgGeom = new THREE.PlaneGeometry(barW, barH);
    fgGeom.translate(barW / 2, 0, 0);
    this.hpBarMat = new THREE.MeshBasicMaterial({ color: palette.hpBar, depthTest: false });
    this.hpBar = new THREE.Mesh(fgGeom, this.hpBarMat);
    this.hpBar.position.set(-barW / 2, 1.4 * scale, 0.001);
    this.hpBar.renderOrder = 6;
    this.group.add(this.hpBar);
  }

  /** 데미지 적용. 사망 시 alive=false. 반환: 실제 데미지. */
  takeDamage(dmg: number): number {
    if (!this.alive) return 0;
    const applied = Math.min(dmg, this.hp);
    this.hp -= applied;
    this.hitFlashTimer = 0.18;
    if (this.hp <= 0) {
      this.alive = false;
      this.hp = 0;
    }
    return applied;
  }

  update(dt: number, _elapsed: number, target: THREE.Vector3 | null, faceCamera: THREE.Quaternion): void {
    // HP bar 갱신
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpBar.scale.x = ratio;

    // HP bar billboard
    this.hpBar.quaternion.copy(faceCamera);
    this.hpBarBg.quaternion.copy(faceCamera);

    // 히트 플래시 — 림 강도 잠시 부스트
    if (this.hitFlashTimer > 0) {
      const k = this.hitFlashTimer / 0.18;
      const mat = this.body.material as THREE.ShaderMaterial;
      if (mat.uniforms.uRimStrength) mat.uniforms.uRimStrength.value = 0.5 + k * 1.6;
      if (mat.uniforms.uEmissiveIntensity) {
        const baseEm = palettesFor(this.kind).emissiveIntensity;
        mat.uniforms.uEmissiveIntensity.value = baseEm + k * 0.6;
      }
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    }

    // 보빙
    this.body.position.y = 0.6 * (this.config.scale ?? 1) + Math.sin(_elapsed * 2.5 + this.bobSeed) * 0.06;

    // 타겟 추적 (간단한 직선)
    if (target && this.alive) {
      const toTarget = new THREE.Vector3().subVectors(target, this.group.position);
      toTarget.y = 0;
      const dist = toTarget.length();
      if (dist > 1.2) {
        toTarget.normalize();
        this.group.position.addScaledVector(toTarget, this.config.speed * dt);
      }
      if (dist > 0.001) {
        const yaw = Math.atan2(toTarget.x, toTarget.z);
        this.group.rotation.y = yaw;
      }
    }
  }

  isInRange(point: THREE.Vector3, radius: number): boolean {
    return this.alive && this.group.position.distanceTo(point) <= radius;
  }

  dispose(): void {
    this.group.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        (c.geometry as THREE.BufferGeometry).dispose();
        const m = c.material;
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
        else (m as THREE.Material).dispose();
      }
    });
  }
}

interface KindPalette {
  base: number;
  emissive: number;
  emissiveIntensity: number;
  rim: number;
  shadowTint: number;
  hpBar: number;
}

function palettesFor(kind: EnemyKind): KindPalette {
  switch (kind) {
    case 'wisp':
      return { base: 0x402850, emissive: 0xa040d0, emissiveIntensity: 0.55, rim: 0xc070ff, shadowTint: 0x180828, hpBar: 0xff5070 };
    case 'imp':
      return { base: 0x282038, emissive: 0xff5070, emissiveIntensity: 0.4, rim: 0xff8898, shadowTint: 0x100818, hpBar: 0xff5070 };
    case 'guardian_ally':
      return { base: 0xc8d4f0, emissive: 0xffd966, emissiveIntensity: 0.4, rim: 0xfff0b0, shadowTint: 0x303860, hpBar: 0x9bff9b };
    case 'guardian_hostile':
      return { base: 0xa8b0c8, emissive: 0xff8848, emissiveIntensity: 0.5, rim: 0xffa080, shadowTint: 0x282038, hpBar: 0xff8848 };
  }
}

function bodyGeometryFor(kind: EnemyKind): THREE.BufferGeometry {
  switch (kind) {
    case 'wisp': {
      const g = new THREE.OctahedronGeometry(0.5, 0);
      g.scale(1.0, 1.5, 1.0);
      return g;
    }
    case 'imp': {
      const g = new THREE.IcosahedronGeometry(0.6, 0);
      return g;
    }
    case 'guardian_ally':
    case 'guardian_hostile': {
      const g = new THREE.CylinderGeometry(0.6, 0.7, 1.7, 12);
      g.translate(0, 0.05, 0);
      return g;
    }
  }
}
