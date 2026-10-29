import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Calendar, AlertTriangle, Zap } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { useStore } from '../lib/store';
import { Modal, ConfirmDialog } from '../components/Modal';
import AttendanceBtnGroup from '../components/AttendanceBtnGroup';
import toast from 'react-hot-toast';
import type { ClassOccurrence, ClassType } from '../types';

const CLASS_TYPES: { value: ClassType; label: string }[] = [
  { value: 'extra', label: 'Extra Class' },
  { value: 'special', label: 'Special Class' },
  { value: 'rescheduled', label: 'Rescheduled Class' },
  { value: 'remedial', label: 'Remedial Class' },
  { value: 'lab', label: 'Additional Lab' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'other', label: 'Other' },
];

interface ExtraClassForm {
  subjectId: string;
  date: string;
  startTime: string;
  endTime: string;
  classType: ClassType;
  facultyName: string;
  location: string;
  notes: string;
}

const EMPTY: ExtraClassForm = {
  subjectId: '', date: format(new Date(), 'yyyy-MM-dd'),
  startTime: '09:00', endTime: '10:00', classType: 'extra',
  facultyName: '', location: '', notes: '',
};

export default function ExtraClassesPage() {
  const { subjects, classOccurrences, addExtraClass, editClass, removeClass, attendanceRecords, getAttendanceStatus } = useStore();
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExtraClassForm>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sf = (k: keyof ExtraClassForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const extraClasses = useMemo(() =>
    classOccurrences.filter(c => c.classType !== 'regular')
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime)),
    [classOccurrences]);

  const today = startOfDay(new Date());
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const filtered = useMemo(() => {
    switch (filter) {
      case 'upcoming': return extraClasses.filter(c => c.date >= todayStr);
      case 'past': return extraClasses.filter(c => c.date < todayStr);
      default: return extraClasses;
    }
  }, [extraClasses, filter, todayStr]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.subjectId) e.subjectId = 'Select a subject.';
    if (!form.date) e.date = 'Date is required.';
    if (!form.startTime) e.startTime = 'Start time required.';
    if (!form.endTime) e.endTime = 'End time required.';
    if (form.startTime >= form.endTime) e.endTime = 'End time must be after start time.';

    // Check overlap with other classes on same day
    const dayClasses = classOccurrences.filter(c => c.date === form.date && c.id !== editingId);
    const overlap = dayClasses.find(c => form.startTime < c.endTime && form.endTime > c.startTime);
    if (overlap) {
      const sub = subjects.find(s => s.id === overlap.subjectId);
      e.overlap = `Possible overlap with ${sub?.name || 'another class'} (${overlap.startTime}–${overlap.endTime}) on this date.`;
    }
    setErrors(e);
    return !e.subjectId && !e.date && !e.startTime && !e.endTime;
  };

  const openAdd = () => {
    setForm({ ...EMPTY, subjectId: subjects[0]?.id || '' });
    setEditingId(null); setErrors({}); setModalOpen(true);
  };

  const openEdit = (c: ClassOccurrence) => {
    setForm({
      subjectId: c.subjectId, date: c.date, startTime: c.startTime, endTime: c.endTime,
      classType: c.classType, facultyName: c.facultyName || '', location: c.location || '', notes: c.notes || '',
    });
    setEditingId(c.id); setErrors({}); setModalOpen(true);
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editingId) {
      editClass(editingId, { ...form, classType: form.classType as ClassType });
      toast.success('Extra class updated!');
    } else {
      addExtraClass({ ...form, classType: form.classType as ClassType });
      toast.success('Extra class added!');
    }
    setModalOpen(false);
  };

  const badgeForStatus = (status: string) => {
    if (status === 'present') return <span className="badge badge-success">Present</span>;
    if (status === 'absent') return <span className="badge badge-danger">Absent</span>;
    if (status === 'cancelled') return <span className="badge badge-muted">Cancelled</span>;
    return <span className="badge badge-warning">Not Marked</span>;
  };

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="section-title" style={{ fontSize: 22 }}>Extra Classes</h1>
          <p className="section-sub">{extraClasses.length} extra class{extraClasses.length !== 1 ? 'es' : ''} recorded</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Schedule Extra Class</button>
      </div>

      {/* Filters */}
      <div className="tabs" style={{ marginBottom: 20, width: 'fit-content' }}>
        {(['upcoming', 'past', 'all'] as const).map(f => (
          <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)} {f === 'all' ? `(${extraClasses.length})` : ''}
          </button>
        ))}
      </div>

      {subjects.length === 0 ? (
        <div className="card empty-state">
          <Zap size={48} />
          <h3>No subjects yet</h3>
          <p>Add subjects first before scheduling extra classes.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <Calendar size={48} />
          <h3>No extra classes {filter !== 'all' ? filter : ''}</h3>
          <p>Schedule extra, remedial, or special classes that aren't in your regular timetable.</p>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Extra Class</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(c => {
            const subject = subjects.find(s => s.id === c.subjectId);
            const status = getAttendanceStatus(c.id);
            const typeInfo = CLASS_TYPES.find(t => t.value === c.classType);
            return (
              <div key={c.id} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 16, borderLeft: `4px solid ${subject?.color || '#6366f1'}` }}>
                {/* Date Badge */}
                <div style={{ textAlign: 'center', minWidth: 52, flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                    {format(parseISO(c.date), 'd')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {format(parseISO(c.date), 'MMM')}
                  </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{subject?.name}</span>
                    <span className="badge badge-muted" style={{ fontSize: 10 }}>{subject?.code}</span>
                    <span className="badge badge-purple" style={{ fontSize: 10 }}>{typeInfo?.label || c.classType}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>⏰ {c.startTime}–{c.endTime}</span>
                    {c.location && <span>📍 {c.location}</span>}
                    {c.facultyName && <span>👤 {c.facultyName}</span>}
                    {c.notes && <span>📝 {c.notes}</span>}
                  </div>
                </div>

                {/* Status + Attendance */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {badgeForStatus(status)}
                  <AttendanceBtnGroup occurrence={c} compact />
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(c)}><Edit2 size={14} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--accent-danger)' }} onClick={() => setDeleteId(c.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Extra Class' : 'Schedule Extra Class'}
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>{editingId ? 'Save Changes' : 'Schedule Class'}</button>
          </>
        }
      >
        {errors.overlap && (
          <div className="alert alert-warning"><AlertTriangle size={16} />{errors.overlap} You can still proceed.</div>
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
            <label className="form-label">Class Type <span>*</span></label>
            <select className="form-input" value={form.classType} onChange={sf('classType')}>
              {CLASS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date <span>*</span></label>
            <input className="form-input" type="date" value={form.date} onChange={sf('date')} />
            {errors.date && <span className="form-error">{errors.date}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Faculty Name</label>
            <input className="form-input" placeholder="Optional" value={form.facultyName} onChange={sf('facultyName')} />
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
        onConfirm={() => { if (deleteId) { removeClass(deleteId); toast.success('Extra class removed.'); } setDeleteId(null); }}
        title="Delete Extra Class"
        message="This will permanently delete the extra class and its attendance record."
      />
    </div>
  );
}
