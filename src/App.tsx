import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ClipboardList, History, Users } from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminPinGate } from './components/AdminPinGate';
import { Header, type AdminTab } from './components/Header';
import { HistoryView } from './components/HistoryView';
import { OfflineIndicator } from './components/PWAInstallButton';
import { StudentAttendanceView } from './components/StudentAttendanceView';
import { StudentsManager } from './components/StudentsManager';
import { Toast, type ToastState } from './components/Toast';
import { getTodayIso, translations } from './i18n';
import type { Language } from './types';

const LANG_STORAGE_KEY = 'sbpg_lang';
const ADMIN_PIN_STORAGE_KEY = 'sbpg_admin_pin';

function parseStudentTokenFromLocation(): string | null {
  const pathMatch = window.location.pathname.match(/^\/a\/([a-zA-Z0-9_-]+)\/?$/);
  if (pathMatch) {
    return pathMatch[1];
  }
  const params = new URLSearchParams(window.location.search);
  const queryToken = params.get('a');
  return queryToken ? queryToken.trim() : null;
}

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    return saved === 'hi' ? 'hi' : 'en';
  });

  const [studentToken, setStudentToken] = useState<string | null>(() =>
    parseStudentTokenFromLocation()
  );

  const [adminPin, setAdminPin] = useState<string>(() => {
    return window.sessionStorage.getItem(ADMIN_PIN_STORAGE_KEY) || '';
  });

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayIso());
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback(
    (message: string, actionLabel?: string, onAction?: () => void) => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      setToast({
        id: Date.now(),
        message,
        actionLabel,
        onAction,
      });
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
      }, 4000);
    },
    []
  );

  useEffect(() => {
    const onPopState = () => {
      setStudentToken(parseStudentTokenFromLocation());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleToggleLang = (nextLang: Language) => {
    setLang(nextLang);
    window.localStorage.setItem(LANG_STORAGE_KEY, nextLang);
  };

  const handleUnlocked = (pin: string) => {
    setAdminPin(pin);
    window.sessionStorage.setItem(ADMIN_PIN_STORAGE_KEY, pin);
  };

  const handleLockAdmin = useCallback(() => {
    setAdminPin('');
    window.sessionStorage.removeItem(ADMIN_PIN_STORAGE_KEY);
  }, []);

  const handlePinUpdated = (newPin: string) => {
    setAdminPin(newPin);
    window.sessionStorage.setItem(ADMIN_PIN_STORAGE_KEY, newPin);
  };

  const handlePreviewStudentLink = (token: string) => {
    window.history.pushState({}, '', `/a/${token}`);
    setStudentToken(token);
  };

  const handleBackToAdmin = () => {
    window.history.pushState({}, '', '/');
    setStudentToken(null);
  };

  const handleOpenDateInDashboard = (date: string) => {
    setSelectedDate(date);
    setActiveTab('dashboard');
  };

  const isStudentMode = Boolean(studentToken);
  const isAdminUnlocked = Boolean(adminPin);
  const t = translations[lang];

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Header
          lang={lang}
          onToggleLang={handleToggleLang}
          isStudentMode={isStudentMode}
          isAdminUnlocked={isAdminUnlocked}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onLockAdmin={handleLockAdmin}
          onBackToAdmin={isStudentMode && isAdminUnlocked ? handleBackToAdmin : undefined}
        />

        {isStudentMode && studentToken ? (
          <StudentAttendanceView token={studentToken} lang={lang} />
        ) : !isAdminUnlocked ? (
          <AdminPinGate lang={lang} onUnlocked={handleUnlocked} />
        ) : (
          <>
            <main>
              <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <AdminDashboard
                      lang={lang}
                      pin={adminPin}
                      selectedDate={selectedDate}
                      onChangeDate={setSelectedDate}
                      onPreviewStudentLink={handlePreviewStudentLink}
                      onInvalidPin={handleLockAdmin}
                      onShowToast={showToast}
                    />
                  </motion.div>
                )}
                {activeTab === 'students' && (
                  <motion.div
                    key="students"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <StudentsManager
                      lang={lang}
                      pin={adminPin}
                      onPinUpdated={handlePinUpdated}
                      onInvalidPin={handleLockAdmin}
                      onShowToast={showToast}
                    />
                  </motion.div>
                )}
                {activeTab === 'history' && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <HistoryView
                      lang={lang}
                      pin={adminPin}
                      onOpenDateInDashboard={handleOpenDateInDashboard}
                      onInvalidPin={handleLockAdmin}
                      onShowToast={showToast}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* Mobile Bottom Navigation Bar */}
            <nav
              className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-3"
              aria-label="Mobile Navigation"
            >
              {(
                [
                  { id: 'dashboard', label: t.navDashboard, Icon: ClipboardList },
                  { id: 'students', label: t.navStudents, Icon: Users },
                  { id: 'history', label: t.navHistory, Icon: History },
                ] as const
              ).map(({ id, label, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`min-h-[44px] flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                      active ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="whitespace-nowrap">{label}</span>
                  </button>
                );
              })}
            </nav>
          </>
        )}

        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <OfflineIndicator lang={lang} />
      </div>
    </MotionConfig>
  );
}
