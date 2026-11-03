import type { AppData, Flat, FlatStep, Material, StepMaterial, StepTemplate } from './types';
import { uid } from './utils';

export const newFlat = (name: string): Flat => ({
  id: uid(),
  name,
  address: '',
  notes: '',
  rooms: [],
  steps: [],
  createdAt: new Date().toISOString(),
});

export const newLine = (m: Material): StepMaterial => ({ id: uid(), materialId: m.id, roomIds: 'auto', overrides: {} });

/**
 * Build a flat step from a template. It depends on the previous step, or — when the template
 * may run in parallel — on whatever the previous step depends on, so the two start together.
 */
export function stepFromTemplate(tpl: StepTemplate, data: AppData, prev?: FlatStep): FlatStep {
  return {
    id: uid(),
    name: tpl.name,
    i18nKey: tpl.i18nKey,
    templateId: tpl.id,
    materialCategoryIds: [...tpl.materialCategoryIds],
    roomIds: 'all',
    materials: data.materials.filter((m) => m.autoAdd && tpl.materialCategoryIds.includes(m.categoryId)).map(newLine),
    dependsOn: prev ? (tpl.parallelWithPrevious ? [...prev.dependsOn] : [prev.id]) : [],
  };
}

export const customStep = (name: string, prev?: FlatStep): FlatStep => ({
  id: uid(),
  name,
  materialCategoryIds: [],
  roomIds: 'all',
  materials: [],
  dependsOn: prev ? [prev.id] : [],
});

/** Deep copy with fresh ids, remapping room and step references. Actual results are not copied. */
export function duplicateFlat(f: Flat, name: string): Flat {
  const roomMap = new Map(f.rooms.map((r) => [r.id, uid()]));
  const stepMap = new Map(f.steps.map((s) => [s.id, uid()]));
  const mapScope = <T extends string | string[]>(scope: T): T =>
    (Array.isArray(scope) ? scope.map((id) => roomMap.get(id) ?? id) : scope) as T;
  return {
    ...newFlat(name),
    address: f.address,
    notes: f.notes,
    rooms: f.rooms.map((r) => ({ ...r, id: roomMap.get(r.id)! })),
    steps: f.steps.map((s) => ({
      ...s,
      id: stepMap.get(s.id)!,
      actual: undefined,
      roomIds: mapScope(s.roomIds),
      dependsOn: s.dependsOn.map((d) => stepMap.get(d) ?? d),
      materials: s.materials.map((m) => ({
        ...m,
        id: uid(),
        roomIds: mapScope(m.roomIds),
        overrides: Object.fromEntries(Object.entries(m.overrides).map(([k, v]) => [roomMap.get(k) ?? k, v])),
      })),
    })),
  };
}

export const flatArea = (f: Flat) => f.rooms.reduce((a, r) => a + r.length * r.width, 0);
