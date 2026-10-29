import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Calendar, CalendarDays, Clock, BarChart3,
  GraduationCap, Settings, LogOut, Sun, Moon, Monitor, Menu, X, ChevronDown, Bell, Plus
} from 'lucide-react';
import { useStore } from '../lib/store';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/subjects', icon: BookOpen, label: 'My Subjects' },
  { to: '/timetable', icon: Clock, label: 'Weekly Timetable' },
  { to: '/extra-classes', icon: Plus, label: 'Extra Classes' },
  { to: '/calendar', icon: CalendarDays, label: 'Attendance Calendar' },
  { to: '/reports', icon: BarChart3, label: 'Reports & Analytics' },
  { to: '/semester', icon: GraduationCap, label: 'Semester Settings' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { currentUser, preferences, savePreferences, logout } = useStore();
  const navigate = useNavigate();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const handleTheme = (theme: 'light' | 'dark' | 'system') => {
    savePreferences({ theme });
  };

  const initials = currentUser?.fullName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="app-layout">
      {/* Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">📊</div>
          <div>
            <div className="sidebar-logo-text">AttendTrack</div>
            <div className="sidebar-logo-sub">Smart Attendance Tracker</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Navigation</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-item" style={{ cursor: 'default', marginBottom: 8 }}>
            <div
              className="avatar"
              style={{ background: currentUser?.avatarColor || '#6366f1', width: 32, height: 32, fontSize: 12 }}
            >
              {initials}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-sidebar)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser?.fullName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-sidebar-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser?.email}
              </div>
            </div>
          </div>
          <button className="sidebar-item w-full" onClick={handleLogout} style={{ color: '#f87171' }}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div>
              <div className="topbar-title">Smart Attendance Tracker</div>
            </div>
          </div>

          <div className="topbar-actions">
            {/* Theme Toggle */}
            <div className="theme-toggle">
              <button
                className={`theme-opt ${preferences?.theme === 'light' ? 'active' : ''}`}
                onClick={() => handleTheme('light')}
                title="Light mode"
              >
                <Sun size={15} />
              </button>
              <button
                className={`theme-opt ${preferences?.theme === 'system' ? 'active' : ''}`}
                onClick={() => handleTheme('system')}
                title="System default"
              >
                <Monitor size={15} />
              </button>
              <button
                className={`theme-opt ${preferences?.theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleTheme('dark')}
                title="Dark mode"
              >
                <Moon size={15} />
              </button>
            </div>

            {/* User Menu */}
            <div className="dropdown" ref={userMenuRef}>
              <div
                className="avatar"
                style={{ background: currentUser?.avatarColor || '#6366f1' }}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                {initials}
              </div>
              {userMenuOpen && (
                <div className="dropdown-menu">
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{currentUser?.fullName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{currentUser?.username}</div>
                  </div>
                  <div className="dropdown-item" onClick={() => { navigate('/settings'); setUserMenuOpen(false); }}>
                    <Settings size={15} /> Profile Settings
                  </div>
                  <div className="dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={15} /> Logout
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
