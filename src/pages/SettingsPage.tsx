import { useState } from 'react';
import { Eye, EyeOff, User, Mail, Lock, Target, Sun, Moon, Monitor, Save, Shield } from 'lucide-react';
import { useStore } from '../lib/store';
import { hashPassword } from '../lib/db';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { currentUser, preferences, savePreferences, updateProfile } = useStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'attendance' | 'appearance'>('profile');

  // Profile
  const [profile, setProfile] = useState({ fullName: currentUser?.fullName || '', username: currentUser?.username || '', email: currentUser?.email || '' });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  // Password
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passErrors, setPassErrors] = useState<Record<string, string>>({});

  // Overall Target
  const [overallTarget, setOverallTarget] = useState(preferences?.overallTarget || 75);

  const sp = (k: keyof typeof profile) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile(p => ({ ...p, [k]: e.target.value }));
    setProfileErrors(p => ({ ...p, [k]: '' }));
  };

  const handleSaveProfile = () => {
    const e: Record<string, string> = {};
    if (!profile.fullName.trim()) e.fullName = 'Full name is required.';
    if (!profile.username.trim()) e.username = 'Username is required.';
    else if (!/^[a-zA-Z0-9_]{3,20}$/.test(profile.username)) e.username = 'Username: 3-20 chars, letters/numbers/underscores.';
    if (!profile.email.trim()) e.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(profile.email)) e.email = 'Enter a valid email.';
    setProfileErrors(e);
    if (Object.keys(e).length > 0) return;
    const result = updateProfile(profile);
    if (result.success) toast.success('Profile updated!');
    else toast.error(result.error || 'Update failed.');
  };

  const handleChangePassword = () => {
    const e: Record<string, string> = {};
    if (!passwords.current) e.current = 'Current password is required.';
    else if (hashPassword(passwords.current) !== currentUser?.passwordHash) e.current = 'Incorrect current password.';
    if (!passwords.newPass) e.newPass = 'New password is required.';
    else if (passwords.newPass.length < 6) e.newPass = 'At least 6 characters.';
    if (passwords.newPass !== passwords.confirm) e.confirm = 'Passwords do not match.';
    setPassErrors(e);
    if (Object.keys(e).length > 0) return;
    updateProfile({ passwordHash: hashPassword(passwords.newPass) });
    setPasswords({ current: '', newPass: '', confirm: '' });
    toast.success('Password changed successfully!');
  };

  const handleSaveTarget = () => {
    if (overallTarget < 0 || overallTarget > 100) {
      toast.error('Target must be between 0 and 100.');
      return;
    }
    savePreferences({ overallTarget });
    toast.success('Overall attendance target saved!');
  };

  const handleTheme = (theme: 'light' | 'dark' | 'system') => {
    savePreferences({ theme });
    toast.success(`Theme set to ${theme}.`);
  };

  const initials = currentUser?.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="section-title" style={{ fontSize: 22 }}>Settings</h1>
          <p className="section-sub">Manage your account, security, and preferences</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Sidebar Tabs */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div className="card" style={{ padding: 8 }}>
            {([
              { key: 'profile', icon: User, label: 'Profile' },
              { key: 'security', icon: Shield, label: 'Security' },
              { key: 'attendance', icon: Target, label: 'Attendance' },
              { key: 'appearance', icon: Sun, label: 'Appearance' },
            ] as const).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                className={`sidebar-item w-full ${activeTab === key ? 'active' : ''}`}
                style={{ background: activeTab === key ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-primary)', justifyContent: 'flex-start' }}
                onClick={() => setActiveTab(key)}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                <div
                  className="avatar lg"
                  style={{ background: currentUser?.avatarColor || '#6366f1' }}
                >
                  {initials}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>{currentUser?.fullName}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>@{currentUser?.username}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{currentUser?.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Full Name <span>*</span></label>
                  <input className="form-input" value={profile.fullName} onChange={sp('fullName')} />
                  {profileErrors.fullName && <span className="form-error">{profileErrors.fullName}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Username <span>*</span></label>
                  <input className="form-input" value={profile.username} onChange={sp('username')} />
                  {profileErrors.username && <span className="form-error">{profileErrors.username}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address <span>*</span></label>
                  <input className="form-input" type="email" value={profile.email} onChange={sp('email')} />
                  {profileErrors.email && <span className="form-error">{profileErrors.email}</span>}
                </div>
                <button className="btn btn-primary" style={{ width: 'fit-content' }} onClick={handleSaveProfile}>
                  <Save size={15} /> Save Profile
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Change Password</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Current Password <span>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input className="form-input" type={showCurrent ? 'text' : 'password'} style={{ paddingRight: 42 }} value={passwords.current} onChange={e => { setPasswords(p => ({ ...p, current: e.target.value })); setPassErrors(p => ({ ...p, current: '' })); }} />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passErrors.current && <span className="form-error">{passErrors.current}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">New Password <span>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input className="form-input" type={showNew ? 'text' : 'password'} style={{ paddingRight: 42 }} placeholder="Min 6 characters" value={passwords.newPass} onChange={e => { setPasswords(p => ({ ...p, newPass: e.target.value })); setPassErrors(p => ({ ...p, newPass: '' })); }} />
                    <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passErrors.newPass && <span className="form-error">{passErrors.newPass}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password <span>*</span></label>
                  <input className="form-input" type="password" value={passwords.confirm} onChange={e => { setPasswords(p => ({ ...p, confirm: e.target.value })); setPassErrors(p => ({ ...p, confirm: '' })); }} />
                  {passErrors.confirm && <span className="form-error">{passErrors.confirm}</span>}
                </div>
                <button className="btn btn-primary" style={{ width: 'fit-content' }} onClick={handleChangePassword}>
                  <Lock size={15} /> Change Password
                </button>
              </div>

              <div style={{ marginTop: 32, padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>🔒 Security Information</div>
                <ul style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2, paddingLeft: 16 }}>
                  <li>Passwords are hashed before storage — they are never stored in plain text.</li>
                  <li>Your data is stored privately in your browser's localStorage.</li>
                  <li>Each user's data is isolated and inaccessible to other users.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card">
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Overall Attendance Target</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                  Set the default minimum attendance percentage required across all subjects.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <input
                      className="form-input"
                      type="number"
                      min={0} max={100}
                      value={overallTarget}
                      onChange={e => setOverallTarget(Number(e.target.value))}
                    />
                  </div>
                  <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-primary)' }}>{overallTarget}%</span>
                  <button className="btn btn-primary" onClick={handleSaveTarget}>
                    <Save size={15} /> Save
                  </button>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div className="progress-bar lg">
                    <div className="progress-fill" style={{ width: `${overallTarget}%`, background: 'var(--gradient-primary)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>0%</span><span>100%</span>
                  </div>
                </div>
              </div>

              <div className="alert alert-info">
                <Target size={16} />
                <span>Individual subject targets can be set from the <strong>My Subjects</strong> page. They are independent of this overall target.</span>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Theme</div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Choose how AttendTrack looks to you.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: 'light' as const, icon: Sun, label: 'Light Mode', desc: 'Clean white background' },
                  { key: 'dark' as const, icon: Moon, label: 'Dark Mode', desc: 'Easy on the eyes at night' },
                  { key: 'system' as const, icon: Monitor, label: 'System Default', desc: 'Follows your device preference' },
                ].map(({ key, icon: Icon, label, desc }) => (
                  <div
                    key={key}
                    onClick={() => handleTheme(key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px',
                      border: `2px solid ${preferences?.theme === key ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      background: preferences?.theme === key ? 'rgba(99,102,241,0.05)' : 'transparent',
                    }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: preferences?.theme === key ? 'rgba(99,102,241,0.15)' : 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={20} color={preferences?.theme === key ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
                    </div>
                    {preferences?.theme === key && (
                      <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'white', fontSize: 12 }}>✓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
