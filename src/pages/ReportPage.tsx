import { useMemo } from 'react';
import { Empty } from '../components/ui';
import { estimateFlat, type FlatEstimate } from '../estimate';
import { flatArea } from '../flatOps';
import { useStore } from '../store';
import type { Flat, ID, MinMax } from '../types';
import { add, zero } from '../utils';

const maxOf = (a: MinMax, b: MinMax): MinMax => ({ min: Math.max(a.min, b.min), max: Math.max(a.max, b.max) });

export default function ReportPage({ ids }: { ids: ID[] }) {
  const { data, t, label, num, moneyRange, numRange, date } = useStore();

  const items = useMemo(
    () =>
      ids
        .map((id) => data.flats.find((f) => f.id === id))
        .filter((f): f is Flat => Boolean(f))
        .map((flat) => ({ flat, est: estimateFlat(flat, data.materials) })),
    [ids, data],
  );

  const materials = new Map(data.materials.map((m) => [m.id, m]));

  // union of materials used across the selected flats, in library order
  const materialIds = useMemo(() => {
    const used = new Set(items.flatMap(({ est }) => est.materials.map((m) => m.materialId)));
    return data.materials.filter((m) => used.has(m.id)).map((m) => m.id);
  }, [items, data.materials]);

  // steps grouped by their display name so the same step lines up across flats
  const stepNames = useMemo(() => {
    const names: string[] = [];
    items.forEach(({ flat }) => flat.steps.forEach((s) => !names.includes(label(s)) && names.push(label(s))));
    return names;
  }, [items, label]);

  if (!items.length) {
    return (
      <div className="page">
        <Empty>{t('report.empty')}</Empty>
        <a className="btn" href="#/flats">{t('common.back')}</a>
      </div>
    );
  }

  const aggOf = (est: FlatEstimate, id: ID) => est.materials.find((m) => m.materialId === id);
  const sum = (fn: (e: FlatEstimate) => MinMax) => items.reduce((acc, { est }) => add(acc, fn(est)), zero());
  const stepDays = (flat: Flat, est: FlatEstimate, name: string) =>
    flat.steps.filter((s) => label(s) === name).reduce((acc, s) => add(acc, est.steps.find((x) => x.stepId === s.id)!.days), zero());
  const cell = (qty: number | undefined, unit: string, cost: MinMax | undefined) =>
    qty === undefined ? <span className="muted">—</span> : (
      <>
        <div>{num(qty, 2)} {unit}</div>
        <div className="small muted">{moneyRange(cost!)}</div>
      </>
    );

  return (
    <div className="page report">
      <div className="page-head no-print">
        <a className="back-link" href="#/flats"><span className="flip">←</span> {t('nav.flats')}</a>
        <div className="btn-row">
          <span className="muted small">{t('report.pdfHint')}</span>
          <button className="btn primary" onClick={() => window.print()}>⬇ {t('report.pdf')}</button>
        </div>
      </div>

      <header className="report-header">
        <h1>{t('report.title')} — {t('appName')}</h1>
        <p className="muted">{t('report.generated', { date: date(new Date().toISOString()) })}</p>
      </header>

      <section className="card">
        <h2>{t('report.summary')}</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('report.flats')}</th>
                <th>{t('rooms.floor')}</th>
                <th>{t('estimate.material')}</th>
                <th>{t('estimate.worker')}</th>
                <th>{t('estimate.total')}</th>
                <th>{t('estimate.duration')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ flat, est }) => (
                <tr key={flat.id}>
                  <th scope="row">{flat.name}</th>
                  <td>{num(flatArea(flat), 1)} {t('unit.m2')}</td>
                  <td>{moneyRange(est.material)}</td>
                  <td>{moneyRange(est.worker)}</td>
                  <td>{moneyRange(est.total)}</td>
                  <td>{numRange(est.days)} {t('common.days')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{t('common.total')}</th>
                <td>{num(items.reduce((a, { flat }) => a + flatArea(flat), 0), 1)} {t('unit.m2')}</td>
                <td>{moneyRange(sum((e) => e.material))}</td>
                <td>{moneyRange(sum((e) => e.worker))}</td>
                <td>{moneyRange(sum((e) => e.total))}</td>
                <td>{numRange(sum((e) => e.days))} {t('common.days')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>{t('report.materials')}</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('materials.title')}</th>
                {items.map(({ flat }) => <th key={flat.id}>{flat.name}</th>)}
                <th>{t('common.total')}</th>
              </tr>
            </thead>
            <tbody>
              {materialIds.map((mid) => {
                const m = materials.get(mid)!;
                const unit = t(`unit.${m.unit}`);
                const per = items.map(({ est }) => aggOf(est, mid));
                const qty = per.reduce((a, x) => a + (x?.qty ?? 0), 0);
                const cost = per.reduce((a, x) => (x ? add(a, x.material) : a), zero());
                return (
                  <tr key={mid}>
                    <th scope="row">{label(m)}</th>
                    {per.map((x, i) => <td key={items[i].flat.id}>{cell(x?.qty, unit, x?.material)}</td>)}
                    <td className="strong">{cell(qty, unit, cost)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{t('common.total')}</th>
                {items.map(({ flat, est }) => <td key={flat.id}>{moneyRange(est.material)}</td>)}
                <td>{moneyRange(sum((e) => e.material))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>{t('report.workers')}</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('materials.title')}</th>
                {items.map(({ flat }) => <th key={flat.id}>{flat.name}</th>)}
                <th>{t('common.total')}</th>
              </tr>
            </thead>
            <tbody>
              {materialIds.map((mid) => {
                const m = materials.get(mid)!;
                const per = items.map(({ est }) => aggOf(est, mid));
                const cost = per.reduce((a, x) => (x ? add(a, x.worker) : a), zero());
                const days = per.reduce((a, x) => (x ? add(a, x.days) : a), zero());
                const workCell = (c: MinMax | undefined, d: MinMax | undefined) =>
                  !c ? <span className="muted">—</span> : (
                    <>
                      <div>{moneyRange(c)}</div>
                      <div className="small muted">{numRange(d!)} {t('report.workerDays')}</div>
                    </>
                  );
                return (
                  <tr key={mid}>
                    <th scope="row">
                      {label(m)}
                      <div className="small muted">{num(per.reduce((a, x) => a + (x?.qty ?? 0), 0), 2)} {t(`unit.${m.unit}`)}</div>
                    </th>
                    {per.map((x, i) => <td key={items[i].flat.id}>{workCell(x?.worker, x?.days)}</td>)}
                    <td className="strong">{workCell(cost, days)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{t('common.total')}</th>
                {items.map(({ flat, est }) => <td key={flat.id}>{moneyRange(est.worker)}</td>)}
                <td>{moneyRange(sum((e) => e.worker))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>{t('report.time')} ({t('common.days')})</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('estimate.step')}</th>
                {items.map(({ flat }) => <th key={flat.id}>{flat.name}</th>)}
                <th>{t('common.total')}</th>
              </tr>
            </thead>
            <tbody>
              {stepNames.map((name) => {
                const per = items.map(({ flat, est }) => stepDays(flat, est, name));
                return (
                  <tr key={name}>
                    <th scope="row">{name}</th>
                    {per.map((d, i) => <td key={items[i].flat.id}>{numRange(d)}</td>)}
                    <td className="strong">{numRange(per.reduce(add, zero()))}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{t('estimate.duration')}</th>
                {items.map(({ flat, est }) => <td key={flat.id}>{numRange(est.days)}</td>)}
                <td />
              </tr>
              <tr>
                <th scope="row" colSpan={items.length + 1}>{t('report.overallSequential')}</th>
                <td>{numRange(sum((e) => e.days))}</td>
              </tr>
              <tr>
                <th scope="row" colSpan={items.length + 1}>{t('report.overallParallel')}</th>
                <td>{numRange(items.reduce((acc, { est }) => maxOf(acc, est.days), zero()))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
