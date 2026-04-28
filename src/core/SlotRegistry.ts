import type { FormDefinition, PartAsset } from './SlotTypes';

/**
 * 부품/폼의 글로벌 등록부.
 * 실제 GLB 파이프라인 도착 시 manifest.json 로더가 등록을 채운다.
 * 프로토타입 단계에서는 코드로 직접 등록.
 */
class SlotRegistry {
  private parts = new Map<string, PartAsset>();
  private forms = new Map<string, FormDefinition>();

  registerPart(part: PartAsset): void {
    if (this.parts.has(part.id)) {
      console.warn(`[SlotRegistry] part "${part.id}" overwritten`);
    }
    this.parts.set(part.id, part);
  }

  registerForm(form: FormDefinition): void {
    if (this.forms.has(form.id)) {
      console.warn(`[SlotRegistry] form "${form.id}" overwritten`);
    }
    this.forms.set(form.id, form);
  }

  getPart(id: string): PartAsset | undefined {
    return this.parts.get(id);
  }

  getForm(id: string): FormDefinition | undefined {
    return this.forms.get(id);
  }

  listForms(): FormDefinition[] {
    return Array.from(this.forms.values());
  }

  listFormsBy(filter: Partial<Pick<FormDefinition, 'timeOfDay' | 'alignment' | 'job'>>): FormDefinition[] {
    return this.listForms().filter((f) =>
      (filter.timeOfDay === undefined || f.timeOfDay === filter.timeOfDay) &&
      (filter.alignment === undefined || f.alignment === filter.alignment) &&
      (filter.job === undefined || f.job === filter.job),
    );
  }

  clear(): void {
    this.parts.clear();
    this.forms.clear();
  }
}

export const slotRegistry = new SlotRegistry();
