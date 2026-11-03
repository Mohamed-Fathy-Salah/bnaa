import { useSyncExternalStore } from 'react';

/** Chrome/Edge/Android only; other browsers install from their share/menu UI. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  /** a new version is downloaded and waiting */
  updateReady: boolean;
  canInstall: boolean;
}

let state: PwaState = { updateReady: false, canInstall: false };
let waiting: ServiceWorker | null = null;
let installEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

const set = (patch: Partial<PwaState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export function registerPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvent = e as BeforeInstallPromptEvent;
    set({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    set({ canInstall: false });
  });

  // All data lives only in this browser, so ask it not to evict storage under pressure.
  navigator.storage?.persist?.().catch(() => {});

  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      const offer = (sw: ServiceWorker | null) => {
        // without a current controller this is the first install, which activates on its own
        if (sw && navigator.serviceWorker.controller) {
          waiting = sw;
          set({ updateReady: true });
        }
      };
      offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        sw?.addEventListener('statechange', () => sw.state === 'installed' && offer(sw));
      });
      // long-lived tabs/installed apps: look for a new version when brought back to the foreground
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reg.update().catch(() => {}));
    } catch (e) {
      console.error('Service worker registration failed', e);
    }
  });
}

export const applyUpdate = () => waiting?.postMessage('SKIP_WAITING');

export async function promptInstall() {
  if (!installEvent) return;
  await installEvent.prompt();
  await installEvent.userChoice;
  installEvent = null;
  set({ canInstall: false });
}

export const usePwa = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
