import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, parseISO, differenceInDays } from 'date-fns';
import {
  BookOpen, CheckCircle, XCircle, Clock, TrendingUp, Target,
  CalendarDays, Plus, AlertTriangle, Award, Zap
} from 'lucide-react';
import { useStore } from '../lib/store';
import { computeSubjectStats } from '../lib/db';
import AttendanceBtnGroup from '../components/AttendanceBtnGroup';
import type { DayOfWeek } from '../types';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_MAP: Record<number, DayOfWeek> = { 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday', 0: 'sunday' };

export default function Dashboard() {
  const { currentUser, subjects, timetableEntries, classOccurrences, attendanceRecords, semesterSettings, preferences, ensureRegularOccurrence, getAttendanceStatus } = useStore();
  const navigate = useNavigate();

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayDay = DAY_MAP[today.getDay()];

  // Compute stats
  const stats = useMemo(() => {
    const allStats = subjects.map(s => computeSubjectStats(s, currentUser!.id));
    const totalAttended = allStats.reduce((a, s) => a + s.attended, 0);
    const totalConducted = allStats.reduce((a, s) => a + s.total, 0);
    const overallPct = totalConducted > 0 ? (totalAttended / totalConducted) * 100 : null;
    return { allStats, totalAttended, totalConducted, totalMissed: totalConducted - totalAttended, overallPct };
  }, [subjects, attendanceRecords, classOccurrences]);

  // Today's timetable entries
  const todayTimetable = useMemo(() => {
    return timetableEntries
      .filter(t => t.dayOfWeek === todayDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [timetableEntries, todayDay]);

  // Ensure today's regular occurrences exist
  const todayOccurrences = useMemo(() => {
    return todayTimetable.map(entry => {
      let occ = classOccurrences.find(c => c.timetableEntryId === entry.id && c.date === todayStr);
      return { entry, occ };
    });
  }, [todayTimetable, classOccurrences, todayStr]);

  // Upcoming extra classes (next 7 days)
  const upcomingExtra = useMemo(() => {
    return classOccurrences
      .filter(c => c.classType !== 'regular' && c.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .slice(0, 5);
  }, [classOccurrences, todayStr]);

  // Unmarked classes
  const unmarkedToday = useMemo(() => {
    return todayOccurrences.filter(({ occ }) => occ && getAttendanceStatus(occ.id) === 'not_marked');
  }, [todayOccurrences, attendanceRecords]);

  // Semester progress
  const semesterProgress = useMemo(() => {
    if (!semesterSettings) return null;
    const start = parseISO(semesterSettings.startDate);
    const end = parseISO(semesterSettings.endDate);
    const total = differenceInDays(end, start);
    const elapsed = Math.max(0, Math.min(total, differenceInDays(today, start)));
    const remaining = Math.max(0, differenceInDays(end, today));
    const pct = total > 0 ? (elapsed / total) * 100 : 0;
    return { total, elapsed, remaining, pct, name: semesterSettings.semesterName || 'Current Semester' };
  }, [semesterSettings, today]);

  const overallTarget = preferences?.overallTarget || 75;
  const overallPct = stats.overallPct;

  const handleMarkClass = (entryId: string) => {
    ensureRegularOccurrence(entryId, todayStr);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>
          Good {today.getHours() < 12 ? 'morning' : today.getHours() < 17 ? 'afternoon' : 'evening'}, {currentUser?.fullName.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          {format(today, 'EEEE, MMMM d, yyyy')} · Here's your attendance overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid-5" style={{ marginBottom: 24 }}>
        <div className="stat-card purple">
          <div className="stat-card-icon" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <TrendingUp size={22} color="#6366f1" />
          </div>
          <div className="stat-card-label">Overall Attendance</div>
          <div className="stat-card-value">{overallPct !== null ? `${overallPct.toFixed(1)}%` : 'N/A'}</div>
          <div className="stat-card-sub">Target: {overallTarget}%</div>
          {overallPct !== null && (
            <div className="progress-bar" style={{ marginTop: 4 }}>
              <div className="progress-fill" style={{ width: `${Math.min(100, overallPct)}%`, background: overallPct >= overallTarget ? 'var(--gradient-success)' : overallPct >= overallTarget - 10 ? 'var(--gradient-warning)' : 'var(--gradient-danger)' }} />
            </div>
          )}
        </div>

        <div className="stat-card blue">
          <div className="stat-card-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
            <BookOpen size={22} color="#3b82f6" />
          </div>
          <div className="stat-card-label">Total Subjects</div>
          <div className="stat-card-value">{subjects.length}</div>
          <div className="stat-card-sub">{stats.allStats.filter(s => s.targetAchieved).length} on target</div>
        </div>

        <div className="stat-card green">
          <div className="stat-card-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <CheckCircle size={22} color="#10b981" />
          </div>
          <div className="stat-card-label">Classes Attended</div>
          <div className="stat-card-value">{stats.totalAttended}</div>
          <div className="stat-card-sub">of {stats.totalConducted} total</div>
        </div>

        <div className="stat-card red">
          <div className="stat-card-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <XCircle size={22} color="#ef4444" />
          </div>
          <div className="stat-card-label">Classes Missed</div>
          <div className="stat-card-value">{stats.totalMissed}</div>
          <div className="stat-card-sub">absences recorded</div>
        </div>

        <div className="stat-card amber">
          <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>
            <CalendarDays size={22} color="#f59e0b" />
          </div>
          <div className="stat-card-label">Today's Classes</div>
          <div className="stat-card-value">{todayTimetable.length + upcomingExtra.filter(c => c.date === todayStr).length}</div>
          <div className="stat-card-sub">{unmarkedToday.length} unmarked</div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24, marginBottom: 24 }}>
        {/* Today's Schedule */}
        <div className="card">
          <div className="section-header">
            <div>
              <div className="section-title">Today's Schedule</div>
              <div className="section-sub">Mark your attendance</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/timetable')}>
              View Timetable
            </button>
          </div>

          {todayTimetable.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <CalendarDays size={36} />
              <p>No classes scheduled for today.</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/timetable')}>
                <Plus size={15} /> Add Timetable
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {todayTimetable.map(entry => {
                const subject = subjects.find(s => s.id === entry.subjectId);
                let occ = classOccurrences.find(c => c.timetableEntryId === entry.id && c.date === todayStr);
                const status = occ ? getAttendanceStatus(occ.id) : 'not_marked';

                return (
                  <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${subject?.color || '#6366f1'}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{subject?.name}</span>
                        <span className="badge badge-muted" style={{ fontSize: 10 }}>{subject?.code}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{entry.startTime} – {entry.endTime}{entry.location ? ` · ${entry.location}` : ''}</div>
                    </div>
                    <div>
                      {occ ? (
                        <AttendanceBtnGroup occurrence={occ} compact />
                      ) : (
                        <button className="btn btn-sm btn-primary" onClick={() => handleMarkClass(entry.id)}>
                          Mark
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Subject Attendance */}
        <div className="card">
          <div className="section-header">
            <div>
              <div className="section-title">Subject Attendance</div>
              <div className="section-sub">Progress towards targets</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/subjects')}>
              Manage
            </button>
          </div>

          {subjects.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <BookOpen size={36} />
              <p>No subjects added yet.</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/subjects')}>
                <Plus size={15} /> Add Subject
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {stats.allStats.map(({ subject, attended, total, percentage, targetAchieved }) => (
                <div key={subject.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: subject.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{subject.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{subject.code}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{percentage !== null ? `${percentage.toFixed(1)}%` : 'N/A'}</span>
                      {percentage !== null && (
                        targetAchieved
                          ? <span className="badge badge-success"><Award size={9} /> ✓</span>
                          : <span className="badge badge-danger"><AlertTriangle size={9} /></span>
                      )}
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${percentage !== null ? Math.min(100, percentage) : 0}%`,
                        background: targetAchieved ? subject.color : percentage !== null && percentage >= subject.attendanceTarget - 10 ? 'var(--gradient-warning)' : 'var(--gradient-danger)'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>{attended}/{total} classes</span>
                    <span>Target: {subject.attendanceTarget}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        {/* Semester Progress */}
        <div className="card">
          <div className="section-header">
            <div>
              <div className="section-title">Semester Progress</div>
              <div className="section-sub">{semesterProgress?.name || 'Not configured'}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/semester')}>Settings</button>
          </div>

          {!semesterProgress ? (
            <div className="empty-state" style={{ padding: '16px 0' }}>
              <Clock size={32} />
              <p>Configure semester dates to see progress.</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/semester')}>
                <Plus size={15} /> Set Dates
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                {[['Days Elapsed', semesterProgress.elapsed], ['Days Remaining', semesterProgress.remaining], ['Progress', `${semesterProgress.pct.toFixed(0)}%`]].map(([l, v]) => (
                  <div key={String(l)} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{v}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div className="progress-bar lg">
                <div className="progress-fill" style={{ width: `${semesterProgress.pct}%`, background: 'var(--gradient-primary)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>{format(parseISO(semesterSettings!.startDate), 'MMM d, yyyy')}</span>
                <span>{format(parseISO(semesterSettings!.endDate), 'MMM d, yyyy')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Upcoming Extra Classes */}
        <div className="card">
          <div className="section-header">
            <div>
              <div className="section-title">Upcoming Extra Classes</div>
              <div className="section-sub">Scheduled outside timetable</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/extra-classes')}>
              <Plus size={15} /> Add
            </button>
          </div>

          {upcomingExtra.length === 0 ? (
            <div className="empty-state" style={{ padding: '16px 0' }}>
              <Zap size={32} />
              <p>No upcoming extra classes.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingExtra.map(c => {
                const subject = subjects.find(s => s.id === c.subjectId);
                return (
                  <div key={c.id} style={{ display: 'flex', gap: 12, padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${subject?.color || '#6366f1'}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{subject?.name}</span>
                        <span className="badge badge-purple" style={{ fontSize: 9 }}>{c.classType}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {format(parseISO(c.date), 'EEE, MMM d')} · {c.startTime}–{c.endTime}
                        {c.location ? ` · ${c.location}` : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="section-title" style={{ marginBottom: 16 }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Add Subject', icon: BookOpen, to: '/subjects', color: '#6366f1' },
            { label: 'View Calendar', icon: CalendarDays, to: '/calendar', color: '#3b82f6' },
            { label: 'Add Extra Class', icon: Plus, to: '/extra-classes', color: '#10b981' },
            { label: 'View Reports', icon: TrendingUp, to: '/reports', color: '#f59e0b' },
            { label: 'Semester Settings', icon: Target, to: '/semester', color: '#8b5cf6' },
          ].map(({ label, icon: Icon, to, color }) => (
            <button
              key={to}
              className="btn btn-secondary"
              onClick={() => navigate(to)}
              style={{ gap: 8 }}
            >
              <Icon size={16} color={color} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
