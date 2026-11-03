import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { registerPwa } from './pwa';
import { StoreProvider } from './store';
import './styles.css';

registerPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
