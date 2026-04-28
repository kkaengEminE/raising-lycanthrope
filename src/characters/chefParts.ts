import * as THREE from 'three';
import { createToonCharacterMaterial } from '@/render/shaders/ToonCharacterMaterial';
import { attachOutline } from '@/render/shaders/OutlineMaterial';
import { slotRegistry } from '@/core/SlotRegistry';
import type { FormDefinition, PartAsset, SlotName } from '@/core/SlotTypes';

interface PartColors {
  base: number;
  emissive?: number;
  emissiveIntensity?: number;
  rim?: number;
  shadowTint?: number;
  outline?: number;
}

interface PrimitivePartSpec {
  id: string;
  slot: SlotName;
  geometry: () => THREE.BufferGeometry;
  colors: PartColors;
  position?: [number, number, number];
}

function buildPart(spec: PrimitivePartSpec): THREE.Object3D {
  const mat = createToonCharacterMaterial({
    color: spec.colors.base,
    emissive: spec.colors.emissive ?? 0x000000,
    emissiveIntensity: spec.colors.emissiveIntensity ?? 0,
    rimColor: spec.colors.rim ?? 0x9bb5ff,
    shadowTint: spec.colors.shadowTint ?? 0x2a3a6a,
    toonBands: 4,
  });
  const mesh = new THREE.Mesh(spec.geometry(), mat);
  mesh.castShadow = true;
  if (spec.position) mesh.position.fromArray(spec.position);
  attachOutline(mesh, { thickness: 0.025, color: spec.colors.outline ?? 0x05060f });
  return mesh;
}

function regPart(spec: PrimitivePartSpec): void {
  const part: PartAsset = {
    id: spec.id,
    slot: spec.slot,
    kind: 'attached',
    build: () => buildPart(spec),
    karmaTintable: true,
  };
  slotRegistry.registerPart(part);
}

// === CHEF DAY ===
regPart({
  id: 'torso_apron_white',
  slot: 'outfit_torso',
  geometry: () => {
    const g = new THREE.BoxGeometry(1.0, 0.85, 0.55);
    g.translate(0, 1.15, 0);
    return g;
  },
  colors: { base: 0xeeece4 },
});

regPart({
  id: 'head_chef_hat',
  slot: 'head',
  geometry: () => {
    const head = new THREE.SphereGeometry(0.36, 16, 12);
    const hat = new THREE.CylinderGeometry(0.34, 0.32, 0.45, 16);
    hat.translate(0, 0.45, 0);
    const merged = mergeBufferLikes(head, hat);
    return merged;
  },
  colors: { base: 0xf2efe6 },
  position: [0, 1.85, 0],
});

regPart({
  id: 'hand_pan_clean',
  slot: 'hand_l',
  geometry: () => {
    const handle = new THREE.BoxGeometry(0.08, 0.5, 0.08);
    handle.translate(-0.7, 1.0, 0);
    const pan = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16);
    pan.rotateX(Math.PI / 2);
    pan.translate(-0.7, 0.78, 0);
    return mergeBufferLikes(handle, pan);
  },
  colors: { base: 0x383038, emissive: 0x222222, emissiveIntensity: 0.1 },
});

// === CHEF NIGHT - GOOD (천사 셰프) ===
regPart({
  id: 'torso_apron_holy',
  slot: 'outfit_torso',
  geometry: () => {
    const g = new THREE.BoxGeometry(1.05, 0.9, 0.58);
    g.translate(0, 1.16, 0);
    return g;
  },
  colors: { base: 0xfaf6e8, emissive: 0xffd966, emissiveIntensity: 0.18, rim: 0xfff0b0 },
});

regPart({
  id: 'head_wolf_halo',
  slot: 'head',
  geometry: () => {
    const head = new THREE.SphereGeometry(0.4, 16, 12);
    head.scale(1.0, 1.05, 1.15);
    const halo = new THREE.TorusGeometry(0.32, 0.03, 8, 24);
    halo.rotateX(Math.PI / 2);
    halo.translate(0, 0.5, 0);
    return mergeBufferLikes(head, halo);
  },
  colors: { base: 0xb0b4c0, emissive: 0xffe680, emissiveIntensity: 0.45, rim: 0xfff0b0 },
  position: [0, 1.92, 0.05],
});

regPart({
  id: 'hand_pan_blessed',
  slot: 'hand_l',
  geometry: () => {
    const handle = new THREE.BoxGeometry(0.08, 0.5, 0.08);
    handle.translate(-0.7, 1.0, 0);
    const pan = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16);
    pan.rotateX(Math.PI / 2);
    pan.translate(-0.7, 0.78, 0);
    return mergeBufferLikes(handle, pan);
  },
  colors: { base: 0xfffae0, emissive: 0xffd966, emissiveIntensity: 0.7, rim: 0xfff0b0 },
});

regPart({
  id: 'back_wings_feather',
  slot: 'back',
  geometry: () => {
    const left = new THREE.BoxGeometry(0.65, 0.9, 0.08);
    left.translate(-0.45, 1.4, -0.15);
    left.rotateZ(0.18);
    const right = new THREE.BoxGeometry(0.65, 0.9, 0.08);
    right.translate(0.45, 1.4, -0.15);
    right.rotateZ(-0.18);
    return mergeBufferLikes(left, right);
  },
  colors: { base: 0xffffff, emissive: 0x9bb5ff, emissiveIntensity: 0.35, rim: 0xfff0b0 },
});

// === CHEF NIGHT - EVIL (정육 셰프) ===
regPart({
  id: 'torso_apron_blood',
  slot: 'outfit_torso',
  geometry: () => {
    const g = new THREE.BoxGeometry(1.05, 0.9, 0.58);
    g.translate(0, 1.16, 0);
    return g;
  },
  colors: { base: 0x4a1820, emissive: 0xa01020, emissiveIntensity: 0.22, rim: 0xff5070 },
});

regPart({
  id: 'head_wolf_butcher',
  slot: 'head',
  geometry: () => {
    const head = new THREE.SphereGeometry(0.42, 16, 12);
    head.scale(1.0, 1.0, 1.18);
    return head;
  },
  colors: { base: 0x602030, emissive: 0xa01020, emissiveIntensity: 0.3, rim: 0xff5070, shadowTint: 0x180810 },
  position: [0, 1.94, 0.05],
});

regPart({
  id: 'hand_meat_raw',
  slot: 'hand_l',
  geometry: () => {
    const g = new THREE.BoxGeometry(0.22, 0.32, 0.22);
    g.translate(-0.7, 0.85, 0);
    return g;
  },
  colors: { base: 0xa02838, emissive: 0xc02838, emissiveIntensity: 0.22, rim: 0xff5070 },
});

regPart({
  id: 'hand_cleaver',
  slot: 'hand_r',
  geometry: () => {
    const handle = new THREE.BoxGeometry(0.06, 0.32, 0.06);
    handle.translate(0.7, 0.92, 0);
    const blade = new THREE.BoxGeometry(0.32, 0.42, 0.04);
    blade.translate(0.74, 1.25, 0);
    return mergeBufferLikes(handle, blade);
  },
  colors: { base: 0xc8c8d0, emissive: 0xa01020, emissiveIntensity: 0.25, rim: 0xff5070 },
});

// === CHEF NIGHT - NEUTRAL ===
regPart({
  id: 'torso_apron_grey',
  slot: 'outfit_torso',
  geometry: () => {
    const g = new THREE.BoxGeometry(1.05, 0.9, 0.58);
    g.translate(0, 1.16, 0);
    return g;
  },
  colors: { base: 0x6a6870 },
});

// === FORM DEFINITIONS ===
const CHEF_FORMS: FormDefinition[] = [
  {
    id: 'chef_day',
    label: '셰프 (낮)',
    timeOfDay: 'day',
    alignment: 'neutral',
    job: 'chef',
    parts: {
      body: 'body_human_hybrid',
      outfit_torso: 'torso_apron_white',
      head: 'head_chef_hat',
      hand_l: 'hand_pan_clean',
      hand_r: 'hand_empty_r',
      back: null,
      aura: 'aura_neutral',
    },
  },
  {
    id: 'chef_night_good',
    label: '셰프 (밤·선)',
    timeOfDay: 'night',
    alignment: 'good',
    job: 'chef',
    parts: {
      body: 'body_wolf_lean',
      outfit_torso: 'torso_apron_holy',
      head: 'head_wolf_halo',
      hand_l: 'hand_pan_blessed',
      hand_r: 'hand_sword_light',
      back: 'back_wings_feather',
      aura: 'aura_gold',
    },
  },
  {
    id: 'chef_night_evil',
    label: '셰프 (밤·악)',
    timeOfDay: 'night',
    alignment: 'evil',
    job: 'chef',
    parts: {
      body: 'body_wolf_lean_evil',
      outfit_torso: 'torso_apron_blood',
      head: 'head_wolf_butcher',
      hand_l: 'hand_meat_raw',
      hand_r: 'hand_cleaver',
      back: null,
      aura: 'aura_purple_smoke',
    },
  },
  {
    id: 'chef_night_neutral',
    label: '셰프 (밤·중립)',
    timeOfDay: 'night',
    alignment: 'neutral',
    job: 'chef',
    parts: {
      body: 'body_wolf_neutral',
      outfit_torso: 'torso_apron_grey',
      head: 'head_wolf_neutral',
      hand_l: 'hand_wolf_paw_l',
      hand_r: 'hand_wolf_paw_r',
      back: null,
      aura: 'aura_neutral',
    },
  },
];

for (const f of CHEF_FORMS) slotRegistry.registerForm(f);

/**
 * 두 BufferGeometry 를 단순 머지 (UV 무시, 본 머지 함수 의존성 회피).
 * placeholder 단계용 — 진짜 GLB 도착 시에는 사용되지 않는다.
 */
function mergeBufferLikes(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const positionsA = a.attributes.position;
  const positionsB = b.attributes.position;
  const normalsA = a.attributes.normal;
  const normalsB = b.attributes.normal;

  if (!positionsA || !positionsB) return a;
  // normals 가 없으면 자동 생성
  if (!normalsA) a.computeVertexNormals();
  if (!normalsB) b.computeVertexNormals();

  const merged = new THREE.BufferGeometry();
  const posCount = positionsA.count + positionsB.count;
  const positions = new Float32Array(posCount * 3);
  const normals = new Float32Array(posCount * 3);

  positions.set(positionsA.array as Float32Array, 0);
  positions.set(positionsB.array as Float32Array, positionsA.count * 3);

  const nA = a.attributes.normal as THREE.BufferAttribute;
  const nB = b.attributes.normal as THREE.BufferAttribute;
  normals.set(nA.array as Float32Array, 0);
  normals.set(nB.array as Float32Array, nA.count * 3);

  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

  // 인덱스 머지 (있으면)
  const indexA = a.index;
  const indexB = b.index;
  if (indexA && indexB) {
    const offsetB = positionsA.count;
    const idx = new Uint32Array(indexA.count + indexB.count);
    for (let i = 0; i < indexA.count; i++) idx[i] = indexA.getX(i);
    for (let i = 0; i < indexB.count; i++) idx[indexA.count + i] = indexB.getX(i) + offsetB;
    merged.setIndex(new THREE.BufferAttribute(idx, 1));
  }

  return merged;
}
