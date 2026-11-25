'use client';

import { Sun, Moon, MessageSquare, LayoutDashboard } from 'lucide-react';
import type { Lang, Theme, MobileTab, Dictionary } from '@/lib/i18n';

type Props = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  mobileTab: MobileTab;
  setMobileTab: (tab: MobileTab) => void;
  t: Dictionary;
  messagesCount: number;
  totalNotifications: number;
  pendingApprovalsCount: number;
};

export function AppHeader({
  lang,
  setLang,
  theme,
  setTheme,
  mobileTab,
  setMobileTab,
  t,
  messagesCount,
  totalNotifications,
  pendingApprovalsCount,
}: Props) {
  const isDark = theme === 'dark';

  const btnSecondary =
    'inline-flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium px-3 sm:px-3.5 py-2 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-muted)] text-[var(--text-primary)] shadow-2xs active:translate-y-[0.5px] transition cursor-pointer';

  return (
    <>
      <header className="w-full bg-[var(--bg-surface)] border-b border-[var(--border-color)] px-3 sm:px-6 lg:px-8 min-h-14 sm:h-16 py-2 sm:py-0 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-md bg-[var(--accent-bg)] text-[var(--accent-text)] flex items-center justify-center font-mono font-bold text-xs sm:text-sm tracking-wider shadow-2xs shrink-0">
            FT
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm sm:text-lg text-[var(--text-primary)] leading-tight truncate">
              {t.appName}
            </h1>
            <p className="hidden sm:block text-xs sm:text-sm text-[var(--text-muted)] truncate">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-2 text-xs sm:text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-page)] px-3 py-1.5 rounded-md border border-[var(--border-color)]">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>{t.online}</span>
          </div>

          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={btnSecondary}
            title={isDark ? t.themeLight : t.themeDark}
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">{t.themeLight}</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-stone-700 shrink-0" />
                <span className="hidden sm:inline">{t.themeDark}</span>
              </>
            )}
          </button>

          <div className="inline-flex rounded-md border border-[var(--border-strong)] bg-[var(--bg-page)] p-0.5 sm:p-1 text-xs sm:text-sm font-medium">
            <button
              type="button"
              onClick={() => setLang('ar')}
              className={`px-2 sm:px-3 py-1 rounded-[4px] transition cursor-pointer ${
                lang === 'ar'
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-text)] font-semibold shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t.langAr}
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2 sm:px-3 py-1 rounded-[4px] transition cursor-pointer ${
                lang === 'en'
                  ? 'bg-[var(--accent-bg)] text-[var(--accent-text)] font-semibold shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t.langEn}
            </button>
          </div>
        </div>
      </header>

      {/* شريط التبديل السريع للموبايل والتابلت */}
      <div className="lg:hidden bg-[var(--bg-surface)] border-b border-[var(--border-color)] px-3 sm:px-6 py-2 sticky top-0 z-20 shrink-0">
        <div className="grid grid-cols-2 gap-2 bg-[var(--bg-page)] p-1 rounded-lg border border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => setMobileTab('chat')}
            className={`py-2 px-3 rounded-md text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              mobileTab === 'chat'
                ? 'bg-[var(--accent-bg)] text-[var(--accent-text)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>{t.mobileTabChat}</span>
            {messagesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[11px] font-mono bg-black/15 dark:bg-white/15">
                {messagesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('dashboard')}
            className={`py-2 px-3 rounded-md text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              mobileTab === 'dashboard'
                ? 'bg-[var(--accent-bg)] text-[var(--accent-text)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>{t.mobileTabDashboard}</span>
            {totalNotifications > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
                  pendingApprovalsCount > 0
                    ? 'bg-red-600 text-white'
                    : 'bg-black/15 dark:bg-white/15'
                }`}
              >
                {totalNotifications}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
