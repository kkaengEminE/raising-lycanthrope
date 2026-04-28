import * as THREE from 'three';
import type { Character } from './Character';
import { slotRegistry } from './SlotRegistry';
import type { FormDefinition } from './SlotTypes';

export type Alignment = 'good' | 'neutral' | 'evil';

const GOOD_THRESHOLD = 0.6;
const EVIL_THRESHOLD = -0.6;

export function alignmentForKarma(karma: number): Alignment {
  if (karma >= GOOD_THRESHOLD) return 'good';
  if (karma <= EVIL_THRESHOLD) return 'evil';
  return 'neutral';
}

export interface KarmaListener {
  (karma: number, alignment: Alignment, prevAlignment: Alignment): void;
}

/**
 * 단일 카르마 스칼라 + 임계값 변화 브로드캐스트.
 * 캐릭터에 연결되면 카르마 값이 변할 때마다 슬롯 머티리얼 틴트가 즉시 갱신되고,
 * 임계값을 넘어가면 폼 자체를 자동으로 swap (밤일 때만 — 낮은 인간 픽션 보존).
 */
export class KarmaController {
  private value = 0;
  private listeners = new Set<KarmaListener>();
  private characters = new Set<Character>();
  private autoSwapEnabled = true;

  /**
   * 캐릭터를 카르마에 연결.
   * onAlignmentChange 콜백으로 폼 swap 정책을 외부에서 결정한다.
   * (낮/밤 상태는 KarmaController 가 모르므로 외부에서 결정)
   */
  attach(character: Character): void {
    this.characters.add(character);
    character.setKarma(this.value);
  }

  detach(character: Character): void {
    this.characters.delete(character);
  }

  setValue(karma: number): void {
    const next = THREE.MathUtils.clamp(karma, -1, 1);
    if (next === this.value) return;
    const prevAlign = alignmentForKarma(this.value);
    this.value = next;
    const nextAlign = alignmentForKarma(next);
    for (const c of this.characters) c.setKarma(next);
    for (const cb of this.listeners) cb(next, nextAlign, prevAlign);
  }

  add(delta: number): void {
    this.setValue(this.value + delta);
  }

  getValue(): number {
    return this.value;
  }

  getAlignment(): Alignment {
    return alignmentForKarma(this.value);
  }

  setAutoSwapEnabled(enabled: boolean): void {
    this.autoSwapEnabled = enabled;
  }

  isAutoSwapEnabled(): boolean {
    return this.autoSwapEnabled;
  }

  onChange(listener: KarmaListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/**
 * 직업과 시간대를 알면 alignment 에 맞는 폼을 등록부에서 찾아준다.
 * 일치하는 폼이 없으면 neutral 로 폴백.
 */
export function selectFormForAlignment(
  job: FormDefinition['job'],
  timeOfDay: 'day' | 'night',
  alignment: Alignment,
): FormDefinition | undefined {
  const candidates = slotRegistry.listFormsBy({ job, timeOfDay });
  return candidates.find((f) => f.alignment === alignment) ?? candidates.find((f) => f.alignment === 'neutral');
}
