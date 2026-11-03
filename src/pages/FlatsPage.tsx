import { useMemo, useState } from 'react';
import { Empty, Field, Modal, Tabs } from '../components/ui';
import { estimateFlat, isFinished } from '../estimate';
import { flatArea, newFlat } from '../flatOps';
import { navigate } from '../router';
import { useStore } from '../store';
import type { ID } from '../types';

export default function FlatsPage() {
  const { data, update, t, num, moneyRange, numRange, date } = useStore();
  const [tab, setTab] = useState<'active' | 'finished'>('active');
  const [selected, setSelected] = useState<ID[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const flats = useMemo(
    () =>
      data.flats
        .filter((f) => isFinished(f) === (tab === 'finished'))
        .map((f) => ({ flat: f, est: estimateFlat(f, data.materials) }))
        .sort((a, b) => b.flat.createdAt.localeCompare(a.flat.createdAt)),
    [data, tab],
  );

  const toggle = (id: ID) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allSelected = flats.length > 0 && flats.every(({ flat }) => selected.includes(flat.id));

  const create = () => {
    const f = newFlat(name.trim());
    update((d) => ({ ...d, flats: [...d.flats, f] }));
    setCreating(false);
    setName('');
    navigate(`/flats/${f.id}`);
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>{t('flats.title')}</h1>
        <button className="btn primary" onClick={() => setCreating(true)}>+ {t('flats.new')}</button>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'active', label: `${t('flats.active')} (${data.flats.filter((f) => !isFinished(f)).length})` },
          { id: 'finished', label: `${t('flats.finished')} (${data.flats.filter(isFinished).length})` },
        ]}
      />

      {flats.length > 0 && (
        <div className="toolbar sticky-actions">
          <label className="check">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => {
                const visible = flats.map(({ flat }) => flat.id);
                setSelected((s) => (allSelected ? s.filter((id) => !visible.includes(id)) : [...new Set([...s, ...visible])]));
              }}
            />
            {t('common.selectAll')}
          </label>
          <button className="btn primary" disabled={!selected.length} onClick={() => navigate(`/report?ids=${selected.join(',')}`)}>
            📄 {t('flats.report', { count: selected.length })}
          </button>
        </div>
      )}

      {flats.length === 0 && <Empty>{t('flats.empty')}</Empty>}
      <div className="flat-grid">
        {flats.map(({ flat, est }) => (
          <article key={flat.id} className={`card flat-card ${selected.includes(flat.id) ? 'selected' : ''}`}>
            <label className="flat-check" onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" checked={selected.includes(flat.id)} onChange={() => toggle(flat.id)} aria-label={flat.name} />
            </label>
            <a href={`#/flats/${flat.id}`} className="flat-link">
              <h3>{flat.name}</h3>
              {flat.address && <div className="muted small">{flat.address}</div>}
              <div className="muted small">
                {t('flats.rooms', { count: flat.rooms.length })} · {t('flats.area', { area: num(flatArea(flat), 1) })}
              </div>
              <dl className="item-facts">
                <div><dt>{t('estimate.total')}</dt><dd>{moneyRange(est.total)}</dd></div>
                <div><dt>{t('estimate.duration')}</dt><dd>{numRange(est.days)} {t('common.days')}</dd></div>
              </dl>
              <div className="muted small">
                {flat.actualEnd
                  ? t('flats.finishedOn', { date: date(flat.actualEnd) })
                  : flat.actualStart && t('flats.startedOn', { date: date(flat.actualStart) })}
              </div>
            </a>
          </article>
        ))}
      </div>

      {creating && (
        <Modal
          title={t('flats.new')}
          onClose={() => setCreating(false)}
          footer={
            <>
              <button className="btn" onClick={() => setCreating(false)}>{t('common.cancel')}</button>
              <button className="btn primary" disabled={!name.trim()} onClick={create}>{t('common.save')}</button>
            </>
          }
        >
          <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) create(); }}>
            <Field label={t('common.name')}>
              <input autoFocus value={name} placeholder={t('flats.namePlaceholder')} onChange={(e) => setName(e.target.value)} />
            </Field>
          </form>
        </Modal>
      )}
    </div>
  );
}
