import { useEffect, useRef, useState } from 'react';
import { TodoDrawer } from './TodoDrawer';
import { useShopping } from './shopping';
import { parseShoppingList, shoppingInstructions } from './shoppingImport';

type Editing = { id: string; name: string; kind: 'store' | 'category'; existing: boolean };

export function Shopping({ storeId }: { storeId?: string }) {
  const { stores, saveStore, removeStore, saveCategory, removeCategory, moveCategory, replaceItems, toggleItem } = useShopping();
  const store = stores.find(item => item.id === storeId);
  const shoppingItems = (store?.items ?? []).map((item, index) => ({ ...item, index }));
  const [ready, setReady] = useState(useShopping.persist.hasHydrated());
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [clipboardMessage, setClipboardMessage] = useState('');
  const [clipboardError, setClipboardError] = useState(false);
  const [clipboardBusy, setClipboardBusy] = useState(false);
  const drag = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void useShopping.persist.rehydrate()?.then(() => {
      if (!active) return;
      if (useShopping.persist.hasHydrated()) setReady(true);
      else setError(true);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);

  function add() {
    setEditing({ id: crypto.randomUUID(), name: '', kind: store ? 'category' : 'store', existing: false });
  }

  async function clipboardAction(action: 'upload' | 'instructions') {
    if (!store) return;
    setClipboardMessage('');
    setClipboardError(false);
    setClipboardBusy(true);
    try {
      if (action === 'instructions') {
        await navigator.clipboard.writeText(shoppingInstructions(store));
        setClipboardMessage('Instructions copied. Paste them into your LLM and add your shopping list.');
      } else {
        let text: string;
        try { text = await navigator.clipboard.readText(); }
        catch { throw new Error('Could not read clipboard. Allow clipboard access in your browser, then try again.'); }
        const current = useShopping.getState().stores.find(item => item.id === store.id);
        if (!current) return;
        const items = parseShoppingList(text, current.categories);
        replaceItems(store.id, items);
        setClipboardMessage(`Uploaded ${items.length} ${items.length === 1 ? 'item' : 'items'}.`);
      }
    } catch (error) {
      setClipboardError(true);
      setClipboardMessage(error instanceof Error ? error.message : 'Clipboard access failed. Check browser clipboard permissions and try again.');
    } finally { setClipboardBusy(false); }
  }

  return <section className="todo-page shopping-page" aria-labelledby="screen-title">
    <div className="todo-heading"><div><p className="eyebrow">{store ? 'YOUR SHOPPING STOP' : 'YOUR REGULAR STOPS'}</p><p className="intro-copy">{store ? 'Your current list and store layout, in one place.' : 'Your stores, with a layout for each stop.'}</p></div><div className="shopping-store-actions">{store ? <button className="shopping-edit" onClick={() => setEditing({ id: store.id, name: store.name, kind: 'store', existing: true })}>Edit store</button> : <button className="todo-add" aria-label="Add store" disabled={!ready || Boolean(storeId)} onClick={add}>+</button>}</div></div>
    {error ? <p role="alert" className="message">Could not load stores. Reload to retry.</p> : !ready ? <p className="todo-empty" role="status">Loading your stores…</p> : storeId && !store ? <p className="todo-empty">Store not found. <a href="#shopping">Back to stores</a></p> : store ? <>
      <section className="shopping-current" aria-labelledby="shopping-list-title">
        <div className="shopping-clipboard-actions">
          <button className="drawer-save" disabled={clipboardBusy || !store.categories.length} onClick={() => void clipboardAction('upload')}>Upload shopping list</button>
          <button className="small-button" disabled={clipboardBusy || !store.categories.length} onClick={() => void clipboardAction('instructions')}>Copy instructions</button>
        </div>
        <p className="shopping-help">{store.categories.length ? 'Upload replaces your current list with JSON from your clipboard.' : 'Add store layout categories below to start uploading lists.'}</p>
        {clipboardMessage && <p className="message" role={clipboardError ? 'alert' : 'status'}>{clipboardMessage}</p>}
        <div className="section-heading"><h2 id="shopping-list-title">Current shopping list</h2><span>{(store.items ?? []).length} ITEMS</span></div>
        {!store.items?.length ? <div className="todo-empty">No shopping items yet. Copy instructions to prepare your list, then upload it.</div> : <>
          {[...store.categories.map(category => ({ ...category, items: shoppingItems.filter(item => item.categoryId === category.id) })),
            { id: 'unassigned', name: 'Removed categories', items: shoppingItems.filter(item => !store.categories.some(category => category.id === item.categoryId)) }]
            .filter(group => group.items.length).map(group => <section className="shopping-item-group" key={group.id}><h3>{group.name}</h3><ul>{group.items.map(item => <li key={item.index}><label className={item.checked ? "shopping-checklist-item is-checked" : "shopping-checklist-item"}><input type="checkbox" checked={Boolean(item.checked)} onChange={() => toggleItem(store.id, item.index)} /><span>{item.item}</span></label></li>)}</ul></section>)}
        </>}
      </section>
      <section aria-labelledby="store-layout-title">
      <div className="section-heading"><h2 id="store-layout-title">Store layout</h2><button className="todo-add" aria-label="Add category" onClick={add}>+</button></div>
      <p className="shopping-help">Add categories in aisle order. Drag handles to rearrange.</p>
      {store.categories.length === 0 ? <div className="todo-empty"><p>No categories yet.</p><p>Tap + to add produce, cheese, coffee, or any category you need.</p></div> : <ol className="shopping-layout">{store.categories.map((category, index) => <li key={category.id} data-category-id={category.id} className={`shopping-row${dragging === category.id ? ' is-dragging' : ''}`}>
        <button className="category-handle" aria-label={`Reorder ${category.name}. Use arrow keys to move.`}
          onKeyDown={event => {
            if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
            event.preventDefault();
            const target = store.categories[index + (event.key === 'ArrowUp' ? -1 : 1)];
            if (target) moveCategory(store.id, category.id, target.id);
          }}
          onPointerDown={event => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = category.id; setDragging(category.id); }}
          onPointerMove={event => {
            if (drag.current !== category.id) return;
            const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-category-id]')?.dataset.categoryId;
            if (target && target !== category.id) moveCategory(store.id, category.id, target);
            if (event.clientY > window.innerHeight - 70) window.scrollBy(0, 12);
            else if (event.clientY < 100) window.scrollBy(0, -12);
          }}
          onPointerUp={() => { drag.current = null; setDragging(null); }} onPointerCancel={() => { drag.current = null; setDragging(null); }} onLostPointerCapture={() => { drag.current = null; setDragging(null); }}>⠿</button>
        <button className="todo-text" onClick={() => setEditing({ ...category, kind: 'category', existing: true })}>{category.name}</button>
        <button className="shopping-remove" aria-label={`Remove ${category.name}`} onClick={() => removeCategory(store.id, category.id)}>×</button>
      </li>)}</ol>}
      </section>
    </> : stores.length === 0 ? <div className="todo-empty"><p>No stores yet.</p><p>Tap + to add your first store.</p></div> : <div className="shopping-stores">{stores.map(item => <a className="shopping-store" key={item.id} href={`#shopping/${item.id}`}><span><strong>{item.name}</strong><small>{item.categories.length} {item.categories.length === 1 ? 'category' : 'categories'}</small></span><span aria-hidden="true">→</span></a>)}</div>}
    {editing && <TodoDrawer onDismiss={() => setEditing(null)}>{close => <form onSubmit={event => {
      event.preventDefault();
      const name = editing.name.trim();
      if (!name) return;
      if (editing.kind === 'store') saveStore({ ...stores.find(item => item.id === editing.id), id: editing.id, name, categories: stores.find(item => item.id === editing.id)?.categories ?? [] });
      else if (store) saveCategory(store.id, { id: editing.id, name });
      close();
    }}>
      <div className="drawer-heading"><button type="button" className="drawer-cancel" onClick={close}>Cancel</button><h2 id="todo-form-title">{editing.existing ? 'Edit' : 'New'} {editing.kind}</h2><button className="drawer-save" type="submit" disabled={!editing.name.trim()}>{editing.existing ? 'Save' : 'Add'}</button></div>
      <div className="drawer-fields"><div className="drawer-task-card"><label htmlFor="shopping-name">{editing.kind === 'store' ? 'Store name' : 'Category name'}</label><input id="shopping-name" data-drawer-autofocus required placeholder={editing.kind === 'store' ? 'e.g. Whole Foods' : 'e.g. Produce'} value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} /></div>
      {editing.kind === 'store' && editing.existing && <button type="button" className="shopping-delete-store" onClick={() => { if (!window.confirm('Delete this store and its layout?')) return; removeStore(editing.id); window.location.hash = '#shopping'; close(); }}>Delete store</button>}</div>
    </form>}</TodoDrawer>}
  </section>;
}
