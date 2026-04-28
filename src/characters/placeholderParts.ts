import * as THREE from 'three';
import { createToonCharacterMaterial } from '@/render/shaders/ToonCharacterMaterial';
import { attachOutline } from '@/render/shaders/OutlineMaterial';
import type { PartAsset, FormDefinition } from '@/core/SlotTypes';
import { slotRegistry } from '@/core/SlotRegistry';

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
  slot: PartAsset['slot'];
  geometry: () => THREE.BufferGeometry;
  colors: PartColors;
  position?: [number, number, number];
  outlineThickness?: number;
}

function buildPrimitivePart(spec: PrimitivePartSpec): THREE.Object3D {
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
  attachOutline(mesh, { thickness: spec.outlineThickness ?? 0.025, color: spec.colors.outline ?? 0x05060f });
  return mesh;
}

function registerPrimitive(spec: PrimitivePartSpec): void {
  slotRegistry.registerPart({
    id: spec.id,
    slot: spec.slot,
    kind: 'attached',
    build: () => buildPrimitivePart(spec),
    karmaTintable: true,
  });
}

// ============================================================
// 부품 등록 (프로토타입용 procedural 도형)
// ============================================================

// --- BODY ---
registerPrimitive({
  id: 'body_human_hybrid',
  slot: 'body',
  geometry: () => {
    const g = new THREE.CylinderGeometry(0.42, 0.5, 1.4, 12, 1);
    g.translate(0, 0.7, 0);
    return g;
  },
  colors: { base: 0xd4ad8a, rim: 0x9bb5ff },
});

registerPrimitive({
  id: 'body_wolf_lean',
  slot: 'body',
  geometry: () => {
    const g = new THREE.CylinderGeometry(0.5, 0.55, 1.55, 12, 1);
    g.translate(0, 0.78, 0);
    return g;
  },
  colors: { base: 0xc0c4d0, rim: 0xffd966 },
});

registerPrimitive({
  id: 'body_wolf_lean_evil',
  slot: 'body',
  geometry: () => {
    const g = new THREE.CylinderGeometry(0.52, 0.56, 1.6, 12, 1);
    g.translate(0, 0.8, 0);
    return g;
  },
  colors: { base: 0x6a3848, rim: 0xc070ff, shadowTint: 0x2a0828 },
});

registerPrimitive({
  id: 'body_wolf_neutral',
  slot: 'body',
  geometry: () => {
    const g = new THREE.CylinderGeometry(0.5, 0.55, 1.55, 12, 1);
    g.translate(0, 0.78, 0);
    return g;
  },
  colors: { base: 0x807c8a, rim: 0xa0a0b0, shadowTint: 0x303040 },
});

// --- TORSO ---
registerPrimitive({
  id: 'torso_suit_navy',
  slot: 'outfit_torso',
  geometry: () => {
    const g = new THREE.BoxGeometry(1.0, 0.85, 0.55);
    g.translate(0, 1.15, 0);
    return g;
  },
  colors: { base: 0x2c3e63 },
});

registerPrimitive({
  id: 'torso_ceo_armor_gold',
  slot: 'outfit_torso',
  geometry: () => {
    const g = new THREE.BoxGeometry(1.1, 0.95, 0.6);
    g.translate(0, 1.18, 0);
    return g;
  },
  colors: { base: 0xc8a64a, emissive: 0xffd966, emissiveIntensity: 0.3, rim: 0xfff0b0 },
});

registerPrimitive({
  id: 'torso_ceo_suit_black',
  slot: 'outfit_torso',
  geometry: () => {
    const g = new THREE.BoxGeometry(1.05, 0.9, 0.58);
    g.translate(0, 1.16, 0);
    return g;
  },
  colors: { base: 0x1f1322, emissive: 0x8a30c0, emissiveIntensity: 0.18, rim: 0xc070ff },
});

registerPrimitive({
  id: 'torso_neutral_gray',
  slot: 'outfit_torso',
  geometry: () => {
    const g = new THREE.BoxGeometry(1.05, 0.9, 0.58);
    g.translate(0, 1.16, 0);
    return g;
  },
  colors: { base: 0x4a4854 },
});

// --- HEAD ---
registerPrimitive({
  id: 'head_human_office',
  slot: 'head',
  geometry: () => new THREE.SphereGeometry(0.36, 16, 12),
  colors: { base: 0x6b4732, rim: 0x9bb5ff },
  position: [0, 1.85, 0],
});

registerPrimitive({
  id: 'head_wolf_noble',
  slot: 'head',
  geometry: () => {
    const g = new THREE.SphereGeometry(0.4, 16, 12);
    g.scale(1.0, 1.05, 1.15);
    return g;
  },
  colors: { base: 0xa0a4b0, emissive: 0xffd966, emissiveIntensity: 0.25, rim: 0xfff0b0 },
  position: [0, 1.92, 0.05],
});

registerPrimitive({
  id: 'head_wolf_shadow',
  slot: 'head',
  geometry: () => {
    const g = new THREE.SphereGeometry(0.42, 16, 12);
    g.scale(1.0, 1.0, 1.18);
    return g;
  },
  colors: { base: 0x5a2838, emissive: 0xa040d0, emissiveIntensity: 0.25, rim: 0xc070ff, shadowTint: 0x180818 },
  position: [0, 1.94, 0.05],
});

registerPrimitive({
  id: 'head_wolf_neutral',
  slot: 'head',
  geometry: () => {
    const g = new THREE.SphereGeometry(0.4, 16, 12);
    g.scale(1.0, 1.0, 1.15);
    return g;
  },
  colors: { base: 0x707080, rim: 0xa0a0b0 },
  position: [0, 1.92, 0.05],
});

// --- HANDS ---
registerPrimitive({
  id: 'hand_empty_l',
  slot: 'hand_l',
  geometry: () => new THREE.SphereGeometry(0.16, 10, 8),
  colors: { base: 0xd4ad8a },
  position: [-0.65, 0.95, 0],
});

registerPrimitive({
  id: 'hand_empty_r',
  slot: 'hand_r',
  geometry: () => new THREE.SphereGeometry(0.16, 10, 8),
  colors: { base: 0xd4ad8a },
  position: [0.65, 0.95, 0],
});

registerPrimitive({
  id: 'hand_wolf_paw_l',
  slot: 'hand_l',
  geometry: () => new THREE.SphereGeometry(0.2, 10, 8),
  colors: { base: 0xc0c4d0 },
  position: [-0.7, 0.95, 0],
});

registerPrimitive({
  id: 'hand_wolf_paw_r',
  slot: 'hand_r',
  geometry: () => new THREE.SphereGeometry(0.2, 10, 8),
  colors: { base: 0xc0c4d0 },
  position: [0.7, 0.95, 0],
});

registerPrimitive({
  id: 'hand_sword_light',
  slot: 'hand_r',
  geometry: () => {
    const g = new THREE.BoxGeometry(0.08, 1.2, 0.08);
    g.translate(0.7, 1.5, 0);
    return g;
  },
  colors: { base: 0xfffae0, emissive: 0xffe680, emissiveIntensity: 1.2, rim: 0xfff0b0 },
});

registerPrimitive({
  id: 'hand_dark_claw_r',
  slot: 'hand_r',
  geometry: () => {
    const g = new THREE.ConeGeometry(0.15, 0.45, 6);
    g.rotateZ(Math.PI);
    g.translate(0.72, 0.85, 0);
    return g;
  },
  colors: { base: 0x301020, emissive: 0xa040d0, emissiveIntensity: 0.4 },
});

// --- BACK ---
registerPrimitive({
  id: 'back_cape_white',
  slot: 'back',
  geometry: () => {
    const g = new THREE.BoxGeometry(0.95, 1.2, 0.08);
    g.translate(0, 0.95, -0.32);
    return g;
  },
  colors: { base: 0xeae6d8, rim: 0xfff0b0 },
});

registerPrimitive({
  id: 'back_tendrils',
  slot: 'back',
  geometry: () => {
    const g = new THREE.BoxGeometry(1.2, 0.8, 0.2);
    g.translate(0, 1.2, -0.28);
    return g;
  },
  colors: { base: 0x180820, emissive: 0x7020a0, emissiveIntensity: 0.5, rim: 0xa040d0 },
});

// --- AURA ---
slotRegistry.registerPart({
  id: 'aura_neutral',
  slot: 'aura',
  kind: 'aura',
  mount: 'chest_fx',
  build: () => {
    const g = new THREE.Group();
    g.position.set(0, 1.1, 0);
    return g;
  },
});

slotRegistry.registerPart({
  id: 'aura_gold',
  slot: 'aura',
  kind: 'aura',
  mount: 'chest_fx',
  build: () => buildAuraGroup(0xffd966, 0.6),
});

slotRegistry.registerPart({
  id: 'aura_purple_smoke',
  slot: 'aura',
  kind: 'aura',
  mount: 'chest_fx',
  build: () => buildAuraGroup(0xa040d0, 0.7),
});

function buildAuraGroup(colorHex: number, intensity: number): THREE.Object3D {
  const group = new THREE.Group();
  group.position.set(0, 1.1, 0);

  const haloGeom = new THREE.RingGeometry(0.6, 0.85, 24);
  const haloMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.35 * intensity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(haloGeom, haloMat);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.85;
  group.add(halo);

  const glowGeom = new THREE.SphereGeometry(0.42, 12, 8);
  const glowMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.18 * intensity,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(glowGeom, glowMat);
  glow.position.y = 0;
  group.add(glow);

  return group;
}

// ============================================================
// 폼 정의 (parts/SlotName 매핑)
// ============================================================

const FORMS: FormDefinition[] = [
  {
    id: 'office_day',
    label: '회사원 (낮)',
    timeOfDay: 'day',
    alignment: 'neutral',
    job: 'office',
    parts: {
      body: 'body_human_hybrid',
      outfit_torso: 'torso_suit_navy',
      head: 'head_human_office',
      hand_l: 'hand_empty_l',
      hand_r: 'hand_empty_r',
      back: null,
      aura: 'aura_neutral',
    },
  },
  {
    id: 'office_night_good',
    label: '회사원 (밤·선)',
    timeOfDay: 'night',
    alignment: 'good',
    job: 'office',
    parts: {
      body: 'body_wolf_lean',
      outfit_torso: 'torso_ceo_armor_gold',
      head: 'head_wolf_noble',
      hand_l: 'hand_wolf_paw_l',
      hand_r: 'hand_sword_light',
      back: 'back_cape_white',
      aura: 'aura_gold',
    },
  },
  {
    id: 'office_night_evil',
    label: '회사원 (밤·악)',
    timeOfDay: 'night',
    alignment: 'evil',
    job: 'office',
    parts: {
      body: 'body_wolf_lean_evil',
      outfit_torso: 'torso_ceo_suit_black',
      head: 'head_wolf_shadow',
      hand_l: 'hand_wolf_paw_l',
      hand_r: 'hand_dark_claw_r',
      back: 'back_tendrils',
      aura: 'aura_purple_smoke',
    },
  },
  {
    id: 'office_night_neutral',
    label: '회사원 (밤·중립)',
    timeOfDay: 'night',
    alignment: 'neutral',
    job: 'office',
    parts: {
      body: 'body_wolf_neutral',
      outfit_torso: 'torso_neutral_gray',
      head: 'head_wolf_neutral',
      hand_l: 'hand_wolf_paw_l',
      hand_r: 'hand_wolf_paw_r',
      back: null,
      aura: 'aura_neutral',
    },
  },
];

for (const f of FORMS) slotRegistry.registerForm(f);

export const PLACEHOLDER_FORMS = FORMS;
