# GLB 부품 드롭 가이드

이 폴더에 Meshy/Tripo 등에서 생성한 GLB 파일을 떨어뜨리고 `manifest.json` 에 등록하면, 같은 ID의 procedural 부품을 자동으로 대체합니다.

## 빠른 시작

1. **GLB 파일 배치**
   ```
   public/assets/parts/
   ├── torso_suit_navy.glb        ← Meshy 출력
   ├── body_human_hybrid.glb
   └── ...
   ```

2. **manifest.json 편집**
   ```json
   {
     "torso_suit_navy": {
       "slot": "outfit_torso",
       "kind": "attached",
       "file": "torso_suit_navy.glb",
       "mount": "root",
       "polycount": 2980
     },
     "body_human_hybrid": {
       "slot": "body",
       "kind": "skinned",
       "file": "body_human_hybrid.glb",
       "scale": 1.0
     }
   }
   ```

3. 페이지 새로고침 — procedural 부품이 GLB 로 자동 교체됩니다.

## 필드 명세

| 필드 | 타입 | 설명 |
|---|---|---|
| `slot` | `body` / `outfit_torso` / `outfit_arms` / `head` / `hand_l` / `hand_r` / `back` / `aura` | 슬롯 이름 |
| `kind` | `skinned` / `attached` / `aura` | 마운트 방식 |
| `file` | string | 이 파일 기준 상대 경로 |
| `mount` | string (선택) | 마운트 본 이름 (`root` / `head_top` / `back` / `hand_l` / `hand_r` / `hip_back` / `chest_fx`) |
| `position` | `[x,y,z]` (선택) | GLB 루트 local 위치 |
| `rotation` | `[x,y,z]` 라디안 (선택) | GLB 루트 회전 |
| `scale` | number 또는 `[x,y,z]` (선택) | 스케일 |
| `emissiveIntensity` | number (선택) | 모든 머티리얼 emissive 강도 일괄 적용 |
| `polycount` | number (선택) | 메타 — 추적용 |
| `tags` | string[] (선택) | 메타 — 필터/디버그용 |

## Meshy 권장 설정

- Model Quality: **High** (≈10k tris, 후처리 리토포 전제)
- Topology: **Quad** (Blender 리토포 호환)
- Texture Resolution: **1024**
- Symmetry: **Enabled** (캐릭터 부품에 한해)
- Auto-rig: **Enabled** (Mixamo Y-bot 호환 휴머노이드)

## Phase A vs Phase B

- **Phase A (현재)**: 부품마다 자체 armature 가 있는 GLB 를 단순 부착. 카르마 틴트는 procedural 부품에서만 작동.
- **Phase B (정규 스켈레톤 도착 후)**: `rig.glb` 에 모든 부품을 SkinnedMesh 로 rebind, 카르마 틴트도 GLB 머티리얼에 onBeforeCompile 로 주입.

## 배치 예시 — 회사원 낮 폼 풀세트

```json
{
  "body_human_hybrid": { "slot": "body", "kind": "skinned", "file": "body_human_hybrid.glb" },
  "torso_suit_navy":   { "slot": "outfit_torso", "kind": "attached", "file": "torso_suit_navy.glb", "mount": "root" },
  "head_human_office": { "slot": "head", "kind": "attached", "file": "head_human_office.glb", "mount": "head_top" },
  "hand_empty_l":      { "slot": "hand_l", "kind": "attached", "file": "hand_empty_l.glb", "mount": "hand_l" },
  "hand_empty_r":      { "slot": "hand_r", "kind": "attached", "file": "hand_empty_r.glb", "mount": "hand_r" }
}
```

## 디버그 — 어떤 부품이 GLB 인지 확인

브라우저 콘솔에서:
```js
slotRegistry.getPart('torso_suit_navy')
// build 함수가 정의되어 있고 manifest 로드 메시지가 콘솔에 찍혔다면 GLB 모드
```

## 문제 해결

- **404 manifest.json**: 정상 — manifest 가 없으면 procedural 폴백
- **GLB 로드 실패**: 콘솔 경고만 — 해당 부품만 procedural 로 폴백
- **DRACO 압축 오류**: 자동으로 `https://www.gstatic.com/draco/v1/decoders/` 를 사용. 오프라인 환경이면 `src/loaders/AssetManager.ts` 의 `setDecoderPath` 를 로컬 경로로 변경
- **텍스처가 흐릿함**: 정상 — 픽셀 파이프라인이 480×270 으로 다운샘플하기 때문. NEAREST 필터는 이미 강제됨
