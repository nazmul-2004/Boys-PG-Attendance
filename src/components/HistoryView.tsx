import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Calendar, CheckCircle2, Clock, Download, XCircle } from 'lucide-react';
import { downloadCsvForDate, fetchDashboard, fetchHistory } from '../api';
import { formatReadableDate, formatTime, translations } from '../i18n';
import type { DashboardData, HistoryItem, Language } from '../types';

interface HistoryViewProps {
  lang: Language;
  pin: string;
  onOpenDateInDashboard: (date: string) => void;
  onInvalidPin: () => void;
  onShowToast: (message: string) => void;
}

export function HistoryView({
  lang,
  pin,
  onOpenDateInDashboard,
  onInvalidPin,
  onShowToast,
}: HistoryViewProps) {
  const t = translations[lang];
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [details, setDetails] = useState<DashboardData | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [downloadingDate, setDownloadingDate] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchHistory(pin);
      setHistory(res.history);
      if (res.history.length > 0 && !selectedDate) {
        setSelectedDate(res.history[0].date);
      }
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 401) {
        onInvalidPin();
      }
    } finally {
      setLoading(false);
    }
  }, [pin, onInvalidPin, selectedDate]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!selectedDate) return;
    let active = true;
    setLoadingDetails(true);
    fetchDashboard(pin, selectedDate)
      .then((res) => {
        if (active) setDetails(res);
      })
      .catch(() => {
        if (active) setDetails(null);
      })
      .finally(() => {
        if (active) setLoadingDetails(false);
      });
    return () => {
      active = false;
    };
  }, [pin, selectedDate]);

  const handleCsv = async (date: string) => {
    setDownloadingDate(date);
    try {
      await downloadCsvForDate(pin, date);
      onShowToast(t.toastCsvReady);
    } finally {
      setDownloadingDate(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 pb-24 md:pb-10 space-y-5">
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
        <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900">
          {t.historyTitle}
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">{t.historySubtitle}</p>
      </section>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 bg-white border border-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-600">
          {t.noHistory}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Date List with Visual Progress Bars */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {history.map((item) => {
                const active = selectedDate === item.date;
                const presentW = item.total > 0 ? (item.present / item.total) * 100 : 0;
                const absentW = item.total > 0 ? (item.absent / item.total) * 100 : 0;
                return (
                  <li
                    key={item.date}
                    className={`p-4 transition-colors ${active ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedDate(item.date)}
                        className="text-left flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                          <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>{formatReadableDate(item.date, lang)}</span>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-600 tabular-nums">
                          <span className="text-emerald-700 font-semibold">
                            {item.present} {t.presentToday}
                          </span>
                          <span aria-hidden="true"> · </span>
                          <span className="text-red-700 font-semibold">
                            {item.absent} {t.absentToday}
                          </span>
                          <span aria-hidden="true"> · </span>
                          <span className="text-amber-700 font-medium">
                            {item.notMarked} {t.notMarked}
                          </span>
                        </p>
                        <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                          <div style={{ width: `${presentW}%` }} className="h-full bg-emerald-600" />
                          <div style={{ width: `${absentW}%` }} className="h-full bg-red-600" />
                        </div>
                      </button>

                      <button
                        type="button"
                        disabled={downloadingDate === item.date}
                        onClick={() => void handleCsv(item.date)}
                        aria-label={`${t.downloadCsv} ${item.date}`}
                        className="min-h-[40px] px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>CSV</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Selected Date Detailed Breakdown */}
          <motion.section
            key={selectedDate || 'empty'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden"
          >
            {selectedDate && (
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    {formatReadableDate(selectedDate, lang)}
                  </h2>
                  {details && (
                    <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                      {details.summary.present} {t.presentToday} · {details.summary.absent}{' '}
                      {t.absentToday} · {details.summary.notMarked} {t.notMarked}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDateInDashboard(selectedDate)}
                  className="min-h-[40px] px-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-[0.98] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>{t.openInDashboardBtn}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {loadingDetails ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-12 bg-slate-100 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : details ? (
              <ul className="divide-y divide-slate-100">
                {details.roster.map(({ student, status, markedAt, markedBy }) => (
                  <li key={student.id} className="p-4 sm:px-5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">
                        {student.fullName}
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {t.roomLabel} {student.roomNumber} · {student.mobileNumber}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
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
                      {markedAt && (
                        <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                          {formatTime(markedAt, lang)} · {markedBy === 'admin' ? t.byAdmin : t.byStudent}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </motion.section>
        </div>
      )}
    </div>
  );
}
