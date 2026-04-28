import * as THREE from 'three';

const STYLE_ID = 'damage-numbers-style';
const CSS = `
.dmg-overlay {
  position: fixed; inset: 0; pointer-events: none; z-index: 30;
  overflow: hidden;
}
.dmg-num {
  position: absolute;
  font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Noto Sans KR", sans-serif;
  font-weight: 800;
  font-size: 22px;
  color: #fff0b0;
  text-shadow: 0 2px 0 rgba(0,0,0,0.85), 0 0 8px rgba(255,200,80,0.55);
  transform: translate(-50%, -50%);
  animation: dmg-rise 0.85s ease-out forwards;
  user-select: none;
  white-space: nowrap;
}
.dmg-num.evil { color: #ff8898; text-shadow: 0 2px 0 rgba(0,0,0,0.85), 0 0 8px rgba(192,80,140,0.55); }
.dmg-num.gold { color: #ffd966; }
.dmg-num.warn { color: #ff5070; }
@keyframes dmg-rise {
  0%   { transform: translate(-50%, -50%) translateY(0)    scale(0.7); opacity: 0; }
  18%  { transform: translate(-50%, -50%) translateY(-8px) scale(1.15); opacity: 1; }
  45%  { transform: translate(-50%, -50%) translateY(-26px) scale(1.0); opacity: 1; }
  100% { transform: translate(-50%, -50%) translateY(-58px) scale(0.85); opacity: 0; }
}
`;

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

export type DamageNumberKind = 'normal' | 'evil' | 'gold' | 'warn';

export class DamageNumbers {
  private overlay: HTMLDivElement;
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private projVec = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.camera = camera;
    this.canvas = canvas;
    ensureStyles();
    this.overlay = document.createElement('div');
    this.overlay.className = 'dmg-overlay';
    document.body.appendChild(this.overlay);
  }

  popAt(worldPos: THREE.Vector3, text: string, kind: DamageNumberKind = 'normal'): void {
    this.projVec.copy(worldPos).project(this.camera);
    if (this.projVec.z > 1 || this.projVec.z < -1) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = rect.left + ((this.projVec.x + 1) * 0.5) * rect.width;
    const y = rect.top + ((-this.projVec.y + 1) * 0.5) * rect.height;
    const el = document.createElement('div');
    el.className = `dmg-num ${kind === 'normal' ? '' : kind}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.overlay.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  dispose(): void {
    this.overlay.remove();
  }
}
