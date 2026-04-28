import { CYCLE } from '@/config/balance';

export type Phase = 'day' | 'night';

export interface PhaseChangeEvent {
  newPhase: Phase;
  cycleCount: number; // 0 부터 시작, 낮 끝날 때마다 +1
}

type Listener = (e: PhaseChangeEvent) => void;

/**
 * 낮 3분 / 밤 2분 자동 사이클.
 * 외부에서 start() 후 매 프레임 update(dt) 호출.
 * onPhaseChange 로 라이팅/전투/경제 시스템 토글.
 */
export class CycleManager {
  private phase: Phase = 'day';
  private remaining = CYCLE.DAY_SECONDS;
  private cycleCount = 0;
  private running = false;
  private listeners = new Set<Listener>();
  private rateMul = 1.0;

  start(initial: Phase = 'day'): void {
    this.phase = initial;
    this.remaining = initial === 'day' ? CYCLE.DAY_SECONDS : CYCLE.NIGHT_SECONDS;
    this.running = true;
    this.broadcast();
  }

  stop(): void {
    this.running = false;
  }

  pause(): void {
    this.running = false;
  }

  resume(): void {
    this.running = true;
  }

  isRunning(): boolean {
    return this.running;
  }

  /** 디버그용 — 사이클을 N배속으로 진행 (1 = 정상). */
  setSpeedMultiplier(mul: number): void {
    this.rateMul = Math.max(0, mul);
  }

  getPhase(): Phase {
    return this.phase;
  }

  getRemaining(): number {
    return this.remaining;
  }

  getRemainingFraction(): number {
    const total = this.phase === 'day' ? CYCLE.DAY_SECONDS : CYCLE.NIGHT_SECONDS;
    return this.remaining / total;
  }

  forceSwitch(): void {
    this.endPhase();
  }

  update(dt: number): void {
    if (!this.running) return;
    this.remaining -= dt * this.rateMul;
    if (this.remaining <= 0) this.endPhase();
  }

  private endPhase(): void {
    if (this.phase === 'day') {
      this.phase = 'night';
      this.remaining = CYCLE.NIGHT_SECONDS;
    } else {
      this.phase = 'day';
      this.remaining = CYCLE.DAY_SECONDS;
      this.cycleCount += 1;
    }
    this.broadcast();
  }

  onPhaseChange(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private broadcast(): void {
    const e: PhaseChangeEvent = { newPhase: this.phase, cycleCount: this.cycleCount };
    for (const cb of this.listeners) cb(e);
  }
}
