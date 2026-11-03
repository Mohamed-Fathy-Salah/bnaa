import { useRef } from 'react';
import { Field, NumInput } from '../components/ui';
import { defaultData } from '../defaults';
import { promptInstall, usePwa } from '../pwa';
import { normalizeData, useStore } from '../store';
import type { Lang } from '../types';
import { downloadFile, todayISO } from '../utils';

export default function SettingsPage() {
  const { data, update, replace, t } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const { canInstall } = usePwa();
  const setSetting = <K extends keyof typeof data.settings>(k: K, v: (typeof data.settings)[K]) =>
    update((d) => ({ ...d, settings: { ...d.settings, [k]: v } }));

  const onImport = async (file: File) => {
    try {
      const parsed = normalizeData(JSON.parse(await file.text()));
      if (!confirm(t('settings.importConfirm'))) return;
      replace(parsed);
      alert(t('settings.importOk'));
    } catch (e) {
      alert(t('settings.importFail', { error: e instanceof Error ? e.message : String(e) }));
    }
  };

  return (
    <div className="page">
      <h1>{t('settings.title')}</h1>
      <section className="card">
        <div className="form-grid">
          <Field label={t('settings.language')}>
            <select value={data.settings.lang} onChange={(e) => setSetting('lang', e.target.value as Lang)}>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </Field>
          <Field label={t('settings.currency')}>
            <input value={data.settings.currency} onChange={(e) => setSetting('currency', e.target.value)} />
          </Field>
          <Field label={t('settings.defaultHeight')}>
            <NumInput value={data.settings.defaultHeight} onChange={(v) => setSetting('defaultHeight', v ?? 3)} />
          </Field>
        </div>
      </section>

      <section className="card">
        <h2>{t('pwa.title')}</h2>
        <p className="muted">{t('pwa.hint')}</p>
        {canInstall && <button className="btn primary" onClick={promptInstall}>⤓ {t('pwa.install')}</button>}
      </section>

      <section className="card">
        <h2>{t('settings.data')}</h2>
        <p className="muted">{t('settings.dataHint')}</p>
        <div className="btn-row">
          <button className="btn primary" onClick={() => downloadFile(`bnaa-backup-${todayISO()}.json`, JSON.stringify(data, null, 2))}>
            ⬇ {t('settings.export')}
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>⬆ {t('settings.import')}</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = '';
            }}
          />
          <button
            className="btn danger"
            onClick={() => confirm(t('settings.resetConfirm')) && replace({ ...defaultData(), settings: data.settings })}
          >
            {t('settings.reset')}
          </button>
        </div>
      </section>
    </div>
  );
}
