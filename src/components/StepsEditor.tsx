import { useMemo, useState } from 'react';
import { computedQty, estimateFlat, inScope, lineCovers, wouldCycle, type StepEstimate } from '../estimate';
import { customStep, newLine, stepFromTemplate } from '../flatOps';
import { rename, useStore } from '../store';
import type { Flat, FlatStep, Material, MaterialRoomScope, RoomScope, StepMaterial } from '../types';
import { ChipSelect, Empty, moveItem, NumInput } from './ui';

type SetFlat = (fn: (f: Flat) => Flat) => void;

function RoomScopePicker({
  flat,
  value,
  onChange,
  allowAuto,
}: {
  flat: Flat;
  value: MaterialRoomScope;
  onChange: (v: MaterialRoomScope) => void;
  allowAuto?: boolean;
}) {
  const { t } = useStore();
  const mode = value === 'all' || value === 'auto' ? value : 'custom';
  return (
    <div className="scope-picker">
      <select
        value={mode}
        onChange={(e) => {
          const m = e.target.value;
          onChange(m === 'custom' ? flat.rooms.map((r) => r.id) : (m as 'all' | 'auto'));
        }}
      >
        {allowAuto && <option value="auto">{t('flatSteps.autoRooms')}</option>}
        <option value="all">{t('flatSteps.allRooms')}</option>
        <option value="custom">{t('flatSteps.rooms')}…</option>
      </select>
      {Array.isArray(value) && (
        <ChipSelect options={flat.rooms.map((r) => ({ id: r.id, name: r.name }))} selected={value} onChange={onChange} />
      )}
    </div>
  );
}

function MaterialLine({
  flat,
  step,
  line,
  material,
  options,
  onChange,
  onRemove,
}: {
  flat: Flat;
  step: FlatStep;
  line: StepMaterial;
  material: Material | undefined;
  options: Material[];
  onChange: (l: StepMaterial) => void;
  onRemove: () => void;
}) {
  const { t, label, num } = useStore();
  const [open, setOpen] = useState(false);
  const rooms = material ? flat.rooms.filter((r) => inScope(step.roomIds, r.id) && lineCovers(line.roomIds, material, r)) : [];
  const qtyOf = (roomId: string) => {
    const o = line.overrides[roomId];
    const r = flat.rooms.find((x) => x.id === roomId)!;
    return o ?? (material ? computedQty(material, r) : 0);
  };
  const total = rooms.reduce((a, r) => a + qtyOf(r.id), 0);
  const unit = material ? t(`unit.${material.unit}`) : '';
  const listed = material && !options.some((o) => o.id === material.id) ? [material, ...options] : options;

  return (
    <div className="line">
      <div className="line-head">
        <select value={line.materialId} onChange={(e) => onChange({ ...line, materialId: e.target.value, overrides: {} })} aria-label={t('materials.title')}>
          {!material && <option value={line.materialId}>—</option>}
          {listed.map((m) => <option key={m.id} value={m.id}>{label(m)}</option>)}
        </select>
        <button className="btn ghost small" onClick={() => setOpen(!open)} aria-expanded={open}>
          {num(total, 2)} {unit} {open ? '▴' : '▾'}
        </button>
        <button className="icon-btn danger" onClick={onRemove} aria-label={t('common.delete')}>✕</button>
      </div>
      <RoomScopePicker flat={flat} value={line.roomIds} allowAuto onChange={(v) => onChange({ ...line, roomIds: v })} />
      {open && (
        <table className="table compact">
          <caption className="sr-only">{t('flatSteps.quantities')}</caption>
          <thead>
            <tr>
              <th>{t('flatSteps.rooms')}</th>
              <th>{t('flatSteps.computed')}</th>
              <th>{t('flatSteps.override')}</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{material ? num(computedQty(material, r), 2) : '—'} {unit}</td>
                <td>
                  <NumInput
                    className="narrow"
                    value={line.overrides[r.id]}
                    placeholder="—"
                    onChange={(v) => {
                      const overrides = { ...line.overrides };
                      if (v === undefined) delete overrides[r.id];
                      else overrides[r.id] = v;
                      onChange({ ...line, overrides });
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StepCard({
  flat,
  step,
  index,
  est,
  setFlat,
}: {
  flat: Flat;
  step: FlatStep;
  index: number;
  est: StepEstimate | undefined;
  setFlat: SetFlat;
}) {
  const { data, t, label, moneyRange, numRange } = useStore();
  const [showAll, setShowAll] = useState(false);

  const setStep = (fn: (s: FlatStep) => FlatStep) =>
    setFlat((f) => ({ ...f, steps: f.steps.map((s) => (s.id === step.id ? fn(s) : s)) }));

  const remove = () => {
    if (!confirm(t('common.confirmDelete', { name: label(step) }))) return;
    // dependents inherit the removed step's dependencies so the chain stays intact
    setFlat((f) => ({
      ...f,
      steps: f.steps
        .filter((s) => s.id !== step.id)
        .map((s) =>
          s.dependsOn.includes(step.id)
            ? { ...s, dependsOn: [...new Set([...s.dependsOn.filter((d) => d !== step.id), ...step.dependsOn])] }
            : s,
        ),
    }));
  };

  const materialOptions = data.materials.filter((m) => showAll || step.materialCategoryIds.includes(m.categoryId));
  const others = flat.steps.filter((s) => s.id !== step.id);
  const materialsById = new Map(data.materials.map((m) => [m.id, m]));

  return (
    <details className="card step-card">
      <summary>
        <span className="order-num">{index + 1}</span>
        <span className="step-title">{label(step)}</span>
        {est && (
          <span className="muted small step-summary">
            {numRange(est.days)} {t('common.days')} · {moneyRange(est.total)}
          </span>
        )}
      </summary>
      <div className="step-body">
        <div className="row-inline">
          <input value={label(step)} aria-label={t('common.name')} onChange={(e) => setStep((s) => rename(s, e.target.value))} />
          <button className="icon-btn" disabled={index === 0} aria-label={t('common.moveUp')} onClick={() => setFlat((f) => ({ ...f, steps: moveItem(f.steps, index, -1) }))}>▲</button>
          <button className="icon-btn" disabled={index === flat.steps.length - 1} aria-label={t('common.moveDown')} onClick={() => setFlat((f) => ({ ...f, steps: moveItem(f.steps, index, 1) }))}>▼</button>
          <button className="btn ghost danger" onClick={remove}>{t('common.delete')}</button>
        </div>

        <div className="field">
          <span className="field-label">{t('flatSteps.rooms')}</span>
          {flat.rooms.length === 0 ? (
            <span className="muted small">{t('flatSteps.noRooms')}</span>
          ) : (
            <RoomScopePicker flat={flat} value={step.roomIds} onChange={(v) => setStep((s) => ({ ...s, roomIds: v as RoomScope }))} />
          )}
        </div>

        <div className="field">
          <span className="field-label">{t('flatSteps.startsAfter')}</span>
          {others.length === 0 ? (
            <span className="muted small">{t('flatSteps.atStart')}</span>
          ) : (
            <div className="chips">
              {others.map((o) => {
                const on = step.dependsOn.includes(o.id);
                const blocked = !on && wouldCycle(flat, step.id, o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    className={`chip ${on ? 'on' : ''}`}
                    aria-pressed={on}
                    disabled={blocked}
                    onClick={() =>
                      setStep((s) => ({ ...s, dependsOn: on ? s.dependsOn.filter((d) => d !== o.id) : [...s.dependsOn, o.id] }))
                    }
                  >
                    {label(o)}
                  </button>
                );
              })}
            </div>
          )}
          <span className="hint">{step.dependsOn.length === 0 ? t('flatSteps.atStart') + ' · ' : ''}{t('flatSteps.startsAfterHint')}</span>
        </div>

        <div className="field">
          <span className="field-label">{t('steps.materialCategories')}</span>
          <ChipSelect options={data.materialCategories} selected={step.materialCategoryIds} onChange={(ids) => setStep((s) => ({ ...s, materialCategoryIds: ids }))} />
        </div>

        <div className="field">
          <span className="field-label">{t('flatSteps.materials')}</span>
          {step.materials.length === 0 && <span className="muted small">{t('flatSteps.noMaterials')}</span>}
          {step.materials.map((line) => (
            <MaterialLine
              key={line.id}
              flat={flat}
              step={step}
              line={line}
              material={materialsById.get(line.materialId)}
              options={materialOptions}
              onChange={(l) => setStep((s) => ({ ...s, materials: s.materials.map((x) => (x.id === l.id ? l : x)) }))}
              onRemove={() => setStep((s) => ({ ...s, materials: s.materials.filter((x) => x.id !== line.id) }))}
            />
          ))}
          <div className="row-inline">
            <select
              value=""
              onChange={(e) => {
                const m = materialsById.get(e.target.value);
                if (m) setStep((s) => ({ ...s, materials: [...s.materials, newLine(m)] }));
              }}
            >
              <option value="">{t('flatSteps.addMaterial')}</option>
              {materialOptions.map((m) => <option key={m.id} value={m.id}>{label(m)}</option>)}
            </select>
            <label className="check small">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
              {t('flatSteps.showAllMaterials')}
            </label>
          </div>
        </div>
      </div>
    </details>
  );
}

export default function StepsEditor({ flat, setFlat }: { flat: Flat; setFlat: SetFlat }) {
  const { data, t, label } = useStore();
  const est = useMemo(() => estimateFlat(flat, data.materials), [flat, data.materials]);

  const addTemplates = (ids: string[]) =>
    setFlat((f) => {
      const steps = [...f.steps];
      for (const id of ids) {
        const tpl = data.stepTemplates.find((x) => x.id === id);
        if (tpl) steps.push(stepFromTemplate(tpl, data, steps[steps.length - 1]));
      }
      return { ...f, steps };
    });

  const missing = data.stepTemplates.filter((tpl) => !flat.steps.some((s) => s.templateId === tpl.id));

  return (
    <div>
      <div className="toolbar">
        {missing.length > 0 && (
          <button className="btn primary" onClick={() => addTemplates(missing.map((m) => m.id))}>
            + {t('flatSteps.addAll')}
          </button>
        )}
        <select
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (v === '__custom') setFlat((f) => ({ ...f, steps: [...f.steps, customStep(t('flatSteps.custom'), f.steps[f.steps.length - 1])] }));
            else if (v) addTemplates([v]);
          }}
        >
          <option value="">{t('flatSteps.addFromTemplate')}</option>
          {data.stepTemplates.map((s) => <option key={s.id} value={s.id}>{label(s)}</option>)}
          <option value="__custom">{t('flatSteps.custom')}</option>
        </select>
      </div>
      {flat.steps.length === 0 && <Empty>{t('flatSteps.empty')}</Empty>}
      {flat.steps.map((s, i) => (
        <StepCard key={s.id} flat={flat} step={s} index={i} est={est.steps.find((x) => x.stepId === s.id)} setFlat={setFlat} />
      ))}
    </div>
  );
}
