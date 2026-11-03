import type { TKey } from './i18n';
import CategoriesPage from './pages/CategoriesPage';
import FlatPage from './pages/FlatPage';
import FlatsPage from './pages/FlatsPage';
import MaterialsPage from './pages/MaterialsPage';
import ReportPage from './pages/ReportPage';
import SettingsPage from './pages/SettingsPage';
import StepsPage from './pages/StepsPage';
import { applyUpdate, usePwa } from './pwa';
import { useRoute } from './router';
import { useStore } from './store';

const NAV: { path: string; key: TKey; icon: string }[] = [
  { path: 'flats', key: 'nav.flats', icon: '🏠' },
  { path: 'materials', key: 'nav.materials', icon: '🧱' },
  { path: 'steps', key: 'nav.steps', icon: '🪜' },
  { path: 'categories', key: 'nav.categories', icon: '🏷️' },
  { path: 'settings', key: 'nav.settings', icon: '⚙️' },
];

export default function App() {
  const { data, update, t, storageError } = useStore();
  const { path, query } = useRoute();
  const { updateReady } = usePwa();
  const section = path[0] ?? 'flats';

  let page;
  if (section === 'flats' && path[1]) page = <FlatPage key={path[1]} id={path[1]} initialTab={query.get('tab') ?? undefined} />;
  else if (section === 'materials') page = <MaterialsPage />;
  else if (section === 'steps') page = <StepsPage />;
  else if (section === 'categories') page = <CategoriesPage />;
  else if (section === 'settings') page = <SettingsPage />;
  else if (section === 'report') page = <ReportPage ids={(query.get('ids') ?? '').split(',').filter(Boolean)} />;
  else page = <FlatsPage />;

  const otherLang = data.settings.lang === 'ar' ? 'en' : 'ar';

  return (
    <div className="app">
      <header className="topbar no-print">
        <a href="#/flats" className="brand">
          <span className="brand-mark">🏗️</span>
          <span>
            <strong>{t('appName')}</strong>
            <small>{t('appTagline')}</small>
          </span>
        </a>
        <nav className="nav desktop-nav">
          {NAV.map((n) => (
            <a key={n.path} href={`#/${n.path}`} className={section === n.path ? 'active' : ''}>
              {t(n.key)}
            </a>
          ))}
        </nav>
        <button
          className="btn ghost lang-btn"
          onClick={() => update((d) => ({ ...d, settings: { ...d.settings, lang: otherLang } }))}
        >
          {otherLang === 'ar' ? 'العربية' : 'English'}
        </button>
      </header>
      {updateReady && (
        <div className="banner info no-print">
          <span>{t('pwa.updateReady')}</span>
          <button className="btn primary small" onClick={applyUpdate}>{t('pwa.reload')}</button>
        </div>
      )}
      {storageError && <div className="banner danger no-print">{t('settings.storageError')}</div>}
      <main className="main">{page}</main>
      <nav className="nav mobile-nav no-print">
        {NAV.map((n) => (
          <a key={n.path} href={`#/${n.path}`} className={section === n.path ? 'active' : ''}>
            <span aria-hidden>{n.icon}</span>
            <span>{t(n.key)}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
