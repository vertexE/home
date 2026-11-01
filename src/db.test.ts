import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { indexedDBStorage } from './db';
import { createStore } from 'zustand/vanilla';
import { createJSONStorage, persist } from 'zustand/middleware';

describe('IndexedDB settings persistence', () => {
  it('stores Zustand serialized state and reads it after commit', async () => {
    const state = JSON.stringify({ state: { setupDismissed: true }, version: 0 });
    await indexedDBStorage.setItem('settings-test', state);
    expect(await indexedDBStorage.getItem('settings-test')).toBe(state);
    await indexedDBStorage.removeItem('settings-test');
    expect(await indexedDBStorage.getItem('settings-test')).toBeNull();
  });

  it('rehydrates setup preference into a fresh Zustand store', async () => {
    const name = 'restart-test';
    const newStore = () => createStore(persist(() => ({ setupDismissed: false }), {
      name, skipHydration: true, storage: createJSONStorage(() => indexedDBStorage),
    }));
    const first = newStore();
    first.setState({ setupDismissed: true });
    // Read is queued after write transaction, so commit finishes before restart.
    await indexedDBStorage.getItem(name);
    const restarted = newStore();
    await restarted.persist.rehydrate();
    expect(restarted.getState().setupDismissed).toBe(true);
    await indexedDBStorage.removeItem(name);
  });
});
