import { AD } from '@/config/balance';
import type { EconomyLoop } from '@/idle/EconomyLoop';

export type AdSlot = 'reward_double' | 'fever' | 'gacha' | 'revive';

export interface AdResult {
  slot: AdSlot;
  message: string;
  rewardGold?: number;
  feverActivated?: boolean;
  reviveActivated?: boolean;
  gachaResult?: string;
}

export interface AdSimulatorOptions {
  economy: EconomyLoop;
  /** 부활 광고가 호출되었을 때 외부 핸들러 (체력 회복 + 무적). */
  onRevive?: (invulSeconds: number) => void;
  /** 갑자 광고로 임시 파츠 장착 (placeholder 단계 — 실제 슬롯 swap 은 외부에서). */
  onGacha?: (partId: string) => void;
}

const GACHA_POOL = [
  '하급 검광 (임시)',
  '연꽃 향료 (임시)',
  '단단한 가죽 (임시)',
  '폭주 글러브 (임시)',
  '월광 망토 (임시)',
];

/**
 * 광고 4종 시뮬레이션.
 * 실제 광고 SDK 대신 즉시 보상이 발화되며, UI 에 결과를 알린다.
 */
export class AdSimulator {
  private opts: AdSimulatorOptions;
  private cooldowns = new Map<AdSlot, number>();

  constructor(opts: AdSimulatorOptions) {
    this.opts = opts;
  }

  isReady(slot: AdSlot): boolean {
    return (this.cooldowns.get(slot) ?? 0) <= performance.now();
  }

  cooldownRemaining(slot: AdSlot): number {
    return Math.max(0, ((this.cooldowns.get(slot) ?? 0) - performance.now()) / 1000);
  }

  /** 모든 슬롯의 쿨다운을 직렬화 (저장용). performance.now() 기준 ms. */
  serializeCooldowns(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [slot, ts] of this.cooldowns) {
      const remaining = ts - performance.now();
      if (remaining > 0) out[slot] = remaining;
    }
    return out;
  }

  /** 직렬화된 쿨다운(잔여 ms) 을 현재 시점 기준으로 복원. */
  restoreCooldowns(remaining: Record<string, number>): void {
    const now = performance.now();
    this.cooldowns.clear();
    for (const [slot, ms] of Object.entries(remaining)) {
      if (ms > 0) this.cooldowns.set(slot as AdSlot, now + ms);
    }
  }

  watch(slot: AdSlot): AdResult | null {
    if (!this.isReady(slot)) return null;
    const now = performance.now();
    let result: AdResult;
    switch (slot) {
      case 'reward_double': {
        // 직전 1초 골드 적립의 (DOUBLE_MUL - 1) 배를 즉시 지급
        const reward = Math.round(this.opts.economy.state.gold * 0.02);
        const safeReward = Math.max(50, reward);
        this.opts.economy.applyAdReward(safeReward);
        result = { slot, message: `+${safeReward.toLocaleString()} G (보상 ×${AD.REWARD_DOUBLE_MUL})`, rewardGold: safeReward };
        this.cooldowns.set(slot, now + 12_000);
        break;
      }
      case 'fever': {
        this.opts.economy.startFever(AD.FEVER_DURATION_SEC, AD.FEVER_GOLD_MUL);
        result = { slot, message: `피버 타임! ${AD.FEVER_DURATION_SEC}초간 ×${AD.FEVER_GOLD_MUL}`, feverActivated: true };
        this.cooldowns.set(slot, now + 90_000);
        break;
      }
      case 'gacha': {
        const pick = GACHA_POOL[Math.floor(Math.random() * GACHA_POOL.length)];
        this.opts.onGacha?.(pick);
        result = { slot, message: `획득: ${pick}`, gachaResult: pick };
        this.cooldowns.set(slot, now + 30_000);
        break;
      }
      case 'revive': {
        this.opts.onRevive?.(AD.REVIVE_INVUL_SEC);
        result = { slot, message: `부활! ${AD.REVIVE_INVUL_SEC}초 무적`, reviveActivated: true };
        this.cooldowns.set(slot, now + 60_000);
        break;
      }
    }
    return result;
  }
}
