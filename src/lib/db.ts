import type {
  User, Subject, TimetableEntry, ClassOccurrence,
  AttendanceRecord, SemesterSettings, UserPreferences
} from '../types';

// Simple hash for passwords (for demo purposes, uses a deterministic hash)
export function hashPassword(password: string): string {
  let hash = 0;
  const salt = 'SSAT_SALT_2024';
  const str = password + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16) + str.length.toString(16);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ============ STORAGE HELPERS ============
function getStore<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as T[];
  } catch {
    return [];
  }
}

function setStore<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function getObject<T>(key: string): T | null {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) as T : null;
  } catch {
    return null;
  }
}

function setObject<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ============ SESSION ============
const SESSION_KEY = 'ssat_session';

export function getCurrentUserId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSession(userId: string): void {
  localStorage.setItem(SESSION_KEY, userId);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// ============ USERS ============
const USERS_KEY = 'ssat_users';

export function getUsers(): User[] {
  return getStore<User>(USERS_KEY);
}

export function getUserById(id: string): User | null {
  return getUsers().find(u => u.id === id) || null;
}

export function getUserByEmail(email: string): User | null {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function getUserByUsername(username: string): User | null {
  return getUsers().find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

export function createUser(data: Omit<User, 'id' | 'createdAt'>): User {
  const users = getUsers();
  const user: User = { ...data, id: generateId(), createdAt: new Date().toISOString() };
  users.push(user);
  setStore(USERS_KEY, users);
  // Create default preferences
  setUserPreferences({ userId: user.id, overallTarget: 75, theme: 'system', updatedAt: new Date().toISOString() });
  return user;
}

export function updateUser(id: string, data: Partial<User>): User | null {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...data };
  setStore(USERS_KEY, users);
  return users[idx];
}

// ============ SUBJECTS ============
const SUBJECTS_KEY = 'ssat_subjects';

export function getSubjects(userId: string): Subject[] {
  return getStore<Subject>(SUBJECTS_KEY).filter(s => s.userId === userId);
}

export function getSubjectById(id: string): Subject | null {
  return getStore<Subject>(SUBJECTS_KEY).find(s => s.id === id) || null;
}

export function createSubject(data: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>): Subject {
  const all = getStore<Subject>(SUBJECTS_KEY);
  const subject: Subject = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  all.push(subject);
  setStore(SUBJECTS_KEY, all);
  return subject;
}

export function updateSubject(id: string, data: Partial<Subject>): Subject | null {
  const all = getStore<Subject>(SUBJECTS_KEY);
  const idx = all.findIndex(s => s.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
  setStore(SUBJECTS_KEY, all);
  return all[idx];
}

export function deleteSubject(id: string): void {
  const all = getStore<Subject>(SUBJECTS_KEY).filter(s => s.id !== id);
  setStore(SUBJECTS_KEY, all);
  // cascade delete timetable entries
  const tt = getStore<TimetableEntry>('ssat_timetable').filter(t => t.subjectId !== id);
  setStore('ssat_timetable', tt);
  // cascade delete class occurrences & attendance
  const occ = getStore<ClassOccurrence>('ssat_classes');
  const toDelete = occ.filter(o => o.subjectId === id).map(o => o.id);
  setStore('ssat_classes', occ.filter(o => o.subjectId !== id));
  const att = getStore<AttendanceRecord>('ssat_attendance').filter(a => !toDelete.includes(a.classOccurrenceId));
  setStore('ssat_attendance', att);
}

// ============ TIMETABLE ============
const TIMETABLE_KEY = 'ssat_timetable';

export function getTimetableEntries(userId: string): TimetableEntry[] {
  return getStore<TimetableEntry>(TIMETABLE_KEY).filter(t => t.userId === userId);
}

export function createTimetableEntry(data: Omit<TimetableEntry, 'id' | 'createdAt' | 'updatedAt'>): TimetableEntry {
  const all = getStore<TimetableEntry>(TIMETABLE_KEY);
  const entry: TimetableEntry = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  all.push(entry);
  setStore(TIMETABLE_KEY, all);
  return entry;
}

export function updateTimetableEntry(id: string, data: Partial<TimetableEntry>): TimetableEntry | null {
  const all = getStore<TimetableEntry>(TIMETABLE_KEY);
  const idx = all.findIndex(t => t.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
  setStore(TIMETABLE_KEY, all);
  return all[idx];
}

export function deleteTimetableEntry(id: string): void {
  setStore(TIMETABLE_KEY, getStore<TimetableEntry>(TIMETABLE_KEY).filter(t => t.id !== id));
}

// ============ CLASS OCCURRENCES ============
const CLASSES_KEY = 'ssat_classes';

export function getClassOccurrences(userId: string): ClassOccurrence[] {
  return getStore<ClassOccurrence>(CLASSES_KEY).filter(c => c.userId === userId);
}

export function getClassOccurrenceById(id: string): ClassOccurrence | null {
  return getStore<ClassOccurrence>(CLASSES_KEY).find(c => c.id === id) || null;
}

export function createClassOccurrence(data: Omit<ClassOccurrence, 'id' | 'createdAt' | 'updatedAt'>): ClassOccurrence {
  const all = getStore<ClassOccurrence>(CLASSES_KEY);
  const occ: ClassOccurrence = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  all.push(occ);
  setStore(CLASSES_KEY, all);
  return occ;
}

export function updateClassOccurrence(id: string, data: Partial<ClassOccurrence>): ClassOccurrence | null {
  const all = getStore<ClassOccurrence>(CLASSES_KEY);
  const idx = all.findIndex(c => c.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
  setStore(CLASSES_KEY, all);
  return all[idx];
}

export function deleteClassOccurrence(id: string): void {
  setStore(CLASSES_KEY, getStore<ClassOccurrence>(CLASSES_KEY).filter(c => c.id !== id));
  setStore('ssat_attendance', getStore<AttendanceRecord>('ssat_attendance').filter(a => a.classOccurrenceId !== id));
}

// Check for existing regular class occurrence (prevent duplicates)
export function findRegularOccurrence(userId: string, timetableEntryId: string, date: string): ClassOccurrence | null {
  return getStore<ClassOccurrence>(CLASSES_KEY).find(
    c => c.userId === userId && c.timetableEntryId === timetableEntryId && c.date === date
  ) || null;
}

// ============ ATTENDANCE RECORDS ============
const ATTENDANCE_KEY = 'ssat_attendance';

export function getAttendanceRecords(userId: string): AttendanceRecord[] {
  return getStore<AttendanceRecord>(ATTENDANCE_KEY).filter(a => a.userId === userId);
}

export function getAttendanceForClass(classOccurrenceId: string): AttendanceRecord | null {
  return getStore<AttendanceRecord>(ATTENDANCE_KEY).find(a => a.classOccurrenceId === classOccurrenceId) || null;
}

export function upsertAttendance(userId: string, classOccurrenceId: string, status: AttendanceRecord['status']): AttendanceRecord {
  const all = getStore<AttendanceRecord>(ATTENDANCE_KEY);
  const idx = all.findIndex(a => a.classOccurrenceId === classOccurrenceId);
  const record: AttendanceRecord = {
    id: idx >= 0 ? all[idx].id : generateId(),
    userId,
    classOccurrenceId,
    status,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) {
    all[idx] = record;
  } else {
    all.push(record);
  }
  setStore(ATTENDANCE_KEY, all);
  return record;
}

// ============ SEMESTER SETTINGS ============
export function getSemesterSettings(userId: string): SemesterSettings | null {
  return getObject<SemesterSettings>(`ssat_semester_${userId}`);
}

export function setSemesterSettings(settings: SemesterSettings): void {
  setObject(`ssat_semester_${settings.userId}`, { ...settings, updatedAt: new Date().toISOString() });
}

// ============ USER PREFERENCES ============
export function getUserPreferences(userId: string): UserPreferences {
  return getObject<UserPreferences>(`ssat_prefs_${userId}`) || {
    userId,
    overallTarget: 75,
    theme: 'system',
    updatedAt: new Date().toISOString(),
  };
}

export function setUserPreferences(prefs: UserPreferences): void {
  setObject(`ssat_prefs_${prefs.userId}`, { ...prefs, updatedAt: new Date().toISOString() });
}

export function updateUserPreferences(userId: string, data: Partial<UserPreferences>): void {
  const current = getUserPreferences(userId);
  setUserPreferences({ ...current, ...data, userId, updatedAt: new Date().toISOString() });
}

// ============ COMPUTED STATS ============
export function computeSubjectStats(subject: Subject, userId: string) {
  const classes = getClassOccurrences(userId).filter(c => c.subjectId === subject.id);
  const attendanceMap = new Map<string, AttendanceRecord>();
  getAttendanceRecords(userId).forEach(a => attendanceMap.set(a.classOccurrenceId, a));

  let attended = subject.initialAttended;
  let total = subject.initialTotal;

  classes.forEach(c => {
    const att = attendanceMap.get(c.id);
    if (!att || att.status === 'not_marked' || att.status === 'cancelled') return;
    total++;
    if (att.status === 'present') attended++;
  });

  const missed = total - attended;
  const percentage = total > 0 ? (attended / total) * 100 : null;
  const target = subject.attendanceTarget / 100;

  let classesNeeded = 0;
  if (percentage !== null && percentage < subject.attendanceTarget) {
    const denominator = 1 - target;
    if (denominator > 0) {
      classesNeeded = Math.max(0, Math.ceil((target * total - attended) / denominator));
    }
  }

  return { subject, attended, total, missed, percentage, targetAchieved: percentage !== null && percentage >= subject.attendanceTarget, classesNeeded };
}

export function computeOverallStats(userId: string) {
  const subjects = getSubjects(userId);
  let totalAttended = 0;
  let totalConducted = 0;

  subjects.forEach(s => {
    const stats = computeSubjectStats(s, userId);
    totalAttended += stats.attended;
    totalConducted += stats.total;
  });

  return {
    totalAttended,
    totalConducted,
    totalMissed: totalConducted - totalAttended,
    percentage: totalConducted > 0 ? (totalAttended / totalConducted) * 100 : null,
    subjectCount: subjects.length,
  };
}

// ============ EXPORT ============
export function exportAttendanceCSV(userId: string): string {
  const subjects = getSubjects(userId);
  const classes = getClassOccurrences(userId);
  const attendanceMap = new Map<string, AttendanceRecord>();
  getAttendanceRecords(userId).forEach(a => attendanceMap.set(a.classOccurrenceId, a));
  const subjectMap = new Map<string, Subject>();
  subjects.forEach(s => subjectMap.set(s.id, s));

  const rows = [['Subject Name', 'Subject Code', 'Date', 'Start Time', 'End Time', 'Class Type', 'Attendance Status']];
  classes.sort((a, b) => a.date.localeCompare(b.date)).forEach(c => {
    const sub = subjectMap.get(c.subjectId);
    const att = attendanceMap.get(c.id);
    if (!sub) return;
    rows.push([sub.name, sub.code, c.date, c.startTime, c.endTime, c.classType, att?.status || 'not_marked']);
  });

  return rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
}
