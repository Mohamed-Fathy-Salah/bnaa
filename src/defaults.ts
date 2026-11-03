import type { AppData, Category, Material, StepTemplate } from './types';

// Stable ids for seeded items so templates and materials can reference each other.
const rc = (key: string): Category => ({ id: `rc-${key}`, name: key, i18nKey: `seed.room.${key}` });
const mc = (key: string): Category => ({ id: `mc-${key}`, name: key, i18nKey: `seed.mat.${key}` });

export const defaultRoomCategories = (): Category[] =>
  ['living', 'reception', 'bedroom', 'kitchen', 'bathroom', 'corridor', 'balcony'].map(rc);

export const defaultMaterialCategories = (): Category[] =>
  ['plumbing', 'electric', 'plaster', 'insulation', 'tiles', 'gypsum', 'paint', 'doors'].map(mc);

const mat = (key: string, m: Omit<Material, 'id' | 'name' | 'i18nKey'>): Material => ({
  id: `m-${key}`,
  name: key,
  i18nKey: `seed.material.${key}`,
  ...m,
});

/** Sample prices — meant to be edited by the user to match their market. */
export const defaultMaterials = (): Material[] => [
  mat('bathPlumbing', {
    categoryId: 'mc-plumbing', unit: 'point', basis: 'perRoom', factor: 6,
    materialPrice: { from: 900, to: 1400 }, workerPrice: { from: 400, to: 600 }, daysPerUnit: { from: 0.2, to: 0.3 },
    roomCategoryIds: ['rc-bathroom'], autoAdd: true,
  }),
  mat('kitchenPlumbing', {
    categoryId: 'mc-plumbing', unit: 'point', basis: 'perRoom', factor: 3,
    materialPrice: { from: 900, to: 1400 }, workerPrice: { from: 400, to: 600 }, daysPerUnit: { from: 0.2, to: 0.3 },
    roomCategoryIds: ['rc-kitchen'], autoAdd: true,
  }),
  mat('electricPoint', {
    categoryId: 'mc-electric', unit: 'point', basis: 'floorArea', factor: 0.5,
    materialPrice: { from: 350, to: 600 }, workerPrice: { from: 150, to: 250 }, daysPerUnit: { from: 0.08, to: 0.12 },
    roomCategoryIds: [], autoAdd: true,
  }),
  mat('cementPlaster', {
    categoryId: 'mc-plaster', unit: 'm2', basis: 'wallArea', factor: 1,
    materialPrice: { from: 90, to: 120 }, workerPrice: { from: 60, to: 80 }, daysPerUnit: { from: 0.015, to: 0.02 },
    roomCategoryIds: [], autoAdd: true,
  }),
  mat('waterproofing', {
    categoryId: 'mc-insulation', unit: 'm2', basis: 'floorArea', factor: 1.3,
    materialPrice: { from: 150, to: 250 }, workerPrice: { from: 50, to: 80 }, daysPerUnit: { from: 0.02, to: 0.03 },
    roomCategoryIds: ['rc-bathroom', 'rc-kitchen', 'rc-balcony'], autoAdd: true,
  }),
  mat('floorPorcelain', {
    categoryId: 'mc-tiles', unit: 'm2', basis: 'floorArea', factor: 1.1,
    materialPrice: { from: 350, to: 700 }, workerPrice: { from: 100, to: 150 }, daysPerUnit: { from: 0.04, to: 0.06 },
    roomCategoryIds: [], autoAdd: true,
  }),
  mat('wallCeramic', {
    categoryId: 'mc-tiles', unit: 'm2', basis: 'wallArea', factor: 1.1,
    materialPrice: { from: 250, to: 500 }, workerPrice: { from: 100, to: 150 }, daysPerUnit: { from: 0.05, to: 0.07 },
    roomCategoryIds: ['rc-bathroom', 'rc-kitchen'], autoAdd: true,
  }),
  mat('gypsumCeiling', {
    categoryId: 'mc-gypsum', unit: 'm2', basis: 'ceilingArea', factor: 1,
    materialPrice: { from: 250, to: 400 }, workerPrice: { from: 100, to: 150 }, daysPerUnit: { from: 0.03, to: 0.05 },
    roomCategoryIds: ['rc-living', 'rc-reception', 'rc-corridor'], autoAdd: true,
  }),
  mat('wallPaint', {
    categoryId: 'mc-paint', unit: 'm2', basis: 'wallArea', factor: 1,
    materialPrice: { from: 40, to: 80 }, workerPrice: { from: 40, to: 60 }, daysPerUnit: { from: 0.008, to: 0.012 },
    roomCategoryIds: ['rc-living', 'rc-reception', 'rc-bedroom', 'rc-corridor'], autoAdd: true,
  }),
  mat('ceilingPaint', {
    categoryId: 'mc-paint', unit: 'm2', basis: 'ceilingArea', factor: 1,
    materialPrice: { from: 30, to: 60 }, workerPrice: { from: 40, to: 60 }, daysPerUnit: { from: 0.01, to: 0.015 },
    roomCategoryIds: [], autoAdd: true,
  }),
  mat('interiorDoor', {
    categoryId: 'mc-doors', unit: 'piece', basis: 'perRoom', factor: 1,
    materialPrice: { from: 4000, to: 9000 }, workerPrice: { from: 300, to: 500 }, daysPerUnit: { from: 0.25, to: 0.5 },
    roomCategoryIds: ['rc-bedroom', 'rc-bathroom', 'rc-kitchen'], autoAdd: true,
  }),
];

const step = (key: string, cats: string[], parallelWithPrevious = false): StepTemplate => ({
  id: `st-${key}`,
  name: key,
  i18nKey: `seed.step.${key}`,
  materialCategoryIds: cats.map((c) => `mc-${c}`),
  parallelWithPrevious,
});

export const defaultStepTemplates = (): StepTemplate[] => [
  step('plumbing', ['plumbing']),
  step('electric', ['electric'], true),
  step('plaster', ['plaster']),
  step('insulation', ['insulation']),
  step('tiles', ['tiles']),
  step('gypsum', ['gypsum'], true),
  step('paint', ['paint']),
  step('doors', ['doors']),
];

export const defaultData = (): AppData => ({
  version: 1,
  settings: { lang: navigator.language?.startsWith('ar') ? 'ar' : 'en', currency: 'EGP', defaultHeight: 3 },
  roomCategories: defaultRoomCategories(),
  materialCategories: defaultMaterialCategories(),
  materials: defaultMaterials(),
  stepTemplates: defaultStepTemplates(),
  flats: [],
});
