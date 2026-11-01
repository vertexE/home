import { useEffect, useRef, useState } from 'react';
import { groupTodos, useTodos, type Todo } from './todos';
import { TodoDrawer } from './TodoDrawer';

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function TodoRow({ item, edit }: { item: Todo; edit: (item: Todo) => void }) {
  const { toggle, remove } = useTodos();
  const [offset, setOffset] = useState(0);
  const drag = useRef<{ x: number; y: number; offset: number; horizontal: boolean } | null>(null);
  const moved = useRef(false);
  return <div className="todo-row-wrap">
    <button className="todo-delete" aria-label={`Delete ${item.task}`} tabIndex={offset < 0 ? 0 : -1} onClick={() => remove(item.id)}>Delete</button>
    <div className={`todo-row${item.completed ? ' completed' : ''}`} style={{ transform: `translateX(${offset}px)` }}
      onPointerDown={event => { if (event.button !== 0) return; moved.current = false; drag.current = { x: event.clientX, y: event.clientY, offset, horizontal: false }; }}
      onPointerMove={event => {
        const start = drag.current;
        if (!start) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (!start.horizontal && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { drag.current = null; return; }
        if (Math.abs(dx) > 8) { start.horizontal = true; moved.current = true; event.currentTarget.setPointerCapture(event.pointerId); }
        if (start.horizontal) setOffset(Math.max(-180, Math.min(0, start.offset + dx)));
      }}
      onPointerUp={() => { if (!drag.current) return; drag.current = null; if (offset <= -145) remove(item.id); else setOffset(offset < -40 ? -88 : 0); }}
      onPointerCancel={() => { drag.current = null; setOffset(0); }}
      onClickCapture={event => { if (moved.current) { event.preventDefault(); event.stopPropagation(); moved.current = false; } }}>
      <button className="todo-check" aria-label={`${item.completed ? 'Mark incomplete' : 'Complete'}: ${item.task}`} aria-pressed={item.completed} onClick={() => toggle(item.id)}>{item.completed ? '✓' : ''}</button>
      <button className="todo-text" onClick={() => edit(item)}>{item.task}</button>
      <button className="todo-more" aria-label={`Show delete for ${item.task}`} aria-expanded={offset < 0} onClick={() => setOffset(offset ? 0 : -88)}>⋯</button>
    </div>
  </div>;
}

export function TodoList() {
  const { items, save } = useTodos();
  const [ready, setReady] = useState(useTodos.persist.hasHydrated());
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    void useTodos.persist.rehydrate()?.then(() => {
      if (!active) return;
      if (useTodos.persist.hasHydrated()) setReady(true);
      else setError(true);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);

  return <section className="todo-page" aria-labelledby="todo-title">
    <a className="back-link" href="#">← Your everyday</a>
    <div className="todo-heading"><div><p className="eyebrow">ONE THING AT A TIME</p><h1 id="todo-title">TODO lists<span>.</span></h1><p className="intro-copy">A little space for what needs doing.</p></div><button ref={addButton} className="todo-add" aria-label="Add todo" disabled={!ready} onClick={() => setEditing({ id: crypto.randomUUID(), dueDate: today(), task: '', completed: false })}>+</button></div>
    {error ? <p role="alert" className="message">Could not load todos. Reload to retry.</p> : !ready ? <p className="todo-empty" role="status">Loading your list…</p> : items.length === 0 ? <div className="todo-empty"><p>Nothing on your list yet.</p><p>Tap + to add your first todo.</p></div> : groupTodos(items).map(([date, group]) => <section className="todo-group" key={date} aria-label={date}><h2><time dateTime={date}>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</time><span>{group.length}</span></h2>{group.map(item => <TodoRow key={item.id} item={item} edit={setEditing} />)}</section>)}
    {editing && <TodoDrawer onDismiss={() => setEditing(null)}>{close =>
      <form onSubmit={event => { event.preventDefault(); if (!editing.task.trim()) return; save({ ...editing, task: editing.task.trim() }); close(); }}>
        <div className="drawer-heading"><h2 id="todo-form-title">{items.some(item => item.id === editing.id) ? 'Edit todo' : 'Add todo'}</h2><button type="button" className="drawer-close" onClick={close} aria-label="Close drawer">×</button></div>
        <label htmlFor="todo-task">Task</label><textarea id="todo-task" data-drawer-autofocus required rows={3} placeholder="What needs doing?" value={editing.task} onChange={event => setEditing({ ...editing, task: event.target.value })} />
        <label htmlFor="todo-date">Due date</label><input id="todo-date" type="date" required value={editing.dueDate} onChange={event => setEditing({ ...editing, dueDate: event.target.value })} />
        <label className="todo-completed"><input type="checkbox" checked={editing.completed} onChange={event => setEditing({ ...editing, completed: event.target.checked })} /> Completed</label>
        <button className="done-button" disabled={!editing.task.trim()} type="submit">Save todo <span aria-hidden="true">→</span></button>
      </form>
    }</TodoDrawer>}
  </section>;
}
