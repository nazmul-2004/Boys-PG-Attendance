import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Search,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  fetchSessionRooms,
  fetchStudentInSession,
  fetchStudentSession,
  lookupStudentsInSession,
  markStudentAttendance,
} from '../api';
import { formatReadableDate, formatTime, translations } from '../i18n';
import type {
  AttendanceStatus,
  Language,
  StudentLookupResult,
  StudentSessionMeta,
} from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface StudentAttendanceViewProps {
  token: string;
  lang: Language;
}

const SAVED_STUDENT_KEY = 'sbpg_saved_student_id';

export function StudentAttendanceView({ token, lang }: StudentAttendanceViewProps) {
  const t = translations[lang];
  const [session, setSession] = useState<StudentSessionMeta | null>(null);
  const [rooms, setRooms] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentLookupResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [rememberedStudent, setRememberedStudent] = useState<StudentLookupResult | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentLookupResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let active = true;
    setSessionLoading(true);
    setSessionError(false);

    Promise.all([fetchStudentSession(token), fetchSessionRooms(token)])
      .then(async ([meta, roomRes]) => {
        if (!active) return;
        setSession(meta);
        setRooms(roomRes.rooms);

        const savedId = window.localStorage.getItem(SAVED_STUDENT_KEY);
        if (savedId) {
          try {
            const quick = await fetchStudentInSession(token, savedId);
            if (active) setRememberedStudent(quick.student);
          } catch {
            window.localStorage.removeItem(SAVED_STUDENT_KEY);
          }
        }
      })
      .catch(() => {
        if (active) setSessionError(true);
      })
      .finally(() => {
        if (active) setSessionLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!session) return;
    const trimmed = query.trim();
    if (!trimmed && !selectedRoom) {
      setResults([]);
      setSearching(false);
      return;
    }

    let active = true;
    setSearching(true);
    const timer = setTimeout(() => {
      lookupStudentsInSession(token, trimmed, selectedRoom || undefined)
        .then((res) => {
          if (active) setResults(res.results);
        })
        .catch(() => {
          if (active) setResults([]);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, selectedRoom, session, token]);

  const handleSelectStudent = (student: StudentLookupResult) => {
    setSelectedStudent(student);
    setSubmitError('');
    window.localStorage.setItem(SAVED_STUDENT_KEY, student.id);
  };

  const handleMark = async (status: AttendanceStatus) => {
    if (!selectedStudent || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const { record } = await markStudentAttendance(token, selectedStudent.id, status);
      const updated = { ...selectedStudent, record };
      setSelectedStudent(updated);
      setRememberedStudent(updated);
    } catch {
      setSubmitError(t.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionLoading) {
    return (
      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="h-6 w-40 bg-slate-100 animate-pulse rounded-lg" />
          <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
          <div className="h-24 bg-slate-100 animate-pulse rounded-xl" />
        </div>
      </main>
    );
  }

  if (sessionError || !session) {
    return (
      <main className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-700 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="font-display text-lg font-bold text-slate-900">{t.invalidLinkTitle}</h1>
          <p className="text-sm text-slate-600">{t.invalidLinkDesc}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6 pb-12 space-y-4">
      {/* Date Banner */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-blue-700">{t.studentAttendanceHeading}</p>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
            {formatReadableDate(session.date, lang)}
          </h1>
        </div>
        <PWAInstallButton lang={lang} variant="compact" />
      </section>

      <AnimatePresence mode="wait">
        {!selectedStudent ? (
          <motion.section
            key="identify"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
          >
            {rememberedStudent && (
              <div className="pb-4 border-b border-slate-200 space-y-2">
                <p className="text-xs font-medium text-slate-500">{t.continueAsTitle}</p>
                <button
                  type="button"
                  onClick={() => handleSelectStudent(rememberedStudent)}
                  className="w-full min-h-[60px] px-4 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 active:scale-[0.99] border border-blue-200 flex items-center justify-between gap-3 text-left transition-all cursor-pointer"
                >
                  <div>
                    <p className="font-semibold text-base text-slate-900">
                      {rememberedStudent.fullName}
                    </p>
                    <p className="text-xs text-slate-600 tabular-nums">
                      {t.roomLabel} {rememberedStudent.roomNumber} · {rememberedStudent.maskedMobile}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-blue-700 shrink-0" />
                </button>
              </div>
            )}

            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                {t.studentIdentifyTitle}
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">{t.studentIdentifyDesc}</p>
            </div>

            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.studentSearchPlaceholder}
                className="w-full min-h-[52px] pl-11 pr-4 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Interactive Quick Room Tap Chips */}
            {rooms.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">{t.quickRoomBrowse}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedRoom('')}
                    className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      selectedRoom === ''
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {t.allRoomsBtn}
                  </button>
                  {rooms.map((room) => {
                    const active = selectedRoom === room;
                    return (
                      <button
                        key={room}
                        type="button"
                        onClick={() => setSelectedRoom(active ? '' : room)}
                        className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold border tabular-nums transition-all active:scale-[0.97] cursor-pointer ${
                          active
                            ? 'bg-blue-700 border-blue-700 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {t.roomLabel} {room}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!query.trim() && !selectedRoom ? (
              <p className="text-xs text-slate-500">{t.typeToSearchHint}</p>
            ) : searching ? (
              <div className="space-y-2">
                <div className="h-14 bg-slate-100 animate-pulse rounded-xl" />
                <div className="h-14 bg-slate-100 animate-pulse rounded-xl" />
              </div>
            ) : results.length === 0 ? (
              <p className="text-sm text-slate-600 py-2">{t.noLookupMatch}</p>
            ) : (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {results.map((stu) => (
                  <li key={stu.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectStudent(stu)}
                      className="w-full min-h-[60px] px-4 py-3 bg-white hover:bg-slate-50 active:bg-slate-100 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-base text-slate-900">{stu.fullName}</p>
                        <p className="text-xs text-slate-600 tabular-nums mt-0.5">
                          {t.roomLabel} {stu.roomNumber} · {stu.maskedMobile}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {stu.record && (
                          <span
                            className={`text-xs font-semibold ${
                              stu.record.status === 'present' ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            {stu.record.status === 'present' ? t.presentToday : t.absentToday}
                          </span>
                        )}
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>
        ) : (
          <motion.section
            key="mark"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5"
          >
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    {selectedStudent.fullName}
                  </h2>
                  <p className="text-sm text-slate-600 tabular-nums">
                    {t.roomLabel} {selectedStudent.roomNumber} · {selectedStudent.maskedMobile}
                  </p>
                </div>
              </div>
            </div>

            {selectedStudent.record ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <div
                  className={`rounded-2xl p-5 border ${
                    selectedStudent.record.status === 'present'
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {selectedStudent.record.status === 'present' ? (
                      <CheckCircle2 className="w-9 h-9 text-emerald-700 shrink-0" />
                    ) : (
                      <XCircle className="w-9 h-9 text-red-700 shrink-0" />
                    )}
                    <div>
                      <h3
                        className={`font-display text-lg font-bold ${
                          selectedStudent.record.status === 'present'
                            ? 'text-emerald-900'
                            : 'text-red-900'
                        }`}
                      >
                        {t.alreadyMarkedTitle}
                      </h3>
                      <p
                        className={`text-sm mt-0.5 ${
                          selectedStudent.record.status === 'present'
                            ? 'text-emerald-800'
                            : 'text-red-800'
                        }`}
                      >
                        {t.alreadyMarkedDesc}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-4 pt-4 border-t border-black/10 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-slate-600">{t.statusSavedLabel}</dt>
                      <dd
                        className={`font-bold mt-0.5 ${
                          selectedStudent.record.status === 'present'
                            ? 'text-emerald-800'
                            : 'text-red-800'
                        }`}
                      >
                        {selectedStudent.record.status === 'present'
                          ? t.presentLarge
                          : t.absentLarge}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-600">{t.timeLabel}</dt>
                      <dd className="font-semibold text-slate-900 mt-0.5 tabular-nums">
                        {formatTime(selectedStudent.record.markedAt, lang)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    setQuery('');
                  }}
                  className="w-full min-h-[44px] text-sm font-medium text-slate-600 hover:text-slate-900 underline underline-offset-4 cursor-pointer"
                >
                  {t.switchStudentBtn}
                </button>
              </motion.div>
            ) : (
              <div className="space-y-3.5">
                <p className="text-sm font-medium text-slate-700">{t.studentConfirmPrompt}</p>

                {submitError && (
                  <p className="text-sm font-medium text-red-700" role="alert">
                    {submitError}
                  </p>
                )}

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleMark('present')}
                  className="w-full min-h-[84px] px-5 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white flex items-center gap-4 text-left transition-all cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-9 h-9 shrink-0" />
                  <div>
                    <span className="block font-display text-xl font-bold leading-tight">
                      {submitting ? t.savingAttendance : t.presentLarge}
                    </span>
                    <span className="block text-sm text-emerald-100 mt-0.5">{t.presentSub}</span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleMark('absent')}
                  className="w-full min-h-[84px] px-5 py-4 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white flex items-center gap-4 text-left transition-all cursor-pointer disabled:opacity-60"
                >
                  <XCircle className="w-9 h-9 shrink-0" />
                  <div>
                    <span className="block font-display text-xl font-bold leading-tight">
                      {submitting ? t.savingAttendance : t.absentLarge}
                    </span>
                    <span className="block text-sm text-red-100 mt-0.5">{t.absentSub}</span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setSelectedStudent(null);
                    setQuery('');
                  }}
                  className="w-full min-h-[44px] text-sm font-medium text-slate-600 hover:text-slate-900 underline underline-offset-4 cursor-pointer"
                >
                  {t.switchStudentBtn}
                </button>
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
