import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, GraduationCap } from 'lucide-react';
import { useStore } from '../lib/store';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ emailOrUsername: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const login = useStore(s => s.login);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.emailOrUsername.trim()) e.emailOrUsername = 'Email or username is required.';
    if (!form.password) e.password = 'Password is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      const result = login(form.emailOrUsername, form.password);
      if (result.success) {
        toast.success('Welcome back!');
      } else {
        setErrors({ form: result.error || 'Login failed.' });
        setLoading(false);
      }
    }, 300);
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div style={{ position: 'relative', zIndex: 1, color: 'white', maxWidth: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 40 }}>
            <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
              📊
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>AttendTrack</div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>Smart Attendance Tracker</div>
            </div>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>
            Take control of your attendance
          </h1>
          <p style={{ opacity: 0.85, fontSize: 16, lineHeight: 1.7 }}>
            Track subjects, mark classes, manage your timetable, and never miss your attendance targets again.
          </p>
          <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {['📅 Weekly timetable with auto class detection', '📈 Subject-wise analytics & targets', '🗓️ Interactive attendance calendar', '📤 Export reports to CSV'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, opacity: 0.9 }}>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <h2 className="auth-title">Welcome back 👋</h2>
            <p className="auth-sub" style={{ marginTop: 6 }}>Sign in to your account</p>
          </div>

          {errors.form && (
            <div className="alert alert-danger">{errors.form}</div>
          )}

          <div className="form-group">
            <label className="form-label">Email or Username <span>*</span></label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 42 }}
                placeholder="Enter email or username"
                value={form.emailOrUsername}
                onChange={e => { setForm(p => ({ ...p, emailOrUsername: e.target.value })); setErrors(p => ({ ...p, emailOrUsername: '' })); }}
                autoComplete="username"
                autoFocus
              />
            </div>
            {errors.emailOrUsername && <span className="form-error">{errors.emailOrUsername}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Password <span>*</span></label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 42, paddingRight: 42 }}
                type={showPass ? 'text' : 'password'}
                placeholder="Enter password"
                value={form.password}
                onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setErrors(p => ({ ...p, password: '' })); }}
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Create one</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
