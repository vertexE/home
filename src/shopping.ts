import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { indexedDBStorage } from './db';

export type Category = { id: string; name: string };
export type ShoppingItem = { item: string; categoryId: string; checked?: boolean };
export type ShoppingStore = { id: string; name: string; categories: Category[]; items?: ShoppingItem[] };
type Shopping = {
  stores: ShoppingStore[];
  saveStore: (store: ShoppingStore) => void;
  removeStore: (id: string) => void;
  replaceItems: (storeId: string, items: ShoppingItem[]) => void;
  toggleItem: (storeId: string, index: number) => void;
  saveCategory: (storeId: string, category: Category) => void;
  removeCategory: (storeId: string, id: string) => void;
  moveCategory: (storeId: string, id: string, targetId: string) => void;
};

export const useShopping = create<Shopping>()(persist((set) => ({
  stores: [],
  replaceItems: (storeId, items) => set(({ stores }) => ({ stores: stores.map(store => store.id === storeId ? { ...store, items: items.map(({ item, categoryId }) => ({ item, categoryId })) } : store) })),
  toggleItem: (storeId, index) => set(({ stores }) => ({ stores: stores.map(store => store.id === storeId ? { ...store, items: store.items?.map((item, itemIndex) => itemIndex === index ? { ...item, checked: !item.checked } : item) } : store) })),
  saveStore: (store) => set(({ stores }) => ({ stores: stores.some(item => item.id === store.id) ? stores.map(item => item.id === store.id ? store : item) : [...stores, store] })),
  removeStore: (id) => set(({ stores }) => ({ stores: stores.filter(store => store.id !== id) })),
  saveCategory: (storeId, category) => set(({ stores }) => ({ stores: stores.map(store => store.id !== storeId ? store : { ...store, categories: store.categories.some(item => item.id === category.id) ? store.categories.map(item => item.id === category.id ? category : item) : [...store.categories, category] }) })),
  removeCategory: (storeId, id) => set(({ stores }) => ({ stores: stores.map(store => store.id !== storeId ? store : { ...store, categories: store.categories.filter(item => item.id !== id) }) })),
  moveCategory: (storeId, id, targetId) => set(({ stores }) => ({ stores: stores.map(store => {
    if (store.id !== storeId || id === targetId) return store;
    const categories = [...store.categories];
    const from = categories.findIndex(item => item.id === id);
    const to = categories.findIndex(item => item.id === targetId);
    if (from < 0 || to < 0) return store;
    categories.splice(to, 0, categories.splice(from, 1)[0]);
    return { ...store, categories };
  }) })),
}), {
  name: 'pocket-shopping',
  skipHydration: true,
  storage: createJSONStorage(() => indexedDBStorage),
  partialize: ({ stores }) => ({ stores }),
}));
