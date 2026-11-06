import { useState } from 'react';
import { getApiKey, scanReceipt, ScanError, type CostKind, type ReceiptLine, type ReceiptResult } from '../receipt';
import { useStore } from '../store';
import type { Flat } from '../types';
import GeminiKey from './GeminiKey';
import { Modal, NumInput } from './ui';

interface Row extends ReceiptLine {
  include: boolean;
}

/**
 * Reads a receipt with Gemini and adds its amounts to the flat's actual costs:
 * each line to its step's actual cost, and optionally the sums to the flat totals.
 */
export default function ReceiptScan({ flat, setFlat, onClose }: { flat: Flat; setFlat: (fn: (f: Flat) => Flat) => void; onClose: () => void }) {
  const { data, t, label, money } = useStore();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<ReceiptResult | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [addToFlat, setAddToFlat] = useState(true);
  const [hasKey, setHasKey] = useState(() => Boolean(getApiKey()));

  const scan = async () => {
    setBusy(true);
    setError('');
    try {
      const steps = flat.steps.map((s) => ({
        id: s.id,
        name: label(s),
        materials: s.materials.map((m) => label(data.materials.find((x) => x.id === m.materialId))).filter((n) => n !== '—'),
      }));
      const r = await scanReceipt(files, steps, data.settings.currency);
      setReceipt(r);
      setRows(r.lines.map((l) => ({ ...l, include: true })));
    } catch (e) {
      console.error(e);
      const code = e instanceof ScanError ? e.code : 'other';
      setError(t(`receipt.error.${code}`, { error: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const included = rows.filter((r) => r.include);
  const sum = (kind: CostKind) => included.filter((r) => r.kind === kind).reduce((a, r) => a + r.total, 0);
  const linesTotal = included.reduce((a, r) => a + r.total, 0);
  const unassigned = included.filter((r) => !r.stepId).length;

  const apply = () => {
    setFlat((f) => {
      const steps = f.steps.map((s) => {
        const mine = included.filter((r) => r.stepId === s.id);
        if (!mine.length) return s;
        const add = (kind: CostKind, prev?: number) => {
          const v = mine.filter((r) => r.kind === kind).reduce((a, r) => a + r.total, 0);
          return v ? (prev ?? 0) + v : prev;
        };
        return { ...s, actual: { ...s.actual, materialCost: add('material', s.actual?.materialCost), workerCost: add('worker', s.actual?.workerCost) } };
      });
      if (!addToFlat) return { ...f, steps };
      const mat = sum('material');
      const wrk = sum('worker');
      return {
        ...f,
        steps,
        actualMaterialCost: mat ? (f.actualMaterialCost ?? 0) + mat : f.actualMaterialCost,
        actualWorkerCost: wrk ? (f.actualWorkerCost ?? 0) + wrk : f.actualWorkerCost,
      };
    });
    onClose();
  };

  const footer = receipt ? (
    <>
      <button className="btn" onClick={() => { setReceipt(null); setRows([]); }}>{t('receipt.rescan')}</button>
      <button className="btn primary" onClick={apply} disabled={!included.length || (!addToFlat && unassigned === included.length)}>
        {t('receipt.apply')}
      </button>
    </>
  ) : (
    <>
      <button className="btn" onClick={onClose}>{t('common.cancel')}</button>
      <button className="btn primary" onClick={scan} disabled={!hasKey || !files.length || busy}>
        {busy ? t('receipt.reading') : t('receipt.read')}
      </button>
    </>
  );

  return (
    <Modal title={t('receipt.title')} onClose={onClose} footer={footer}>
      {!receipt ? (
        <>
          {!hasKey ? (
            <section className="card">
              <p className="muted" style={{ marginTop: 0 }}>{t('receipt.noKey')}</p>
              <GeminiKey onChange={(k) => setHasKey(Boolean(k))} />
            </section>
          ) : (
            <p className="muted">{t('receipt.hint')}</p>
          )}
          <label className="field">
            <span className="field-label">{t('receipt.files')}</span>
            <input type="file" accept="image/*,application/pdf" multiple disabled={busy} onChange={(e) => setFiles([...(e.target.files ?? [])])} />
          </label>
          {busy && <p className="muted">{t('receipt.readingHint')}</p>}
          {error && <p className="error-text" role="alert">{error}</p>}
        </>
      ) : (
        <>
          <p className="muted">
            {[receipt.vendor, receipt.date].filter(Boolean).join(' · ')}
            {receipt.total > 0 && ` · ${t('receipt.printedTotal')}: ${money(receipt.total)}`}
          </p>
          <div className="table-wrap">
            <table className="table compact">
              <thead>
                <tr>
                  <th />
                  <th>{t('receipt.item')}</th>
                  <th>{t('receipt.amount')}</th>
                  <th>{t('receipt.kind')}</th>
                  <th>{t('estimate.step')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r.include ? '' : 'muted'}>
                    <td><input type="checkbox" checked={r.include} onChange={(e) => setRow(i, { include: e.target.checked })} aria-label={r.description} /></td>
                    <td>
                      {r.description}
                      {r.quantity > 0 && r.unitPrice > 0 && <div className="small muted">{r.quantity} × {money(r.unitPrice)}</div>}
                    </td>
                    <td><NumInput className="narrow" min={-Infinity} value={r.total} onChange={(v) => setRow(i, { total: v ?? 0 })} ariaLabel={t('receipt.amount')} /></td>
                    <td>
                      <select value={r.kind} onChange={(e) => setRow(i, { kind: e.target.value as CostKind })} aria-label={t('receipt.kind')}>
                        <option value="material">{t('estimate.material')}</option>
                        <option value="worker">{t('estimate.worker')}</option>
                      </select>
                    </td>
                    <td>
                      <select value={r.stepId} onChange={(e) => setRow(i, { stepId: e.target.value })} aria-label={t('estimate.step')}>
                        <option value="">{t('receipt.noStep')}</option>
                        {flat.steps.map((s) => <option key={s.id} value={s.id}>{label(s)}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td />
                  <th>{t('common.total')}</th>
                  <td colSpan={3}>
                    {money(linesTotal)}
                    <div className="small muted">{t('estimate.material')}: {money(sum('material'))} · {t('estimate.worker')}: {money(sum('worker'))}</div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {receipt.total > 0 && Math.abs(receipt.total - rows.reduce((a, r) => a + r.total, 0)) >= 1 && (
            <p className="hint warn-text">{t('receipt.mismatch', { lines: money(rows.reduce((a, r) => a + r.total, 0)), total: money(receipt.total) })}</p>
          )}
          <label className="check" style={{ marginTop: '0.75rem' }}>
            <input type="checkbox" checked={addToFlat} onChange={(e) => setAddToFlat(e.target.checked)} />
            {t('receipt.addToFlat')}
          </label>
          {!addToFlat && unassigned > 0 && <p className="hint warn-text">{t('receipt.unassigned', { n: unassigned })}</p>}
        </>
      )}
    </Modal>
  );
}
