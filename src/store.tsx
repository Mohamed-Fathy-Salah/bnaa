import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { defaultData } from './defaults';
import { isTKey, translate, type TKey } from './i18n';
import type { AppData, MinMax, Named } from './types';

const STORAGE_KEY = 'bnaa:data:v1';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Validate and fill in missing fields of data coming from storage or an imported file.
 * Throws on data that is clearly not an export of this app.
 */
export function normalizeData(raw: unknown): AppData {
  if (!isObj(raw)) throw new Error('not a JSON object');
  const d = defaultData();
  for (const key of ['roomCategories', 'materialCategories', 'materials', 'stepTemplates', 'flats'] as const) {
    if (raw[key] !== undefined && !Array.isArray(raw[key])) throw new Error(`"${key}" must be a list`);
  }
  if (!Array.isArray(raw.flats) && !Array.isArray(raw.materials)) throw new Error('missing flats/materials');
  const settings = isObj(raw.settings) ? raw.settings : {};
  return {
    version: 1,
    settings: {
      lang: settings.lang === 'ar' || settings.lang === 'en' ? settings.lang : d.settings.lang,
      currency: typeof settings.currency === 'string' ? settings.currency : d.settings.currency,
      defaultHeight: typeof settings.defaultHeight === 'number' ? settings.defaultHeight : d.settings.defaultHeight,
    },
    roomCategories: (raw.roomCategories as AppData['roomCategories']) ?? d.roomCategories,
    materialCategories: (raw.materialCategories as AppData['materialCategories']) ?? d.materialCategories,
    materials: ((raw.materials as AppData['materials']) ?? d.materials).map((m) => ({
      ...m,
      roomCategoryIds: m.roomCategoryIds ?? [],
      autoAdd: m.autoAdd ?? true,
      factor: m.factor ?? 1,
      basis: m.basis ?? 'manual',
    })),
    stepTemplates: ((raw.stepTemplates as AppData['stepTemplates']) ?? d.stepTemplates).map((s) => ({
      ...s,
      materialCategoryIds: s.materialCategoryIds ?? [],
      parallelWithPrevious: Boolean(s.parallelWithPrevious),
    })),
    flats: ((raw.flats as AppData['flats']) ?? []).map((f) => ({
      ...f,
      address: f.address ?? '',
      notes: f.notes ?? '',
      rooms: f.rooms ?? [],
      createdAt: f.createdAt ?? new Date().toISOString(),
      steps: (f.steps ?? []).map((s) => ({
        ...s,
        roomIds: s.roomIds ?? 'all',
        dependsOn: s.dependsOn ?? [],
        materialCategoryIds: s.materialCategoryIds ?? [],
        materials: (s.materials ?? []).map((m) => ({ ...m, roomIds: m.roomIds ?? 'auto', overrides: m.overrides ?? {} })),
      })),
    })),
  };
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeData(JSON.parse(raw));
  } catch (e) {
    console.error('Failed to load saved data, starting fresh', e);
  }
  return defaultData();
}

type Updater = (draft: AppData) => AppData;

interface Store {
  data: AppData;
  update: (fn: Updater) => void;
  replace: (data: AppData) => void;
  storageError: boolean;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
  /** display name of a seeded or user item */
  label: (item: Named | undefined) => string;
  num: (n: number, digits?: number) => string;
  money: (n: number) => string;
  moneyRange: (r: MinMax) => string;
  numRange: (r: MinMax, digits?: number) => string;
  date: (iso: string) => string;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);
  const [storageError, setStorageError] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStorageError(false);
    } catch (e) {
      console.error(e);
      setStorageError(true);
    }
  }, [data]);

  const lang = data.settings.lang;
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const update = useCallback((fn: Updater) => setData((d) => fn(d)), []);
  const replace = useCallback((d: AppData) => setData(d), []);

  const store = useMemo<Store>(() => {
    const locale = lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US';
    const fmt = (digits: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits });
    const num = (n: number, digits = 2) => fmt(digits).format(n);
    const money = (n: number) => `${fmt(0).format(Math.round(n))} ${data.settings.currency}`.trim();
    const t = (key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
    return {
      data,
      update,
      replace,
      storageError,
      t,
      label: (item) => (!item ? '—' : item.i18nKey && isTKey(item.i18nKey) ? t(item.i18nKey) : item.name),
      num,
      money,
      moneyRange: (r) =>
        Math.round(r.min) === Math.round(r.max) ? money(r.min) : `${fmt(0).format(Math.round(r.min))} – ${money(r.max)}`,
      numRange: (r, digits = 1) =>
        num(r.min, digits) === num(r.max, digits) ? num(r.min, digits) : `${num(r.min, digits)} – ${num(r.max, digits)}`,
      date: (iso) => {
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(locale, { dateStyle: 'medium' });
      },
    };
  }, [data, lang, update, replace, storageError]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}

/** Rename helper: once the user edits a seeded name, it stops following the UI language. */
export const rename = <T extends Named>(item: T, name: string): T => ({ ...item, name, i18nKey: undefined });
