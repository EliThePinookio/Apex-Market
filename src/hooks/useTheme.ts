import { useState, useEffect } from 'react';
import {
  ThemeMode,
  EffectiveTheme,
  getStoredThemeMode,
  setStoredThemeMode,
  subscribeTheme,
  getSystemTheme,
} from '../services/themeService';

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(getStoredThemeMode);
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>(() =>
    mode === 'system' ? getSystemTheme() : mode
  );
  const [systemTheme, setSystemTheme] = useState<EffectiveTheme>(getSystemTheme);

  useEffect(() => {
    const unsubscribe = subscribeTheme((effective, currentMode) => {
      setEffectiveTheme(effective);
      setMode(currentMode);
      setSystemTheme(getSystemTheme());
    });

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMedia = () => {
      setSystemTheme(getSystemTheme());
    };
    if (media.addEventListener) {
      media.addEventListener('change', handleMedia);
    }

    return () => {
      unsubscribe();
      if (media.removeEventListener) {
        media.removeEventListener('change', handleMedia);
      }
    };
  }, []);

  const changeMode = (newMode: ThemeMode) => {
    const effective = setStoredThemeMode(newMode);
    setMode(newMode);
    setEffectiveTheme(effective);
  };

  const toggleTheme = () => {
    if (mode === 'system') {
      changeMode(effectiveTheme === 'dark' ? 'light' : 'dark');
    } else if (mode === 'dark') {
      changeMode('light');
    } else {
      changeMode('dark');
    }
  };

  return {
    mode,
    effectiveTheme,
    isDark: effectiveTheme === 'dark',
    systemTheme,
    setThemeMode: changeMode,
    toggleTheme,
  };
}
