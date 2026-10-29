import { useState } from 'react';
import { format, parseISO, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';
import { GraduationCap, Calendar, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useStore } from '../lib/store';
import toast from 'react-hot-toast';

export default function SemesterPage() {
  const { semesterSettings, saveSemesterSettings } = useStore();
  const [form, setForm] = useState({
    semesterName: semesterSettings?.semesterName || '',
    startDate: semesterSettings?.startDate || '',
    endDate: semesterSettings?.endDate || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const sf = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    setErrors(p => ({ ...p, [k]: '' }));
    setSaved(false);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.startDate) e.startDate = 'Start date is required.';
    if (!form.endDate) e.endDate = 'End date is required.';
    if (form.startDate && form.endDate && form.endDate <= form.startDate) {
      e.endDate = 'End date must be after start date.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    saveSemesterSettings(form);
    setSaved(true);
    toast.success('Semester settings saved!');
  };

  const today = new Date();

  const progress = (() => {
    if (!form.startDate || !form.endDate) return null;
    try {
      const start = parseISO(form.startDate);
      const end = parseISO(form.endDate);
      const total = differenceInDays(end, start);
      if (total <= 0) return null;
      const elapsed = Math.max(0, Math.min(total, differenceInDays(today, start)));
      const remaining = Math.max(0, differenceInDays(end, today));
      const pct = (elapsed / total) * 100;
      const weeksRemaining = differenceInWeeks(end, today);
      const monthsRemaining = differenceInMonths(end, today);
      const notStarted = today < start;
      const ended = today > end;
      return { total, elapsed, remaining, pct, weeksRemaining, monthsRemaining, notStarted, ended, start, end };
    } catch {
      return null;
    }
  })();

  const statusColor = progress
    ? progress.pct < 33 ? '#10b981' : progress.pct < 66 ? '#f59e0b' : progress.pct < 90 ? '#f97316' : '#ef4444'
    : '#6366f1';

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="section-title" style={{ fontSize: 22 }}>Semester Settings</h1>
          <p className="section-sub">Configure your semester dates and track progress</p>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'flex-start' }}>
        {/* Settings Form */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={20} color="#6366f1" />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Semester Configuration</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Semester Name</label>
              <input className="form-input" placeholder="e.g. Fall 2024, Semester 5" value={form.semesterName} onChange={sf('semesterName')} />
              <span className="form-hint">Optional name for your semester</span>
            </div>
            <div className="form-group">
              <label className="form-label">Start Date <span>*</span></label>
              <input className="form-input" type="date" value={form.startDate} onChange={sf('startDate')} />
              {errors.startDate && <span className="form-error">{errors.startDate}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">End Date <span>*</span></label>
              <input className="form-input" type="date" value={form.endDate} onChange={sf('endDate')} />
              {errors.endDate && <span className="form-error">{errors.endDate}</span>}
            </div>

            <button className="btn btn-primary" onClick={handleSave} style={{ marginTop: 4 }}>
              {saved ? <><CheckCircle size={16} /> Saved</> : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Timeline Preview */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={20} color="#6366f1" />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Semester Timeline</div>
          </div>

          {!progress ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <Clock size={40} />
              <h3>No semester configured</h3>
              <p>Fill in the start and end dates to see your semester timeline.</p>
            </div>
          ) : progress.notStarted ? (
            <div>
              <div className="alert alert-info" style={{ marginBottom: 16 }}>
                <Calendar size={16} />
                <span>Semester hasn't started yet. Starting in {differenceInDays(progress.start, today)} days.</span>
              </div>
              <SemesterTimeline progress={progress} statusColor={statusColor} form={form} />
            </div>
          ) : progress.ended ? (
            <div>
              <div className="alert alert-success" style={{ marginBottom: 16 }}>
                <CheckCircle size={16} />
                <span>🎓 Semester has ended! Great work!</span>
              </div>
              <SemesterTimeline progress={progress} statusColor={statusColor} form={form} />
            </div>
          ) : (
            <SemesterTimeline progress={progress} statusColor={statusColor} form={form} />
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {progress && !progress.notStarted && (
        <div className="grid-4" style={{ marginTop: 24 }}>
          {[
            { label: 'Days Elapsed', value: progress.elapsed, icon: '📅', color: '#6366f1' },
            { label: 'Days Remaining', value: progress.remaining, icon: '⏳', color: '#f59e0b' },
            { label: 'Weeks Remaining', value: Math.max(0, progress.weeksRemaining), icon: '📆', color: '#3b82f6' },
            { label: '% Completed', value: `${progress.pct.toFixed(0)}%`, icon: '📊', color: statusColor },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="stat-card">
              <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
              <div className="stat-card-value" style={{ color }}>{value}</div>
              <div className="stat-card-label">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SemesterTimeline({ progress, statusColor, form }: any) {
  return (
    <div>
      {form.semesterName && (
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12, color: 'var(--text-primary)' }}>
          {form.semesterName}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>
        <span>Start: {form.startDate ? format(parseISO(form.startDate), 'MMM d, yyyy') : '—'}</span>
        <span>End: {form.endDate ? format(parseISO(form.endDate), 'MMM d, yyyy') : '—'}</span>
      </div>
      <div className="progress-bar lg" style={{ marginBottom: 8 }}>
        <div className="progress-fill" style={{ width: `${progress.pct}%`, background: `linear-gradient(90deg, #6366f1, ${statusColor})` }} />
      </div>
      <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)', marginTop: 12 }}>
        <strong style={{ fontSize: 24, color: statusColor }}>{progress.pct.toFixed(1)}%</strong>
        <span style={{ marginLeft: 8 }}>of semester completed</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 20 }}>
        {[
          ['Total Days', progress.total],
          ['Elapsed', progress.elapsed],
          ['Remaining', progress.remaining],
        ].map(([l, v]) => (
          <div key={String(l)} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{v}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
