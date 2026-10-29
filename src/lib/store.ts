import { create } from 'zustand';
import {
  getCurrentUserId, setSession, clearSession,
  getUserById, getUserByEmail, getUserByUsername, createUser, updateUser, hashPassword,
  getSubjects, createSubject, updateSubject, deleteSubject,
  getTimetableEntries, createTimetableEntry, updateTimetableEntry, deleteTimetableEntry,
  getClassOccurrences, createClassOccurrence, updateClassOccurrence, deleteClassOccurrence,
  getAttendanceForClass, upsertAttendance, getAttendanceRecords,
  getSemesterSettings, setSemesterSettings,
  getUserPreferences, updateUserPreferences,
  computeSubjectStats, computeOverallStats,
  findRegularOccurrence,
} from './db';
import type {
  User, Subject, TimetableEntry, ClassOccurrence, AttendanceRecord,
  SemesterSettings, UserPreferences, SubjectStats, OverallStats, DayOfWeek, ClassType
} from '../types';

interface AppState {
  // Auth
  currentUser: User | null;
  isAuthenticated: boolean;
  
  // Data
  subjects: Subject[];
  timetableEntries: TimetableEntry[];
  classOccurrences: ClassOccurrence[];
  attendanceRecords: AttendanceRecord[];
  semesterSettings: SemesterSettings | null;
  preferences: UserPreferences | null;

  // Actions - Auth
  login: (emailOrUsername: string, password: string) => { success: boolean; error?: string };
  register: (data: { fullName: string; username: string; email: string; password: string }) => { success: boolean; error?: string };
  logout: () => void;
  updateProfile: (data: Partial<User>) => { success: boolean; error?: string };

  // Actions - Data loading
  loadUserData: (userId: string) => void;

  // Actions - Subjects
  addSubject: (data: Omit<Subject, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Subject;
  editSubject: (id: string, data: Partial<Subject>) => void;
  removeSubject: (id: string) => void;

  // Actions - Timetable
  addTimetableEntry: (data: Omit<TimetableEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => TimetableEntry;
  editTimetableEntry: (id: string, data: Partial<TimetableEntry>) => void;
  removeTimetableEntry: (id: string) => void;

  // Actions - Classes
  addExtraClass: (data: Omit<ClassOccurrence, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => ClassOccurrence;
  editClass: (id: string, data: Partial<ClassOccurrence>) => void;
  removeClass: (id: string) => void;
  ensureRegularOccurrence: (timetableEntryId: string, date: string) => ClassOccurrence | null;

  // Actions - Attendance
  markAttendance: (classOccurrenceId: string, status: AttendanceRecord['status']) => void;
  getAttendanceStatus: (classOccurrenceId: string) => AttendanceRecord['status'];

  // Actions - Settings
  saveSemesterSettings: (data: Omit<SemesterSettings, 'userId' | 'updatedAt'>) => void;
  savePreferences: (data: Partial<UserPreferences>) => void;

  // Computed
  getSubjectStats: (subjectId: string) => SubjectStats | null;
  getOverallStats: () => OverallStats;
  getClassesForDate: (date: string) => ClassOccurrence[];
}

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  subjects: [],
  timetableEntries: [],
  classOccurrences: [],
  attendanceRecords: [],
  semesterSettings: null,
  preferences: null,

  login: (emailOrUsername, password) => {
    const user = getUserByEmail(emailOrUsername) || getUserByUsername(emailOrUsername);
    if (!user) return { success: false, error: 'No account found with that email or username.' };
    const hash = hashPassword(password);
    if (user.passwordHash !== hash) return { success: false, error: 'Incorrect password.' };
    setSession(user.id);
    set({ currentUser: user, isAuthenticated: true });
    get().loadUserData(user.id);
    return { success: true };
  },

  register: ({ fullName, username, email, password }) => {
    if (getUserByEmail(email)) return { success: false, error: 'An account with this email already exists.' };
    if (getUserByUsername(username)) return { success: false, error: 'Username already taken.' };
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    const user = createUser({ fullName, username, email, passwordHash: hashPassword(password), avatarColor });
    setSession(user.id);
    set({ currentUser: user, isAuthenticated: true });
    get().loadUserData(user.id);
    return { success: true };
  },

  logout: () => {
    clearSession();
    set({ currentUser: null, isAuthenticated: false, subjects: [], timetableEntries: [], classOccurrences: [], attendanceRecords: [], semesterSettings: null, preferences: null });
  },

  updateProfile: (data) => {
    const { currentUser } = get();
    if (!currentUser) return { success: false, error: 'Not authenticated.' };
    if (data.email && data.email !== currentUser.email) {
      const existing = getUserByEmail(data.email);
      if (existing) return { success: false, error: 'Email already in use.' };
    }
    if (data.username && data.username !== currentUser.username) {
      const existing = getUserByUsername(data.username);
      if (existing) return { success: false, error: 'Username already taken.' };
    }
    const updated = updateUser(currentUser.id, data);
    if (updated) set({ currentUser: updated });
    return { success: true };
  },

  loadUserData: (userId) => {
    set({
      subjects: getSubjects(userId),
      timetableEntries: getTimetableEntries(userId),
      classOccurrences: getClassOccurrences(userId),
      attendanceRecords: getAttendanceRecords(userId),
      semesterSettings: getSemesterSettings(userId),
      preferences: getUserPreferences(userId),
    });
  },

  addSubject: (data) => {
    const { currentUser } = get();
    if (!currentUser) throw new Error('Not authenticated');
    const subject = createSubject({ ...data, userId: currentUser.id });
    set(state => ({ subjects: [...state.subjects, subject] }));
    return subject;
  },

  editSubject: (id, data) => {
    updateSubject(id, data);
    set(state => ({ subjects: state.subjects.map(s => s.id === id ? { ...s, ...data } : s) }));
  },

  removeSubject: (id) => {
    deleteSubject(id);
    const { currentUser } = get();
    if (currentUser) {
      set({
        subjects: getSubjects(currentUser.id),
        timetableEntries: getTimetableEntries(currentUser.id),
        classOccurrences: getClassOccurrences(currentUser.id),
        attendanceRecords: getAttendanceRecords(currentUser.id),
      });
    }
  },

  addTimetableEntry: (data) => {
    const { currentUser } = get();
    if (!currentUser) throw new Error('Not authenticated');
    const entry = createTimetableEntry({ ...data, userId: currentUser.id });
    set(state => ({ timetableEntries: [...state.timetableEntries, entry] }));
    return entry;
  },

  editTimetableEntry: (id, data) => {
    updateTimetableEntry(id, data);
    set(state => ({ timetableEntries: state.timetableEntries.map(t => t.id === id ? { ...t, ...data } : t) }));
  },

  removeTimetableEntry: (id) => {
    deleteTimetableEntry(id);
    set(state => ({ timetableEntries: state.timetableEntries.filter(t => t.id !== id) }));
  },

  addExtraClass: (data) => {
    const { currentUser } = get();
    if (!currentUser) throw new Error('Not authenticated');
    const occ = createClassOccurrence({ ...data, userId: currentUser.id });
    set(state => ({ classOccurrences: [...state.classOccurrences, occ] }));
    return occ;
  },

  editClass: (id, data) => {
    updateClassOccurrence(id, data);
    set(state => ({ classOccurrences: state.classOccurrences.map(c => c.id === id ? { ...c, ...data } : c) }));
  },

  removeClass: (id) => {
    deleteClassOccurrence(id);
    set(state => ({
      classOccurrences: state.classOccurrences.filter(c => c.id !== id),
      attendanceRecords: state.attendanceRecords.filter(a => a.classOccurrenceId !== id),
    }));
  },

  ensureRegularOccurrence: (timetableEntryId, date) => {
    const { currentUser, timetableEntries, subjects } = get();
    if (!currentUser) return null;
    
    const existing = findRegularOccurrence(currentUser.id, timetableEntryId, date);
    if (existing) return existing;

    const entry = timetableEntries.find(t => t.id === timetableEntryId);
    if (!entry) return null;
    const subject = subjects.find(s => s.id === entry.subjectId);
    if (!subject) return null;

    const occ = createClassOccurrence({
      userId: currentUser.id,
      subjectId: entry.subjectId,
      date,
      startTime: entry.startTime,
      endTime: entry.endTime,
      classType: 'regular',
      timetableEntryId,
      location: entry.location,
      notes: entry.notes,
    });
    set(state => ({ classOccurrences: [...state.classOccurrences, occ] }));
    return occ;
  },

  markAttendance: (classOccurrenceId, status) => {
    const { currentUser } = get();
    if (!currentUser) return;
    const record = upsertAttendance(currentUser.id, classOccurrenceId, status);
    set(state => {
      const existing = state.attendanceRecords.findIndex(a => a.classOccurrenceId === classOccurrenceId);
      if (existing >= 0) {
        const updated = [...state.attendanceRecords];
        updated[existing] = record;
        return { attendanceRecords: updated };
      }
      return { attendanceRecords: [...state.attendanceRecords, record] };
    });
  },

  getAttendanceStatus: (classOccurrenceId) => {
    const { attendanceRecords } = get();
    return attendanceRecords.find(a => a.classOccurrenceId === classOccurrenceId)?.status || 'not_marked';
  },

  saveSemesterSettings: (data) => {
    const { currentUser } = get();
    if (!currentUser) return;
    const settings: SemesterSettings = { ...data, userId: currentUser.id, updatedAt: new Date().toISOString() };
    setSemesterSettings(settings);
    set({ semesterSettings: settings });
  },

  savePreferences: (data) => {
    const { currentUser, preferences } = get();
    if (!currentUser) return;
    updateUserPreferences(currentUser.id, data);
    const updated = { ...preferences!, ...data, userId: currentUser.id };
    set({ preferences: updated });
  },

  getSubjectStats: (subjectId) => {
    const { currentUser, subjects } = get();
    if (!currentUser) return null;
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return null;
    return computeSubjectStats(subject, currentUser.id);
  },

  getOverallStats: () => {
    const { currentUser } = get();
    if (!currentUser) return { totalAttended: 0, totalConducted: 0, totalMissed: 0, percentage: null, subjectCount: 0 };
    return computeOverallStats(currentUser.id);
  },

  getClassesForDate: (date) => {
    return get().classOccurrences.filter(c => c.date === date);
  },
}));

// Initialize from session on load
export function initStore() {
  const userId = getCurrentUserId();
  if (userId) {
    const user = getUserById(userId);
    if (user) {
      useStore.setState({ currentUser: user, isAuthenticated: true });
      useStore.getState().loadUserData(userId);
    } else {
      clearSession();
    }
  }
}
