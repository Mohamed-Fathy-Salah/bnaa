export type ID = string;
export type Lang = 'en' | 'ar';

/** A "from – to" value. When `to` is empty it equals `from`. */
export interface Range {
  from: number;
  to?: number | null;
}

export interface MinMax {
  min: number;
  max: number;
}

/**
 * Built-in (seeded) items carry an `i18nKey` so their name follows the UI language.
 * Once the user renames one, the key is dropped and `name` is shown as typed.
 */
export interface Named {
  id: ID;
  name: string;
  i18nKey?: string;
}

export type Category = Named;

export const UNITS = ['m', 'm2', 'm3', 'piece', 'point', 'kg', 'ton', 'liter', 'bag'] as const;
export type Unit = (typeof UNITS)[number];

/** How a material's quantity is derived from a room's dimensions. */
export const BASES = ['floorArea', 'wallArea', 'ceilingArea', 'perimeter', 'volume', 'perRoom', 'manual'] as const;
export type QuantityBasis = (typeof BASES)[number];

export interface Material extends Named {
  categoryId: ID;
  unit: Unit;
  basis: QuantityBasis;
  /** quantity = basis(room) × factor (e.g. 1.1 for 10% waste, 6 points per bathroom) */
  factor: number;
  /** price of the material itself per unit */
  materialPrice: Range;
  /** workmanship price per unit */
  workerPrice: Range;
  /** days needed to finish one unit */
  daysPerUnit: Range;
  /** room categories this material applies to by default (empty = all) */
  roomCategoryIds: ID[];
  /** added automatically when its step is added to a flat */
  autoAdd: boolean;
}

export interface StepTemplate extends Named {
  materialCategoryIds: ID[];
  /** when added to a flat, may start together with the previous step */
  parallelWithPrevious: boolean;
}

export interface Room {
  id: ID;
  name: string;
  categoryId: ID;
  length: number;
  width: number;
  height: number;
}

export type RoomScope = 'all' | ID[];

/** 'auto' = rooms whose category matches the material's room categories */
export type MaterialRoomScope = RoomScope | 'auto';

export interface StepMaterial {
  id: ID;
  materialId: ID;
  roomIds: MaterialRoomScope;
  /** manual quantity per room, overrides the computed one */
  overrides: Record<ID, number>;
}

export interface StepActual {
  days?: number;
  materialCost?: number;
  workerCost?: number;
}

export interface FlatStep extends Named {
  templateId?: ID;
  materialCategoryIds: ID[];
  roomIds: RoomScope;
  materials: StepMaterial[];
  /** ids of steps that must finish before this one starts */
  dependsOn: ID[];
  actual?: StepActual;
}

export interface Flat {
  id: ID;
  name: string;
  address: string;
  notes: string;
  rooms: Room[];
  steps: FlatStep[];
  createdAt: string;
  /** ISO dates (yyyy-mm-dd) */
  actualStart?: string;
  actualEnd?: string;
  actualMaterialCost?: number;
  actualWorkerCost?: number;
}

export interface Settings {
  lang: Lang;
  currency: string;
  defaultHeight: number;
}

export interface AppData {
  version: 1;
  settings: Settings;
  roomCategories: Category[];
  materialCategories: Category[];
  materials: Material[];
  stepTemplates: StepTemplate[];
  flats: Flat[];
}
