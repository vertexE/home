import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { indexedDBStorage } from './db';

export type Todo = { id: string; dueDate: string; task: string; completed: boolean };
type Todos = {
  items: Todo[];
  save: (todo: Todo) => void;
  toggle: (id: string) => void;
  remove: (id: string) => void;
};

export const useTodos = create<Todos>()(persist((set) => ({
  items: [],
  save: (todo) => set(({ items }) => ({ items: items.some(item => item.id === todo.id) ? items.map(item => item.id === todo.id ? todo : item) : [...items, todo] })),
  toggle: (id) => set(({ items }) => ({ items: items.map(item => item.id === id ? { ...item, completed: !item.completed } : item) })),
  remove: (id) => set(({ items }) => ({ items: items.filter(item => item.id !== id) })),
}), {
  name: 'pocket-todos',
  skipHydration: true,
  storage: createJSONStorage(() => indexedDBStorage),
  partialize: ({ items }) => ({ items }),
}));

export function groupTodos(items: Todo[]) {
  const groups = new Map<string, Todo[]>();
  for (const item of [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate))) {
    groups.set(item.dueDate, [...(groups.get(item.dueDate) ?? []), item]);
  }
  return [...groups];
}
