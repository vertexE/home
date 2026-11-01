import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { indexedDBStorage } from './db';
import { groupTodos, useTodos, type Todo } from './todos';

describe('todos', () => {
  it('groups dates earliest first without moving completed tasks or mutating input', () => {
    const items: Todo[] = [
      { id: 'late', dueDate: '2027-01-01', task: 'Later', completed: false },
      { id: 'done', dueDate: '2026-11-02', task: 'Done', completed: true },
      { id: 'early', dueDate: '2026-11-02', task: 'Earlier', completed: false },
    ];
    expect(groupTodos(items).map(([date, group]) => [date, group.map(item => item.id)])).toEqual([
      ['2026-11-02', ['done', 'early']], ['2027-01-01', ['late']],
    ]);
    expect(items[0].id).toBe('late');
  });

  it('persists additions, completion, edits, and deletion across hydration', async () => {
    const store = useTodos;
    await store.persist.rehydrate();
    store.getState().save({ id: 'test', dueDate: '2026-11-02', task: 'Original', completed: false });
    store.getState().toggle('test');
    store.getState().save({ ...store.getState().items[0], task: 'Edited', dueDate: '2026-11-03' });
    await indexedDBStorage.getItem('pocket-todos');
    // Clear memory without overwriting persisted state, then reload from IndexedDB.
    const saved = await indexedDBStorage.getItem('pocket-todos');
    store.setState({ items: [] });
    await indexedDBStorage.setItem('pocket-todos', saved!);
    await store.persist.rehydrate();
    expect(store.getState().items).toEqual([{ id: 'test', dueDate: '2026-11-03', task: 'Edited', completed: true }]);
    store.getState().remove('test');
    await indexedDBStorage.getItem('pocket-todos');
    await store.persist.rehydrate();
    expect(store.getState().items).toEqual([]);
  });
});
