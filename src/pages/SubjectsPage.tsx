import { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Award, AlertTriangle, BookOpen, Target } from 'lucide-react';
import { useStore } from '../lib/store';
import { computeSubjectStats } from '../lib/db';
import { Modal, ConfirmDialog } from '../components/Modal';
import toast from 'react-hot-toast';
import type { Subject } from '../types';

const SUBJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
  '#10b981', '#3b82f6', '#14b8a6', '#f97316', '#84cc16',
  '#06b6d4', '#a855f7', '#e11d48', '#0ea5e9', '#22c55e',
];

interface SubjectFormData {
  name: string;
  code: string;
  facultyName: string;
  category: string;
  color: string;
  attendanceTarget: number;
  initialAttended: number;
  initialTotal: number;
}

const EMPTY_FORM: SubjectFormData = {
  name: '', code: '', facultyName: '', category: '',
  color: '#6366f1', attendanceTarget: 75,
  initialAttended: 0, initialTotal: 0,
};

export default function SubjectsPage() {
  const { currentUser, subjects, addSubject, editSubject, removeSubject, attendanceRecords, classOccurrences } = useStore();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SubjectFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() =>
    subjects.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
    ), [subjects, search]);

  const allStats = useMemo(() =>
    subjects.reduce((acc, s) => {
      acc[s.id] = computeSubjectStats(s, currentUser!.id);
      return acc;
    }, {} as Record<string, ReturnType<typeof computeSubjectStats>>),
    [subjects, attendanceRecords, classOccurrences]
  );

  const sf = (k: keyof SubjectFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = ['attendanceTarget', 'initialAttended', 'initialTotal'].includes(k) ? Number(e.target.value) : e.target.value;
    setForm(p => ({ ...p, [k]: val }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Subject name is required.';
    if (!form.code.trim()) e.code = 'Subject code is required.';
    if (form.attendanceTarget < 0 || form.attendanceTarget > 100) e.attendanceTarget = 'Target must be 0–100%.';
    if (form.initialAttended < 0) e.initialAttended = 'Must be ≥ 0.';
    if (form.initialTotal < 0) e.initialTotal = 'Must be ≥ 0.';
    if (form.initialAttended > form.initialTotal) e.initialAttended = 'Cannot be more than total classes.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setErrors({}); setModalOpen(true); };

  const openEdit = (s: Subject) => {
    setForm({
      name: s.name, code: s.code, facultyName: s.facultyName || '',
      category: s.category || '', color: s.color,
      attendanceTarget: s.attendanceTarget,
      initialAttended: s.initialAttended, initialTotal: s.initialTotal,
    });
    setEditingId(s.id);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editingId) {
      editSubject(editingId, form);
      toast.success('Subject updated!');
    } else {
      addSubject(form);
      toast.success('Subject added!');
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    removeSubject(id);
    toast.success('Subject deleted.');
  };

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="section-title" style={{ fontSize: 22 }}>My Subjects</h1>
          <p className="section-sub">{subjects.length} subject{subjects.length !== 1 ? 's' : ''} · Manage your courses and attendance targets</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Subject
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="form-input"
          style={{ paddingLeft: 42, maxWidth: 360 }}
          placeholder="Search by name or code..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Subject Cards */}
      {filtered.length === 0 ? (
        <div className="empty-state card">
          <BookOpen size={48} />
          <h3>No subjects found</h3>
          <p>{search ? 'Try a different search term.' : 'Add your first subject to get started!'}</p>
          {!search && <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Subject</button>}
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(subject => {
            const stats = allStats[subject.id];
            const pct = stats?.percentage;
            const needed = stats?.classesNeeded || 0;
            return (
              <div key={subject.id} className="card" style={{ borderTop: `4px solid ${subject.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 16 }}>{subject.name}</span>
                    </div>
                    <div className="badge badge-muted">{subject.code}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(subject)} title="Edit"><Edit2 size={15} /></button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--accent-danger)' }} onClick={() => setDeleteId(subject.id)} title="Delete"><Trash2 size={15} /></button>
                  </div>
                </div>

                {subject.facultyName && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>👤 {subject.facultyName}</div>
                )}

                {/* Attendance */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Attendance</span>
                    <span style={{ fontSize: 20, fontWeight: 800 }}>{pct !== null ? `${pct.toFixed(1)}%` : 'N/A'}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{
                      width: `${pct !== null ? Math.min(100, pct) : 0}%`,
                      background: stats?.targetAchieved ? subject.color : pct !== null && pct >= subject.attendanceTarget - 10 ? 'var(--gradient-warning)' : 'var(--gradient-danger)'
                    }} />
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                  {[
                    ['Attended', stats?.attended ?? 0, '#10b981'],
                    ['Missed', stats?.missed ?? 0, '#ef4444'],
                    ['Total', stats?.total ?? 0, '#6366f1'],
                  ].map(([l, v, c]) => (
                    <div key={String(l)} style={{ textAlign: 'center', padding: '8px 6px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontWeight: 700, fontSize: 18, color: String(c) }}>{String(v)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{String(l)}</div>
                    </div>
                  ))}
                </div>

                {/* Target */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Target size={14} color="var(--text-muted)" />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Target: {subject.attendanceTarget}%</span>
                  </div>
                  {pct !== null && (
                    stats?.targetAchieved
                      ? <span className="badge badge-success"><Award size={10} /> On Track</span>
                      : needed > 0
                        ? <span className="badge badge-danger"><AlertTriangle size={10} /> Need {needed} more</span>
                        : <span className="badge badge-warning">Below target</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Subject' : 'Add New Subject'}
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>{editingId ? 'Save Changes' : 'Add Subject'}</button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Subject Name <span>*</span></label>
            <input className="form-input" placeholder="e.g. Data Structures" value={form.name} onChange={sf('name')} />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Subject Code <span>*</span></label>
            <input className="form-input" placeholder="e.g. CS301 or any code" value={form.code} onChange={sf('code')} />
            {errors.code && <span className="form-error">{errors.code}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Faculty Name</label>
            <input className="form-input" placeholder="Optional" value={form.facultyName} onChange={sf('facultyName')} />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <input className="form-input" placeholder="e.g. Core, Elective, Lab" value={form.category} onChange={sf('category')} />
          </div>
          <div className="form-group">
            <label className="form-label">Attendance Target (%) <span>*</span></label>
            <input className="form-input" type="number" min={0} max={100} value={form.attendanceTarget} onChange={sf('attendanceTarget')} />
            {errors.attendanceTarget && <span className="form-error">{errors.attendanceTarget}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Initial Classes Attended</label>
            <input className="form-input" type="number" min={0} value={form.initialAttended} onChange={sf('initialAttended')} />
            {errors.initialAttended && <span className="form-error">{errors.initialAttended}</span>}
            <span className="form-hint">Classes attended before tracking started</span>
          </div>
          <div className="form-group">
            <label className="form-label">Initial Total Classes</label>
            <input className="form-input" type="number" min={0} value={form.initialTotal} onChange={sf('initialTotal')} />
            {errors.initialTotal && <span className="form-error">{errors.initialTotal}</span>}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Subject Color</label>
          <div className="color-swatches">
            {SUBJECT_COLORS.map(c => (
              <div
                key={c}
                className={`color-swatch ${form.color === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setForm(p => ({ ...p, color: c }))}
              />
            ))}
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) handleDelete(deleteId); setDeleteId(null); }}
        title="Delete Subject"
        message="This will permanently delete the subject and all its timetable entries and attendance records. This action cannot be undone."
      />
    </div>
  );
}
