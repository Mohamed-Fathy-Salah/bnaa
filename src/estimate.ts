import type { Flat, FlatStep, ID, Material, MaterialRoomScope, MinMax, QuantityBasis, Room, RoomScope } from './types';
import { add, rangeOf, scale, zero } from './utils';

export const roomFloorArea = (r: Room) => r.length * r.width;
export const roomWallArea = (r: Room) => 2 * (r.length + r.width) * r.height;

export const basisValue = (basis: QuantityBasis, r: Room): number => {
  switch (basis) {
    case 'floorArea':
    case 'ceilingArea':
      return roomFloorArea(r);
    case 'wallArea':
      return roomWallArea(r);
    case 'perimeter':
      return 2 * (r.length + r.width);
    case 'volume':
      return r.length * r.width * r.height;
    case 'perRoom':
      return 1;
    case 'manual':
      return 0;
  }
};

export const inScope = (scope: RoomScope, roomId: ID) => scope === 'all' || scope.includes(roomId);

export const materialAppliesTo = (m: Material, r: Room) => m.roomCategoryIds.length === 0 || m.roomCategoryIds.includes(r.categoryId);

export const lineCovers = (scope: MaterialRoomScope, m: Material, r: Room) =>
  scope === 'auto' ? materialAppliesTo(m, r) : inScope(scope, r.id);

export const computedQty = (m: Material, r: Room) => basisValue(m.basis, r) * (m.factor || 0);

export interface LineEstimate {
  stepId: ID;
  materialId: ID;
  roomId: ID;
  qty: number;
  material: MinMax;
  worker: MinMax;
  days: MinMax;
}

export interface Totals {
  material: MinMax;
  worker: MinMax;
  total: MinMax;
  days: MinMax;
}

export interface StepEstimate extends Totals {
  stepId: ID;
  lines: LineEstimate[];
  /** day offsets from flat start, following dependencies */
  start: MinMax;
  end: MinMax;
}

export interface MaterialAggregate extends Totals {
  materialId: ID;
  qty: number;
}

export interface FlatEstimate extends Totals {
  steps: StepEstimate[];
  materials: MaterialAggregate[];
  /** sum of all step durations, i.e. if nothing overlapped */
  sequentialDays: MinMax;
}

const emptyTotals = (): Totals => ({ material: zero(), worker: zero(), total: zero(), days: zero() });

const accumulate = (t: Totals, l: { material: MinMax; worker: MinMax; days: MinMax }) => {
  t.material = add(t.material, l.material);
  t.worker = add(t.worker, l.worker);
  t.total = add(t.material, t.worker);
  t.days = add(t.days, l.days);
};

export function estimateStepLines(step: FlatStep, flat: Flat, materials: Map<ID, Material>): LineEstimate[] {
  const lines: LineEstimate[] = [];
  for (const sm of step.materials) {
    const m = materials.get(sm.materialId);
    if (!m) continue;
    for (const room of flat.rooms) {
      if (!inScope(step.roomIds, room.id) || !lineCovers(sm.roomIds, m, room)) continue;
      const override = sm.overrides[room.id];
      const qty = override !== undefined && override !== null && !Number.isNaN(override) ? override : computedQty(m, room);
      if (qty <= 0) continue;
      lines.push({
        stepId: step.id,
        materialId: m.id,
        roomId: room.id,
        qty,
        material: scale(rangeOf(m.materialPrice), qty),
        worker: scale(rangeOf(m.workerPrice), qty),
        days: scale(rangeOf(m.daysPerUnit), qty),
      });
    }
  }
  return lines;
}

/**
 * Estimate a flat. Within a step the work is done by one crew, so line durations add up.
 * Steps run as soon as all the steps they depend on have finished, so the flat's duration
 * is the longest dependency chain (critical path); steps without a dependency between them overlap.
 */
export function estimateFlat(flat: Flat, materialList: Material[]): FlatEstimate {
  const materials = new Map(materialList.map((m) => [m.id, m]));
  const stepIds = new Set(flat.steps.map((s) => s.id));

  const steps: StepEstimate[] = flat.steps.map((step) => {
    const lines = estimateStepLines(step, flat, materials);
    const t = emptyTotals();
    lines.forEach((l) => accumulate(t, l));
    return { ...t, stepId: step.id, lines, start: zero(), end: zero() };
  });
  const byId = new Map(steps.map((s) => [s.stepId, s]));
  const deps = new Map(flat.steps.map((s) => [s.id, s.dependsOn.filter((d) => stepIds.has(d) && d !== s.id)]));

  // longest-path scheduling; `visiting` breaks dependency cycles instead of recursing forever
  const done = new Set<ID>();
  const visiting = new Set<ID>();
  const schedule = (id: ID): StepEstimate => {
    const s = byId.get(id)!;
    if (done.has(id) || visiting.has(id)) return s;
    visiting.add(id);
    let start = zero();
    for (const d of deps.get(id) ?? []) {
      const dep = schedule(d);
      if (visiting.has(d)) continue;
      start = { min: Math.max(start.min, dep.end.min), max: Math.max(start.max, dep.end.max) };
    }
    s.start = start;
    s.end = add(start, s.days);
    visiting.delete(id);
    done.add(id);
    return s;
  };
  steps.forEach((s) => schedule(s.stepId));

  const totals = emptyTotals();
  const sequentialDays = steps.reduce((acc, s) => add(acc, s.days), zero());
  steps.forEach((s) => {
    totals.material = add(totals.material, s.material);
    totals.worker = add(totals.worker, s.worker);
  });
  totals.total = add(totals.material, totals.worker);
  totals.days = steps.reduce(
    (acc, s) => ({ min: Math.max(acc.min, s.end.min), max: Math.max(acc.max, s.end.max) }),
    zero(),
  );

  const agg = new Map<ID, MaterialAggregate>();
  for (const s of steps) {
    for (const l of s.lines) {
      const a = agg.get(l.materialId) ?? { materialId: l.materialId, qty: 0, ...emptyTotals() };
      a.qty += l.qty;
      accumulate(a, l);
      agg.set(l.materialId, a);
    }
  }

  return { ...totals, steps, materials: [...agg.values()], sequentialDays };
}

/** Returns true if making `stepId` depend on `candidate` would create a cycle. */
export function wouldCycle(flat: Flat, stepId: ID, candidate: ID): boolean {
  const deps = new Map(flat.steps.map((s) => [s.id, s.dependsOn]));
  const stack = [candidate];
  const seen = new Set<ID>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === stepId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...(deps.get(cur) ?? []));
  }
  return false;
}

export const isFinished = (f: Flat) => Boolean(f.actualEnd);
