import * as THREE from 'three';

interface ActiveBurst {
  group: THREE.Group;
  startTime: number;
  duration: number;
  update: (t: number) => void;
}

/**
 * 1회성 변신 VFX — 플래시 + 파티클 + 충격파 링.
 * 발화 후 update() 가 false 를 리턴하면 자동 정리.
 */
export class TransformBurst {
  private active: ActiveBurst[] = [];
  private clock = new THREE.Clock();
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  /** 풀스크린 플래시는 카메라 자식 평면으로 구현. */
  private flashMaterial: THREE.MeshBasicMaterial;
  private flashMesh: THREE.Mesh;
  private flashTimer = 0;
  private flashPeak = 0.85;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;

    this.flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });
    this.flashMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.flashMaterial);
    this.flashMesh.frustumCulled = false;
    this.flashMesh.renderOrder = 999;
    this.flashMesh.position.z = -0.5;
    this.camera.add(this.flashMesh);
    this.scene.add(this.camera);

    this.clock.start();
  }

  triggerFlash(color: THREE.ColorRepresentation = 0xffffff, peak = 0.85, durationMs = 220): void {
    this.flashMaterial.color = new THREE.Color(color);
    this.flashPeak = peak;
    this.flashTimer = durationMs / 1000;
  }

  spawnRingShockwave(position: THREE.Vector3, color: THREE.ColorRepresentation = 0xffffff): void {
    const geom = new THREE.RingGeometry(0.1, 0.18, 32);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position);
    mesh.position.y = 0.05;
    const group = new THREE.Group();
    group.add(mesh);
    this.scene.add(group);

    const startTime = this.clock.getElapsedTime();
    const duration = 0.6;
    const update = (t: number) => {
      const k = (t - startTime) / duration;
      mesh.scale.setScalar(0.4 + k * 7.0);
      mat.opacity = 0.85 * (1 - k);
    };
    this.active.push({
      group,
      startTime,
      duration,
      update,
    });
  }

  spawnParticleBurst(position: THREE.Vector3, color: THREE.ColorRepresentation = 0xffffff, count = 80): void {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const phi = Math.random() * Math.PI * 2;
      const theta = (Math.random() - 0.5) * Math.PI;
      const speed = 2.5 + Math.random() * 2.0;
      const dx = Math.cos(theta) * Math.cos(phi);
      const dy = Math.abs(Math.sin(theta)) + 0.2;
      const dz = Math.cos(theta) * Math.sin(phi);
      velocities[i * 3] = dx * speed;
      velocities[i * 3 + 1] = dy * speed;
      velocities[i * 3 + 2] = dz * speed;
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size: 0.18,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geom, mat);
    const group = new THREE.Group();
    group.position.copy(position);
    group.add(points);
    this.scene.add(group);

    const startTime = this.clock.getElapsedTime();
    const duration = 0.9;
    const update = (t: number) => {
      const dt = (t - startTime) / duration;
      for (let i = 0; i < count; i++) {
        positions[i * 3] += velocities[i * 3] * 0.016;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * 0.016;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * 0.016;
        velocities[i * 3 + 1] -= 0.05; // 중력
      }
      (geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      mat.opacity = Math.max(0, 1 - dt);
      mat.size = 0.18 * (1 - dt * 0.5);
    };
    this.active.push({ group, startTime, duration, update });
  }

  update(dt: number): void {
    const t = this.clock.getElapsedTime();

    if (this.flashTimer > 0) {
      const k = this.flashTimer / 0.22;
      const tri = k > 0.5 ? (k - 0.5) * 2 : (0.5 - k) * 2;
      this.flashMaterial.opacity = this.flashPeak * (1 - tri);
      this.flashTimer = Math.max(0, this.flashTimer - dt);
      if (this.flashTimer <= 0) this.flashMaterial.opacity = 0;
    }

    for (let i = this.active.length - 1; i >= 0; i--) {
      const a = this.active[i];
      a.update(t);
      if (t - a.startTime >= a.duration) {
        this.scene.remove(a.group);
        a.group.traverse((c) => {
          if (c instanceof THREE.Mesh || c instanceof THREE.Points) {
            (c.geometry as THREE.BufferGeometry).dispose();
            const m = c.material;
            if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
            else (m as THREE.Material).dispose();
          }
        });
        this.active.splice(i, 1);
      }
    }
  }

  dispose(): void {
    this.flashMesh.removeFromParent();
    (this.flashMesh.geometry as THREE.BufferGeometry).dispose();
    this.flashMaterial.dispose();
    for (const a of this.active) this.scene.remove(a.group);
    this.active = [];
  }
}
