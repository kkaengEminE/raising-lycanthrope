import * as THREE from 'three';

export interface ToonCharacterMaterialParams {
  color?: THREE.ColorRepresentation;
  rimColor?: THREE.ColorRepresentation;
  rimPower?: number;
  rimStrength?: number;
  shadowTint?: THREE.ColorRepresentation;
  shadowStrength?: number;
  toonBands?: number;
  karmaTint?: number;
  tintGood?: THREE.ColorRepresentation;
  tintEvil?: THREE.ColorRepresentation;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  map?: THREE.Texture | null;
}

/**
 * 공유 툴 캐릭터 머티리얼.
 * - 단계화된 툴 압색 (3–5 밴드)
 * - 달빛 림라이트
 * - 그림자 색상 추이프트 (차가움과 팝말딘과 맒니니 달밤)
 * - karma uniform 으로 선/악 틴트 주입
 *
 * onBeforeCompile 대신 완전 손으로 작성 — 파이프라인에서
 * 난장판/입명 시 디버깅이 쉬우며 three.js 버전 의존성에서 자유롭다.
 */
export function createToonCharacterMaterial(
  params: ToonCharacterMaterialParams = {},
): THREE.ShaderMaterial {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.lights,
    {
      uColor: { value: new THREE.Color(params.color ?? 0xc8c8d0) },
      uMap: { value: params.map ?? null },
      uHasMap: { value: params.map ? 1.0 : 0.0 },
      uRimColor: { value: new THREE.Color(params.rimColor ?? 0x9bb5ff) },
      uRimPower: { value: params.rimPower ?? 2.5 },
      uRimStrength: { value: params.rimStrength ?? 0.6 },
      uShadowTint: { value: new THREE.Color(params.shadowTint ?? 0x2a3a6a) },
      uShadowStrength: { value: params.shadowStrength ?? 0.65 },
      uToonBands: { value: params.toonBands ?? 4.0 },
      uKarmaTint: { value: params.karmaTint ?? 0.0 },
      uTintGood: { value: new THREE.Color(params.tintGood ?? 0xffd966) },
      uTintEvil: { value: new THREE.Color(params.tintEvil ?? 0x6620a0) },
      uEmissive: { value: new THREE.Color(params.emissive ?? 0x000000) },
      uEmissiveIntensity: { value: params.emissiveIntensity ?? 0.0 },
    },
  ]);

  return new THREE.ShaderMaterial({
    name: 'ToonCharacterMaterial',
    uniforms,
    lights: true,
    vertexShader: /* glsl */ `
      varying vec3 vNormalV;
      varying vec3 vPositionV;
      varying vec3 vViewDirV;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vPositionV = mvPos.xyz;
        vNormalV = normalize(normalMatrix * normal);
        vViewDirV = normalize(-mvPos.xyz); // 카메라가 원점인 view space
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <packing>

      uniform vec3 uColor;
      uniform sampler2D uMap;
      uniform float uHasMap;
      uniform vec3 uRimColor;
      uniform float uRimPower;
      uniform float uRimStrength;
      uniform vec3 uShadowTint;
      uniform float uShadowStrength;
      uniform float uToonBands;
      uniform float uKarmaTint;
      uniform vec3 uTintGood;
      uniform vec3 uTintEvil;
      uniform vec3 uEmissive;
      uniform float uEmissiveIntensity;

      uniform vec3 ambientLightColor;

      #if NUM_DIR_LIGHTS > 0
        struct DirectionalLight {
          vec3 direction;
          vec3 color;
        };
        uniform DirectionalLight directionalLights[NUM_DIR_LIGHTS];
      #endif

      #if NUM_HEMI_LIGHTS > 0
        struct HemisphereLight {
          vec3 direction;
          vec3 skyColor;
          vec3 groundColor;
        };
        uniform HemisphereLight hemisphereLights[NUM_HEMI_LIGHTS];
      #endif

      #if NUM_POINT_LIGHTS > 0
        struct PointLight {
          vec3 position;
          vec3 color;
          float distance;
          float decay;
        };
        uniform PointLight pointLights[NUM_POINT_LIGHTS];
      #endif

      varying vec3 vNormalV;
      varying vec3 vPositionV;
      varying vec3 vViewDirV;
      varying vec2 vUv;

      float toonStep(float v, float bands) {
        return floor(clamp(v, 0.0, 1.0) * bands) / bands;
      }

      void main() {
        vec3 N = normalize(vNormalV);
        vec3 V = normalize(vViewDirV);

        vec3 base = uColor;
        if (uHasMap > 0.5) {
          base *= texture2D(uMap, vUv).rgb;
        }

        // 카르마 틴트 (비대칭: 악이 더 강하게 부패)
        vec3 tint = uKarmaTint < 0.0
          ? mix(vec3(1.0), uTintEvil, -uKarmaTint * 0.6)
          : mix(vec3(1.0), uTintGood,  uKarmaTint * 0.4);
        base *= tint;

        // 단계화된 diffuse (툴 랜프)
        vec3 lightAccum = ambientLightColor;

        #if NUM_DIR_LIGHTS > 0
          for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
            vec3 L = normalize(directionalLights[i].direction);
            float NdotL = dot(N, L);
            float toon = toonStep(NdotL * 0.5 + 0.5, uToonBands);
            // 그림자 구간에 색상 시프트 주입
            vec3 lit = mix(uShadowTint * uShadowStrength, vec3(1.0), toon);
            lightAccum += directionalLights[i].color * lit;
          }
        #endif

        #if NUM_HEMI_LIGHTS > 0
          for (int i = 0; i < NUM_HEMI_LIGHTS; i++) {
            vec3 L = normalize(hemisphereLights[i].direction);
            float w = 0.5 * dot(N, L) + 0.5;
            vec3 hemi = mix(hemisphereLights[i].groundColor, hemisphereLights[i].skyColor, w);
            lightAccum += hemi;
          }
        #endif

        #if NUM_POINT_LIGHTS > 0
          for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
            vec3 toLight = pointLights[i].position - vPositionV;
            float dist = length(toLight);
            vec3 L = toLight / max(dist, 1e-4);
            float NdotL = max(dot(N, L), 0.0);
            float toon = toonStep(NdotL, uToonBands);
            float atten = 1.0;
            if (pointLights[i].distance > 0.0) {
              atten = pow(clamp(1.0 - dist / pointLights[i].distance, 0.0, 1.0), pointLights[i].decay);
            }
            lightAccum += pointLights[i].color * toon * atten;
          }
        #endif

        vec3 color = base * lightAccum;

        // 림라이트
        float rim = pow(1.0 - max(dot(N, V), 0.0), uRimPower);
        color += uRimColor * rim * uRimStrength;

        // 이미시브 (계광/광배/공격 이펙트)
        color += uEmissive * uEmissiveIntensity;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

export function setKarma(material: THREE.ShaderMaterial, karma: number): void {
  if (material.uniforms.uKarmaTint) {
    material.uniforms.uKarmaTint.value = THREE.MathUtils.clamp(karma, -1, 1);
  }
}
