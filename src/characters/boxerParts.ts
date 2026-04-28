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
  attachOutline(mesh, { thickness: 0.028, color: spec.colors.outline ?? 0x05060f });
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

// ============================================================
// BODY (벌크 — 복서 전용 두 번째 변형)
// ============================================================
regPart({
  id: 'body_wolf_bulk',
  slot: 'body',
  geometry: () => {
    const g = new THREE.CylinderGeometry(0.62, 0.7, 1.7, 12, 1);
    g.translate(0, 0.85, 0);
    return g;
  },
  colors: { base: 0x705a64, rim: 0xffd966, shadowTint: 0x281828 },
});

regPart({
  id: 'body_wolf_bulk_evil',
  slot: 'body',
  geometry: () => {
    const g = new THREE.CylinderGeometry(0.65, 0.72, 1.75, 12, 1);
    g.translate(0, 0.88, 0);
    return g;
  },
  colors: { base: 0x6a1a28, rim: 0xff5070, shadowTint: 0x180810 },
});

regPart({
  id: 'body_wolf_bulk_neutral',
  slot: 'body',
  geometry: () => {
    const g = new THREE.CylinderGeometry(0.62, 0.7, 1.7, 12, 1);
    g.translate(0, 0.85, 0);
    return g;
  },
  colors: { base: 0x6a6870, shadowTint: 0x2a2a36 },
});

// ============================================================
// BOXER DAY
// ============================================================
regPart({
  id: 'torso_shorts_red',
  slot: 'outfit_torso',
  geometry: () => {
    const g = new THREE.BoxGeometry(1.0, 0.55, 0.55);
    g.translate(0, 0.85, 0);
    return g;
  },
  colors: { base: 0xa01f30, rim: 0xff8898 },
});

regPart({
  id: 'arms_taped',
  slot: 'outfit_arms',
  geometry: () => {
    const left = new THREE.BoxGeometry(0.18, 0.4, 0.18);
    left.translate(-0.55, 1.1, 0);
    const right = new THREE.BoxGeometry(0.18, 0.4, 0.18);
    right.translate(0.55, 1.1, 0);
    return mergeBufferLikes(left, right);
  },
  colors: { base: 0xeae6d8 },
});

regPart({
  id: 'head_buzzcut',
  slot: 'head',
  geometry: () => new THREE.SphereGeometry(0.36, 16, 12),
  colors: { base: 0x6b4732, rim: 0x9bb5ff },
  position: [0, 1.85, 0],
});

regPart({
  id: 'hand_glove_red_l',
  slot: 'hand_l',
  geometry: () => {
    const g = new THREE.SphereGeometry(0.22, 12, 10);
    g.translate(-0.7, 1.0, 0);
    return g;
  },
  colors: { base: 0xc02030, rim: 0xff8898 },
});

regPart({
  id: 'hand_glove_red_r',
  slot: 'hand_r',
  geometry: () => {
    const g = new THREE.SphereGeometry(0.22, 12, 10);
    g.translate(0.7, 1.0, 0);
    return g;
  },
  colors: { base: 0xc02030, rim: 0xff8898 },
});

// ============================================================
// BOXER NIGHT — GOOD (팔라딘)
// ============================================================
regPart({
  id: 'torso_paladin_plate',
  slot: 'outfit_torso',
  geometry: () => {
    const g = new THREE.BoxGeometry(1.2, 1.05, 0.65);
    g.translate(0, 1.2, 0);
    return g;
  },
  colors: { base: 0xc8d4f0, emissive: 0xffd966, emissiveIntensity: 0.32, rim: 0xfff0b0 },
});

regPart({
  id: 'head_wolf_halo_helm',
  slot: 'head',
  geometry: () => {
    const head = new THREE.SphereGeometry(0.42, 16, 12);
    head.scale(1.05, 1.0, 1.15);
    const halo = new THREE.TorusGeometry(0.36, 0.04, 8, 24);
    halo.rotateX(Math.PI / 2);
    halo.translate(0, 0.55, 0);
    const helm = new THREE.BoxGeometry(0.5, 0.25, 0.5);
    helm.translate(0, 0.32, 0);
    return mergeBufferLikes(mergeBufferLikes(head, halo), helm);
  },
  colors: { base: 0xb8c8e0, emissive: 0xffe680, emissiveIntensity: 0.45, rim: 0xfff0b0 },
  position: [0, 1.95, 0.0],
});

regPart({
  id: 'hand_glove_paladin_l',
  slot: 'hand_l',
  geometry: () => {
    const g = new THREE.SphereGeometry(0.28, 12, 10);
    g.scale(1.1, 1.0, 1.1);
    g.translate(-0.78, 1.05, 0);
    return g;
  },
  colors: { base: 0xeae0c8, emissive: 0xffd966, emissiveIntensity: 0.4, rim: 0xfff0b0 },
});

regPart({
  id: 'hand_glove_paladin_r',
  slot: 'hand_r',
  geometry: () => {
    const g = new THREE.SphereGeometry(0.28, 12, 10);
    g.scale(1.1, 1.0, 1.1);
    g.translate(0.78, 1.05, 0);
    return g;
  },
  colors: { base: 0xeae0c8, emissive: 0xffd966, emissiveIntensity: 0.4, rim: 0xfff0b0 },
});

regPart({
  id: 'back_cape_blue',
  slot: 'back',
  geometry: () => {
    const g = new THREE.BoxGeometry(1.05, 1.3, 0.08);
    g.translate(0, 0.95, -0.35);
    return g;
  },
  colors: { base: 0x3852a0, emissive: 0x9bb5ff, emissiveIntensity: 0.25, rim: 0x9bb5ff },
});

// ============================================================
// BOXER NIGHT — EVIL (악마)
// ============================================================
regPart({
  id: 'torso_demon_spiked',
  slot: 'outfit_torso',
  geometry: () => {
    const torso = new THREE.BoxGeometry(1.2, 1.0, 0.65);
    torso.translate(0, 1.18, 0);
    const spike1 = new THREE.ConeGeometry(0.14, 0.4, 6);
    spike1.translate(-0.55, 1.55, 0);
    const spike2 = new THREE.ConeGeometry(0.14, 0.4, 6);
    spike2.translate(0.55, 1.55, 0);
    return mergeBufferLikes(mergeBufferLikes(torso, spike1), spike2);
  },
  colors: { base: 0x382838, emissive: 0x60ff60, emissiveIntensity: 0.45, rim: 0x9aff9a, shadowTint: 0x180818 },
});

regPart({
  id: 'head_wolf_hood_red',
  slot: 'head',
  geometry: () => {
    const head = new THREE.SphereGeometry(0.42, 16, 12);
    head.scale(1.0, 1.0, 1.18);
    const hood = new THREE.ConeGeometry(0.55, 0.5, 8, 1, true);
    hood.translate(0, 0.32, -0.05);
    return mergeBufferLikes(head, hood);
  },
  colors: { base: 0x801818, emissive: 0xff5070, emissiveIntensity: 0.4, rim: 0xff8898, shadowTint: 0x180810 },
  position: [0, 1.95, 0.05],
});

regPart({
  id: 'hand_glove_demon_l',
  slot: 'hand_l',
  geometry: () => {
    const g = new THREE.SphereGeometry(0.3, 12, 10);
    g.scale(1.15, 1.0, 1.1);
    g.translate(-0.8, 1.05, 0);
    return g;
  },
  colors: { base: 0x801010, emissive: 0xff3050, emissiveIntensity: 0.5, rim: 0xff8898 },
});

regPart({
  id: 'hand_glove_demon_r',
  slot: 'hand_r',
  geometry: () => {
    const g = new THREE.SphereGeometry(0.3, 12, 10);
    g.scale(1.15, 1.0, 1.1);
    g.translate(0.8, 1.05, 0);
    return g;
  },
  colors: { base: 0x801010, emissive: 0xff3050, emissiveIntensity: 0.5, rim: 0xff8898 },
});

// ============================================================
// BOXER NIGHT — NEUTRAL
// ============================================================
regPart({
  id: 'torso_boxer_neutral',
  slot: 'outfit_torso',
  geometry: () => {
    const g = new THREE.BoxGeometry(1.15, 0.95, 0.62);
    g.translate(0, 1.18, 0);
    return g;
  },
  colors: { base: 0x4a4854 },
});

regPart({
  id: 'hand_wolf_paw_bulk_l',
  slot: 'hand_l',
  geometry: () => {
    const g = new THREE.SphereGeometry(0.26, 12, 10);
    g.translate(-0.78, 1.0, 0);
    return g;
  },
  colors: { base: 0x807c8a },
});

regPart({
  id: 'hand_wolf_paw_bulk_r',
  slot: 'hand_r',
  geometry: () => {
    const g = new THREE.SphereGeometry(0.26, 12, 10);
    g.translate(0.78, 1.0, 0);
    return g;
  },
  colors: { base: 0x807c8a },
});

// ============================================================
// FORM DEFINITIONS
// ============================================================
const BOXER_FORMS: FormDefinition[] = [
  {
    id: 'boxer_day',
    label: '복서 (낮)',
    timeOfDay: 'day',
    alignment: 'neutral',
    job: 'boxer',
    parts: {
      body: 'body_human_hybrid',
      outfit_torso: 'torso_shorts_red',
      outfit_arms: 'arms_taped',
      head: 'head_buzzcut',
      hand_l: 'hand_glove_red_l',
      hand_r: 'hand_glove_red_r',
      back: null,
      aura: 'aura_neutral',
    },
  },
  {
    id: 'boxer_night_good',
    label: '복서 (밤·선)',
    timeOfDay: 'night',
    alignment: 'good',
    job: 'boxer',
    parts: {
      body: 'body_wolf_bulk',
      outfit_torso: 'torso_paladin_plate',
      head: 'head_wolf_halo_helm',
      hand_l: 'hand_glove_paladin_l',
      hand_r: 'hand_glove_paladin_r',
      back: 'back_cape_blue',
      aura: 'aura_gold',
    },
  },
  {
    id: 'boxer_night_evil',
    label: '복서 (밤·악)',
    timeOfDay: 'night',
    alignment: 'evil',
    job: 'boxer',
    parts: {
      body: 'body_wolf_bulk_evil',
      outfit_torso: 'torso_demon_spiked',
      head: 'head_wolf_hood_red',
      hand_l: 'hand_glove_demon_l',
      hand_r: 'hand_glove_demon_r',
      back: null,
      aura: 'aura_purple_smoke',
    },
  },
  {
    id: 'boxer_night_neutral',
    label: '복서 (밤·중립)',
    timeOfDay: 'night',
    alignment: 'neutral',
    job: 'boxer',
    parts: {
      body: 'body_wolf_bulk_neutral',
      outfit_torso: 'torso_boxer_neutral',
      head: 'head_wolf_neutral',
      hand_l: 'hand_wolf_paw_bulk_l',
      hand_r: 'hand_wolf_paw_bulk_r',
      back: null,
      aura: 'aura_neutral',
    },
  },
];

for (const f of BOXER_FORMS) slotRegistry.registerForm(f);

function mergeBufferLikes(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const positionsA = a.attributes.position;
  const positionsB = b.attributes.position;
  if (!positionsA || !positionsB) return a;
  if (!a.attributes.normal) a.computeVertexNormals();
  if (!b.attributes.normal) b.computeVertexNormals();
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
