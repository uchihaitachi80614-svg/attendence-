import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, UserCircle } from 'lucide-react';
import { useStore } from '../lib/store';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const register = useStore(s => s.register);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    setErrors(p => ({ ...p, [k]: '', form: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required.';
    if (!form.username.trim()) e.username = 'Username is required.';
    else if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) e.username = 'Username: 3-20 chars, letters, numbers, underscores only.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address.';
    if (!form.password) e.password = 'Password is required.';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      const result = register({ fullName: form.fullName, username: form.username, email: form.email, password: form.password });
      if (result.success) {
        toast.success('Account created! Welcome to AttendTrack 🎉');
      } else {
        setErrors({ form: result.error || 'Registration failed.' });
        setLoading(false);
      }
    }, 300);
  };

  const fields = [
    { key: 'fullName', label: 'Full Name', icon: UserCircle, placeholder: 'John Doe', type: 'text', autocomplete: 'name' },
    { key: 'username', label: 'Username', icon: User, placeholder: 'john_doe', type: 'text', autocomplete: 'username' },
    { key: 'email', label: 'Email Address', icon: Mail, placeholder: 'john@example.com', type: 'email', autocomplete: 'email' },
  ] as const;

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
            Start tracking your attendance today
          </h1>
          <p style={{ opacity: 0.85, fontSize: 16, lineHeight: 1.7 }}>
            Create your free account and get full control over your academic attendance records.
          </p>
          <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[['📚', 'Multi-subject', 'Track multiple subjects'], ['🎯', 'Set targets', 'Custom per subject'], ['📅', 'Calendar view', 'Visual history'], ['📤', 'Export data', 'CSV download']].map(([icon, t, s]) => (
              <div key={t} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{t}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <h2 className="auth-title">Create your account</h2>
            <p className="auth-sub" style={{ marginTop: 6 }}>Free forever, no credit card needed</p>
          </div>

          {errors.form && <div className="alert alert-danger">{errors.form}</div>}

          {fields.map(f => (
            <div className="form-group" key={f.key}>
              <label className="form-label">{f.label} <span>*</span></label>
              <div style={{ position: 'relative' }}>
                <f.icon size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: 42 }}
                  type={f.type}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={set(f.key)}
                  autoComplete={f.autocomplete}
                />
              </div>
              {errors[f.key] && <span className="form-error">{errors[f.key]}</span>}
            </div>
          ))}

          <div className="form-group">
            <label className="form-label">Password <span>*</span></label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 42, paddingRight: 42 }}
                type={showPass ? 'text' : 'password'}
                placeholder="Min 6 characters"
                value={form.password}
                onChange={set('password')}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password <span>*</span></label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 42 }}
                type="password"
                placeholder="Repeat your password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                autoComplete="new-password"
              />
            </div>
            {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
