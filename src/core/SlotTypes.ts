import * as THREE from 'three';

export type SlotName =
  | 'body'
  | 'outfit_torso'
  | 'outfit_arms'
  | 'head'
  | 'hand_l'
  | 'hand_r'
  | 'back'
  | 'aura';

export const SLOT_NAMES: SlotName[] = [
  'body',
  'outfit_torso',
  'outfit_arms',
  'head',
  'hand_l',
  'hand_r',
  'back',
  'aura',
];

/**
 * 부품 종류:
 *  - 'skinned' — SkinnedMesh 가 정규 스켈레톤에 바인딩 (실제 GLB 단계)
 *  - 'attached' — Mesh 를 마운트 본의 자식으로 부착
 *  - 'aura' — VFX Group, mount:chest_fx 자식
 *
 * 프로토타입 단계에서는 procedural 도형을 'attached' 로 처리한다.
 */
export type PartKind = 'skinned' | 'attached' | 'aura';

export interface PartAsset {
  id: string;
  slot: SlotName;
  kind: PartKind;
  /** 마운트 본 이름 (kind === 'attached' 또는 'aura' 일 때 필수). */
  mount?: string;
  /** 이 부품의 루트 Object3D. 빌더가 인스턴스마다 새로 생성해야 한다. */
  build: () => THREE.Object3D;
  /** 부품에 카르마 틴트가 적용 가능한가 (ShaderMaterial 사용 시). */
  karmaTintable?: boolean;
}

export interface FormDefinition {
  id: string;
  /** 표시용 한글 이름. */
  label: string;
  /** 'day' | 'night' — 폼이 활성 가능한 시간대. */
  timeOfDay: 'day' | 'night' | 'any';
  /** 카르마 분류: -1=evil, 0=neutral, +1=good. 임계값 swap 의 기준. */
  alignment: 'good' | 'neutral' | 'evil';
  /** 직업 분류 — UI 카테고리에 사용. */
  job: 'office' | 'chef' | 'boxer' | 'unknown';
  /** slot → partId 매핑. null 이면 빈 슬롯. */
  parts: Partial<Record<SlotName, string | null>>;
}
