import { useMemo, useState } from 'react';
import ActualView from '../components/ActualView';
import EstimateView from '../components/EstimateView';
import RoomsEditor from '../components/RoomsEditor';
import StepsEditor from '../components/StepsEditor';
import { Empty, Field, Tabs } from '../components/ui';
import { estimateFlat, isFinished } from '../estimate';
import { duplicateFlat } from '../flatOps';
import { navigate } from '../router';
import { useStore } from '../store';
import type { Flat } from '../types';

type Tab = 'info' | 'rooms' | 'steps' | 'estimate' | 'actual';

export default function FlatPage({ id, initialTab }: { id: string; initialTab?: string }) {
  const { data, update, t, moneyRange, numRange } = useStore();
  const flat = data.flats.find((f) => f.id === id);
  const [tab, setTab] = useState<Tab>((initialTab as Tab) || (flat && flat.rooms.length ? 'estimate' : 'rooms'));
  const est = useMemo(() => (flat ? estimateFlat(flat, data.materials) : null), [flat, data.materials]);

  if (!flat || !est) {
    return (
      <div className="page">
        <Empty>{t('flat.notFound')}</Empty>
        <a className="btn" href="#/flats">{t('common.back')}</a>
      </div>
    );
  }

  const setFlat = (fn: (f: Flat) => Flat) => update((d) => ({ ...d, flats: d.flats.map((x) => (x.id === id ? fn(x) : x)) }));

  return (
    <div className="page">
      <a className="back-link" href="#/flats"><span className="flip">←</span> {t('nav.flats')}</a>
      <div className="page-head">
        <h1>
          {flat.name}
          {isFinished(flat) && <span className="badge success">{t('flats.finished')}</span>}
        </h1>
        <div className="head-summary muted">
          {moneyRange(est.total)} · {numRange(est.days)} {t('common.days')}
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'info', label: t('flat.tab.info') },
          { id: 'rooms', label: `${t('flat.tab.rooms')} (${flat.rooms.length})` },
          { id: 'steps', label: `${t('flat.tab.steps')} (${flat.steps.length})` },
          { id: 'estimate', label: t('flat.tab.estimate') },
          { id: 'actual', label: t('flat.tab.actual') },
        ]}
      />

      {tab === 'info' && (
        <section className="card">
          <div className="form-grid">
            <Field label={t('common.name')}>
              <input value={flat.name} onChange={(e) => setFlat((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label={t('flat.address')}>
              <input value={flat.address} onChange={(e) => setFlat((f) => ({ ...f, address: e.target.value }))} />
            </Field>
            <label className="field span-2">
              <span className="field-label">{t('flat.notes')}</span>
              <textarea rows={4} value={flat.notes} onChange={(e) => setFlat((f) => ({ ...f, notes: e.target.value }))} />
            </label>
          </div>
          <div className="btn-row">
            <button
              className="btn"
              onClick={() => {
                const copy = duplicateFlat(flat, `${flat.name} (2)`);
                update((d) => ({ ...d, flats: [...d.flats, copy] }));
                navigate(`/flats/${copy.id}`);
              }}
            >
              {t('common.duplicate')}
            </button>
            <button
              className="btn danger"
              onClick={() => {
                if (!confirm(t('common.confirmDelete', { name: flat.name }))) return;
                navigate('/flats');
                update((d) => ({ ...d, flats: d.flats.filter((x) => x.id !== id) }));
              }}
            >
              {t('flat.delete')}
            </button>
          </div>
        </section>
      )}
      {tab === 'rooms' && <RoomsEditor flat={flat} setFlat={setFlat} />}
      {tab === 'steps' && <StepsEditor flat={flat} setFlat={setFlat} />}
      {tab === 'estimate' && <EstimateView flat={flat} est={est} />}
      {tab === 'actual' && <ActualView flat={flat} est={est} setFlat={setFlat} />}
    </div>
  );
}
