export type Language = 'en' | 'hi';

export type AttendanceStatus = 'present' | 'absent';
export type RosterStatus = AttendanceStatus | 'not_marked';
export type MarkedBy = 'student' | 'admin';

export interface Student {
  id: string;
  fullName: string;
  roomNumber: string;
  mobileNumber: string;
  createdAt: string;
}

export interface AttendanceSession {
  id: string;
  date: string;
  token: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  markedAt: string;
  markedBy: MarkedBy;
}

export interface RosterItem {
  student: Student;
  status: RosterStatus;
  markedAt: string | null;
  markedBy: MarkedBy | null;
}

export interface DashboardSummary {
  total: number;
  present: number;
  absent: number;
  notMarked: number;
}

export interface DashboardData {
  hostelName: string;
  date: string;
  session: AttendanceSession | null;
  summary: DashboardSummary;
  roster: RosterItem[];
}

export interface HistoryItem {
  date: string;
  token: string | null;
  total: number;
  present: number;
  absent: number;
  notMarked: number;
}

export interface StudentSessionMeta {
  hostelName: string;
  date: string;
  token: string;
  totalStudents: number;
}

export interface StudentLookupResult {
  id: string;
  fullName: string;
  roomNumber: string;
  maskedMobile: string;
  record: AttendanceRecord | null;
}
