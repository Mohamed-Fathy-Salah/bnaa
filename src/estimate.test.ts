import { describe, expect, it } from 'vitest';
import { estimateFlat, wouldCycle } from './estimate';
import { duplicateFlat } from './flatOps';
import type { Flat, FlatStep, Material } from './types';
import { daysBetween, rangeOf } from './utils';

const paint: Material = {
  id: 'paint',
  name: 'Paint',
  categoryId: 'mc-paint',
  unit: 'm2',
  basis: 'wallArea',
  factor: 1,
  materialPrice: { from: 10, to: 20 },
  workerPrice: { from: 5 },
  daysPerUnit: { from: 0.1, to: null },
  roomCategoryIds: [],
  autoAdd: true,
};

const tiles: Material = {
  ...paint,
  id: 'tiles',
  basis: 'floorArea',
  factor: 1.1,
  materialPrice: { from: 100 },
  workerPrice: { from: 50 },
  daysPerUnit: { from: 0.5, to: 1 },
  roomCategoryIds: ['bath'],
};

const step = (id: string, materialId: string, dependsOn: string[] = []): FlatStep => ({
  id,
  name: id,
  materialCategoryIds: [],
  roomIds: 'all',
  materials: [{ id: `${id}-l`, materialId, roomIds: 'auto', overrides: {} }],
  dependsOn,
});

const flat = (steps: FlatStep[]): Flat => ({
  id: 'f',
  name: 'F',
  address: '',
  notes: '',
  createdAt: '2026-01-01',
  rooms: [
    { id: 'r1', name: 'Living', categoryId: 'living', length: 4, width: 3, height: 3 }, // walls 42, floor 12
    { id: 'r2', name: 'Bath', categoryId: 'bath', length: 2, width: 2, height: 3 }, // walls 24, floor 4
  ],
  steps,
});

describe('rangeOf', () => {
  it('uses from when to is empty', () => {
    expect(rangeOf({ from: 5 })).toEqual({ min: 5, max: 5 });
    expect(rangeOf({ from: 5, to: null })).toEqual({ min: 5, max: 5 });
    expect(rangeOf({ from: 5, to: 8 })).toEqual({ min: 5, max: 8 });
  });
});

describe('estimateFlat', () => {
  it('computes quantity, cost and days per room', () => {
    const est = estimateFlat(flat([step('s1', 'paint')]), [paint]);
    // wall area 42 + 24 = 66
    expect(est.materials[0].qty).toBeCloseTo(66);
    expect(est.material).toEqual({ min: 660, max: 1320 });
    expect(est.worker).toEqual({ min: 330, max: 330 });
    expect(est.total).toEqual({ min: 990, max: 1650 });
    expect(est.days.min).toBeCloseTo(6.6);
  });

  it('auto scope limits a material to its room categories', () => {
    const est = estimateFlat(flat([step('s1', 'tiles')]), [tiles]);
    expect(est.materials[0].qty).toBeCloseTo(4.4); // only the bathroom floor × 1.1
  });

  it('honours manual overrides and step room scope', () => {
    const s = step('s1', 'paint');
    s.materials[0].overrides = { r1: 10 };
    s.roomIds = ['r1'];
    const est = estimateFlat(flat([s]), [paint]);
    expect(est.materials[0].qty).toBe(10);
  });

  it('overlaps independent steps and chains dependent ones', () => {
    const parallel = estimateFlat(flat([step('a', 'paint'), step('b', 'paint')]), [paint]);
    expect(parallel.days.min).toBeCloseTo(6.6);
    expect(parallel.sequentialDays.min).toBeCloseTo(13.2);

    const chained = estimateFlat(flat([step('a', 'paint'), step('b', 'paint', ['a'])]), [paint]);
    expect(chained.days.min).toBeCloseTo(13.2);
    expect(chained.steps[1].start.min).toBeCloseTo(6.6);
  });

  it('survives dependency cycles', () => {
    const est = estimateFlat(flat([step('a', 'paint', ['b']), step('b', 'paint', ['a'])]), [paint]);
    expect(Number.isFinite(est.days.max)).toBe(true);
  });
});

describe('wouldCycle', () => {
  it('detects indirect cycles', () => {
    const f = flat([step('a', 'paint'), step('b', 'paint', ['a']), step('c', 'paint', ['b'])]);
    expect(wouldCycle(f, 'a', 'c')).toBe(true);
    expect(wouldCycle(f, 'c', 'a')).toBe(false);
  });
});

describe('duplicateFlat', () => {
  it('remaps room and step ids', () => {
    const s = step('b', 'paint', ['a']);
    s.roomIds = ['r1'];
    s.materials[0].overrides = { r1: 3 };
    const copy = duplicateFlat(flat([step('a', 'paint'), s]), 'Copy');
    const [r1] = copy.rooms;
    expect(r1.id).not.toBe('r1');
    expect(copy.steps[1].roomIds).toEqual([r1.id]);
    expect(copy.steps[1].dependsOn).toEqual([copy.steps[0].id]);
    expect(copy.steps[1].materials[0].overrides).toEqual({ [r1.id]: 3 });
    expect(estimateFlat(copy, [paint]).total).toEqual(estimateFlat(flat([step('a', 'paint'), s]), [paint]).total);
  });
});

describe('daysBetween', () => {
  it('counts both ends', () => {
    expect(daysBetween('2026-01-01', '2026-01-10')).toBe(10);
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(1);
  });
});
