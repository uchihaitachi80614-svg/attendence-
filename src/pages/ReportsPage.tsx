
import { useState, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Download, Award, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useStore } from '../lib/store';
import { computeSubjectStats, exportAttendanceCSV } from '../lib/db';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const { currentUser, subjects, classOccurrences, attendanceRecords, preferences } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'monthly'>('overview');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const overallTarget = preferences?.overallTarget || 75;

  const allStats = useMemo(() =>
    subjects.map(s => computeSubjectStats(s, currentUser!.id)),
    [subjects, attendanceRecords, classOccurrences]
  );

  const totalAttended = allStats.reduce((a, s) => a + s.attended, 0);
  const totalConducted = allStats.reduce((a, s) => a + s.total, 0);
  const totalMissed = totalConducted - totalAttended;
  const overallPct = totalConducted > 0 ? (totalAttended / totalConducted) * 100 : null;

  const regularCount = classOccurrences.filter(c => c.classType === 'regular').length;
  const extraCount = classOccurrences.filter(c => c.classType !== 'regular').length;

  // Monthly data for the selected month
  const monthlyData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(start);
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayClasses = classOccurrences.filter(c => c.date === dateStr);
      let present = 0, absent = 0;
      dayClasses.forEach(c => {
        const att = attendanceRecords.find(a => a.classOccurrenceId === c.id);
        if (att?.status === 'present') present++;
        else if (att?.status === 'absent') absent++;
      });
      return { date: format(day, 'd'), present, absent, total: present + absent };
    }).filter(d => d.total > 0);
  }, [selectedMonth, classOccurrences, attendanceRecords]);

  // Export CSV
  const handleExport = () => {
    const csv = exportAttendanceCSV(currentUser!.id);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Attendance data exported to CSV!');
  };

  const pieData = [
    { name: 'Present', value: totalAttended, color: '#10b981' },
    { name: 'Absent', value: totalMissed, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const barData = allStats.map(s => ({
    name: s.subject.code || s.subject.name.slice(0, 8),
    fullName: s.subject.name,
    attended: s.attended,
    missed: s.missed,
    target: s.subject.attendanceTarget,
    pct: s.percentage !== null ? parseFloat(s.percentage.toFixed(1)) : 0,
    color: s.subject.color,
  }));

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="section-title" style={{ fontSize: 22 }}>Reports & Analytics</h1>
          <p className="section-sub">Comprehensive attendance analysis</p>
        </div>
        <button className="btn btn-primary" onClick={handleExport}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {(['overview', 'subjects', 'monthly'] as const).map(t => (
          <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid-4" style={{ marginBottom: 24 }}>
            {[
              { label: 'Overall Attendance', value: overallPct !== null ? `${overallPct.toFixed(1)}%` : 'N/A', color: '#6366f1' },
              { label: 'Classes Attended', value: totalAttended, color: '#10b981' },
              { label: 'Classes Missed', value: totalMissed, color: '#ef4444' },
              { label: 'Total Conducted', value: totalConducted, color: '#3b82f6' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-card-label">{s.label}</div>
                <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid-2" style={{ gap: 24 }}>
            {/* Overall Progress */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: 16 }}>Overall Progress</div>
              {overallPct !== null ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 48, fontWeight: 800, color: overallPct >= overallTarget ? '#10b981' : '#ef4444' }}>
                        {overallPct.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Current</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 48, fontWeight: 800, color: '#6366f1' }}>{overallTarget}%</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Target</div>
                    </div>
                  </div>
                  <div className="progress-bar lg">
                    <div className="progress-fill" style={{ width: `${Math.min(100, overallPct)}%`, background: overallPct >= overallTarget ? 'var(--gradient-success)' : 'var(--gradient-danger)' }} />
                  </div>
                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    {overallPct >= overallTarget
                      ? <div className="badge badge-success" style={{ fontSize: 13, padding: '6px 16px' }}><Award size={14} /> Target Achieved! You're on track.</div>
                      : (() => {
                          const target = overallTarget / 100;
                          const needed = Math.max(0, Math.ceil((target * totalConducted - totalAttended) / (1 - target)));
                          return <div className="badge badge-danger" style={{ fontSize: 13, padding: '6px 16px' }}><AlertTriangle size={14} /> Need {needed} more consecutive class{needed !== 1 ? 'es' : ''}</div>;
                        })()
                    }
                  </div>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '20px 0' }}><p>No attendance data yet.</p></div>
              )}
            </div>

            {/* Pie Chart */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: 16 }}>Present vs Absent</div>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: '20px 0' }}><p>No data to display.</p></div>
              )}
            </div>
          </div>

          {/* Class Type Breakdown */}
          <div className="card" style={{ marginTop: 24 }}>
            <div className="section-title" style={{ marginBottom: 16 }}>Class Breakdown</div>
            <div className="grid-3">
              <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#6366f1' }}>{regularCount}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Regular Classes</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#8b5cf6' }}>{extraCount}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Extra Classes</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6' }}>{subjects.length}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Subjects</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subjects Tab */}
      {activeTab === 'subjects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Bar Chart */}
          {barData.length > 0 && (
            <div className="card">
              <div className="section-title" style={{ marginBottom: 16 }}>Attendance % by Subject</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8 }}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    formatter={(value, name) => [`${value}%`, name === 'pct' ? 'Attendance %' : name]}
                  />
                  <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Subject Table */}
          <div className="card">
            <div className="section-title" style={{ marginBottom: 16 }}>Subject-wise Details</div>
            {subjects.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}><p>No subjects added yet.</p></div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Code</th>
                      <th>Attended</th>
                      <th>Missed</th>
                      <th>Total</th>
                      <th>Attendance %</th>
                      <th>Target</th>
                      <th>Status</th>
                      <th>Need</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allStats.map(({ subject, attended, missed, total, percentage, targetAchieved, classesNeeded }) => (
                      <tr key={subject.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: subject.color, flexShrink: 0 }} />
                            {subject.name}
                          </div>
                        </td>
                        <td><span className="badge badge-muted">{subject.code}</span></td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>{attended}</td>
                        <td style={{ color: '#ef4444', fontWeight: 600 }}>{missed}</td>
                        <td>{total}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700 }}>{percentage !== null ? `${percentage.toFixed(1)}%` : 'N/A'}</span>
                            {percentage !== null && <div className="progress-bar" style={{ width: 60 }}>
                              <div className="progress-fill" style={{ width: `${Math.min(100, percentage)}%`, background: subject.color }} />
                            </div>}
                          </div>
                        </td>
                        <td>{subject.attendanceTarget}%</td>
                        <td>
                          {percentage !== null
                            ? targetAchieved
                              ? <span className="badge badge-success">On Track</span>
                              : <span className="badge badge-danger">Below</span>
                            : <span className="badge badge-muted">N/A</span>
                          }
                        </td>
                        <td>
                          {!targetAchieved && classesNeeded > 0
                            ? <span style={{ fontWeight: 600, color: '#f59e0b' }}>{classesNeeded} class{classesNeeded !== 1 ? 'es' : ''}</span>
                            : <span style={{ color: '#10b981' }}>✓</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Monthly Tab */}
      {activeTab === 'monthly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="section-title">Monthly Attendance</div>
              <input
                className="form-input"
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                style={{ width: 'auto' }}
              />
            </div>

            {monthlyData.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}><p>No attendance data for this month.</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="present" name="Present" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
