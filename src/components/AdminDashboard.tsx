import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  BellRing,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  LayoutGrid,
  Link2,
  List,
  MessageSquare,
  RefreshCw,
  Search,
  Users,
  XCircle,
} from 'lucide-react';
import {
  adminSetAttendance,
  downloadCsvForDate,
  fetchDashboard,
  startAttendanceSession,
} from '../api';
import {
  buildWhatsAppMessage,
  formatReadableDate,
  formatTime,
  getTodayIso,
  translations,
} from '../i18n';
import type { DashboardData, Language, RosterItem, RosterStatus } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface AdminDashboardProps {
  lang: Language;
  pin: string;
  selectedDate: string;
  onChangeDate: (date: string) => void;
  onPreviewStudentLink: (token: string) => void;
  onInvalidPin: () => void;
  onShowToast: (message: string, actionLabel?: string, onAction?: () => void) => void;
}

type FilterMode = 'all' | RosterStatus;
type ViewMode = 'list' | 'rooms';

function buildRecentDates(count: number): string[] {
  const result: string[] = [];
  const base = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    result.push(`${y}-${m}-${day}`);
  }
  return result;
}

function formatDayChip(dateStr: string, lang: Language): { weekday: string; day: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    weekday: dt.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'short' }),
    day: String(d),
  };
}

export function AdminDashboard({
  lang,
  pin,
  selectedDate,
  onChangeDate,
  onPreviewStudentLink,
  onInvalidPin,
  onShowToast,
}: AdminDashboardProps) {
  const t = translations[lang];
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [copiedType, setCopiedType] = useState<'link' | 'whatsapp' | 'pending' | null>(null);
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMsg('');
      try {
        const res = await fetchDashboard(pin, selectedDate);
        setData(res);
      } catch (err: unknown) {
        const status = (err as { status?: number }).status;
        if (status === 401) {
          onInvalidPin();
          return;
        }
        if (!silent) setErrorMsg(t.genericError);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pin, selectedDate, onInvalidPin, t.genericError]
  );

  useEffect(() => {
    void loadDashboard(false);
  }, [loadDashboard]);

  // Live background sync every 8 seconds so student submissions appear automatically
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadDashboard(true);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const handleStartAttendance = async () => {
    setStarting(true);
    setErrorMsg('');
    try {
      await startAttendanceSession(pin, selectedDate);
      await loadDashboard(true);
      onShowToast(t.linkReadyTitle);
    } catch {
      setErrorMsg(t.genericError);
    } finally {
      setStarting(false);
    }
  };

  const shareUrl = useMemo(() => {
    if (!data?.session) return '';
    return `${window.location.origin}/a/${data.session.token}`;
  }, [data?.session]);

  const copyText = async (text: string, type: 'link' | 'whatsapp' | 'pending') => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedType(type);
    onShowToast(t.copiedToast);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleManualMark = async (
    studentId: string,
    studentName: string,
    previousStatus: RosterStatus,
    nextStatus: RosterStatus
  ) => {
    if (previousStatus === nextStatus) return;
    setUpdatingStudentId(studentId);
    try {
      await adminSetAttendance(pin, selectedDate, studentId, nextStatus);
      await loadDashboard(true);
      const statusText =
        nextStatus === 'present'
          ? t.presentToday
          : nextStatus === 'absent'
          ? t.absentToday
          : t.notMarked;

      onShowToast(`${studentName}: ${t.toastMarkedAs} ${statusText}`, t.undoBtn, () => {
        void adminSetAttendance(pin, selectedDate, studentId, previousStatus).then(() => {
          void loadDashboard(true);
          onShowToast(t.toastUndone);
        });
      });
    } catch {
      setErrorMsg(t.genericError);
    } finally {
      setUpdatingStudentId(null);
    }
  };

  const handleCopyPendingReminder = () => {
    if (!data) return;
    const pending = data.roster.filter((item) => item.status === 'not_marked');
    if (pending.length === 0) {
      onShowToast(t.allMarkedMsg);
      return;
    }
    const listLines = pending
      .map((item) => `• ${item.student.fullName} (${t.roomLabel} ${item.student.roomNumber})`)
      .join('\n');
    const linkPart = shareUrl ? `\n\n${shareUrl}` : '';
    const msg = `*${t.pendingMessageHeader} (${formatReadableDate(selectedDate, lang)})*\n${listLines}${linkPart}`;
    void copyText(msg, 'pending');
  };

  const handleDownloadCsv = async () => {
    setExportingCsv(true);
    try {
      await downloadCsvForDate(pin, selectedDate);
      onShowToast(t.toastCsvReady);
    } catch {
      setErrorMsg(t.genericError);
    } finally {
      setExportingCsv(false);
    }
  };

  const filteredRoster = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.roster.filter((item) => {
      if (filter !== 'all' && item.status !== filter) return false;
      if (!q) return true;
      return (
        item.student.fullName.toLowerCase().includes(q) ||
        item.student.roomNumber.toLowerCase().includes(q) ||
        item.student.mobileNumber.includes(q)
      );
    });
  }, [data, filter, search]);

  const groupedByRoom = useMemo(() => {
    const groups = new Map<string, RosterItem[]>();
    for (const item of filteredRoster) {
      const room = item.student.roomNumber;
      const arr = groups.get(room) || [];
      arr.push(item);
      groups.set(room, arr);
    }
    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { numeric: true })
    );
  }, [filteredRoster]);

  const recentDates = useMemo(() => buildRecentDates(7), []);
  const todayIso = getTodayIso();

  const totalCount = data?.summary.total || 0;
  const markedCount = (data?.summary.present || 0) + (data?.summary.absent || 0);
  const completionPct = totalCount > 0 ? Math.round((markedCount / totalCount) * 100) : 0;
  const presentPct = totalCount > 0 ? ((data?.summary.present || 0) / totalCount) * 100 : 0;
  const absentPct = totalCount > 0 ? ((data?.summary.absent || 0) / totalCount) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 pb-24 md:pb-10 space-y-5">
      {/* Top Date Scroller & Controls */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">{t.attendanceDate}</p>
            <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900">
              {formatReadableDate(selectedDate, lang)}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <PWAInstallButton lang={lang} variant="compact" />
            <button
              type="button"
              onClick={() => void loadDashboard(true)}
              disabled={refreshing}
              aria-label={t.refreshBtn}
              className="min-h-[40px] px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{t.refreshBtn}</span>
            </button>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && onChangeDate(e.target.value)}
                aria-label={t.attendanceDate}
                className="min-h-[40px] pl-9 pr-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        {/* 7-Day Horizontal Quick Date Scroller */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {recentDates.map((d) => {
            const { weekday, day } = formatDayChip(d, lang);
            const active = selectedDate === d;
            const isToday = d === todayIso;
            return (
              <button
                key={d}
                type="button"
                onClick={() => onChangeDate(d)}
                className={`min-w-[54px] flex-1 min-h-[54px] px-2.5 py-1.5 rounded-xl border text-center transition-all cursor-pointer shrink-0 ${
                  active
                    ? 'bg-blue-700 border-blue-700 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`block text-[10px] font-semibold ${
                    active ? 'text-blue-100' : 'text-slate-500'
                  }`}
                >
                  {isToday ? t.todayBtn : weekday}
                </span>
                <span className="block text-sm font-bold tabular-nums mt-0.5">{day}</span>
              </button>
            );
          })}
        </div>
      </section>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* Attendance Link Card (Primary Action Anchor) */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
        {loading && !data ? (
          <div className="h-24 animate-pulse bg-slate-100 rounded-xl" />
        ) : !data?.session ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-display text-base sm:text-lg font-bold text-slate-900">
                {t.startAttendanceTitle}
              </h2>
              <p className="text-sm text-slate-600">{t.startAttendanceDesc}</p>
            </div>
            <button
              type="button"
              disabled={starting}
              onClick={handleStartAttendance}
              className="min-h-[48px] px-5 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-[0.98] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <Link2 className="w-4 h-4" />
              <span>{starting ? t.startingBtn : t.startAttendanceBtn}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-slate-900">
                  {t.linkReadyTitle}
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">{t.linkReadyDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => onPreviewStudentLink(data.session!.token)}
                className="min-h-[40px] px-3.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{t.openStudentPreview}</span>
              </button>
            </div>

            <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-700 break-all select-all">
              {shareUrl}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  void copyText(
                    buildWhatsAppMessage(data.hostelName, selectedDate, shareUrl, lang),
                    'whatsapp'
                  )
                }
                className="min-h-[48px] px-4 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {copiedType === 'whatsapp' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{t.copiedToast}</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    <span>{t.copyWhatsApp}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => void copyText(shareUrl, 'link')}
                className="min-h-[48px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-900 font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {copiedType === 'link' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-700" />
                    <span className="text-emerald-700">{t.copiedToast}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{t.copyLink}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Interactive Tap-to-Filter KPI Cards + Progress Bar */}
      <section className="space-y-3" aria-label="Attendance summary">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(
            [
              {
                id: 'all' as FilterMode,
                label: t.totalStudents,
                value: data?.summary.total,
                Icon: Users,
                textClass: 'text-slate-700',
                numClass: 'text-slate-900',
                ringClass: 'ring-2 ring-slate-900 border-slate-900',
              },
              {
                id: 'present' as FilterMode,
                label: t.presentToday,
                value: data?.summary.present,
                Icon: CheckCircle2,
                textClass: 'text-emerald-700',
                numClass: 'text-emerald-700',
                ringClass: 'ring-2 ring-emerald-600 border-emerald-600',
              },
              {
                id: 'absent' as FilterMode,
                label: t.absentToday,
                value: data?.summary.absent,
                Icon: XCircle,
                textClass: 'text-red-700',
                numClass: 'text-red-700',
                ringClass: 'ring-2 ring-red-600 border-red-600',
              },
              {
                id: 'not_marked' as FilterMode,
                label: t.notMarked,
                value: data?.summary.notMarked,
                Icon: Clock,
                textClass: 'text-amber-700',
                numClass: 'text-amber-700',
                ringClass: 'ring-2 ring-amber-600 border-amber-600',
              },
            ] as const
          ).map(({ id, label, value, Icon, textClass, numClass, ringClass }) => {
            const isSelected = filter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`text-left bg-white border rounded-2xl p-4 transition-all active:scale-[0.98] cursor-pointer ${
                  isSelected ? ringClass : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`flex items-center gap-2 text-xs sm:text-sm font-medium ${textClass}`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </div>
                <p
                  className={`mt-2 font-display text-2xl sm:text-3xl font-bold tabular-nums ${numClass}`}
                >
                  {value !== undefined ? value : '—'}
                </p>
              </button>
            );
          })}
        </div>

        {/* Animated Completion Progress Strip */}
        {data && totalCount > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600 tabular-nums">
                <span>
                  {t.completionLabel}: {markedCount} / {totalCount} ({completionPct}%)
                </span>
                {data.summary.notMarked > 0 && (
                  <span className="text-amber-700 font-semibold">
                    {data.summary.notMarked} {t.notMarked}
                  </span>
                )}
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${presentPct}%` }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full bg-emerald-600"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${absentPct}%` }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full bg-red-600"
                />
              </div>
            </div>

            {data.summary.notMarked > 0 && (
              <button
                type="button"
                onClick={handleCopyPendingReminder}
                className="min-h-[40px] px-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-semibold text-amber-800 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedType === 'pending' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{t.copiedToast}</span>
                  </>
                ) : (
                  <>
                    <BellRing className="w-3.5 h-3.5" />
                    <span>{t.copyPendingBtn}</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </section>

      {/* Roster List + Search + Filters + View Mode + CSV */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-base sm:text-lg font-bold text-slate-900">
              {t.rosterTitle}
            </h2>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>{t.viewList}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('rooms')}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === 'rooms'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>{t.viewRoom}</span>
                </button>
              </div>

              <button
                type="button"
                disabled={exportingCsv || !data || data.roster.length === 0}
                onClick={handleDownloadCsv}
                className="min-h-[44px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-900 inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{t.downloadCsv}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.searchRosterPlaceholder}
                className="w-full min-h-[44px] pl-10 pr-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
              {(
                [
                  { id: 'all', label: t.filterAll },
                  { id: 'present', label: t.filterPresent },
                  { id: 'absent', label: t.filterAbsent },
                  { id: 'not_marked', label: t.filterNotMarked },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && !data ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-16 bg-slate-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : data && data.roster.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600">{t.noStudentsYet}</div>
        ) : filteredRoster.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600">{t.noStudentsMatch}</div>
        ) : viewMode === 'rooms' ? (
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupedByRoom.map(([room, items]) => {
              const roomPresent = items.filter((i) => i.status === 'present').length;
              return (
                <div
                  key={room}
                  className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/40"
                >
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-display font-bold text-sm text-slate-900 tabular-nums">
                      {t.roomLabel} {room}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 tabular-nums">
                      {roomPresent}/{items.length} {t.presentToday}
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-100 bg-white">
                    {items.map(({ student, status, markedAt }) => {
                      const busy = updatingStudentId === student.id;
                      return (
                        <li
                          key={student.id}
                          className="px-4 py-3 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-900 truncate">
                              {student.fullName}
                            </p>
                            <p className="text-xs text-slate-500 tabular-nums">
                              {markedAt ? formatTime(markedAt, lang) : t.notMarked}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void handleManualMark(
                                  student.id,
                                  student.fullName,
                                  status,
                                  'present'
                                )
                              }
                              className={`min-h-[38px] px-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                status === 'present'
                                  ? 'bg-emerald-700 border-emerald-700 text-white'
                                  : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-600'
                              }`}
                            >
                              P
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void handleManualMark(
                                  student.id,
                                  student.fullName,
                                  status,
                                  'absent'
                                )
                              }
                              className={`min-h-[38px] px-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                status === 'absent'
                                  ? 'bg-red-700 border-red-700 text-white'
                                  : 'bg-white border-slate-300 text-slate-700 hover:border-red-600'
                              }`}
                            >
                              A
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredRoster.map(({ student, status, markedAt, markedBy }) => {
              const busy = updatingStudentId === student.id;
              return (
                <li
                  key={student.id}
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-semibold text-base text-slate-900">
                        {student.fullName}
                      </span>
                      {status === 'present' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t.presentToday}</span>
                        </span>
                      )}
                      {status === 'absent' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{t.absentToday}</span>
                        </span>
                      )}
                      {status === 'not_marked' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{t.notMarked}</span>
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs sm:text-sm text-slate-500 tabular-nums">
                      <span>
                        {t.roomLabel} {student.roomNumber}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span>{student.mobileNumber}</span>
                      {markedAt && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>
                            {t.markedAtLabel} {formatTime(markedAt, lang)}{' '}
                            {markedBy === 'admin' ? t.byAdmin : t.byStudent}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Manual Admin Override Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void handleManualMark(student.id, student.fullName, status, 'present')
                      }
                      className={`min-h-[42px] px-3.5 rounded-xl text-xs font-semibold border transition-all active:scale-[0.97] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
                        status === 'present'
                          ? 'bg-emerald-700 border-emerald-700 text-white'
                          : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-600 hover:text-emerald-700'
                      }`}
                    >
                      {t.markPresentBtn}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void handleManualMark(student.id, student.fullName, status, 'absent')
                      }
                      className={`min-h-[42px] px-3.5 rounded-xl text-xs font-semibold border transition-all active:scale-[0.97] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
                        status === 'absent'
                          ? 'bg-red-700 border-red-700 text-white'
                          : 'bg-white border-slate-300 text-slate-700 hover:border-red-600 hover:text-red-700'
                      }`}
                    >
                      {t.markAbsentBtn}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
