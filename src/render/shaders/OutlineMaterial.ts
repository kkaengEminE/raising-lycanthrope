import * as THREE from 'three';

export interface OutlineParams {
  color?: THREE.ColorRepresentation;
  thickness?: number;
}

/**
 * 인버티드 헐 외곽선 머티리얼.
 * 메시를 두 번 렌더 — 한 번은 정상, 한 번은 이 머티리얼 + side=BackSide.
 * 정점을 노멀 방향으로 약간 내면 (uThickness, world-space units) 검정 실루엣이 생긴다.
 *
 * 480×270 RT 출력에서 ~1px 두께가 되도록 0.02–0.04 정도가 적절.
 */
export function createOutlineMaterial(params: OutlineParams = {}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'OutlineMaterial',
    side: THREE.BackSide,
    uniforms: {
      uColor: { value: new THREE.Color(params.color ?? 0x05060f) },
      uThickness: { value: params.thickness ?? 0.025 },
    },
    vertexShader: /* glsl */ `
      uniform float uThickness;
      void main() {
        vec3 inflated = position + normal * uThickness;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(inflated, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      void main() {
        gl_FragColor = vec4(uColor, 1.0);
      }
    `,
  });
}

/**
 * 일반 메시에 외곽선 자식 메시를 부착.
 * 부모 메시와 같은 지오메트리를 공유하므로 GPU 메모리 추가는 없다.
 * 외곽선은 부모 변환을 따라가며 자동 동기화.
 */
export function attachOutline(target: THREE.Mesh, params: OutlineParams = {}): THREE.Mesh {
  const outline = new THREE.Mesh(target.geometry, createOutlineMaterial(params));
  outline.name = `${target.name || 'mesh'}__outline`;
  outline.renderOrder = target.renderOrder - 1;
  outline.castShadow = false;
  outline.receiveShadow = false;
  target.add(outline);
  return outline;
}
