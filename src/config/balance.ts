/**
 * 게임 밸런스 상수 (계획서 §1.1 / §3 / §4 정밀 수치 시트 반영).
 * 단일 소스 — 코드 어디서도 magic number 를 직접 적지 말 것.
 */

export const CYCLE = {
  DAY_SECONDS: 180,   // 낮 3분
  NIGHT_SECONDS: 120, // 밤 2분
};

export const KARMA = {
  GOOD_THRESHOLD: 0.6,
  EVIL_THRESHOLD: -0.6,
  KARMA_LIMIT: 1.0,
  GOOD_UNLOCK: 0.3,    // 마을 상점
  GOOD_AURA_UNLOCK: 0.7,
  EVIL_UNLOCK: -0.3,   // 암시장 상점
  EVIL_HUNGER_UNLOCK: -0.7,
};

export type JobId = 'office' | 'chef' | 'boxer';

export interface JobBalance {
  baseGoldPerSec: number;
  goodMultiplier: number;
  evilMultiplier: number;
  evilRiskChance: number;        // 단속/실패 발생 확률 (0..1, per second sample)
  evilRiskPenaltyMul: number;    // 발생 시 수익 곱 (예: 0 = 몰수, 0.2 = 80% 차감)
  goodLabel: string;
  evilLabel: string;
}

export const JOBS: Record<JobId, JobBalance> = {
  office: {
    baseGoldPerSec: 100,
    goodMultiplier: 1.5,
    evilMultiplier: 3.0,
    evilRiskChance: 0.15,
    evilRiskPenaltyMul: 0,
    goodLabel: '안정 승진',
    evilLabel: '횡령 / 내부거래',
  },
  chef: {
    baseGoldPerSec: 120,
    goodMultiplier: 1.4,
    evilMultiplier: 2.5,
    evilRiskChance: 0.10,
    evilRiskPenaltyMul: 0,
    goodLabel: '신뢰 셰프',
    evilLabel: '암거래 정육',
  },
  boxer: {
    baseGoldPerSec: 150,
    goodMultiplier: 1.5,
    evilMultiplier: 4.0,
    evilRiskChance: 0.12,
    evilRiskPenaltyMul: 0.3,
    goodLabel: '공식 챔피언',
    evilLabel: '지하 투기장',
  },
};

export const COMBAT = {
  BASE_SLASH_DAMAGE: 22,
  SLASH_RADIUS: 0.9,
  PLAYER_BASE_HP: 100,
  HP_REGEN_PER_SEC_GOOD_HALO: 4,
};

export const AD = {
  REWARD_DOUBLE_MUL: 2.0,
  FEVER_DURATION_SEC: 60,
  FEVER_GOLD_MUL: 5.0,
  REVIVE_HP_RATIO: 1.0,
  REVIVE_INVUL_SEC: 5,
};

export const TIER_RES = {
  low: [320, 180] as [number, number],
  medium: [480, 270] as [number, number],
  high: [640, 360] as [number, number],
};
