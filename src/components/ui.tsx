import { useEffect, useState, type ReactNode } from 'react';
import { useStore } from '../store';
import type { ID, Named, Range } from '../types';

const toStr = (v: number | null | undefined) => (v === undefined || v === null || Number.isNaN(v) ? '' : String(v));

/**
 * Number input that keeps the raw text while typing (so "1." or "" don't get clobbered)
 * and reports `undefined` when empty.
 */
export function NumInput({
  value,
  onChange,
  placeholder,
  min = 0,
  step = 'any',
  ariaLabel,
  className,
}: {
  value: number | null | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  min?: number;
  step?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [text, setText] = useState(toStr(value));
  useEffect(() => {
    if (Number(text) !== value && !(text === '' && (value === undefined || value === null))) setText(toStr(value));
  }, [value]);
  return (
    <input
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={className}
      onChange={(e) => {
        setText(e.target.value);
        const n = e.target.value === '' ? undefined : Number(e.target.value);
        if (n === undefined || !Number.isNaN(n)) onChange(n);
      }}
    />
  );
}

export function RangeInput({ value, onChange, label }: { value: Range; onChange: (r: Range) => void; label: string }) {
  const { t } = useStore();
  return (
    <fieldset className="field range-field">
      <legend>{label}</legend>
      <div className="range-inputs">
        <NumInput ariaLabel={`${label} ${t('common.from')}`} placeholder={t('common.from')} value={value.from} onChange={(v) => onChange({ ...value, from: v ?? 0 })} />
        <span aria-hidden>–</span>
        <NumInput ariaLabel={`${label} ${t('common.to')}`} placeholder={`${t('common.to')} (= ${value.from || 0})`} value={value.to} onChange={(v) => onChange({ ...value, to: v ?? null })} />
      </div>
    </fieldset>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const { t } = useStore();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>✕</button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}

/** Multi-select rendered as toggle chips. */
export function ChipSelect({
  options,
  selected,
  onChange,
}: {
  options: Named[];
  selected: ID[];
  onChange: (ids: ID[]) => void;
}) {
  const { label } = useStore();
  return (
    <div className="chips">
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <button
            type="button"
            key={o.id}
            className={`chip ${on ? 'on' : ''}`}
            aria-pressed={on}
            onClick={() => onChange(on ? selected.filter((x) => x !== o.id) : [...selected, o.id])}
          >
            {label(o)}
          </button>
        );
      })}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab.id} role="tab" aria-selected={tab.id === value} className={`tab ${tab.id === value ? 'active' : ''}`} onClick={() => onChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export const moveItem = <T,>(list: T[], index: number, dir: -1 | 1): T[] => {
  const j = index + dir;
  if (j < 0 || j >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[j]] = [copy[j], copy[index]];
  return copy;
};
