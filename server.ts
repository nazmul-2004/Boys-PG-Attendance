import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type AttendanceStatus = 'present' | 'absent';
type MarkedBy = 'student' | 'admin';

interface Student {
  id: string;
  fullName: string;
  roomNumber: string;
  mobileNumber: string;
  createdAt: string;
}

interface AttendanceSession {
  id: string;
  date: string; // YYYY-MM-DD
  token: string;
  createdAt: string;
}

interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  markedAt: string;
  markedBy: MarkedBy;
}

interface StoreData {
  hostelName: string;
  adminPin: string;
  students: Student[];
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'pg-attendance.json');

const PORT = Number(process.env.PORT) || 3000;

function formatDateOffset(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateToken(date: string): string {
  const compactDate = date.replace(/-/g, '');
  const randomPart = crypto.randomBytes(3).toString('hex');
  return `sbpg-${compactDate}-${randomPart}`;
}

function createSeedData(): StoreData {
  const now = new Date().toISOString();
  const yesterday = formatDateOffset(-1);
  const twoDaysAgo = formatDateOffset(-2);

  const students: Student[] = [
    { id: 'stu-101', fullName: 'Aarav Sharma', roomNumber: '101', mobileNumber: '9876501001', createdAt: now },
    { id: 'stu-102', fullName: 'Rohan Verma', roomNumber: '101', mobileNumber: '9876501002', createdAt: now },
    { id: 'stu-103', fullName: 'Aditya Patel', roomNumber: '102', mobileNumber: '9876501003', createdAt: now },
    { id: 'stu-104', fullName: 'Vikram Singh', roomNumber: '102', mobileNumber: '9876501004', createdAt: now },
    { id: 'stu-105', fullName: 'Karan Gupta', roomNumber: '103', mobileNumber: '9876501005', createdAt: now },
    { id: 'stu-106', fullName: 'Siddharth Nair', roomNumber: '104', mobileNumber: '9876501006', createdAt: now },
    { id: 'stu-107', fullName: 'Manish Kumar', roomNumber: '201', mobileNumber: '9876501007', createdAt: now },
    { id: 'stu-108', fullName: 'Deepak Yadav', roomNumber: '202', mobileNumber: '9876501008', createdAt: now },
    { id: 'stu-109', fullName: 'Nikhil Joshi', roomNumber: '203', mobileNumber: '9876501009', createdAt: now },
    { id: 'stu-110', fullName: 'Vivek Mishra', roomNumber: '204', mobileNumber: '9876501010', createdAt: now },
  ];

  const sessions: AttendanceSession[] = [
    {
      id: 'sess-seed-1',
      date: yesterday,
      token: `sbpg-${yesterday.replace(/-/g, '')}-demo1`,
      createdAt: `${yesterday}T14:30:00.000Z`,
    },
    {
      id: 'sess-seed-2',
      date: twoDaysAgo,
      token: `sbpg-${twoDaysAgo.replace(/-/g, '')}-demo2`,
      createdAt: `${twoDaysAgo}T14:30:00.000Z`,
    },
  ];

  const yesterdayStatuses: Array<{ studentId: string; status: AttendanceStatus; time: string; by: MarkedBy }> = [
    { studentId: 'stu-101', status: 'present', time: '14:42:10', by: 'student' },
    { studentId: 'stu-102', status: 'present', time: '14:45:22', by: 'student' },
    { studentId: 'stu-103', status: 'absent', time: '14:51:04', by: 'student' },
    { studentId: 'stu-104', status: 'present', time: '15:02:19', by: 'student' },
    { studentId: 'stu-105', status: 'present', time: '15:10:40', by: 'student' },
    { studentId: 'stu-106', status: 'present', time: '15:18:11', by: 'student' },
    { studentId: 'stu-107', status: 'absent', time: '15:30:00', by: 'admin' },
    { studentId: 'stu-108', status: 'present', time: '15:34:55', by: 'student' },
    { studentId: 'stu-109', status: 'present', time: '15:40:12', by: 'student' },
  ];

  const twoDaysAgoStatuses: Array<{ studentId: string; status: AttendanceStatus; time: string; by: MarkedBy }> = [
    { studentId: 'stu-101', status: 'present', time: '14:38:05', by: 'student' },
    { studentId: 'stu-102', status: 'present', time: '14:40:18', by: 'student' },
    { studentId: 'stu-103', status: 'present', time: '14:44:30', by: 'student' },
    { studentId: 'stu-104', status: 'absent', time: '14:55:12', by: 'student' },
    { studentId: 'stu-105', status: 'present', time: '15:01:28', by: 'student' },
    { studentId: 'stu-106', status: 'present', time: '15:09:44', by: 'student' },
    { studentId: 'stu-107', status: 'present', time: '15:14:02', by: 'student' },
    { studentId: 'stu-108', status: 'present', time: '15:22:36', by: 'student' },
    { studentId: 'stu-109', status: 'absent', time: '15:35:00', by: 'admin' },
    { studentId: 'stu-110', status: 'present', time: '15:38:19', by: 'student' },
  ];

  const records: AttendanceRecord[] = [
    ...yesterdayStatuses.map((item, idx) => ({
      id: `rec-y-${idx + 1}`,
      date: yesterday,
      sessionId: 'sess-seed-1',
      studentId: item.studentId,
      status: item.status,
      markedAt: `${yesterday}T${item.time}.000Z`,
      markedBy: item.by,
    })),
    ...twoDaysAgoStatuses.map((item, idx) => ({
      id: `rec-t-${idx + 1}`,
      date: twoDaysAgo,
      sessionId: 'sess-seed-2',
      studentId: item.studentId,
      status: item.status,
      markedAt: `${twoDaysAgo}T${item.time}.000Z`,
      markedBy: item.by,
    })),
  ];

  return {
    hostelName: 'Sunshine Boys PG',
    adminPin: '1234',
    students,
    sessions,
    records,
  };
}

let writeQueue: Promise<void> = Promise.resolve();

async function ensureStore(): Promise<StoreData> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw) as StoreData;
  } catch {
    const seed = createSeedData();
    await fs.writeFile(DATA_FILE, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }
}

async function readStore(): Promise<StoreData> {
  return ensureStore();
}

async function mutateStore<T>(fn: (store: StoreData) => T | Promise<T>): Promise<T> {
  const task = writeQueue.then(async () => {
    const store = await ensureStore();
    const result = await fn(store);
    const tempFile = `${DATA_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(store, null, 2), 'utf8');
    await fs.rename(tempFile, DATA_FILE);
    return result;
  });
  writeQueue = task.then(
    () => undefined,
    () => undefined
  );
  return task;
}

function normalizeMobile(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

function isValidDateString(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function maskMobile(mobile: string): string {
  if (mobile.length <= 4) return mobile;
  return `${'•'.repeat(mobile.length - 4)}${mobile.slice(-4)}`;
}

function escapeCsvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function sortStudents(students: Student[]): Student[] {
  return [...students].sort((a, b) => {
    const roomCompare = a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
    if (roomCompare !== 0) return roomCompare;
    return a.fullName.localeCompare(b.fullName);
  });
}

async function startServer() {
  await ensureStore();

  const app = express();
  app.use(express.json({ limit: '256kb' }));

  const requireAdminPin = async (req: Request, res: Response, next: NextFunction) => {
    const pin = String(req.header('x-admin-pin') || '').trim();
    const store = await readStore();
    if (!pin || pin !== store.adminPin) {
      res.status(401).json({ error: 'INVALID_PIN', message: 'Invalid Admin PIN' });
      return;
    }
    next();
  };

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Admin PIN verification
  app.post('/api/admin/verify-pin', async (req, res) => {
    const pin = String(req.body?.pin || '').trim();
    const store = await readStore();
    if (!pin || pin !== store.adminPin) {
      res.status(401).json({ valid: false, error: 'INVALID_PIN' });
      return;
    }
    res.json({ valid: true, hostelName: store.hostelName });
  });

  // Update Admin PIN
  app.post('/api/admin/change-pin', requireAdminPin, async (req, res) => {
    const newPin = String(req.body?.newPin || '').trim();
    if (!/^\d{4}$/.test(newPin)) {
      res.status(400).json({ error: 'INVALID_NEW_PIN', message: 'PIN must be exactly 4 digits.' });
      return;
    }
    await mutateStore((store) => {
      store.adminPin = newPin;
    });
    res.json({ ok: true });
  });

  // Admin Dashboard for a selected date
  app.get('/api/admin/dashboard', requireAdminPin, async (req, res) => {
    const date = String(req.query.date || formatDateOffset(0));
    if (!isValidDateString(date)) {
      res.status(400).json({ error: 'INVALID_DATE' });
      return;
    }

    const store = await readStore();
    const session = store.sessions.find((s) => s.date === date) || null;
    const recordsForDate = store.records.filter((r) => r.date === date);
    const recordByStudent = new Map(recordsForDate.map((r) => [r.studentId, r]));

    const sorted = sortStudents(store.students);
    let present = 0;
    let absent = 0;
    let notMarked = 0;

    const roster = sorted.map((student) => {
      const record = recordByStudent.get(student.id) || null;
      if (record?.status === 'present') present += 1;
      else if (record?.status === 'absent') absent += 1;
      else notMarked += 1;

      return {
        student,
        status: record ? record.status : ('not_marked' as const),
        markedAt: record ? record.markedAt : null,
        markedBy: record ? record.markedBy : null,
      };
    });

    res.json({
      hostelName: store.hostelName,
      date,
      session,
      summary: {
        total: sorted.length,
        present,
        absent,
        notMarked,
      },
      roster,
    });
  });

  // List students
  app.get('/api/admin/students', requireAdminPin, async (_req, res) => {
    const store = await readStore();
    res.json({ students: sortStudents(store.students) });
  });

  // Add student
  app.post('/api/admin/students', requireAdminPin, async (req, res) => {
    const fullName = String(req.body?.fullName || '').trim();
    const roomNumber = String(req.body?.roomNumber || '').trim();
    const mobileNumber = normalizeMobile(String(req.body?.mobileNumber || ''));

    if (fullName.length < 2 || fullName.length > 80) {
      res.status(400).json({ error: 'INVALID_NAME', message: 'Enter a valid full name.' });
      return;
    }
    if (roomNumber.length < 1 || roomNumber.length > 20) {
      res.status(400).json({ error: 'INVALID_ROOM', message: 'Enter a valid room number.' });
      return;
    }
    if (!/^\d{10}$/.test(mobileNumber)) {
      res.status(400).json({ error: 'INVALID_MOBILE', message: 'Enter a valid 10-digit mobile number.' });
      return;
    }

    try {
      const created = await mutateStore((store) => {
        const duplicate = store.students.find((s) => s.mobileNumber === mobileNumber);
        if (duplicate) {
          throw Object.assign(new Error('DUPLICATE_MOBILE'), { statusCode: 409, code: 'DUPLICATE_MOBILE' });
        }
        const student: Student = {
          id: `stu-${crypto.randomBytes(4).toString('hex')}`,
          fullName,
          roomNumber,
          mobileNumber,
          createdAt: new Date().toISOString(),
        };
        store.students.push(student);
        return student;
      });
      res.status(201).json({ student: created });
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode || 500;
      const code = (err as { code?: string }).code || 'SERVER_ERROR';
      res.status(statusCode).json({ error: code, message: 'Mobile number is already registered.' });
    }
  });

  // Update student
  app.patch('/api/admin/students/:id', requireAdminPin, async (req, res) => {
    const studentId = req.params.id;
    const fullName = String(req.body?.fullName || '').trim();
    const roomNumber = String(req.body?.roomNumber || '').trim();
    const mobileNumber = normalizeMobile(String(req.body?.mobileNumber || ''));

    if (fullName.length < 2 || fullName.length > 80) {
      res.status(400).json({ error: 'INVALID_NAME', message: 'Enter a valid full name.' });
      return;
    }
    if (roomNumber.length < 1 || roomNumber.length > 20) {
      res.status(400).json({ error: 'INVALID_ROOM', message: 'Enter a valid room number.' });
      return;
    }
    if (!/^\d{10}$/.test(mobileNumber)) {
      res.status(400).json({ error: 'INVALID_MOBILE', message: 'Enter a valid 10-digit mobile number.' });
      return;
    }

    try {
      const updated = await mutateStore((store) => {
        const target = store.students.find((s) => s.id === studentId);
        if (!target) {
          throw Object.assign(new Error('NOT_FOUND'), { statusCode: 404, code: 'NOT_FOUND' });
        }
        const duplicate = store.students.find((s) => s.mobileNumber === mobileNumber && s.id !== studentId);
        if (duplicate) {
          throw Object.assign(new Error('DUPLICATE_MOBILE'), { statusCode: 409, code: 'DUPLICATE_MOBILE' });
        }
        target.fullName = fullName;
        target.roomNumber = roomNumber;
        target.mobileNumber = mobileNumber;
        return target;
      });
      res.json({ student: updated });
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode || 500;
      const code = (err as { code?: string }).code || 'SERVER_ERROR';
      res.status(statusCode).json({ error: code });
    }
  });

  // Delete student
  app.delete('/api/admin/students/:id', requireAdminPin, async (req, res) => {
    const studentId = req.params.id;
    const removed = await mutateStore((store) => {
      const index = store.students.findIndex((s) => s.id === studentId);
      if (index === -1) return false;
      store.students.splice(index, 1);
      store.records = store.records.filter((r) => r.studentId !== studentId);
      return true;
    });
    if (!removed) {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }
    res.json({ ok: true });
  });

  // Start attendance for a date (idempotent: returns existing session or creates one)
  app.post('/api/admin/sessions/start', requireAdminPin, async (req, res) => {
    const date = String(req.body?.date || '');
    if (!isValidDateString(date)) {
      res.status(400).json({ error: 'INVALID_DATE' });
      return;
    }

    const session = await mutateStore((store) => {
      const existing = store.sessions.find((s) => s.date === date);
      if (existing) return existing;

      const created: AttendanceSession = {
        id: `sess-${crypto.randomBytes(4).toString('hex')}`,
        date,
        token: generateToken(date),
        createdAt: new Date().toISOString(),
      };
      store.sessions.push(created);
      return created;
    });

    res.json({ session });
  });

  // Manual Admin attendance override
  app.put('/api/admin/attendance', requireAdminPin, async (req, res) => {
    const date = String(req.body?.date || '');
    const studentId = String(req.body?.studentId || '');
    const status = String(req.body?.status || '') as AttendanceStatus | 'not_marked';

    if (!isValidDateString(date)) {
      res.status(400).json({ error: 'INVALID_DATE' });
      return;
    }
    if (!['present', 'absent', 'not_marked'].includes(status)) {
      res.status(400).json({ error: 'INVALID_STATUS' });
      return;
    }

    try {
      const result = await mutateStore((store) => {
        const student = store.students.find((s) => s.id === studentId);
        if (!student) {
          throw Object.assign(new Error('STUDENT_NOT_FOUND'), { statusCode: 404, code: 'STUDENT_NOT_FOUND' });
        }

        let session = store.sessions.find((s) => s.date === date);
        if (!session) {
          session = {
            id: `sess-${crypto.randomBytes(4).toString('hex')}`,
            date,
            token: generateToken(date),
            createdAt: new Date().toISOString(),
          };
          store.sessions.push(session);
        }

        const existingIndex = store.records.findIndex(
          (r) => r.date === date && r.studentId === studentId
        );

        if (status === 'not_marked') {
          if (existingIndex !== -1) {
            store.records.splice(existingIndex, 1);
          }
          return null;
        }

        const now = new Date().toISOString();
        if (existingIndex !== -1) {
          store.records[existingIndex].status = status;
          store.records[existingIndex].markedAt = now;
          store.records[existingIndex].markedBy = 'admin';
          return store.records[existingIndex];
        }

        const created: AttendanceRecord = {
          id: `rec-${crypto.randomBytes(4).toString('hex')}`,
          date,
          sessionId: session.id,
          studentId,
          status,
          markedAt: now,
          markedBy: 'admin',
        };
        store.records.push(created);
        return created;
      });
      res.json({ record: result });
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode || 500;
      const code = (err as { code?: string }).code || 'SERVER_ERROR';
      res.status(statusCode).json({ error: code });
    }
  });

  // Attendance history summary by date
  app.get('/api/admin/history', requireAdminPin, async (_req, res) => {
    const store = await readStore();
    const dates = new Set<string>();
    for (const s of store.sessions) dates.add(s.date);
    for (const r of store.records) dates.add(r.date);

    const total = store.students.length;
    const activeIds = new Set(store.students.map((s) => s.id));

    const history = Array.from(dates)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => {
        const session = store.sessions.find((s) => s.date === date) || null;
        const recs = store.records.filter((r) => r.date === date && activeIds.has(r.studentId));
        const present = recs.filter((r) => r.status === 'present').length;
        const absent = recs.filter((r) => r.status === 'absent').length;
        const notMarked = Math.max(0, total - present - absent);
        return {
          date,
          token: session?.token || null,
          total,
          present,
          absent,
          notMarked,
        };
      });

    res.json({ history });
  });

  // Export attendance CSV for a selected date
  app.get('/api/admin/export-csv', requireAdminPin, async (req, res) => {
    const date = String(req.query.date || '');
    if (!isValidDateString(date)) {
      res.status(400).json({ error: 'INVALID_DATE' });
      return;
    }

    const store = await readStore();
    const recordsForDate = store.records.filter((r) => r.date === date);
    const recordMap = new Map(recordsForDate.map((r) => [r.studentId, r]));
    const sorted = sortStudents(store.students);

    const header = ['Date', 'Student Name', 'Room Number', 'Mobile Number', 'Status', 'Marked At', 'Marked By'];
    const rows = sorted.map((stu) => {
      const rec = recordMap.get(stu.id);
      const statusLabel = rec ? (rec.status === 'present' ? 'Present' : 'Absent') : 'Not Marked';
      const markedAtFormatted = rec
        ? new Date(rec.markedAt).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
        : '';
      const markedBy = rec ? (rec.markedBy === 'admin' ? 'Admin' : 'Student') : '';
      return [
        date,
        stu.fullName,
        stu.roomNumber,
        stu.mobileNumber,
        statusLabel,
        markedAtFormatted,
        markedBy,
      ]
        .map(escapeCsvCell)
        .join(',');
    });

    const csvContent = `\uFEFF${[header.join(','), ...rows].join('\r\n')}`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="sunshine-pg-attendance-${date}.csv"`);
    res.send(csvContent);
  });

  // Public Student Session Metadata
  app.get('/api/session/:token', async (req, res) => {
    const token = String(req.params.token || '').trim();
    const store = await readStore();
    const session = store.sessions.find((s) => s.token === token);
    if (!session) {
      res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      return;
    }
    res.json({
      hostelName: store.hostelName,
      date: session.date,
      token: session.token,
      totalStudents: store.students.length,
    });
  });

  // Public Student Session Rooms List (for quick tap-by-room browsing)
  app.get('/api/session/:token/rooms', async (req, res) => {
    const token = String(req.params.token || '').trim();
    const store = await readStore();
    const session = store.sessions.find((s) => s.token === token);
    if (!session) {
      res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      return;
    }
    const rooms = Array.from(new Set(store.students.map((s) => s.roomNumber))).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
    res.json({ rooms });
  });

  // Public Student Lookup by Mobile, Name, or Room
  app.get('/api/session/:token/lookup', async (req, res) => {
    const token = String(req.params.token || '').trim();
    const q = String(req.query.q || '').trim();
    const roomFilter = String(req.query.room || '').trim();
    const store = await readStore();
    const session = store.sessions.find((s) => s.token === token);
    if (!session) {
      res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      return;
    }

    if (q.length === 0 && roomFilter.length === 0) {
      res.json({ results: [] });
      return;
    }

    const queryLower = q.toLowerCase();
    const queryDigits = q.replace(/\D/g, '');
    const recordMap = new Map(
      store.records.filter((r) => r.date === session.date).map((r) => [r.studentId, r])
    );

    const matches = sortStudents(store.students)
      .filter((stu) => {
        if (roomFilter && stu.roomNumber.toLowerCase() !== roomFilter.toLowerCase()) {
          return false;
        }
        if (!q) return true;
        const nameMatch = stu.fullName.toLowerCase().includes(queryLower);
        const roomMatch = stu.roomNumber.toLowerCase().includes(queryLower);
        const mobileMatch = queryDigits.length >= 2 && stu.mobileNumber.includes(queryDigits);
        return nameMatch || roomMatch || mobileMatch;
      })
      .slice(0, 15)
      .map((stu) => {
        const record = recordMap.get(stu.id) || null;
        return {
          id: stu.id,
          fullName: stu.fullName,
          roomNumber: stu.roomNumber,
          maskedMobile: maskMobile(stu.mobileNumber),
          record,
        };
      });

    res.json({ results: matches });
  });

  // Public Student Quick Fetch (when remembered on device)
  app.get('/api/session/:token/student/:studentId', async (req, res) => {
    const token = String(req.params.token || '').trim();
    const studentId = String(req.params.studentId || '').trim();
    const store = await readStore();
    const session = store.sessions.find((s) => s.token === token);
    if (!session) {
      res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      return;
    }

    const stu = store.students.find((s) => s.id === studentId);
    if (!stu) {
      res.status(404).json({ error: 'STUDENT_NOT_FOUND' });
      return;
    }

    const record =
      store.records.find((r) => r.date === session.date && r.studentId === stu.id) || null;

    res.json({
      student: {
        id: stu.id,
        fullName: stu.fullName,
        roomNumber: stu.roomNumber,
        maskedMobile: maskMobile(stu.mobileNumber),
        record,
      },
    });
  });

  // Public Student Mark Attendance (Strict once-per-date lock)
  app.post('/api/session/:token/mark', async (req, res) => {
    const token = String(req.params.token || '').trim();
    const studentId = String(req.body?.studentId || '').trim();
    const status = String(req.body?.status || '') as AttendanceStatus;

    if (!['present', 'absent'].includes(status)) {
      res.status(400).json({ error: 'INVALID_STATUS' });
      return;
    }

    try {
      const result = await mutateStore((store) => {
        const session = store.sessions.find((s) => s.token === token);
        if (!session) {
          throw Object.assign(new Error('SESSION_NOT_FOUND'), {
            statusCode: 404,
            code: 'SESSION_NOT_FOUND',
          });
        }

        const student = store.students.find((s) => s.id === studentId);
        if (!student) {
          throw Object.assign(new Error('STUDENT_NOT_FOUND'), {
            statusCode: 404,
            code: 'STUDENT_NOT_FOUND',
          });
        }

        const existing = store.records.find(
          (r) => r.date === session.date && r.studentId === studentId
        );
        if (existing) {
          return { duplicate: true as const, record: existing };
        }

        const created: AttendanceRecord = {
          id: `rec-${crypto.randomBytes(4).toString('hex')}`,
          date: session.date,
          sessionId: session.id,
          studentId,
          status,
          markedAt: new Date().toISOString(),
          markedBy: 'student',
        };
        store.records.push(created);
        return { duplicate: false as const, record: created };
      });

      if (result.duplicate) {
        res.status(409).json({
          error: 'ALREADY_MARKED',
          message: 'Attendance already marked for this date.',
          record: result.record,
        });
        return;
      }

      res.status(201).json({ record: result.record });
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode || 500;
      const code = (err as { code?: string }).code || 'SERVER_ERROR';
      res.status(statusCode).json({ error: code });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sunshine Boys PG Attendance server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
