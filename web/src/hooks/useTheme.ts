import { useCallback, useEffect, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ColorScheme = 'default' | 'dot' | 'neutral';
export type FontStyle = 'default' | 'anthropic';

const THEME_KEY = 'dotclaw-theme';
const SCHEME_KEY = 'dotclaw-color-scheme';
const FONT_KEY = 'dotclaw-font-style';

// Pre-rebrand storage keys. The project shipped as `miniclaw-*` (and before
// that `happyClaw-*`) before the DotClaw rename, so a returning visitor still
// holds their theme, palette, font style, last route and workspace memory
// under the old keys. Read them as a fallback and promote on first write so
// the rename never silently resets a user's preferences.
const LEGACY_KEY_PREFIX = 'miniclaw-';
const LEGACY_THEME_KEY = `${LEGACY_KEY_PREFIX}theme`;
const LEGACY_SCHEME_KEY = `${LEGACY_KEY_PREFIX}color-scheme`;
const LEGACY_FONT_KEY = `${LEGACY_KEY_PREFIX}font-style`;

/** Copy one legacy value forward once, then drop the old key. */
function readPref(key: string, legacyKey: string): string | null {
  if (typeof window === 'undefined') return null;
  const current = window.localStorage.getItem(key);
  if (current !== null) return current;
  const legacy = window.localStorage.getItem(legacyKey);
  if (legacy !== null) {
    window.localStorage.setItem(key, legacy);
    window.localStorage.removeItem(legacyKey);
  }
  return legacy;
}

/** Move a legacy preference that has no current key and is not a plain value. */
function migrateLegacyKeys() {
  if (typeof window === 'undefined') return;
  const passthrough: Array<[string, string]> = [
    ['message-snapshots', 'dotclaw-message-snapshots'],
    ['pwa-last-route', 'dotclaw-pwa-last-route'],
    ['pwa-restore-enabled', 'dotclaw-pwa-restore-enabled'],
    ['workspace-last-agent', 'dotclaw-workspace-last-agent'],
  ];
  for (const [suffix, target] of passthrough) {
    const legacy = window.localStorage.getItem(`${LEGACY_KEY_PREFIX}${suffix}`);
    if (legacy === null) continue;
    if (window.localStorage.getItem(target) === null) {
      window.localStorage.setItem(target, legacy);
    }
    window.localStorage.removeItem(`${LEGACY_KEY_PREFIX}${suffix}`);
  }
}
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => cb());
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

// 默认浅色：未设置过主题的用户不再跟随系统深色模式。
// 存储语义与之对称——无 key = light；「深色」「跟随系统」都显式落 key。
function readTheme(): Theme {
  const stored = readPref(THEME_KEY, LEGACY_THEME_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system')
    return stored;
  return 'light';
}

function readColorScheme(): ColorScheme {
  const stored = readPref(SCHEME_KEY, LEGACY_SCHEME_KEY);
  // 'orange' was the pre-rebrand name of the brand scheme; it now means 'dot'.
  // Rewrite the stored value so the old word never survives in localStorage.
  if (stored === 'orange') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SCHEME_KEY, 'dot');
    }
    return 'dot';
  }
  if (stored === 'default' || stored === 'dot' || stored === 'neutral')
    return stored;
  return 'dot';
}

function readFontStyle(): FontStyle {
  const stored = readPref(FONT_KEY, LEGACY_FONT_KEY);
  if (stored === 'default' || stored === 'anthropic') return stored;
  return 'default';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme;
}

function syncMetaThemeColor() {
  if (typeof document === 'undefined') return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const isDark = document.documentElement.classList.contains('dark');
  const isNeutral =
    document.documentElement.classList.contains('theme-neutral');
  const isBrand = document.documentElement.classList.contains('theme-dot');
  if (isDark) {
    meta.setAttribute('content', isNeutral ? '#09090b' : '#0f172a');
  } else {
    meta.setAttribute(
      'content',
      isBrand ? '#FAF9F5' : isNeutral ? '#ffffff' : '#ffffff',
    );
  }
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle(
    'dark',
    resolveTheme(theme) === 'dark',
  );
  syncMetaThemeColor();
}

function applyColorScheme(scheme: ColorScheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('theme-dot', scheme === 'dot');
  document.documentElement.classList.toggle(
    'theme-neutral',
    scheme === 'neutral',
  );
  syncMetaThemeColor();
}

function applyFontStyle(style: FontStyle) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle(
    'font-anthropic',
    style === 'anthropic',
  );
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    readTheme,
    () => 'light' as Theme,
  );
  const colorScheme = useSyncExternalStore(
    subscribe,
    readColorScheme,
    () => 'dot' as ColorScheme,
  );
  const fontStyle = useSyncExternalStore(
    subscribe,
    readFontStyle,
    () => 'default' as FontStyle,
  );

  useEffect(() => {
    migrateLegacyKeys();
  }, []);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  useEffect(() => {
    applyColorScheme(colorScheme);
  }, [colorScheme]);
  useEffect(() => {
    applyFontStyle(fontStyle);
  }, [fontStyle]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (readTheme() === 'system') {
        applyTheme('system');
        notify();
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    if (t === 'light') window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, t);
    applyTheme(t);
    notify();
  }, []);

  const setColorScheme = useCallback((s: ColorScheme) => {
    if (s === 'dot') window.localStorage.removeItem(SCHEME_KEY);
    else window.localStorage.setItem(SCHEME_KEY, s);
    applyColorScheme(s);
    notify();
  }, []);

  const setFontStyle = useCallback((f: FontStyle) => {
    if (f === 'default') window.localStorage.removeItem(FONT_KEY);
    else window.localStorage.setItem(FONT_KEY, f);
    applyFontStyle(f);
    notify();
  }, []);

  const toggle = useCallback(() => {
    const next: Theme =
      theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  }, [theme, setTheme]);

  return {
    theme,
    resolvedTheme: resolveTheme(theme),
    colorScheme,
    fontStyle,
    toggle,
    setTheme,
    setColorScheme,
    setFontStyle,
  };
}
