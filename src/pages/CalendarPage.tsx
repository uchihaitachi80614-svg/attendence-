import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isToday, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useStore } from '../lib/store';
import AttendanceBtnGroup from '../components/AttendanceBtnGroup';
import type { DayOfWeek } from '../types';

const DAY_MAP: Record<number, DayOfWeek> = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };

export default function CalendarPage() {
  const { subjects, timetableEntries, classOccurrences, attendanceRecords, ensureRegularOccurrence, getAttendanceStatus } = useStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>('all');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart); // 0=Sun

  // Build class map for the month
  const classMap = useMemo(() => {
    const map: Record<string, { occurrences: typeof classOccurrences; timetableIds: string[] }> = {};
    // Extra/special classes
    classOccurrences.forEach(c => {
      if (!map[c.date]) map[c.date] = { occurrences: [], timetableIds: [] };
      if (!map[c.date].occurrences.find(x => x.id === c.id)) {
        map[c.date].occurrences.push(c);
      }
    });
    // Regular timetable classes
    calDays.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayOfWeek = DAY_MAP[getDay(day)];
      const dayEntries = timetableEntries.filter(t => t.dayOfWeek === dayOfWeek);
      dayEntries.forEach(entry => {
        if (!map[dayStr]) map[dayStr] = { occurrences: [], timetableIds: [] };
        if (!map[dayStr].timetableIds.includes(entry.id)) {
          map[dayStr].timetableIds.push(entry.id);
        }
        // Add existing occurrences
        const existing = classOccurrences.find(c => c.timetableEntryId === entry.id && c.date === dayStr);
        if (existing && !map[dayStr].occurrences.find(x => x.id === existing.id)) {
          map[dayStr].occurrences.push(existing);
        }
      });
    });
    return map;
  }, [calDays, classOccurrences, timetableEntries]);

  const getDotsForDay = (dateStr: string) => {
    const data = classMap[dateStr];
    if (!data) return [];
    const dots: { color: string; status: string }[] = [];
    
    data.timetableIds.forEach(tid => {
      const entry = timetableEntries.find(t => t.id === tid);
      if (!entry) return;
      const subject = subjects.find(s => s.id === entry.subjectId);
      const occ = classOccurrences.find(c => c.timetableEntryId === tid && c.date === dateStr);
      const status = occ ? attendanceRecords.find(a => a.classOccurrenceId === occ.id)?.status || 'not_marked' : 'not_marked';
      dots.push({ color: subject?.color || '#6366f1', status });
    });
    
    data.occurrences.filter(c => c.classType !== 'regular').forEach(c => {
      const subject = subjects.find(s => s.id === c.subjectId);
      const status = attendanceRecords.find(a => a.classOccurrenceId === c.id)?.status || 'not_marked';
      dots.push({ color: subject?.color || '#8b5cf6', status });
    });
    
    return dots;
  };

  const getClassesForSelectedDate = () => {
    if (!selectedDate) return [];
    const data = classMap[selectedDate];
    if (!data) return [];
    const classes: Array<{ id: string; subjectName: string; subjectCode: string; color: string; startTime: string; endTime: string; classType: string; isExtra: boolean; occurrence: typeof classOccurrences[0] | null; timetableEntryId?: string }> = [];

    // Regular timetable classes
    data.timetableIds.forEach(tid => {
      const entry = timetableEntries.find(t => t.id === tid);
      if (!entry) return;
      const subject = subjects.find(s => s.id === entry.subjectId);
      if (!subject) return;
      if (filterSubject !== 'all' && subject.id !== filterSubject) return;
      const occ = classOccurrences.find(c => c.timetableEntryId === tid && c.date === selectedDate);
      classes.push({
        id: tid,
        subjectName: subject.name,
        subjectCode: subject.code,
        color: subject.color,
        startTime: entry.startTime,
        endTime: entry.endTime,
        classType: 'Regular',
        isExtra: false,
        occurrence: occ || null,
        timetableEntryId: tid,
      });
    });

    // Extra classes
    data.occurrences.filter(c => c.classType !== 'regular').forEach(c => {
      const subject = subjects.find(s => s.id === c.subjectId);
      if (!subject) return;
      if (filterSubject !== 'all' && subject.id !== filterSubject) return;
      classes.push({
        id: c.id,
        subjectName: subject.name,
        subjectCode: subject.code,
        color: subject.color,
        startTime: c.startTime,
        endTime: c.endTime,
        classType: c.classType,
        isExtra: true,
        occurrence: c,
      });
    });

    return classes.sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const selectedClasses = useMemo(getClassesForSelectedDate, [selectedDate, classMap, subjects, classOccurrences, attendanceRecords, filterSubject]);

  const dotColor = (status: string) => {
    if (status === 'present') return '#10b981';
    if (status === 'absent') return '#ef4444';
    if (status === 'cancelled') return '#94a3b8';
    return '#f59e0b';
  };

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="section-title" style={{ fontSize: 22 }}>Attendance Calendar</h1>
          <p className="section-sub">Click a date to view and mark attendance</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            className="form-input"
            style={{ width: 'auto' }}
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
          >
            <option value="all">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'flex-start' }}>
        {/* Calendar */}
        <div className="card">
          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button className="btn btn-ghost btn-icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontWeight: 700, fontSize: 18 }}>{format(currentMonth, 'MMMM yyyy')}</span>
            <button className="btn btn-ghost btn-icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day Headers */}
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="calendar-header-cell">{d}</div>
            ))}

            {/* Empty cells */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Day cells */}
            {calDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dots = getDotsForDay(dateStr);
              const isSelected = selectedDate === dateStr;
              const isCurrentDay = isToday(day);
              const hasUnmarked = dots.some(d => d.status === 'not_marked');
              return (
                <div
                  key={dateStr}
                  className={`calendar-cell ${isCurrentDay ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                >
                  <div className="calendar-cell-date">{format(day, 'd')}</div>
                  <div className="calendar-dots">
                    {dots.slice(0, 4).map((dot, i) => (
                      <div
                        key={i}
                        className="calendar-dot"
                        style={{ background: dotColor(dot.status), border: dot.status === 'not_marked' ? `2px solid ${dot.color}` : 'none' }}
                        title={dot.status}
                      />
                    ))}
                    {dots.length > 4 && <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{dots.length - 4}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
            {[['#10b981', 'Present'], ['#ef4444', 'Absent'], ['#94a3b8', 'Cancelled'], ['#f59e0b', 'Not Marked']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Selected Day Detail */}
        <div>
          {selectedDate ? (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{selectedClasses.length} class{selectedClasses.length !== 1 ? 'es' : ''}</div>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedDate(null)}><X size={16} /></button>
              </div>

              {selectedClasses.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px 0' }}>
                  <p>No classes on this date{filterSubject !== 'all' ? ' for this subject' : ''}.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedClasses.map(cls => {
                    const status = cls.occurrence ? getAttendanceStatus(cls.occurrence.id) : 'not_marked';
                    return (
                      <div key={cls.id} style={{ padding: '14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${cls.color}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontWeight: 700, fontSize: 14 }}>{cls.subjectName}</span>
                              <span className="badge badge-muted" style={{ fontSize: 10 }}>{cls.subjectCode}</span>
                              {cls.isExtra && <span className="badge badge-purple" style={{ fontSize: 10 }}>{cls.classType}</span>}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              ⏰ {cls.startTime} – {cls.endTime}
                            </div>
                          </div>
                          <div>
                            {status === 'present' && <span className="badge badge-success">Present</span>}
                            {status === 'absent' && <span className="badge badge-danger">Absent</span>}
                            {status === 'cancelled' && <span className="badge badge-muted">Cancelled</span>}
                            {status === 'not_marked' && <span className="badge badge-warning">Unmarked</span>}
                          </div>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          {cls.occurrence ? (
                            <AttendanceBtnGroup occurrence={cls.occurrence} />
                          ) : cls.timetableEntryId ? (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => { ensureRegularOccurrence(cls.timetableEntryId!, selectedDate); }}
                            >
                              Mark Attendance
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="card empty-state" style={{ minHeight: 200 }}>
              <CalendarIcon />
              <p>Click a date on the calendar to view classes and mark attendance.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
    </svg>
  );
}
