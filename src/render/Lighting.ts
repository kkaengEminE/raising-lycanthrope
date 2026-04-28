import * as THREE from 'three';

export type TimeOfDay = 'day' | 'night';

interface LightingPreset {
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  dirColor: THREE.Color;
  dirIntensity: number;
  dirPosition: THREE.Vector3;
  bgTop: THREE.Color;
  bgBottom: THREE.Color;
  fogColor: THREE.Color;
  fogNear: number;
  fogFar: number;
  torchEnabled: boolean;
}

const PRESETS: Record<TimeOfDay, LightingPreset> = {
  day: {
    hemiSky: new THREE.Color(0x87ceeb),
    hemiGround: new THREE.Color(0xd4a574),
    hemiIntensity: 0.6,
    dirColor: new THREE.Color(0xfff2d4),
    dirIntensity: 1.0,
    dirPosition: new THREE.Vector3(6, 10, 4),
    bgTop: new THREE.Color(0xa6cdf2),
    bgBottom: new THREE.Color(0xeec98a),
    fogColor: new THREE.Color(0xb8c8d8),
    fogNear: 18,
    fogFar: 60,
    torchEnabled: false,
  },
  night: {
    hemiSky: new THREE.Color(0x1a2347),
    hemiGround: new THREE.Color(0x2a1a3a),
    hemiIntensity: 0.3,
    dirColor: new THREE.Color(0x9bb5ff),
    dirIntensity: 0.5,
    dirPosition: new THREE.Vector3(-4, 8, 2),
    bgTop: new THREE.Color(0x05071a),
    bgBottom: new THREE.Color(0x1d1530),
    fogColor: new THREE.Color(0x0a0d1f),
    fogNear: 12,
    fogFar: 40,
    torchEnabled: true,
  },
};

function lerpPreset(a: LightingPreset, b: LightingPreset, t: number, out: LightingPreset): void {
  out.hemiSky.copy(a.hemiSky).lerp(b.hemiSky, t);
  out.hemiGround.copy(a.hemiGround).lerp(b.hemiGround, t);
  out.hemiIntensity = THREE.MathUtils.lerp(a.hemiIntensity, b.hemiIntensity, t);
  out.dirColor.copy(a.dirColor).lerp(b.dirColor, t);
  out.dirIntensity = THREE.MathUtils.lerp(a.dirIntensity, b.dirIntensity, t);
  out.dirPosition.copy(a.dirPosition).lerp(b.dirPosition, t);
  out.bgTop.copy(a.bgTop).lerp(b.bgTop, t);
  out.bgBottom.copy(a.bgBottom).lerp(b.bgBottom, t);
  out.fogColor.copy(a.fogColor).lerp(b.fogColor, t);
  out.fogNear = THREE.MathUtils.lerp(a.fogNear, b.fogNear, t);
  out.fogFar = THREE.MathUtils.lerp(a.fogFar, b.fogFar, t);
  out.torchEnabled = t > 0.5 ? b.torchEnabled : a.torchEnabled;
}

function clonePreset(p: LightingPreset): LightingPreset {
  return {
    hemiSky: p.hemiSky.clone(),
    hemiGround: p.hemiGround.clone(),
    hemiIntensity: p.hemiIntensity,
    dirColor: p.dirColor.clone(),
    dirIntensity: p.dirIntensity,
    dirPosition: p.dirPosition.clone(),
    bgTop: p.bgTop.clone(),
    bgBottom: p.bgBottom.clone(),
    fogColor: p.fogColor.clone(),
    fogNear: p.fogNear,
    fogFar: p.fogFar,
    torchEnabled: p.torchEnabled,
  };
}

interface Torch {
  light: THREE.PointLight;
  mesh: THREE.Mesh;
  baseIntensity: number;
  noiseSeed: number;
}

/**
 * 단일 라이팅 리그가 낮/밤 사이를 lerp.
 * 스카이박스는 그라데이션 셰이더 머티리얼 (top/bottom 색).
 * 횃불은 밤에만 활성화, simplex noise 풍의 깜빡임.
 */
export class Lighting {
  scene: THREE.Scene;
  hemi: THREE.HemisphereLight;
  dir: THREE.DirectionalLight;
  torches: Torch[] = [];
  bgMaterial: THREE.ShaderMaterial;
  bgMesh: THREE.Mesh;

  private current: LightingPreset = clonePreset(PRESETS.day);
  private from: LightingPreset = clonePreset(PRESETS.day);
  private to: LightingPreset = clonePreset(PRESETS.day);
  private blend = 0;
  private blendDuration = 2.0;
  private blendActive = false;
  private currentTime: TimeOfDay = 'day';

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.hemi = new THREE.HemisphereLight(this.current.hemiSky, this.current.hemiGround, this.current.hemiIntensity);
    scene.add(this.hemi);

    this.dir = new THREE.DirectionalLight(this.current.dirColor, this.current.dirIntensity);
    this.dir.position.copy(this.current.dirPosition);
    this.dir.castShadow = false;
    scene.add(this.dir);

    scene.fog = new THREE.Fog(this.current.fogColor, this.current.fogNear, this.current.fogFar);

    this.bgMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: this.current.bgTop.clone() },
        uBottom: { value: this.current.bgBottom.clone() },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = position;
          mat4 mv = mat4(mat3(modelViewMatrix));
          gl_Position = projectionMatrix * mv * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop;
        uniform vec3 uBottom;
        varying vec3 vDir;
        void main() {
          float t = clamp(normalize(vDir).y * 0.5 + 0.5, 0.0, 1.0);
          gl_FragColor = vec4(mix(uBottom, uTop, t), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.bgMesh = new THREE.Mesh(new THREE.SphereGeometry(200, 16, 12), this.bgMaterial);
    this.bgMesh.frustumCulled = false;
    this.bgMesh.renderOrder = -1000;
    scene.add(this.bgMesh);

    this.spawnTorches();
  }

  private spawnTorches(): void {
    const positions: [number, number, number][] = [
      [-3.5, 1.5, -2],
      [3.5, 1.5, -2],
      [0, 1.5, -5],
    ];
    for (const [x, y, z] of positions) {
      const light = new THREE.PointLight(0xff7a3a, 0, 8, 1.6);
      light.position.set(x, y, z);
      light.visible = false;
      this.scene.add(light);

      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.18, 0),
        new THREE.MeshBasicMaterial({ color: 0xffae5a }),
      );
      mesh.position.copy(light.position);
      mesh.visible = false;
      this.scene.add(mesh);

      this.torches.push({
        light,
        mesh,
        baseIntensity: 1.5,
        noiseSeed: Math.random() * 1000,
      });
    }
  }

  setTimeOfDay(time: TimeOfDay, instant = false): void {
    if (this.currentTime === time && !instant) return;
    this.currentTime = time;

    this.from = clonePreset(this.current);
    this.to = clonePreset(PRESETS[time]);

    if (instant) {
      this.current = clonePreset(this.to);
      this.applyCurrent();
      this.blendActive = false;
    } else {
      this.blend = 0;
      this.blendActive = true;
    }
  }

  getTimeOfDay(): TimeOfDay {
    return this.currentTime;
  }

  private applyCurrent(): void {
    this.hemi.color.copy(this.current.hemiSky);
    this.hemi.groundColor.copy(this.current.hemiGround);
    this.hemi.intensity = this.current.hemiIntensity;
    this.dir.color.copy(this.current.dirColor);
    this.dir.intensity = this.current.dirIntensity;
    this.dir.position.copy(this.current.dirPosition);

    (this.bgMaterial.uniforms.uTop.value as THREE.Color).copy(this.current.bgTop);
    (this.bgMaterial.uniforms.uBottom.value as THREE.Color).copy(this.current.bgBottom);

    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(this.current.fogColor);
      this.scene.fog.near = this.current.fogNear;
      this.scene.fog.far = this.current.fogFar;
    }

    for (const torch of this.torches) {
      torch.light.visible = this.current.torchEnabled;
      torch.mesh.visible = this.current.torchEnabled;
    }
  }

  update(dt: number, elapsedTime: number): void {
    if (this.blendActive) {
      this.blend = Math.min(1, this.blend + dt / this.blendDuration);
      lerpPreset(this.from, this.to, this.blend, this.current);
      this.applyCurrent();
      if (this.blend >= 1) this.blendActive = false;
    }

    if (this.current.torchEnabled) {
      for (const torch of this.torches) {
        const flicker =
          0.7 +
          0.3 * Math.sin(elapsedTime * 6.3 + torch.noiseSeed) +
          0.15 * Math.sin(elapsedTime * 17.1 + torch.noiseSeed * 1.7);
        torch.light.intensity = torch.baseIntensity * flicker;
      }
    }
  }

  dispose(): void {
    this.bgMaterial.dispose();
    (this.bgMesh.geometry as THREE.BufferGeometry).dispose();
    for (const torch of this.torches) {
      (torch.mesh.material as THREE.Material).dispose();
      (torch.mesh.geometry as THREE.BufferGeometry).dispose();
    }
  }
}
