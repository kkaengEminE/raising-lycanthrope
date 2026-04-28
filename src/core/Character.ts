import * as THREE from 'three';
import { setKarma } from '@/render/shaders/ToonCharacterMaterial';
import type { FormDefinition, SlotName } from './SlotTypes';
import { SLOT_NAMES } from './SlotTypes';
import { slotRegistry } from './SlotRegistry';
import { AnimationManager } from '@/animation/AnimationManager';
import { registerStandardClips } from '@/animation/proceduralClips';

interface EquippedSlot {
  partId: string;
  object: THREE.Object3D;
}

/**
 * 부품을 슬롯 단위로 swap 하는 캐릭터 컨테이너.
 * 마운트 본은 group 의 명명된 자식 Object3D 로 표현되며,
 * 실제 GLB 도착 시 mixamorig:* 본 트리로 교체된다.
 *
 * 프로토타입 단계에서 모든 부품은 'attached' 로 처리.
 */
export class Character {
  group: THREE.Group;
  mounts = new Map<string, THREE.Object3D>();
  animation: AnimationManager;

  private slots = new Map<SlotName, EquippedSlot>();
  private currentFormId: string | null = null;
  private karma = 0;

  constructor(name = 'Character') {
    this.group = new THREE.Group();
    this.group.name = name;

    // 프로토타입용 마운트 본 — 실제 리그 도착 시 이 부분이 본 트리로 교체된다.
    const mountNames = ['root', 'head_top', 'back', 'hand_l', 'hand_r', 'hip_back', 'chest_fx', 'foot_l_fx', 'foot_r_fx'];
    for (const name of mountNames) {
      const obj = new THREE.Object3D();
      obj.name = `mount:${name}`;
      this.group.add(obj);
      this.mounts.set(name, obj);
    }

    this.animation = new AnimationManager(this.group, this.mounts);
    registerStandardClips(this.animation);
    this.animation.play('idle', { fadeIn: 0.001 });
  }

  update(dt: number): void {
    this.animation.update(dt);
  }

  /** 단일 슬롯에 부품 장착. null 을 주면 슬롯 비움. */
  equip(slot: SlotName, partId: string | null): void {
    const existing = this.slots.get(slot);
    if (existing) {
      existing.object.removeFromParent();
      disposeSubtree(existing.object);
      this.slots.delete(slot);
    }

    if (!partId) return;
    const part = slotRegistry.getPart(partId);
    if (!part) {
      console.warn(`[Character] unknown part "${partId}" for slot "${slot}"`);
      return;
    }
    if (part.slot !== slot) {
      console.warn(`[Character] part "${partId}" declares slot "${part.slot}", refusing to equip into "${slot}"`);
      return;
    }

    const obj = part.build();
    obj.name = `${slot}:${partId}`;

    let parent: THREE.Object3D = this.group;
    if (part.kind === 'attached' || part.kind === 'aura') {
      const mountName = part.mount ?? defaultMountForSlot(slot);
      const mount = this.mounts.get(mountName);
      if (!mount) {
        console.warn(`[Character] missing mount "${mountName}" for part "${partId}"`);
      } else {
        parent = mount;
      }
    } else if (part.kind === 'skinned') {
      // Phase A: GLB 의 자체 armature 를 그대로 사용. mount 가 명시되면 그 본 자식으로,
      // 없으면 character 루트의 자식으로 부착.
      // Phase B (정규 스켈레톤 도착 시): SkinnedMesh 를 canonical Skeleton 에 rebind.
      if (part.mount) {
        const mount = this.mounts.get(part.mount);
        if (mount) parent = mount;
      }
    }
    parent.add(obj);

    if (part.karmaTintable) applyKarmaToSubtree(obj, this.karma);

    this.slots.set(slot, { partId, object: obj });
  }

  applyForm(formOrId: FormDefinition | string): void {
    const form = typeof formOrId === 'string' ? slotRegistry.getForm(formOrId) : formOrId;
    if (!form) {
      console.warn(`[Character] unknown form "${formOrId}"`);
      return;
    }
    for (const slot of SLOT_NAMES) {
      const partId = form.parts[slot] ?? null;
      this.equip(slot, partId);
    }
    this.currentFormId = form.id;
  }

  getCurrentFormId(): string | null {
    return this.currentFormId;
  }

  getEquipped(slot: SlotName): string | null {
    return this.slots.get(slot)?.partId ?? null;
  }

  setKarma(karma: number): void {
    this.karma = THREE.MathUtils.clamp(karma, -1, 1);
    for (const { object } of this.slots.values()) {
      applyKarmaToSubtree(object, this.karma);
    }
  }

  getKarma(): number {
    return this.karma;
  }

  dispose(): void {
    for (const { object } of this.slots.values()) {
      object.removeFromParent();
      disposeSubtree(object);
    }
    this.slots.clear();
  }
}

function defaultMountForSlot(slot: SlotName): string {
  switch (slot) {
    case 'body':
    case 'outfit_torso':
    case 'outfit_arms':
      return 'root';
    case 'head':
      return 'head_top';
    case 'hand_l':
      return 'hand_l';
    case 'hand_r':
      return 'hand_r';
    case 'back':
      return 'back';
    case 'aura':
      return 'chest_fx';
  }
}

function disposeSubtree(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Sprite) {
      const geom = (child as THREE.Mesh).geometry;
      if (geom && typeof (geom as THREE.BufferGeometry).dispose === 'function') {
        (geom as THREE.BufferGeometry).dispose();
      }
      const mat = (child as THREE.Mesh).material;
      if (Array.isArray(mat)) {
        for (const m of mat) m.dispose();
      } else if (mat && typeof mat.dispose === 'function') {
        mat.dispose();
      }
    }
  });
}

function applyKarmaToSubtree(obj: THREE.Object3D, karma: number): void {
  obj.traverse((child) => {
    const mat = (child as THREE.Mesh).material;
    if (mat instanceof THREE.ShaderMaterial && mat.uniforms.uKarmaTint !== undefined) {
      setKarma(mat, karma);
    }
  });
}
