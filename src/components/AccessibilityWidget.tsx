'use client';
/**
 * AccessibilityWidget — Reusable floating accessibility menu for Next.js + Tailwind sites.
 *
 * SETUP:
 * 1. Copy this file to your project's components/ folder
 * 2. Copy accessibility.css to your app/ or styles/ folder and import it in globals.css:
 *      @import './accessibility.css';
 *    Or paste its contents directly into your globals.css.
 * 3. Render <AccessibilityWidget /> in your root layout.tsx:
 *      import AccessibilityWidget from '@/components/AccessibilityWidget';
 *      // inside the body:
 *      <AccessibilityWidget />
 *
 * DEPENDENCIES: lucide-react (npm i lucide-react)
 * OPTIONAL: Supports i18n — pass `locale` prop ('he' | 'en' | 'ru') to localize labels.
 *           Defaults to 'he' if no locale is provided.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Accessibility, X, Type, Contrast, Link2, Pause, Eye, RotateCcw } from 'lucide-react';

type Locale = 'he' | 'en' | 'ru';

const labels: Record<string, Record<Locale, string>> = {
  title: { he: 'תפריט נגישות', en: 'Accessibility Menu', ru: 'Меню доступности' },
  toggleBtn: { he: 'נגישות', en: 'Accessibility', ru: 'Доступность' },
  fontSize: { he: 'הגדלת טקסט', en: 'Increase Text', ru: 'Увеличить текст' },
  contrast: { he: 'ניגודיות גבוהה', en: 'High Contrast', ru: 'Высокий контраст' },
  linkHighlight: { he: 'הדגשת קישורים', en: 'Highlight Links', ru: 'Выделить ссылки' },
  stopAnimations: { he: 'עצור אנימציות', en: 'Stop Animations', ru: 'Остановить анимации' },
  grayscale: { he: 'גווני אפור', en: 'Grayscale', ru: 'Оттенки серого' },
  reset: { he: 'איפוס', en: 'Reset', ru: 'Сброс' },
  close: { he: 'סגור תפריט נגישות', en: 'Close accessibility menu', ru: 'Закрыть меню доступности' },
};

interface A11yState {
  fontLevel: number; // 0 = normal, 1 = large, 2 = extra-large
  highContrast: boolean;
  linkHighlight: boolean;
  stopAnimations: boolean;
  grayscale: boolean;
}

const DEFAULT_STATE: A11yState = {
  fontLevel: 0,
  highContrast: false,
  linkHighlight: false,
  stopAnimations: false,
  grayscale: false,
};

interface AccessibilityWidgetProps {
  locale?: Locale;
}

export default function AccessibilityWidget({ locale = 'he' }: AccessibilityWidgetProps) {
  const t = (key: string) => labels[key]?.[locale] ?? labels[key]?.['he'] ?? key;

  const [open, setOpen] = useState(false);
  const [state, setState] = useState<A11yState>(DEFAULT_STATE);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Load saved state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('a11y-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setState(prev => ({ ...prev, ...parsed }));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Apply state to DOM and persist
  useEffect(() => {
    const root = document.documentElement;

    // Font size
    const fontSizes = ['100%', '115%', '130%'];
    root.style.fontSize = fontSizes[state.fontLevel] || '100%';

    // Toggle CSS classes
    root.classList.toggle('a11y-high-contrast', state.highContrast);
    root.classList.toggle('a11y-link-highlight', state.linkHighlight);
    root.classList.toggle('a11y-stop-animations', state.stopAnimations);
    root.classList.toggle('a11y-grayscale', state.grayscale);

    localStorage.setItem('a11y-settings', JSON.stringify(state));
  }, [state]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
    document.documentElement.style.fontSize = '100%';
  }, []);

  const cycleFontSize = useCallback(() => {
    setState(prev => ({ ...prev, fontLevel: (prev.fontLevel + 1) % 3 }));
  }, []);

  const toggle = useCallback((key: keyof Omit<A11yState, 'fontLevel'>) => {
    setState(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const isActive = state.fontLevel > 0 || state.highContrast || state.linkHighlight || state.stopAnimations || state.grayscale;

  const menuItems = [
    { key: 'fontSize' as const, icon: Type, action: cycleFontSize, active: state.fontLevel > 0, badge: state.fontLevel > 0 ? `+${state.fontLevel}` : undefined },
    { key: 'contrast' as const, icon: Contrast, action: () => toggle('highContrast'), active: state.highContrast },
    { key: 'linkHighlight' as const, icon: Link2, action: () => toggle('linkHighlight'), active: state.linkHighlight },
    { key: 'stopAnimations' as const, icon: Pause, action: () => toggle('stopAnimations'), active: state.stopAnimations },
    { key: 'grayscale' as const, icon: Eye, action: () => toggle('grayscale'), active: state.grayscale },
  ];

  return (
    <>
      {/* Floating Accessibility Button */}
      <button
        ref={btnRef}
        onClick={() => setOpen(prev => !prev)}
        aria-label={t('toggleBtn')}
        aria-expanded={open}
        aria-controls="a11y-panel"
        className={`fixed bottom-6 left-6 z-[9999] flex items-center gap-2 rounded-full shadow-lg px-4 py-3 text-white font-bold text-sm transition-all duration-300 hover:scale-105 focus-visible:ring-4 focus-visible:ring-blue-300 ${
          isActive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        <Accessibility size={22} aria-hidden="true" />
        <span className="hidden sm:inline">{t('toggleBtn')}</span>
      </button>

      {/* Accessibility Panel */}
      {open && (
        <div
          ref={panelRef}
          id="a11y-panel"
          role="dialog"
          aria-label={t('title')}
          aria-modal="false"
          className="fixed bottom-20 left-6 z-[9999] w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
            <div className="flex items-center gap-2">
              <Accessibility size={18} aria-hidden="true" />
              <span className="font-bold text-sm">{t('title')}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label={t('close')}
              className="p-1 rounded-lg hover:bg-blue-500 transition-colors focus-visible:ring-2 focus-visible:ring-white"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="p-3 space-y-1.5">
            {menuItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={item.action}
                  aria-pressed={item.active}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    item.active
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <Icon size={18} aria-hidden="true" className={item.active ? 'text-blue-600' : 'text-gray-400'} />
                  <span className="flex-1 text-start">{t(item.key)}</span>
                  {item.badge && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                  {item.active && !item.badge && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Reset */}
          <div className="px-3 pb-3">
            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200 transition-colors"
            >
              <RotateCcw size={14} aria-hidden="true" />
              {t('reset')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
