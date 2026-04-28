import * as THREE from 'three';
import { slotRegistry } from '@/core/SlotRegistry';
import type { PartAsset, PartKind, SlotName } from '@/core/SlotTypes';
import { assetManager } from './AssetManager';

export interface ManifestPartEntry {
  slot: SlotName;
  kind: PartKind;
  file: string;
  /** mount 본 이름 (kind === 'attached' 또는 'aura' 일 때). */
  mount?: string;
  /** 적용 시 자동 위치/회전/스케일 (Object3D.position/rotation/scale 매핑). */
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  /** 이미시브 텍스처 별도 파일 (선택). */
  emissiveMap?: string;
  emissiveIntensity?: number;
  /** 메타데이터 (현재는 정보용). */
  polycount?: number;
  tags?: string[];
}

export type Manifest = Record<string, ManifestPartEntry>;

interface LoadOptions {
  /** 로드 실패 시 에러를 던질지 (기본 false — 누락은 procedural 로 폴백). */
  strict?: boolean;
  /** GLB 들이 위치한 베이스 경로 (manifest 의 file 은 이 경로 기준). */
  baseUrl?: string;
}

/**
 * manifest.json 을 읽어서 GLB 부품을 slotRegistry 에 등록.
 * 같은 id 의 procedural 부품이 이미 있으면 덮어쓴다 (= GLB 우선).
 *
 * 매니페스트 형식 예:
 *   {
 *     "torso_suit_navy": {
 *       "slot": "outfit_torso",
 *       "kind": "attached",
 *       "file": "torso_suit_navy.glb",
 *       "mount": "root",
 *       "polycount": 2980
 *     }
 *   }
 */
export class ManifestLoader {
  /** manifest.json 을 fetch 하고 모든 GLB 를 사전 로드 후 등록. */
  static async load(manifestUrl: string, options: LoadOptions = {}): Promise<{ loaded: number; failed: number }> {
    const { strict = false, baseUrl = manifestUrl.replace(/\/[^/]*$/, '/') } = options;
    let manifest: Manifest;
    try {
      const res = await fetch(manifestUrl);
      if (!res.ok) {
        if (strict) throw new Error(`manifest HTTP ${res.status}`);
        return { loaded: 0, failed: 0 };
      }
      manifest = (await res.json()) as Manifest;
    } catch (err) {
      if (strict) throw err;
      console.info(`[ManifestLoader] no manifest found at ${manifestUrl} — using procedural fallbacks`);
      return { loaded: 0, failed: 0 };
    }

    const entries = Object.entries(manifest);
    if (entries.length === 0) return { loaded: 0, failed: 0 };

    let loaded = 0;
    let failed = 0;

    await Promise.all(
      entries.map(async ([id, entry]) => {
        try {
          const url = baseUrl + entry.file;
          const gltf = await assetManager.loadGLTF(url);

          const part: PartAsset = {
            id,
            slot: entry.slot,
            kind: entry.kind,
            mount: entry.mount,
            karmaTintable: false, // Phase A: GLB 머티리얼은 카르마 틴트 미적용 (Phase B 에서 onBeforeCompile 주입)
            build: () => {
              const obj = assetManager.cloneScene(gltf);
              if (entry.position) obj.position.fromArray(entry.position);
              if (entry.rotation) obj.rotation.set(entry.rotation[0], entry.rotation[1], entry.rotation[2]);
              if (entry.scale !== undefined) {
                if (typeof entry.scale === 'number') obj.scale.setScalar(entry.scale);
                else obj.scale.fromArray(entry.scale);
              }
              applyEmissive(obj, entry.emissiveIntensity);
              return obj;
            },
          };
          slotRegistry.registerPart(part);
          loaded += 1;
        } catch (err) {
          failed += 1;
          console.warn(`[ManifestLoader] failed to load "${id}":`, err);
        }
      }),
    );

    console.info(`[ManifestLoader] ${loaded} GLB part(s) registered, ${failed} failed`);
    return { loaded, failed };
  }
}

function applyEmissive(root: THREE.Object3D, intensity: number | undefined): void {
  if (intensity === undefined) return;
  root.traverse((c) => {
    if (c instanceof THREE.Mesh) {
      const mats: THREE.Material[] = Array.isArray(c.material) ? c.material : [c.material];
      for (const m of mats) {
        if ('emissiveIntensity' in m) {
          (m as any).emissiveIntensity = intensity;
        }
      }
    }
  });
}
