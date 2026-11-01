import { useEffect, useState } from 'react';
import { useSettings } from './store';
import { TodoList } from './TodoList';

type StorageStatus = 'checking' | 'persistent' | 'best-effort' | 'unsupported' | 'error';
const storageLabels: Record<StorageStatus, string> = {
  checking: 'Checking storage…', persistent: 'Persistent storage enabled',
  'best-effort': 'Standard device storage', unsupported: 'Persistence request unavailable', error: 'Storage request failed',
};

function Icon({ kind }: { kind: 'todo' | 'bag' | 'pocket' }) {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {kind === 'todo' ? <><path d="m6 9 2 2 4-4M16 9h10M6 17l2 2 4-4M16 17h10M6 25l2 2 4-4M16 25h10" /></> : kind === 'bag' ? <><path d="M7 11h18l2 17H5l2-17Z" /><path d="M11 12V8a5 5 0 0 1 10 0v4" /></> : <><path d="M5 7h22v11a11 11 0 0 1-22 0V7Z" /><path d="m11 15 5 5 5-5" /></>}
  </svg>;
}

export function App() {
  const { setupDismissed, dismissSetup } = useSettings();
  const [hydrated, setHydrated] = useState(useSettings.persist.hasHydrated());
  const [storage, setStorage] = useState<StorageStatus>('checking');
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [todoOpen, setTodoOpen] = useState(window.location.hash === '#todos');
  useEffect(() => {
    const navigate = () => setTodoOpen(window.location.hash === '#todos');
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  async function requestStorage() {
    if (!navigator.storage?.persist) { setStorage('unsupported'); return; }
    try {
      const granted = await navigator.storage.persisted() || await navigator.storage.persist();
      setStorage(granted ? 'persistent' : 'best-effort');
    } catch { setStorage('error'); }
  }

  useEffect(() => {
    const unsubscribe = useSettings.persist.onFinishHydration(() => setHydrated(true));
    // Hydration can finish between render and effect registration.
    if (useSettings.persist.hasHydrated()) setHydrated(true);
    void requestStorage();
    const storageError = () => { setHydrated(true); setMessage('Device storage is unavailable. Changes may not survive closing this app.'); };
    const offlineError = () => setMessage('Offline setup failed. Reopen online to retry.');
    const network = () => setOnline(navigator.onLine);
    window.addEventListener('pocket-storage-error', storageError);
    window.addEventListener('pocket-offline-error', offlineError);
    window.addEventListener('online', network);
    window.addEventListener('offline', network);
    // A failed asynchronous hydration does not fire onFinishHydration.
    if (useSettings.persist.hasHydrated() === false) {
      void useSettings.persist.rehydrate();
    }
    return () => {
      unsubscribe();
      window.removeEventListener('pocket-storage-error', storageError);
      window.removeEventListener('pocket-offline-error', offlineError);
      window.removeEventListener('online', network);
      window.removeEventListener('offline', network);
    };
  }, []);

  async function enableNotifications() {
    if (ios && !installed) { setMessage('In Safari, tap Share → Add to Home Screen. Open Pocket from your Home Screen, then enable notifications.'); return; }
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) { setMessage('This browser does not support notifications.'); return; }
    setBusy(true);
    try {
      // Permission call must happen before awaiting any other work on iOS.
      const result = await Notification.requestPermission();
      setPermission(result);
      setMessage(result === 'granted' ? 'Notifications enabled. Try a test below.' : result === 'denied' ? 'Notifications blocked. Change permission in device settings to enable them.' : 'Notifications remain off. You can enable them later.');
    } catch { setMessage('Could not request notification permission. Try again from the installed app.'); }
    finally { setBusy(false); }
  }

  async function testNotification() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
      if (!registration?.active) throw new Error('Service worker not ready');
      await registration.showNotification('Hello from Pocket', { body: 'A little nudge, right when you need it.', icon: `${import.meta.env.BASE_URL}icon-192.png` });
      setMessage('Test notification sent.');
    } catch { setMessage('Notification could not be sent. Reopen online and check device notification settings.'); }
    finally { setBusy(false); }
  }

  function closeSetup() {
    // Persist failures must not become unhandled promise rejections.
    try {
      dismissSetup();
    } catch { setMessage('Could not save setup preference.'); }
    setSettingsOpen(false);
  }

  const showSetup = settingsOpen || (hydrated && !setupDismissed);
  return <main className="shell">
    <header className="topbar"><a className="brand" href="./" aria-label="Pocket home"><span className="brand-icon"><Icon kind="pocket" /></span>Pocket<span className="brand-dot">.</span></a><button className="settings" onClick={() => setSettingsOpen(!settingsOpen)} aria-expanded={showSetup} aria-controls="setup">Settings <span aria-hidden="true">↗</span></button></header>
    {todoOpen ? <TodoList /> : <><section className="intro"><p className="eyebrow">A LITTLE SPACE FOR EVERYDAY LIFE</p><h1>Less on your mind.<br /><span>More in your pocket.</span></h1><p className="intro-copy">Your lists, in one little place.<br className="mobile-break" /> Ready whenever you are.</p></section>
    <section className="lists" aria-labelledby="lists-title"><div className="section-heading"><h2 id="lists-title">Your everyday</h2><span>02 SPACES</span></div><div className="tiles">
      <a className="tile todo" href="#todos"><div className="tile-top"><span className="tile-icon"><Icon kind="todo" /></span><span className="pill">OPEN ↗</span></div><div><h3>TODO lists</h3><p>Make room for what matters.</p></div><span className="tile-number" aria-hidden="true">01</span></a>
      <article className="tile shopping"><div className="tile-top"><span className="tile-icon"><Icon kind="bag" /></span><span className="pill">COMING SOON</span></div><div><h3>Shopping</h3><p>A little list. One less thing to forget.</p></div><span className="tile-number" aria-hidden="true">02</span></article>
    </div></section></>}
    {showSetup && <section id="setup" className="setup" aria-labelledby="setup-title"><div className="setup-heading"><span className="spark" aria-hidden="true">✳</span><div><p className="eyebrow">MAKE YOURSELF AT HOME</p><h2 id="setup-title">A quick pocket check.</h2></div></div><p className="setup-copy">Keep your space on this device, and let Pocket send you a nudge.</p>
      {ios && !installed && <p className="install-tip">On iPhone: open in Safari, tap <strong>Share → Add to Home Screen</strong>, then launch Pocket from your Home Screen.</p>}
      <div className="setting-row"><div><h3>Device storage</h3><p>{storageLabels[storage]}</p><small>Browser decides persistence. Clearing app data still removes saved settings.</small></div><button className="small-button" onClick={() => void requestStorage()} disabled={storage === 'checking' || storage === 'persistent'}>{storage === 'persistent' ? 'Enabled ✓' : 'Request'}</button></div>
      <div className="setting-row"><div><h3>Notifications</h3><p>{permission === 'granted' ? 'Permission granted' : permission === 'denied' ? 'Blocked in device settings' : permission === 'unsupported' ? 'Unavailable in this browser' : 'Only with your permission'}</p><small>Background delivery needs a connected push sender.</small></div><button className="small-button" disabled={busy || permission === 'denied' || (permission === 'unsupported' && !ios)} onClick={() => void (permission === 'granted' ? testNotification() : enableNotifications())}>{busy ? 'Working…' : permission === 'granted' ? 'Send test' : 'Enable'}</button></div>
      <button className="done-button" onClick={closeSetup}>Make yourself at home <span aria-hidden="true">→</span></button>
    </section>}
    {message && <p className="message" role="status">{message}</p>}
    <footer><span><i className={online ? '' : 'offline'} />{online ? 'A little calmer. A little more together.' : 'Offline. Still in your pocket.'}</span><span>YOURS, ON THIS DEVICE</span></footer>
  </main>;
}
