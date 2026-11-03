import type { MinMax, Range } from './types';

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

/** Resolve a range, treating an empty `to` as equal to `from`. */
export const rangeOf = (r: Range): MinMax => {
  const from = Number(r.from) || 0;
  const to = r.to === undefined || r.to === null || Number.isNaN(r.to) ? from : Number(r.to);
  return { min: Math.min(from, to), max: Math.max(from, to) };
};

export const zero = (): MinMax => ({ min: 0, max: 0 });
export const add = (a: MinMax, b: MinMax): MinMax => ({ min: a.min + b.min, max: a.max + b.max });
export const scale = (a: MinMax, k: number): MinMax => ({ min: a.min * k, max: a.max * k });
export const mid = (a: MinMax): number => (a.min + a.max) / 2;

/** Whole calendar days between two ISO dates, counting both ends. */
export const daysBetween = (start: string, end: string): number => {
  const ms = Date.parse(end) - Date.parse(start);
  if (Number.isNaN(ms)) return 0;
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
};

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const downloadFile = (filename: string, content: string, type = 'application/json') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
