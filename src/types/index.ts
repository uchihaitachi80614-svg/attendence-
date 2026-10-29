export type AttendanceStatus = 'present' | 'absent' | 'cancelled' | 'not_marked';
export type ClassType = 'regular' | 'extra' | 'special' | 'rescheduled' | 'remedial' | 'lab' | 'tutorial' | 'other';
export type Theme = 'light' | 'dark' | 'system';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  passwordHash: string;
  avatarColor: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  code: string;
  facultyName?: string;
  category?: string;
  color: string;
  attendanceTarget: number; // percentage 0-100
  initialAttended: number;
  initialTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableEntry {
  id: string;
  userId: string;
  subjectId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassOccurrence {
  id: string;
  userId: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  classType: ClassType;
  timetableEntryId?: string; // for regular classes
  location?: string;
  notes?: string;
  facultyName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  classOccurrenceId: string;
  status: AttendanceStatus;
  updatedAt: string;
}

export interface SemesterSettings {
  userId: string;
  semesterName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  updatedAt: string;
}

export interface UserPreferences {
  userId: string;
  overallTarget: number; // percentage
  theme: Theme;
  updatedAt: string;
}

// Computed types
export interface SubjectStats {
  subject: Subject;
  attended: number;
  total: number;
  missed: number;
  percentage: number | null;
  targetAchieved: boolean;
  classesNeeded: number;
}

export interface OverallStats {
  totalAttended: number;
  totalConducted: number;
  totalMissed: number;
  percentage: number | null;
  subjectCount: number;
}

export interface ClassWithDetails {
  occurrence: ClassOccurrence;
  subject: Subject;
  attendance: AttendanceRecord | null;
  timetableEntry?: TimetableEntry;
}
