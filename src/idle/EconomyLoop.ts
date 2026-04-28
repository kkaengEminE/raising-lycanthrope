import { JOBS, KARMA, type JobId, type JobBalance } from '@/config/balance';

export interface EconomyState {
  gold: number;
  job: JobId;
  feverEndsAt: number; // performance.now() ms; 0 이면 비활성
  feverMultiplier: number;
}

export interface EconomyTickEvent {
  goldDelta: number;
  goldTotal: number;
  reason: 'idle' | 'kill' | 'ad' | 'penalty';
  riskTriggered?: boolean;
}

type Listener = (e: EconomyTickEvent) => void;

/**
 * 낮 동안의 방치형 골드 누적 + 광고/킬 보너스 통합.
 * tick(dt, isDayActive, karma) 를 매 프레임 호출.
 *
 * 성향 분기:
 *  - karma > +0.6 → goodMultiplier (안정)
 *  - karma < -0.6 → evilMultiplier (고수익) + 확률적 risk penalty
 *  - 그 외 → 1.0 (중립)
 */
export class EconomyLoop {
  state: EconomyState = {
    gold: 0,
    job: 'office',
    feverEndsAt: 0,
    feverMultiplier: 1.0,
  };

  private listeners = new Set<Listener>();
  private riskAccum = 0;

  setJob(job: JobId): void {
    this.state.job = job;
  }

  /** 광고 "수익 2배" 등 즉시 보너스. */
  applyAdReward(goldDelta: number): void {
    this.state.gold += goldDelta;
    this.broadcast({ goldDelta, goldTotal: this.state.gold, reason: 'ad' });
  }

  /** 광고 "피버 타임" 시작. duration 초 동안 multiplier 적용. */
  startFever(duration: number, multiplier: number): void {
    this.state.feverEndsAt = performance.now() + duration * 1000;
    this.state.feverMultiplier = multiplier;
  }

  isFeverActive(): boolean {
    return performance.now() < this.state.feverEndsAt;
  }

  feverRemainingSec(): number {
    return Math.max(0, (this.state.feverEndsAt - performance.now()) / 1000);
  }

  addKillReward(gold: number): void {
    this.state.gold += gold;
    this.broadcast({ goldDelta: gold, goldTotal: this.state.gold, reason: 'kill' });
  }

  computeMultiplier(karma: number, balance: JobBalance): { mul: number; align: 'good' | 'neutral' | 'evil' } {
    if (karma >= KARMA.GOOD_THRESHOLD) return { mul: balance.goodMultiplier, align: 'good' };
    if (karma <= KARMA.EVIL_THRESHOLD) return { mul: balance.evilMultiplier, align: 'evil' };
    return { mul: 1.0, align: 'neutral' };
  }

  /** 매 프레임 호출. 낮 활성 시에만 골드 적립. */
  tick(dt: number, isDayActive: boolean, karma: number): void {
    if (!isDayActive) return;
    const balance = JOBS[this.state.job];
    const { mul, align } = this.computeMultiplier(karma, balance);
    const fever = this.isFeverActive() ? this.state.feverMultiplier : 1.0;
    let gain = balance.baseGoldPerSec * mul * fever * dt;

    let risk = false;
    if (align === 'evil') {
      // 1초당 risk 확률 굴림 — 누적 dt 가 1을 넘으면 1회 굴림
      this.riskAccum += dt;
      while (this.riskAccum >= 1) {
        this.riskAccum -= 1;
        if (Math.random() < balance.evilRiskChance) {
          risk = true;
          gain *= balance.evilRiskPenaltyMul;
          break;
        }
      }
    } else {
      this.riskAccum = 0;
    }

    if (gain <= 0 && !risk) return;
    this.state.gold += gain;
    this.broadcast({
      goldDelta: gain,
      goldTotal: this.state.gold,
      reason: risk ? 'penalty' : 'idle',
      riskTriggered: risk,
    });
  }

  onChange(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private broadcast(e: EconomyTickEvent): void {
    for (const cb of this.listeners) cb(e);
  }
}
