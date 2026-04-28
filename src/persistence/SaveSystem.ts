import type { JobId } from '@/config/balance';

const SAVE_KEY = 'raising-lycanthrope.save.v1';
const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  /** 누적 골드. */
  gold: number;
  /** 카르마 -1..+1. */
  karma: number;
  /** 현재 직업. */
  job: JobId;
  /** 현재 폼 ID (예: office_day, chef_night_good). */
  formId: string;
  /** 사이클 카운트 (밤 종료 후 +1). */
  cycleCount: number;
  /** 누적 플레이 시간 (초). */
  totalPlayTime: number;
  /** 광고 슬롯 쿨다운 (slot → ms epoch). */
  adCooldowns: Record<string, number>;
  /** 저장된 시각 (ms epoch) — 디버그용. */
  savedAt: number;
}

const DEFAULT_SAVE: SaveData = {
  version: SAVE_VERSION,
  gold: 0,
  karma: 0,
  job: 'office',
  formId: 'office_day',
  cycleCount: 0,
  totalPlayTime: 0,
  adCooldowns: {},
  savedAt: 0,
};

/**
 * localStorage 기반 영속화.
 * 버전 호환성 — 키에 버전 prefix, 미일치 save 는 무시 (default 로드).
 *
 * 자동 저장: startAutosave(getter, intervalSec) 호출 후 매 N초 저장.
 * 수동 저장: save(data) / load() / clear().
 */
export class SaveSystem {
  private autosaveTimer: number | null = null;

  load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { ...DEFAULT_SAVE };
      const parsed = JSON.parse(raw) as SaveData;
      if (parsed.version !== SAVE_VERSION) {
        console.info(`[SaveSystem] version mismatch (${parsed.version} → ${SAVE_VERSION}), using defaults`);
        return { ...DEFAULT_SAVE };
      }
      return { ...DEFAULT_SAVE, ...parsed }; // 누락 필드는 default 로 채움 (forward compat)
    } catch (err) {
      console.warn('[SaveSystem] load failed:', err);
      return { ...DEFAULT_SAVE };
    }
  }

  save(data: Omit<SaveData, 'version' | 'savedAt'>): boolean {
    try {
      const full: SaveData = {
        ...data,
        version: SAVE_VERSION,
        savedAt: Date.now(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(full));
      return true;
    } catch (err) {
      console.warn('[SaveSystem] save failed:', err);
      return false;
    }
  }

  clear(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  startAutosave(getter: () => Omit<SaveData, 'version' | 'savedAt'>, intervalSec = 10): void {
    this.stopAutosave();
    this.autosaveTimer = window.setInterval(() => {
      this.save(getter());
    }, intervalSec * 1000);
  }

  stopAutosave(): void {
    if (this.autosaveTimer !== null) {
      window.clearInterval(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }

  dispose(): void {
    this.stopAutosave();
  }
}

export const saveSystem = new SaveSystem();
