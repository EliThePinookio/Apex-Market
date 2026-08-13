export type ThemeMode = 'system' | 'light' | 'dark';
export type EffectiveTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'app_theme_mode_v1';

export function getSystemTheme(): EffectiveTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch (e) {
    console.warn('Unable to read stored theme mode:', e);
  }
  return 'system';
}

export function resolveEffectiveTheme(mode: ThemeMode): EffectiveTheme {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
}

export function applyTheme(mode: ThemeMode): EffectiveTheme {
  const effective = resolveEffectiveTheme(mode);
  
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    const body = document.body;

    if (effective === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      if (body) {
        body.classList.add('dark');
        body.classList.remove('light');
      }
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      if (body) {
        body.classList.remove('dark');
        body.classList.add('light');
      }
      root.style.colorScheme = 'light';
    }

    // Update <meta name="theme-color"> for iOS/Android status bar
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', effective === 'dark' ? '#090d16' : '#ffffff');
  }

  // Notify listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('app-theme-changed', {
        detail: { mode, effectiveTheme: effective },
      })
    );
  }

  return effective;
}

export function setStoredThemeMode(mode: ThemeMode): EffectiveTheme {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (e) {
    console.warn('Unable to store theme mode:', e);
  }
  return applyTheme(mode);
}

const themeSubscribers = new Set<(effective: EffectiveTheme, mode: ThemeMode) => void>();

export function subscribeTheme(
  callback: (effective: EffectiveTheme, mode: ThemeMode) => void
): () => void {
  themeSubscribers.add(callback);

  const initialMode = getStoredThemeMode();
  const initialEffective = resolveEffectiveTheme(initialMode);
  callback(initialEffective, initialMode);

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<{ mode: ThemeMode; effectiveTheme: EffectiveTheme }>;
    if (custom.detail) {
      callback(custom.detail.effectiveTheme, custom.detail.mode);
    }
  };

  const handleMediaChange = () => {
    const currentMode = getStoredThemeMode();
    if (currentMode === 'system') {
      const newEffective = applyTheme('system');
      themeSubscribers.forEach((cb) => cb(newEffective, 'system'));
    }
  };

  window.addEventListener('app-theme-changed', handleCustomEvent);

  let mediaQuery: MediaQueryList | null = null;
  if (typeof window !== 'undefined' && window.matchMedia) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(handleMediaChange);
    }
  }

  return () => {
    themeSubscribers.delete(callback);
    window.removeEventListener('app-theme-changed', handleCustomEvent);
    if (mediaQuery) {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else if ((mediaQuery as any).removeListener) {
        (mediaQuery as any).removeListener(handleMediaChange);
      }
    }
  };
}
