import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { indexedDBStorage } from './db';
import { useShopping } from './shopping';

it('keeps custom store layouts isolated and persists edits, order, and removals', async () => {
  const store = useShopping;
  await store.persist.rehydrate();
  store.getState().saveStore({ id: 'whole-foods', name: 'Whole Foods', categories: [] });
  store.getState().saveStore({ id: 'other', name: 'Other', categories: [] });
  for (const name of ['Produce', 'Cheese', 'Coffee']) {
    store.getState().saveCategory('whole-foods', { id: name, name });
  }
  store.getState().moveCategory('whole-foods', 'Coffee', 'Produce');
  store.getState().saveCategory('whole-foods', { id: 'Cheese', name: 'Dairy' });
  store.getState().removeCategory('whole-foods', 'Produce');
  store.getState().moveCategory('whole-foods', 'missing', 'Coffee');
  const saved = await indexedDBStorage.getItem('pocket-shopping');
  store.setState({ stores: [] });
  await indexedDBStorage.setItem('pocket-shopping', saved!);
  await store.persist.rehydrate();
  expect(store.getState().stores).toEqual([
    { id: 'whole-foods', name: 'Whole Foods', categories: [{ id: 'Coffee', name: 'Coffee' }, { id: 'Cheese', name: 'Dairy' }] },
    { id: 'other', name: 'Other', categories: [] },
  ]);
  store.getState().moveCategory('whole-foods', 'Coffee', 'Cheese');
  expect(store.getState().stores[0].categories.map(item => item.id)).toEqual(['Cheese', 'Coffee']);
  store.getState().removeStore('whole-foods');
  await indexedDBStorage.getItem('pocket-shopping');
  await store.persist.rehydrate();
  expect(store.getState().stores.map(item => item.id)).toEqual(['other']);
});
