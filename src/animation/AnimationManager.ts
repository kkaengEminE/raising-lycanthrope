import * as THREE from 'three';

/**
 * 절차적 클립 함수 — 매 프레임 호출되며 캐릭터 transform 을 직접 만진다.
 * weight 0..1 로 lerp 가중치를 받아 크로스페이드 동안 부드러운 블렌딩 보장.
 */
export type ProceduralClipFn = (ctx: ProceduralClipContext) => void;

export interface ProceduralClipContext {
  root: THREE.Object3D;
  mounts: Map<string, THREE.Object3D>;
  /** 클립이 시작된 후 경과한 시간 (초). 'once' 모드에서 0..duration 으로 진행. */
  localTime: number;
  /** 전역 elapsed time (재생 시작과 무관). 부드러운 사이클 효과에 사용. */
  globalTime: number;
  /** 블렌딩 가중치 (0..1). 1 이면 완전 적용, 0 이면 영향 없음. */
  weight: number;
}

export type ClipMode = 'loop' | 'once';

interface ProceduralClipDef {
  fn: ProceduralClipFn;
  mode: ClipMode;
  duration: number;
}

interface ActiveTrack {
  name: string;
  weight: number;
  startedAt: number;
  fadingOut?: { from: number; duration: number; startedAt: number };
}

export interface PlayOptions {
  /** 크로스페이드 시간 (초). 0 이면 즉시. */
  fadeIn?: number;
  /** 'once' 모드일 때 종료 후 fallback 클립으로 전환. 미지정 시 idle 로 복귀. */
  returnTo?: string;
}

/**
 * 애니메이션 관리자.
 *
 * Phase A: ProceduralClipFn 기반 — 콜백이 transform 을 직접 만진다.
 *          GLB 클립 도착 전에도 walk/attack 등 즉시 사용 가능.
 *
 * Phase B (실제 Mixamo 클립 도착 시):
 *          AnimationMixer 와 AnimationClip 을 추가로 보유, registerClip 으로 등록.
 *          play(name) 은 mixer 액션을 우선 사용하고 procedural 은 fallback.
 *          (현재 구현은 procedural 만 — mixer 통합은 GLB 클립이 매니페스트로 들어올 때 활성화)
 */
export class AnimationManager {
  private root: THREE.Object3D;
  private mounts: Map<string, THREE.Object3D>;
  private clips = new Map<string, ProceduralClipDef>();
  private active: ActiveTrack[] = [];
  private clock = new THREE.Clock();
  private currentName: string | null = null;
  private fallbackName = 'idle';

  // Phase B 대비 — mixer 와 GLB 클립 슬롯 미리 마련
  mixer: THREE.AnimationMixer | null = null;
  private gltfClips = new Map<string, THREE.AnimationClip>();

  constructor(root: THREE.Object3D, mounts: Map<string, THREE.Object3D>) {
    this.root = root;
    this.mounts = mounts;
    this.clock.start();
  }

  registerProcedural(name: string, fn: ProceduralClipFn, mode: ClipMode = 'loop', duration = 0): void {
    this.clips.set(name, { fn, mode, duration });
  }

  /** Phase B — 실제 Mixamo/GLB 클립 등록. mixer 가 없으면 자동 생성. */
  registerClip(name: string, clip: THREE.AnimationClip): void {
    if (!this.mixer) this.mixer = new THREE.AnimationMixer(this.root);
    this.gltfClips.set(name, clip);
  }

  setFallback(name: string): void {
    this.fallbackName = name;
  }

  /** 현재 active 트랙 (페이드 인 중 포함). */
  getCurrent(): string | null {
    return this.currentName;
  }

  play(name: string, options: PlayOptions = {}): void {
    const def = this.clips.get(name);
    if (!def) {
      console.warn(`[AnimationManager] unknown clip "${name}"`);
      return;
    }
    if (this.currentName === name && def.mode === 'loop') return;

    const fadeIn = Math.max(0.001, options.fadeIn ?? 0.18);
    const now = this.clock.getElapsedTime();

    // 기존 트랙은 페이드아웃
    for (const t of this.active) {
      if (!t.fadingOut) {
        t.fadingOut = { from: t.weight, duration: fadeIn, startedAt: now };
      }
    }

    // 새 트랙 추가
    this.active.push({ name, weight: 0, startedAt: now });
    this.currentName = name;

    if (def.mode === 'once' && def.duration > 0) {
      const returnTo = options.returnTo ?? this.fallbackName;
      // localTime 이 duration 도달 후 returnTo 로 복귀
      window.setTimeout(() => {
        if (this.currentName === name) this.play(returnTo, { fadeIn: 0.15 });
      }, def.duration * 1000);
    }
  }

  /** 매 프레임 호출. */
  update(dt: number): void {
    if (this.mixer) this.mixer.update(dt);

    if (this.active.length === 0) return;

    const now = this.clock.getElapsedTime();
    const ctx: ProceduralClipContext = {
      root: this.root,
      mounts: this.mounts,
      localTime: 0,
      globalTime: now,
      weight: 0,
    };

    for (let i = this.active.length - 1; i >= 0; i--) {
      const tr = this.active[i];
      const def = this.clips.get(tr.name);
      if (!def) {
        this.active.splice(i, 1);
        continue;
      }

      // 페이드아웃 처리
      if (tr.fadingOut) {
        const elapsed = now - tr.fadingOut.startedAt;
        const k = Math.min(1, elapsed / tr.fadingOut.duration);
        tr.weight = tr.fadingOut.from * (1 - k);
        if (k >= 1) {
          this.active.splice(i, 1);
          continue;
        }
      } else {
        // 페이드인 (가장 최근 추가된 트랙 기준)
        const elapsed = now - tr.startedAt;
        tr.weight = Math.min(1, elapsed / 0.18);
      }

      ctx.localTime = now - tr.startedAt;
      ctx.weight = tr.weight;
      def.fn(ctx);
    }
  }

  dispose(): void {
    this.active = [];
    this.clips.clear();
    this.gltfClips.clear();
    this.mixer = null;
  }
}
