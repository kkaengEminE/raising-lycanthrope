import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * GLB/GLTF 캐시 + 픽셀 미감용 텍스처 필터 강제.
 * Meshy/Tripo 출력은 보통 LinearFilter + mipmap 활성화로 들어오므로
 * 로드 직후 모든 텍스처를 NearestFilter 로 전환한다.
 *
 * 사용법:
 *   const gltf = await assetManager.loadGLTF('/assets/parts/torso_suit_navy.glb');
 *   const cloned = assetManager.cloneScene(gltf);
 */
export class AssetManager {
  private loader: GLTFLoader;
  private cache = new Map<string, Promise<GLTF>>();

  constructor() {
    this.loader = new GLTFLoader();
    // DRACO 압축 GLB 도 지원 (Meshy 일부 출력이 사용)
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    this.loader.setDRACOLoader(draco);
  }

  async loadGLTF(url: string): Promise<GLTF> {
    let pending = this.cache.get(url);
    if (!pending) {
      pending = new Promise((resolve, reject) => {
        this.loader.load(
          url,
          (gltf) => {
            this.applyPixelFilter(gltf.scene);
            resolve(gltf);
          },
          undefined,
          (err) => reject(err),
        );
      });
      this.cache.set(url, pending);
    }
    return pending;
  }

  /**
   * 인스턴스화 — 같은 GLB 를 여러 캐릭터에 부착할 때 매번 호출.
   * Three.js 의 SkeletonUtils.clone 을 쓰지 않고 단순 Object3D.clone(true) 사용.
   * (Phase A: 자체 armature 를 가진 Meshy 단일 부품용. 정규 스켈레톤 공유는 Phase B.)
   */
  cloneScene(gltf: GLTF): THREE.Object3D {
    const cloned = gltf.scene.clone(true);
    // 머티리얼은 공유하지 않고 클론 — 부품마다 다른 카르마 틴트 가능하도록
    cloned.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        if (Array.isArray(c.material)) {
          c.material = c.material.map((m) => m.clone());
        } else {
          c.material = c.material.clone();
        }
      }
    });
    return cloned;
  }

  /** 로드된 GLB 의 모든 텍스처에 NEAREST 필터 + mipmap OFF 강제. */
  private applyPixelFilter(root: THREE.Object3D): void {
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mats: THREE.Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
          for (const key of Object.keys(mat) as Array<keyof THREE.Material>) {
            const v = (mat as any)[key];
            if (v instanceof THREE.Texture) {
              v.minFilter = THREE.NearestFilter;
              v.magFilter = THREE.NearestFilter;
              v.generateMipmaps = false;
              v.colorSpace = THREE.SRGBColorSpace;
              v.needsUpdate = true;
            }
          }
        }
      }
    });
  }

  has(url: string): boolean {
    return this.cache.has(url);
  }

  /** 사전 프리로드 — 변신 시 메시 swap 이 끊기지 않도록 사용. */
  async preload(urls: string[]): Promise<void> {
    await Promise.all(urls.map((u) => this.loadGLTF(u).catch((e) => {
      console.warn(`[AssetManager] preload failed for ${u}:`, e);
    })));
  }

  dispose(): void {
    this.cache.clear();
  }
}

export const assetManager = new AssetManager();
