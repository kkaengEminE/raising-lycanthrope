import * as THREE from 'three';

export type PixelTier = 'low' | 'medium' | 'high';

export interface PixelRenderOptions {
  tier: PixelTier;
  enabled: boolean;
}

const TIER_RES: Record<PixelTier, [number, number]> = {
  low: [320, 180],
  medium: [480, 270],
  high: [640, 360],
};

/**
 * 씬을 저해상도 RT 로 렌더하고 NEAREST 로 업스케일하는 픽셀 파이프라인.
 * 풀스크린 쿼드 + 자체 셰이더로 구현 (EffectComposer 의존성 회피).
 */
export class PixelRenderPipeline {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private renderTarget!: THREE.WebGLRenderTarget;
  private upscaleScene: THREE.Scene;
  private upscaleCamera: THREE.OrthographicCamera;
  private upscaleQuad: THREE.Mesh;
  private upscaleMaterial: THREE.ShaderMaterial;

  private currentTier: PixelTier;
  private enabled: boolean;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    options: PixelRenderOptions = { tier: 'medium', enabled: true },
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.currentTier = options.tier;
    this.enabled = options.enabled;

    this.upscaleScene = new THREE.Scene();
    this.upscaleCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.upscaleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(tDiffuse, vUv);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    this.upscaleQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.upscaleMaterial);
    this.upscaleQuad.frustumCulled = false;
    this.upscaleScene.add(this.upscaleQuad);

    this.createRenderTarget();
  }

  private createRenderTarget(): void {
    if (this.renderTarget) this.renderTarget.dispose();
    const [w, h] = TIER_RES[this.currentTier];
    this.renderTarget = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
      colorSpace: THREE.SRGBColorSpace,
    });
    this.upscaleMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
  }

  setTier(tier: PixelTier): void {
    if (tier === this.currentTier) return;
    this.currentTier = tier;
    this.createRenderTarget();
  }

  getTier(): PixelTier {
    return this.currentTier;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** 현재 내부 RT 의 [width, height]. 픽셀 스냅 계산에 사용. */
  getInternalResolution(): [number, number] {
    const [w, h] = TIER_RES[this.currentTier];
    return [w, h];
  }

  /** 캔버스 리사이즈 시 카메라 종횡비를 RT 종횡비에 맞춘다 (왜곡 방지). */
  resize(viewportWidth: number, viewportHeight: number): void {
    this.renderer.setSize(viewportWidth, viewportHeight, false);
    this.camera.aspect = viewportWidth / viewportHeight;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    if (!this.enabled) {
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.upscaleScene, this.upscaleCamera);
  }

  dispose(): void {
    this.renderTarget.dispose();
    this.upscaleMaterial.dispose();
    (this.upscaleQuad.geometry as THREE.BufferGeometry).dispose();
  }
}
