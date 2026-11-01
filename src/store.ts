import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { indexedDBStorage } from './db';

type Settings = {
  setupDismissed: boolean;
  dismissSetup: () => void;
};

export const useSettings = create<Settings>()(persist((set) => ({
  setupDismissed: false,
  dismissSetup: () => set({ setupDismissed: true }),
}), {
  name: 'pocket-settings',
  skipHydration: true,
  storage: createJSONStorage(() => indexedDBStorage),
  partialize: ({ setupDismissed }) => ({ setupDismissed }),
  onRehydrateStorage: () => (_state, error) => {
    if (error) window.dispatchEvent(new Event('pocket-storage-error'));
  },
}));
