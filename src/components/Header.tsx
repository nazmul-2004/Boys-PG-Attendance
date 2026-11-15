import { Lock, ArrowLeft } from 'lucide-react';
import { translations } from '../i18n';
import type { Language } from '../types';

export type AdminTab = 'dashboard' | 'students' | 'history';

interface HeaderProps {
  lang: Language;
  onToggleLang: (lang: Language) => void;
  isStudentMode: boolean;
  isAdminUnlocked: boolean;
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onLockAdmin: () => void;
  onBackToAdmin?: () => void;
}

export function Header({
  lang,
  onToggleLang,
  isStudentMode,
  isAdminUnlocked,
  activeTab,
  onSelectTab,
  onLockAdmin,
  onBackToAdmin,
}: HeaderProps) {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-5xl mx-auto h-full px-4 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Title */}
        <span className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          {t.hostelName}
        </span>

        {/* Zone 2: Desktop Navigation Links (Admin only) */}
        {!isStudentMode && isAdminUnlocked ? (
          <nav className="hidden md:flex items-center gap-6" aria-label="Primary">
            {(
              [
                { id: 'dashboard', label: t.navDashboard },
                { id: 'students', label: t.navStudents },
                { id: 'history', label: t.navHistory },
              ] as const
            ).map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`h-14 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-blue-700 text-blue-700'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        ) : (
          <div className="hidden md:block" />
        )}

        {/* Zone 3: Language Switch + Contextual Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200"
            role="group"
            aria-label="Language"
          >
            <button
              type="button"
              onClick={() => onToggleLang('en')}
              className={`min-h-[34px] px-2.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                lang === 'en'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onToggleLang('hi')}
              className={`min-h-[34px] px-2.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                lang === 'hi'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिं
            </button>
          </div>

          {isStudentMode && onBackToAdmin ? (
            <button
              type="button"
              onClick={onBackToAdmin}
              className="min-h-[36px] px-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t.backToAdmin}</span>
            </button>
          ) : !isStudentMode && isAdminUnlocked ? (
            <button
              type="button"
              onClick={onLockAdmin}
              className="min-h-[36px] px-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{t.lockAdmin}</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
