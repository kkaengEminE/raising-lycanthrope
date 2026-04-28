import * as THREE from 'three';
import { createToonCharacterMaterial } from '@/render/shaders/ToonCharacterMaterial';

/**
 * 프로토타입 씬: 평지 + 미니 오브젝트 몇 개.
 * 캐릭터 placeholder 와 라이팅 무드 검증이 목표.
 */
export function buildPrototypeScene(scene: THREE.Scene): {
  ground: THREE.Mesh;
  props: THREE.Object3D[];
} {
  const ground = createGround();
  scene.add(ground);

  const props: THREE.Object3D[] = [];

  // 깊이감을 위한 단순 prop들 (멀찍이 배치된 건물/돌)
  const propPositions: Array<[number, number, number, number, number]> = [
    [-6, 0, -8, 1.2, 0x4a4a5a],
    [7, 0, -10, 1.6, 0x3a3a4a],
    [-9, 0, -5, 1.0, 0x5a4a4a],
    [9, 0, -3, 1.3, 0x4a3a3a],
    [-3, 0, -12, 1.1, 0x3a4a4a],
  ];
  for (const [x, y, z, scale, color] of propPositions) {
    const geom = new THREE.BoxGeometry(scale, scale * 1.6, scale);
    geom.translate(0, scale * 0.8, 0);
    const mat = createToonCharacterMaterial({
      color,
      toonBands: 3,
      rimStrength: 0.3,
      shadowStrength: 0.55,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    props.push(mesh);
  }

  return { ground, props };
}

function createGround(): THREE.Mesh {
  const geom = new THREE.PlaneGeometry(80, 80, 1, 1);
  geom.rotateX(-Math.PI / 2);

  const material = createToonCharacterMaterial({
    color: 0x2a2438,
    toonBands: 2,
    rimStrength: 0.0,
    shadowStrength: 0.4,
    shadowTint: 0x1a1428,
  });

  const ground = new THREE.Mesh(geom, material);
  ground.name = 'ground';
  ground.receiveShadow = true;
  return ground;
}
