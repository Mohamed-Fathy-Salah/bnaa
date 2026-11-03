import { useState } from 'react';
import { rename, useStore } from '../store';
import type { AppData, Category } from '../types';
import { uid } from '../utils';

type Kind = 'roomCategories' | 'materialCategories';

const usageCount = (data: AppData, kind: Kind, id: string): number => {
  if (kind === 'roomCategories') {
    return (
      data.flats.reduce((n, f) => n + f.rooms.filter((r) => r.categoryId === id).length, 0) +
      data.materials.filter((m) => m.roomCategoryIds.includes(id)).length
    );
  }
  return (
    data.materials.filter((m) => m.categoryId === id).length +
    data.stepTemplates.filter((s) => s.materialCategoryIds.includes(id)).length +
    data.flats.reduce((n, f) => n + f.steps.filter((s) => s.materialCategoryIds.includes(id)).length, 0)
  );
};

function CategoryList({ kind, title }: { kind: Kind; title: string }) {
  const { data, update, t, label } = useStore();
  const [newName, setNewName] = useState('');
  const list = data[kind];

  const set = (fn: (l: Category[]) => Category[]) => update((d) => ({ ...d, [kind]: fn(d[kind]) }));

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    set((l) => [...l, { id: uid(), name }]);
    setNewName('');
  };

  const remove = (c: Category) => {
    const used = usageCount(data, kind, c.id);
    if (used > 0) return alert(t('categories.inUse', { count: used }));
    if (confirm(t('common.confirmDelete', { name: label(c) }))) set((l) => l.filter((x) => x.id !== c.id));
  };

  return (
    <section className="card">
      <h2>{title}</h2>
      <ul className="plain-list">
        {list.map((c) => (
          <li key={c.id} className="row-inline">
            <input
              value={label(c)}
              aria-label={t('common.name')}
              onChange={(e) => set((l) => l.map((x) => (x.id === c.id ? rename(x, e.target.value) : x)))}
            />
            <button className="btn danger ghost" onClick={() => remove(c)}>{t('common.delete')}</button>
          </li>
        ))}
      </ul>
      <form className="row-inline" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input value={newName} placeholder={t('categories.newPlaceholder')} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn primary" type="submit" disabled={!newName.trim()}>{t('common.add')}</button>
      </form>
    </section>
  );
}

export default function CategoriesPage() {
  const { t } = useStore();
  return (
    <div className="page">
      <h1>{t('categories.title')}</h1>
      <div className="grid-2">
        <CategoryList kind="roomCategories" title={t('categories.room')} />
        <CategoryList kind="materialCategories" title={t('categories.material')} />
      </div>
    </div>
  );
}
