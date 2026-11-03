import type { FlatEstimate } from '../estimate';
import { useStore } from '../store';
import type { Flat } from '../types';
import { Empty, Stat } from './ui';

export function Schedule({ flat, est }: { flat: Flat; est: FlatEstimate }) {
  const { t, label, numRange } = useStore();
  const span = Math.max(est.days.max, 1);
  const pct = (d: number) => `${(d / span) * 100}%`;
  return (
    <div className="gantt">
      {est.steps.map((s) => {
        const step = flat.steps.find((x) => x.id === s.stepId)!;
        return (
          <div key={s.stepId} className="gantt-row">
            <div className="gantt-label" title={label(step)}>{label(step)}</div>
            <div className="gantt-track">
              <div className="gantt-bar max" style={{ insetInlineStart: pct(s.start.min), width: pct(s.end.max - s.start.min) }} />
              <div className="gantt-bar" style={{ insetInlineStart: pct(s.start.min), width: pct(s.end.min - s.start.min) }} />
            </div>
            <div className="gantt-days small muted">{numRange(s.days)}</div>
          </div>
        );
      })}
      <div className="gantt-axis small muted">
        <span>0</span>
        <span>{numRange(est.days)} {t('common.days')}</span>
      </div>
    </div>
  );
}

export default function EstimateView({ flat, est }: { flat: Flat; est: FlatEstimate }) {
  const { data, t, label, num, moneyRange, numRange } = useStore();
  if (!flat.rooms.length || !flat.steps.length) return <Empty>{t('estimate.empty')}</Empty>;
  const materials = new Map(data.materials.map((m) => [m.id, m]));

  return (
    <div>
      <div className="stats">
        <Stat label={t('estimate.material')} value={moneyRange(est.material)} />
        <Stat label={t('estimate.worker')} value={moneyRange(est.worker)} />
        <Stat label={t('estimate.total')} value={moneyRange(est.total)} />
        <Stat
          label={t('estimate.duration')}
          value={`${numRange(est.days)} ${t('common.days')}`}
          sub={t('estimate.durationHint', { days: `${numRange(est.sequentialDays)} ${t('common.days')}` })}
        />
      </div>

      <section className="card">
        <h2>{t('estimate.schedule')}</h2>
        <Schedule flat={flat} est={est} />
      </section>

      <section className="card">
        <h2>{t('estimate.byStep')}</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('estimate.step')}</th>
                <th>{t('estimate.start')}</th>
                <th>{t('estimate.duration')}</th>
                <th>{t('estimate.material')}</th>
                <th>{t('estimate.worker')}</th>
                <th>{t('common.total')}</th>
              </tr>
            </thead>
            <tbody>
              {est.steps.map((s) => (
                <tr key={s.stepId}>
                  <td>{label(flat.steps.find((x) => x.id === s.stepId))}</td>
                  <td>{numRange(s.start)}</td>
                  <td>{numRange(s.days)}</td>
                  <td>{moneyRange(s.material)}</td>
                  <td>{moneyRange(s.worker)}</td>
                  <td>{moneyRange(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>{t('estimate.byMaterial')}</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('materials.title')}</th>
                <th>{t('estimate.qty')}</th>
                <th>{t('estimate.material')}</th>
                <th>{t('estimate.worker')}</th>
                <th>{t('report.workerDays')}</th>
              </tr>
            </thead>
            <tbody>
              {est.materials.map((a) => {
                const m = materials.get(a.materialId);
                return (
                  <tr key={a.materialId}>
                    <td>{label(m)}</td>
                    <td>{num(a.qty, 2)} {m ? t(`unit.${m.unit}`) : ''}</td>
                    <td>{moneyRange(a.material)}</td>
                    <td>{moneyRange(a.worker)}</td>
                    <td>{numRange(a.days)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
