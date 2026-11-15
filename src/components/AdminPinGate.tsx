import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Delete, ShieldCheck } from 'lucide-react';
import { verifyAdminPin } from '../api';
import { translations } from '../i18n';
import type { Language } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface AdminPinGateProps {
  lang: Language;
  onUnlocked: (pin: string) => void;
}

export function AdminPinGate({ lang, onUnlocked }: AdminPinGateProps) {
  const t = translations[lang];
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const submitPin = async (candidate: string) => {
    if (candidate.length !== 4 || checking) return;
    setChecking(true);
    setError('');
    try {
      const res = await verifyAdminPin(candidate);
      if (res.valid) {
        onUnlocked(candidate);
      } else {
        setError(t.pinInvalid);
        setPin('');
      }
    } catch {
      setError(t.pinInvalid);
      setPin('');
    } finally {
      setChecking(false);
    }
  };

  const handleDigit = (digit: string) => {
    if (checking || pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError('');
    if (next.length === 4) {
      void submitPin(next);
    }
  };

  const handleBackspace = () => {
    if (checking) return;
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    if (checking) return;
    setPin('');
    setError('');
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter' && pin.length === 4) {
        void submitPin(pin);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 sm:p-7">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="font-display text-xl font-bold text-slate-900">{t.pinTitle}</h1>
          <p className="mt-1 text-sm text-slate-600">{t.pinSubtitle}</p>
        </div>

        {/* 4-digit PIN boxes */}
        <motion.div
          key={error ? 'shake' : 'ok'}
          animate={error ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-center justify-center gap-3 mb-4"
          aria-label={t.pinPlaceholder}
        >
          {[0, 1, 2, 3].map((idx) => {
            const filled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold tabular-nums transition-colors ${
                  error
                    ? 'border-red-400 bg-red-50 text-red-700'
                    : filled
                    ? 'border-blue-700 bg-blue-50/50 text-slate-900'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                {filled ? '•' : ''}
              </div>
            );
          })}
        </motion.div>

        {error ? (
          <p className="text-center text-sm font-medium text-red-700 mb-4" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-center text-xs text-slate-500 mb-4 tabular-nums">{t.pinHint}</p>
        )}

        {/* Tactile Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5">
          {digits.map((d) => (
            <button
              key={d}
              type="button"
              disabled={checking}
              onClick={() => handleDigit(d)}
              className="min-h-[54px] rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-[0.97] border border-slate-200 text-xl font-semibold text-slate-900 tabular-nums transition-all cursor-pointer disabled:opacity-50"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            disabled={checking || pin.length === 0}
            onClick={handleClear}
            className="min-h-[54px] rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-[0.97] border border-slate-200 text-xs font-semibold text-slate-600 transition-all cursor-pointer disabled:opacity-40"
          >
            {t.pinClear}
          </button>
          <button
            type="button"
            disabled={checking}
            onClick={() => handleDigit('0')}
            className="min-h-[54px] rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-[0.97] border border-slate-200 text-xl font-semibold text-slate-900 tabular-nums transition-all cursor-pointer disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            disabled={checking || pin.length === 0}
            onClick={handleBackspace}
            aria-label="Backspace"
            className="min-h-[54px] rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-[0.97] border border-slate-200 flex items-center justify-center text-slate-700 transition-all cursor-pointer disabled:opacity-40"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          disabled={checking || pin.length !== 4}
          onClick={() => void submitPin(pin)}
          className="mt-4 w-full min-h-[48px] rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-500 text-white font-semibold text-sm transition-colors cursor-pointer"
        >
          {checking ? t.loadingText : t.pinUnlock}
        </button>

        <div className="mt-3">
          <PWAInstallButton lang={lang} variant="banner" />
        </div>
      </div>
    </main>
  );
}
