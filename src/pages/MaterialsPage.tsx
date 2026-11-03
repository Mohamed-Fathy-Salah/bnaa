import { useMemo, useState } from 'react';
import { ChipSelect, Empty, Field, Modal, NumInput, RangeInput } from '../components/ui';
import { rename, useStore } from '../store';
import { BASES, UNITS, type Material } from '../types';
import { rangeOf, uid } from '../utils';

const blank = (categoryId: string): Material => ({
  id: uid(),
  name: '',
  categoryId,
  unit: 'm2',
  basis: 'floorArea',
  factor: 1,
  materialPrice: { from: 0 },
  workerPrice: { from: 0 },
  daysPerUnit: { from: 0 },
  roomCategoryIds: [],
  autoAdd: true,
});

function MaterialForm({ initial, onClose }: { initial: Material; onClose: () => void }) {
  const { data, update, t, label } = useStore();
  const [m, setM] = useState<Material>(initial);
  const [name, setName] = useState(label(initial));
  const isNew = !data.materials.some((x) => x.id === m.id);

  const save = () => {
    const nameChanged = name.trim() !== label(initial);
    const final = nameChanged ? rename(m, name.trim()) : m;
    update((d) => ({
      ...d,
      materials: isNew ? [...d.materials, final] : d.materials.map((x) => (x.id === final.id ? final : x)),
    }));
    onClose();
  };

  return (
    <Modal
      title={isNew ? t('materials.add') : t('materials.edit')}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn primary" onClick={save} disabled={!name.trim()}>{t('common.save')}</button>
        </>
      }
    >
      <div className="form-grid">
        <Field label={t('common.name')}>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t('common.category')}>
          <select value={m.categoryId} onChange={(e) => setM({ ...m, categoryId: e.target.value })}>
            {data.materialCategories.map((c) => <option key={c.id} value={c.id}>{label(c)}</option>)}
          </select>
        </Field>
        <Field label={t('materials.unit')}>
          <select value={m.unit} onChange={(e) => setM({ ...m, unit: e.target.value as Material['unit'] })}>
            {UNITS.map((u) => <option key={u} value={u}>{t(`unit.${u}`)}</option>)}
          </select>
        </Field>
        <Field label={t('materials.basis')}>
          <select value={m.basis} onChange={(e) => setM({ ...m, basis: e.target.value as Material['basis'] })}>
            {BASES.map((b) => <option key={b} value={b}>{t(`basis.${b}`)}</option>)}
          </select>
        </Field>
        {m.basis !== 'manual' && (
          <Field label={t('materials.factor')} hint={t('materials.factorHint')}>
            <NumInput value={m.factor} onChange={(v) => setM({ ...m, factor: v ?? 0 })} />
          </Field>
        )}
        <RangeInput label={`${t('materials.materialPrice')} (${data.settings.currency})`} value={m.materialPrice} onChange={(r) => setM({ ...m, materialPrice: r })} />
        <RangeInput label={`${t('materials.workerPrice')} (${data.settings.currency})`} value={m.workerPrice} onChange={(r) => setM({ ...m, workerPrice: r })} />
        <RangeInput label={t('materials.daysPerUnit')} value={m.daysPerUnit} onChange={(r) => setM({ ...m, daysPerUnit: r })} />
        <div className="field span-2">
          <span className="field-label">{t('materials.rooms')}</span>
          <ChipSelect options={data.roomCategories} selected={m.roomCategoryIds} onChange={(ids) => setM({ ...m, roomCategoryIds: ids })} />
          <span className="hint">{t('materials.roomsHint')}</span>
        </div>
        <label className="check span-2">
          <input type="checkbox" checked={m.autoAdd} onChange={(e) => setM({ ...m, autoAdd: e.target.checked })} />
          {t('materials.autoAdd')}
        </label>
      </div>
    </Modal>
  );
}

export default function MaterialsPage() {
  const { data, update, t, label, numRange, moneyRange } = useStore();
  const [editing, setEditing] = useState<Material | null>(null);
  const [filter, setFilter] = useState('');
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = data.materials.filter(
      (m) => (!filter || m.categoryId === filter) && (!q || label(m).toLowerCase().includes(q)),
    );
    const cats = [...data.materialCategories, { id: '', name: t('common.uncategorized') }];
    return cats
      .map((c) => ({
        cat: c,
        items: visible.filter((m) => (c.id ? m.categoryId === c.id : !data.materialCategories.some((x) => x.id === m.categoryId))),
      }))
      .filter((g) => g.items.length);
  }, [data, filter, query, label, t]);

  const remove = (m: Material) => {
    const used = data.flats.reduce((n, f) => n + f.steps.filter((s) => s.materials.some((x) => x.materialId === m.id)).length, 0);
    const msg = used ? t('materials.inUse', { count: used }) : t('common.confirmDelete', { name: label(m) });
    if (confirm(msg)) update((d) => ({ ...d, materials: d.materials.filter((x) => x.id !== m.id) }));
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>{t('materials.title')}</h1>
        <button className="btn primary" onClick={() => setEditing(blank(filter || data.materialCategories[0]?.id || ''))}>
          + {t('materials.add')}
        </button>
      </div>
      <p className="muted">{t('materials.sampleNote')}</p>
      <div className="toolbar">
        <input type="search" placeholder={t('common.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label={t('common.category')}>
          <option value="">{t('common.all')}</option>
          {data.materialCategories.map((c) => <option key={c.id} value={c.id}>{label(c)}</option>)}
        </select>
      </div>

      {groups.length === 0 && <Empty>{t('materials.empty')}</Empty>}
      {groups.map(({ cat, items }) => (
        <section key={cat.id} className="card">
          <h2>{label(cat)}</h2>
          <div className="item-list">
            {items.map((m) => (
              <article key={m.id} className="item">
                <div className="item-main">
                  <strong>{label(m)}</strong>
                  <span className="muted small">
                    {t(`basis.${m.basis}`)}
                    {m.basis !== 'manual' && ` × ${m.factor}`} · {t(`unit.${m.unit}`)}
                    {m.roomCategoryIds.length > 0 && ` · ${m.roomCategoryIds.map((id) => label(data.roomCategories.find((c) => c.id === id))).join(', ')}`}
                  </span>
                </div>
                <dl className="item-facts">
                  <div><dt>{t('estimate.material')}</dt><dd>{moneyRange(rangeOf(m.materialPrice))}</dd></div>
                  <div><dt>{t('estimate.worker')}</dt><dd>{moneyRange(rangeOf(m.workerPrice))}</dd></div>
                  <div><dt>{t('materials.daysPerUnit')}</dt><dd>{numRange(rangeOf(m.daysPerUnit), 3)}</dd></div>
                </dl>
                <div className="item-actions">
                  <button className="btn ghost" onClick={() => setEditing(m)}>{t('common.edit')}</button>
                  <button className="btn ghost danger" onClick={() => remove(m)}>{t('common.delete')}</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
      {editing && <MaterialForm initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
