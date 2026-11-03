import { useState } from 'react';
import { ChipSelect, Empty, Field, Modal, moveItem } from '../components/ui';
import { rename, useStore } from '../store';
import type { StepTemplate } from '../types';
import { uid } from '../utils';

function StepForm({ initial, onClose }: { initial: StepTemplate; onClose: () => void }) {
  const { data, update, t, label } = useStore();
  const [s, setS] = useState(initial);
  const [name, setName] = useState(label(initial));
  const isNew = !data.stepTemplates.some((x) => x.id === s.id);

  const save = () => {
    const final = name.trim() !== label(initial) ? rename(s, name.trim()) : s;
    update((d) => ({
      ...d,
      stepTemplates: isNew ? [...d.stepTemplates, final] : d.stepTemplates.map((x) => (x.id === final.id ? final : x)),
    }));
    onClose();
  };

  return (
    <Modal
      title={isNew ? t('steps.add') : t('steps.edit')}
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
        <div className="field span-2">
          <span className="field-label">{t('steps.materialCategories')}</span>
          <ChipSelect options={data.materialCategories} selected={s.materialCategoryIds} onChange={(ids) => setS({ ...s, materialCategoryIds: ids })} />
        </div>
        <label className="check span-2">
          <input type="checkbox" checked={s.parallelWithPrevious} onChange={(e) => setS({ ...s, parallelWithPrevious: e.target.checked })} />
          {t('steps.parallel')}
        </label>
      </div>
    </Modal>
  );
}

export default function StepsPage() {
  const { data, update, t, label } = useStore();
  const [editing, setEditing] = useState<StepTemplate | null>(null);
  const list = data.stepTemplates;

  const setList = (fn: (l: StepTemplate[]) => StepTemplate[]) => update((d) => ({ ...d, stepTemplates: fn(d.stepTemplates) }));

  return (
    <div className="page">
      <div className="page-head">
        <h1>{t('steps.title')}</h1>
        <button className="btn primary" onClick={() => setEditing({ id: uid(), name: '', materialCategoryIds: [], parallelWithPrevious: false })}>
          + {t('steps.add')}
        </button>
      </div>
      <p className="muted">{t('steps.subtitle')}</p>
      {list.length === 0 && <Empty>{t('steps.empty')}</Empty>}
      <ol className="step-list">
        {list.map((s, i) => (
          <li key={s.id} className="card item">
            <div className="order-btns">
              <button className="icon-btn" disabled={i === 0} aria-label={t('common.moveUp')} onClick={() => setList((l) => moveItem(l, i, -1))}>▲</button>
              <span className="order-num">{i + 1}</span>
              <button className="icon-btn" disabled={i === list.length - 1} aria-label={t('common.moveDown')} onClick={() => setList((l) => moveItem(l, i, 1))}>▼</button>
            </div>
            <div className="item-main">
              <strong>{label(s)}</strong>
              <div className="chips static">
                {s.materialCategoryIds.map((id) => (
                  <span key={id} className="chip on">{label(data.materialCategories.find((c) => c.id === id))}</span>
                ))}
              </div>
              {s.parallelWithPrevious && i > 0 && <span className="badge">⇉ {t('steps.parallelShort')}</span>}
            </div>
            <div className="item-actions">
              <button className="btn ghost" onClick={() => setEditing(s)}>{t('common.edit')}</button>
              <button
                className="btn ghost danger"
                onClick={() => confirm(t('common.confirmDelete', { name: label(s) })) && setList((l) => l.filter((x) => x.id !== s.id))}
              >
                {t('common.delete')}
              </button>
            </div>
          </li>
        ))}
      </ol>
      {editing && <StepForm initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
