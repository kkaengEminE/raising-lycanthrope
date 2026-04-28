import * as THREE from 'three';
import { PixelRenderPipeline, type PixelTier } from '@/render/PixelRenderPipeline';
import { Lighting, type TimeOfDay } from '@/render/Lighting';

export interface EngineHandles {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  pipeline: PixelRenderPipeline;
  lighting: Lighting;
}

export type FrameCallback = (dt: number, elapsed: number) => void;

export class Engine {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  pipeline: PixelRenderPipeline;
  lighting: Lighting;

  private clock = new THREE.Clock();
  private frameCallbacks = new Set<FrameCallback>();
  private rafHandle = 0;
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x05071a, 1.0);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 200);
    this.camera.position.set(0, 4.8, 11);
    this.camera.lookAt(0, 1.0, 0);

    this.pipeline = new PixelRenderPipeline(this.renderer, this.scene, this.camera, {
      tier: 'medium',
      enabled: true,
    });

    this.lighting = new Lighting(this.scene);

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  onFrame(cb: FrameCallback): () => void {
    this.frameCallbacks.add(cb);
    return () => this.frameCallbacks.delete(cb);
  }

  setTimeOfDay(time: TimeOfDay, instant = false): void {
    this.lighting.setTimeOfDay(time, instant);
  }

  setPixelTier(tier: PixelTier): void {
    this.pipeline.setTier(tier);
  }

  setPixelEnabled(enabled: boolean): void {
    this.pipeline.setEnabled(enabled);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const loop = () => {
      if (!this.running) return;
      const dt = Math.min(this.clock.getDelta(), 0.1);
      const elapsed = this.clock.getElapsedTime();
      this.lighting.update(dt, elapsed);
      for (const cb of this.frameCallbacks) cb(dt, elapsed);
      this.pipeline.render();
      this.rafHandle = requestAnimationFrame(loop);
    };
    this.rafHandle = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafHandle);
  }

  private handleResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.pipeline.resize(w, h);
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    this.pipeline.dispose();
    this.lighting.dispose();
    this.renderer.dispose();
  }
}
