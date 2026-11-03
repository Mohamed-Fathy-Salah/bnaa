import { roomFloorArea, roomWallArea } from '../estimate';
import { useStore } from '../store';
import type { Flat, Room } from '../types';
import { uid } from '../utils';
import { Empty, Field, NumInput } from './ui';

export default function RoomsEditor({ flat, setFlat }: { flat: Flat; setFlat: (fn: (f: Flat) => Flat) => void }) {
  const { data, t, label, num } = useStore();

  const setRoom = (id: string, patch: Partial<Room>) =>
    setFlat((f) => ({ ...f, rooms: f.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));

  const addRoom = () =>
    setFlat((f) => ({
      ...f,
      rooms: [
        ...f.rooms,
        {
          id: uid(),
          name: t('rooms.defaultName', { n: f.rooms.length + 1 }),
          categoryId: data.roomCategories[0]?.id ?? '',
          length: 0,
          width: 0,
          height: data.settings.defaultHeight,
        },
      ],
    }));

  const removeRoom = (r: Room) => {
    if (!confirm(t('common.confirmDelete', { name: r.name }))) return;
    setFlat((f) => ({ ...f, rooms: f.rooms.filter((x) => x.id !== r.id) }));
  };

  const totalFloor = flat.rooms.reduce((a, r) => a + roomFloorArea(r), 0);

  return (
    <div>
      {flat.rooms.length === 0 && <Empty>{t('rooms.empty')}</Empty>}
      <div className="room-list">
        {flat.rooms.map((r) => (
          <article key={r.id} className="card room-card">
            <div className="room-grid">
              <Field label={t('common.name')}>
                <input value={r.name} onChange={(e) => setRoom(r.id, { name: e.target.value })} />
              </Field>
              <Field label={t('common.category')}>
                <select value={r.categoryId} onChange={(e) => setRoom(r.id, { categoryId: e.target.value })}>
                  {data.roomCategories.map((c) => <option key={c.id} value={c.id}>{label(c)}</option>)}
                </select>
              </Field>
              <Field label={t('rooms.length')}>
                <NumInput value={r.length} onChange={(v) => setRoom(r.id, { length: v ?? 0 })} />
              </Field>
              <Field label={t('rooms.width')}>
                <NumInput value={r.width} onChange={(v) => setRoom(r.id, { width: v ?? 0 })} />
              </Field>
              <Field label={t('rooms.height')}>
                <NumInput value={r.height} onChange={(v) => setRoom(r.id, { height: v ?? 0 })} />
              </Field>
            </div>
            <div className="room-foot">
              <span className="muted small">
                {t('rooms.floor')}: {num(roomFloorArea(r), 2)} {t('unit.m2')} · {t('rooms.walls')}: {num(roomWallArea(r), 2)} {t('unit.m2')}
              </span>
              <button className="btn ghost danger" onClick={() => removeRoom(r)}>{t('common.delete')}</button>
            </div>
          </article>
        ))}
      </div>
      <div className="btn-row">
        <button className="btn primary" onClick={addRoom}>+ {t('rooms.add')}</button>
        {flat.rooms.length > 0 && (
          <span className="muted">
            {t('common.total')}: {num(totalFloor, 2)} {t('unit.m2')}
          </span>
        )}
      </div>
    </div>
  );
}
