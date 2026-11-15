import type {
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  DashboardData,
  HistoryItem,
  RosterStatus,
  Student,
  StudentLookupResult,
  StudentSessionMeta,
} from './types';

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let body: { error?: string; message?: string; record?: AttendanceRecord } = {};
    try {
      body = (await res.json()) as { error?: string; message?: string };
    } catch {
      // ignore non-json error body
    }
    throw new ApiError(res.status, body.error || 'REQUEST_FAILED', body.message || 'Request failed');
  }

  return (await res.json()) as T;
}

export async function verifyAdminPin(pin: string): Promise<{ valid: boolean; hostelName: string }> {
  return request('/api/admin/verify-pin', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
}

export async function changeAdminPin(pin: string, newPin: string): Promise<{ ok: boolean }> {
  return request('/api/admin/change-pin', {
    method: 'POST',
    headers: { 'x-admin-pin': pin },
    body: JSON.stringify({ newPin }),
  });
}

export async function fetchDashboard(pin: string, date: string): Promise<DashboardData> {
  return request(`/api/admin/dashboard?date=${encodeURIComponent(date)}`, {
    headers: { 'x-admin-pin': pin },
  });
}

export async function startAttendanceSession(
  pin: string,
  date: string
): Promise<{ session: AttendanceSession }> {
  return request('/api/admin/sessions/start', {
    method: 'POST',
    headers: { 'x-admin-pin': pin },
    body: JSON.stringify({ date }),
  });
}

export async function adminSetAttendance(
  pin: string,
  date: string,
  studentId: string,
  status: RosterStatus
): Promise<{ record: AttendanceRecord | null }> {
  return request('/api/admin/attendance', {
    method: 'PUT',
    headers: { 'x-admin-pin': pin },
    body: JSON.stringify({ date, studentId, status }),
  });
}

export async function fetchStudents(pin: string): Promise<{ students: Student[] }> {
  return request('/api/admin/students', {
    headers: { 'x-admin-pin': pin },
  });
}

export async function addStudent(
  pin: string,
  payload: { fullName: string; roomNumber: string; mobileNumber: string }
): Promise<{ student: Student }> {
  return request('/api/admin/students', {
    method: 'POST',
    headers: { 'x-admin-pin': pin },
    body: JSON.stringify(payload),
  });
}

export async function updateStudent(
  pin: string,
  studentId: string,
  payload: { fullName: string; roomNumber: string; mobileNumber: string }
): Promise<{ student: Student }> {
  return request(`/api/admin/students/${encodeURIComponent(studentId)}`, {
    method: 'PATCH',
    headers: { 'x-admin-pin': pin },
    body: JSON.stringify(payload),
  });
}

export async function deleteStudent(pin: string, studentId: string): Promise<{ ok: boolean }> {
  return request(`/api/admin/students/${encodeURIComponent(studentId)}`, {
    method: 'DELETE',
    headers: { 'x-admin-pin': pin },
  });
}

export async function fetchHistory(pin: string): Promise<{ history: HistoryItem[] }> {
  return request('/api/admin/history', {
    headers: { 'x-admin-pin': pin },
  });
}

export async function downloadCsvForDate(pin: string, date: string): Promise<void> {
  const res = await fetch(`/api/admin/export-csv?date=${encodeURIComponent(date)}`, {
    headers: { 'x-admin-pin': pin },
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'CSV_FAILED', 'Could not download CSV');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sunshine-pg-attendance-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Public Student Session APIs
export async function fetchStudentSession(token: string): Promise<StudentSessionMeta> {
  return request(`/api/session/${encodeURIComponent(token)}`);
}

export async function fetchSessionRooms(token: string): Promise<{ rooms: string[] }> {
  return request(`/api/session/${encodeURIComponent(token)}/rooms`);
}

export async function lookupStudentsInSession(
  token: string,
  query: string,
  room?: string
): Promise<{ results: StudentLookupResult[] }> {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (room) params.set('room', room);
  return request(`/api/session/${encodeURIComponent(token)}/lookup?${params.toString()}`);
}

export async function fetchStudentInSession(
  token: string,
  studentId: string
): Promise<{ student: StudentLookupResult }> {
  return request(
    `/api/session/${encodeURIComponent(token)}/student/${encodeURIComponent(studentId)}`
  );
}

export async function markStudentAttendance(
  token: string,
  studentId: string,
  status: AttendanceStatus
): Promise<{ record: AttendanceRecord }> {
  const res = await fetch(`/api/session/${encodeURIComponent(token)}/mark`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, status }),
  });
  const data = (await res.json()) as {
    record?: AttendanceRecord;
    error?: string;
    message?: string;
  };
  if (res.status === 409 && data.record) {
    return { record: data.record };
  }
  if (!res.ok || !data.record) {
    throw new ApiError(res.status, data.error || 'MARK_FAILED', data.message || 'Could not save attendance');
  }
  return { record: data.record };
}
