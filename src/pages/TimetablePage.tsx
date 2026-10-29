import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, Clock } from 'lucide-react';
import { useStore } from '../lib/store';
import { Modal, ConfirmDialog } from '../components/Modal';
import toast from 'react-hot-toast';
import type { TimetableEntry, DayOfWeek } from '../types';

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

interface EntryForm {
  subjectId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
}

const EMPTY: EntryForm = { subjectId: '', dayOfWeek: 'monday', startTime: '09:00', endTime: '10:00', location: '', notes: '' };

export default function TimetablePage() {
  const { subjects, timetableEntries, addTimetableEntry, editTimetableEntry, removeTimetableEntry } = useStore();
  const [view, setView] = useState<'week' | 'day'>('week');
  const [activeDay, setActiveDay] = useState<DayOfWeek>('monday');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EntryForm>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sf = (k: keyof EntryForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.subjectId) e.subjectId = 'Select a subject.';
    if (!form.startTime) e.startTime = 'Start time required.';
    if (!form.endTime) e.endTime = 'End time required.';
    if (form.startTime >= form.endTime) e.endTime = 'End time must be after start time.';
    
    // Check overlap
    const dayEntries = timetableEntries.filter(t => t.dayOfWeek === form.dayOfWeek && t.id !== editingId);
    const overlap = dayEntries.find(t => form.startTime < t.endTime && form.endTime > t.startTime);
    if (overlap) {
      const sub = subjects.find(s => s.id === overlap.subjectId);
      e.overlap = `Overlaps with ${sub?.name || 'another class'} (${overlap.startTime}–${overlap.endTime})`;
    }
    setErrors(e);
    return !e.subjectId && !e.startTime && !e.endTime;
  };

  const openAdd = (day?: DayOfWeek) => {
    setForm({ ...EMPTY, dayOfWeek: day || activeDay, subjectId: subjects[0]?.id || '' });
    setEditingId(null); setErrors({}); setModalOpen(true);
  };

  const openEdit = (entry: TimetableEntry) => {
    setForm({ subjectId: entry.subjectId, dayOfWeek: entry.dayOfWeek, startTime: entry.startTime, endTime: entry.endTime, location: entry.location || '', notes: entry.notes || '' });
    setEditingId(entry.id); setErrors({}); setModalOpen(true);
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editingId) {
      editTimetableEntry(editingId, form);
      toast.success('Timetable entry updated!');
    } else {
      addTimetableEntry(form);
      toast.success('Class added to timetable!');
    }
    setModalOpen(false);
  };

  const entriesByDay = useMemo(() => {
    const map: Record<DayOfWeek, TimetableEntry[]> = {} as any;
    DAYS.forEach(d => { map[d.key] = []; });
    timetableEntries.forEach(t => map[t.dayOfWeek]?.push(t));
    Object.keys(map).forEach(k => (map[k as DayOfWeek] = map[k as DayOfWeek].sort((a, b) => a.startTime.localeCompare(b.startTime))));
    return map;
  }, [timetableEntries]);

  const displayDays = view === 'week' ? DAYS : DAYS.filter(d => d.key === activeDay);

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="section-title" style={{ fontSize: 22 }}>Weekly Timetable</h1>
          <p className="section-sub">{timetableEntries.length} classes scheduled</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="tabs">
            <button className={`tab ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Weekly</button>
            <button className={`tab ${view === 'day' ? 'active' : ''}`} onClick={() => setView('day')}>Daily</button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => openAdd()}><Plus size={15} /> Add Class</button>
        </div>
      </div>

      {/* Day selector for daily view */}
      {view === 'day' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {DAYS.map(d => (
            <button
              key={d.key}
              className={`btn ${activeDay === d.key ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setActiveDay(d.key)}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {subjects.length === 0 ? (
        <div className="card empty-state">
          <Clock size={48} />
          <h3>No subjects yet</h3>
          <p>Add subjects first before creating your timetable.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {displayDays.map(day => {
            const entries = entriesByDay[day.key];
            const today = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] === day.key;
            return (
              <div key={day.key} className="card" style={today ? { borderColor: 'var(--accent-primary)' } : {}}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 15 }}>{day.label}</h3>
                    {today && <span className="badge badge-purple">Today</span>}
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{entries.length} class{entries.length !== 1 ? 'es' : ''}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => openAdd(day.key)}>
                    <Plus size={14} /> Add
                  </button>
                </div>
                {entries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '14px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    No classes · <button className="btn btn-ghost btn-sm" onClick={() => openAdd(day.key)} style={{ display: 'inline-flex', padding: '2px 8px' }}>Add one</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {entries.map(entry => {
                      const subject = subjects.find(s => s.id === entry.subjectId);
                      return (
                        <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${subject?.color || '#6366f1'}` }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                              <span style={{ fontWeight: 700, fontSize: 14 }}>{subject?.name}</span>
                              <span className="badge badge-muted">{subject?.code}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                              <span>⏰ {entry.startTime} – {entry.endTime}</span>
                              {entry.location && <span>📍 {entry.location}</span>}
                              {entry.notes && <span>📝 {entry.notes}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(entry)}><Edit2 size={14} /></button>
                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--accent-danger)' }} onClick={() => setDeleteId(entry.id)}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Timetable Entry' : 'Add Timetable Entry'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>{editingId ? 'Save Changes' : 'Add Class'}</button>
          </>
        }
      >
        {errors.overlap && (
          <div className="alert alert-warning"><AlertTriangle size={16} />{errors.overlap}</div>
        )}
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Subject <span>*</span></label>
            <select className="form-input" value={form.subjectId} onChange={sf('subjectId')}>
              <option value="">Select subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
            {errors.subjectId && <span className="form-error">{errors.subjectId}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Day of Week <span>*</span></label>
            <select className="form-input" value={form.dayOfWeek} onChange={sf('dayOfWeek')}>
              {DAYS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Start Time <span>*</span></label>
            <input className="form-input" type="time" value={form.startTime} onChange={sf('startTime')} />
            {errors.startTime && <span className="form-error">{errors.startTime}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">End Time <span>*</span></label>
            <input className="form-input" type="time" value={form.endTime} onChange={sf('endTime')} />
            {errors.endTime && <span className="form-error">{errors.endTime}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Location / Room</label>
            <input className="form-input" placeholder="Optional" value={form.location} onChange={sf('location')} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" placeholder="Optional" value={form.notes} onChange={sf('notes')} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) { removeTimetableEntry(deleteId); toast.success('Entry removed.'); } setDeleteId(null); }}
        title="Remove Timetable Entry"
        message="This will remove the class from your timetable. Existing attendance records for past classes will not be affected."
      />
    </div>
  );
}
