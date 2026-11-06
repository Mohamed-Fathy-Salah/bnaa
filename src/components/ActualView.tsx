import { useState } from 'react';
import type { FlatEstimate } from '../estimate';
import { useStore } from '../store';
import type { Flat, MinMax, StepActual } from '../types';
import { daysBetween, mid } from '../utils';
import ReceiptScan from './ReceiptScan';
import { Field, NumInput } from './ui';

interface Row {
  key: string;
  label: string;
  est: MinMax;
  actual: number;
  money: boolean;
}

function CompareTable({ rows }: { rows: Row[] }) {
  const { t, num, money, moneyRange, numRange } = useStore();
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th />
            <th>{t('actual.estimated')}</th>
            <th>{t('actual.actual')}</th>
            <th>{t('actual.diff')}</th>
            <th>{t('actual.ratio')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const m = mid(r.est);
            const diff = r.actual - m;
            const status = r.actual > r.est.max ? 'over' : r.actual < r.est.min ? 'under' : 'within';
            const fmt = (n: number) => (r.money ? money(n) : num(n, 1));
            return (
              <tr key={r.key}>
                <th scope="row">{r.label}</th>
                <td>{r.money ? moneyRange(r.est) : numRange(r.est)}</td>
                <td>{fmt(r.actual)}</td>
                <td className={`diff ${status}`}>
                  {diff > 0 ? '+' : ''}
                  {fmt(diff)}
                  {m > 0 && ` (${diff > 0 ? '+' : ''}${num((diff / m) * 100, 0)}%)`}
                  <span className="small"> · {t(`actual.${status}`)}</span>
                </td>
                <td>{m > 0 ? num(r.actual / m, 2) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ActualView({ flat, est, setFlat }: { flat: Flat; est: FlatEstimate; setFlat: (fn: (f: Flat) => Flat) => void }) {
  const { data, t, label } = useStore();
  const [scanning, setScanning] = useState(false);
  const set = (patch: Partial<Flat>) => setFlat((f) => ({ ...f, ...patch }));
  const setStepActual = (stepId: string, patch: StepActual) =>
    setFlat((f) => ({ ...f, steps: f.steps.map((s) => (s.id === stepId ? { ...s, actual: { ...s.actual, ...patch } } : s)) }));

  const rows: Row[] = [];
  if (flat.actualStart && flat.actualEnd)
    rows.push({ key: 'time', label: t('actual.time'), est: est.days, actual: daysBetween(flat.actualStart, flat.actualEnd), money: false });
  if (flat.actualMaterialCost !== undefined)
    rows.push({ key: 'mat', label: t('estimate.material'), est: est.material, actual: flat.actualMaterialCost, money: true });
  if (flat.actualWorkerCost !== undefined)
    rows.push({ key: 'wrk', label: t('estimate.worker'), est: est.worker, actual: flat.actualWorkerCost, money: true });
  if (flat.actualMaterialCost !== undefined && flat.actualWorkerCost !== undefined)
    rows.push({ key: 'tot', label: t('estimate.total'), est: est.total, actual: flat.actualMaterialCost + flat.actualWorkerCost, money: true });

  const stepRows: Row[] = [];
  for (const s of flat.steps) {
    const e = est.steps.find((x) => x.stepId === s.id);
    if (!e || !s.actual) continue;
    const name = label(s);
    if (s.actual.days !== undefined) stepRows.push({ key: `${s.id}-d`, label: `${name} · ${t('actual.days')}`, est: e.days, actual: s.actual.days, money: false });
    if (s.actual.materialCost !== undefined)
      stepRows.push({ key: `${s.id}-m`, label: `${name} · ${t('estimate.material')}`, est: e.material, actual: s.actual.materialCost, money: true });
    if (s.actual.workerCost !== undefined)
      stepRows.push({ key: `${s.id}-w`, label: `${name} · ${t('estimate.worker')}`, est: e.worker, actual: s.actual.workerCost, money: true });
  }

  return (
    <div>
      <section className="card">
        <div className="card-head">
          <h2>{t('actual.title')}</h2>
          <button className="btn" onClick={() => setScanning(true)}>🧾 {t('receipt.scan')}</button>
        </div>
        <div className="form-grid">
          <Field label={t('actual.start')}>
            <input type="date" value={flat.actualStart ?? ''} onChange={(e) => set({ actualStart: e.target.value || undefined })} />
          </Field>
          <Field label={t('actual.end')} hint={t('actual.endHint')}>
            <input
              type="date"
              value={flat.actualEnd ?? ''}
              min={flat.actualStart}
              onChange={(e) => set({ actualEnd: e.target.value || undefined })}
            />
          </Field>
          <Field label={`${t('actual.materialCost')} (${data.settings.currency})`}>
            <NumInput value={flat.actualMaterialCost} onChange={(v) => set({ actualMaterialCost: v })} />
          </Field>
          <Field label={`${t('actual.workerCost')} (${data.settings.currency})`}>
            <NumInput value={flat.actualWorkerCost} onChange={(v) => set({ actualWorkerCost: v })} />
          </Field>
        </div>
      </section>

      <section className="card">
        <h2>{t('actual.compare')}</h2>
        {rows.length ? <CompareTable rows={rows} /> : <p className="muted">{t('actual.compareEmpty')}</p>}
        {stepRows.length > 0 && <CompareTable rows={stepRows} />}
        {(rows.length > 0 || stepRows.length > 0) && <p className="hint">{t('actual.calibrateHint')}</p>}
      </section>

      {flat.steps.length > 0 && (
        <section className="card">
          <h2>{t('actual.perStep')}</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('estimate.step')}</th>
                  <th>{t('actual.days')}</th>
                  <th>{t('estimate.material')}</th>
                  <th>{t('estimate.worker')}</th>
                </tr>
              </thead>
              <tbody>
                {flat.steps.map((s) => (
                  <tr key={s.id}>
                    <td>{label(s)}</td>
                    <td><NumInput className="narrow" value={s.actual?.days} onChange={(v) => setStepActual(s.id, { days: v })} /></td>
                    <td><NumInput className="narrow" value={s.actual?.materialCost} onChange={(v) => setStepActual(s.id, { materialCost: v })} /></td>
                    <td><NumInput className="narrow" value={s.actual?.workerCost} onChange={(v) => setStepActual(s.id, { workerCost: v })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {scanning && <ReceiptScan flat={flat} setFlat={setFlat} onClose={() => setScanning(false)} />}
    </div>
  );
}
