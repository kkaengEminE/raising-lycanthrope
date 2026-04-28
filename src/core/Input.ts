/**
 * 글로벌 키보드 입력 상태 추적.
 * 액션 단위 추상화 (Forward/Back/Left/Right) — 키 매핑 변경에 대비.
 */

export type Action = 'forward' | 'back' | 'left' | 'right';

const DEFAULT_BINDINGS: Record<Action, string[]> = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
};

class InputSystem {
  private down = new Set<string>();
  private bindings = DEFAULT_BINDINGS;
  private attached = false;

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  isDown(action: Action): boolean {
    for (const code of this.bindings[action]) {
      if (this.down.has(code)) return true;
    }
    return false;
  }

  /**
   * 정규화된 이동 벡터 (length <= 1). 키 입력 없으면 (0, 0).
   * x = 좌우 (-1=left, +1=right), z = 전후 (-1=forward away from camera, +1=back toward camera).
   */
  getMoveVector(): { x: number; z: number } {
    let x = 0;
    let z = 0;
    if (this.isDown('forward')) z -= 1;
    if (this.isDown('back')) z += 1;
    if (this.isDown('left')) x -= 1;
    if (this.isDown('right')) x += 1;
    const len = Math.hypot(x, z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    return { x, z };
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    // 화살표 키는 페이지 스크롤을 막는다 — 게임 내 이동 입력으로만 사용.
    if (e.code.startsWith('Arrow')) e.preventDefault();
    this.down.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code);
  };

  private onBlur = (): void => {
    this.down.clear();
  };
}

export const input = new InputSystem();
