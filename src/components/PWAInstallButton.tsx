import { useState } from 'react';
import { Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import type { Language } from '../types';

interface PWAInstallButtonProps {
  lang: Language;
  variant?: 'banner' | 'compact';
}

export function PWAInstallButton({ lang, variant = 'banner' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const labels =
    lang === 'hi'
      ? {
          btn: 'फ़ोन में इंस्टॉल करें',
          title: 'फ़ोन पर ऐप इंस्टॉल करें',
          subtitle: 'बिना .exe या Play Store के सीधे होम स्क्रीन पर ऐप जोड़ें।',
          iosSteps: [
            '1. Safari ब्राउज़र में नीचे Share (शेयर) बटन दबाएं।',
            '2. थोड़ा नीचे स्क्रॉल करें और "Add to Home Screen" चुनें।',
            '3. ऊपर दाईं ओर "Add" दबाएं — ऐप आइकन फ़ोन पर आ जाएगा।',
          ],
          androidSteps: [
            '1. इस ऐप के URL को अपने फ़ोन के Chrome ब्राउज़र में सीधे खोलें।',
            '2. ऊपर दाईं ओर 3-डॉट (⋮) मेनू दबाएं।',
            '3. "Install app" या "Add to Home screen" चुनें।',
          ],
          note: 'फ़ोन (Android / iPhone) पर Windows .exe फ़ाइल नहीं चलती। यह वेब ऐप सीधे आपके फ़ोन की होम स्क्रीन पर ऐप की तरह इंस्टॉल हो जाता है।',
          close: 'बंद करें',
        }
      : {
          btn: 'Install App on Phone',
          title: 'Install on Your Phone',
          subtitle: 'Add Sunshine PG to your phone home screen like a native app.',
          iosSteps: [
            '1. Tap the Share button in Safari toolbar.',
            '2. Scroll down and tap "Add to Home Screen".',
            '3. Tap "Add" — the app icon will appear on your home screen.',
          ],
          androidSteps: [
            '1. Open the app URL directly in Chrome on your phone.',
            '2. Tap the 3-dot (⋮) browser menu in the top right.',
            '3. Tap "Install app" or "Add to Home screen".',
          ],
          note: 'Phones (Android & iPhone) cannot run Windows .exe files. Installing this web app adds an icon to your home screen and launches full-screen.',
          close: 'Close',
        };

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={() => void handleClick()}
          className="min-h-[40px] px-3.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-semibold text-blue-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span>{labels.btn}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void handleClick()}
          className="w-full min-h-[48px] px-4 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 active:scale-[0.99] text-sm font-semibold text-blue-800 inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>{labels.btn}</span>
        </button>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 p-5 sm:p-6">
            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">{labels.title}</h2>
                <p className="text-sm text-slate-600 mt-0.5">{labels.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label={labels.close}
                className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
              {labels.note}
            </div>

            <ol className="mt-4 space-y-2.5 text-sm text-slate-800">
              {(isIOS ? labels.iosSteps : labels.androidSteps).map((step) => (
                <li key={step} className="leading-snug">
                  {step}
                </li>
              ))}
            </ol>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full min-h-[48px] rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold cursor-pointer"
            >
              {labels.close}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function OfflineIndicator({ lang }: { lang: Language }) {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 md:bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>
        {lang === 'hi'
          ? 'ऑफ़लाइन मोड — इंटरनेट कनेक्शन नहीं है।'
          : 'Offline — Check your internet connection to sync attendance.'}
      </span>
    </div>
  );
}
