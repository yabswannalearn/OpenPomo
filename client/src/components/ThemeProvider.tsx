"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface ModeColors {
  pomodoro: string; // HSL hue (0-360)
  shortBreak: string;
  longBreak: string;
}

interface ThemeContextType {
  isDark: boolean;
  toggleDarkMode: () => void;
  modeColors: ModeColors;
  setModeColor: (mode: keyof ModeColors, hue: string) => void;
}

const DEFAULT_COLORS: ModeColors = {
  pomodoro: '350', // Rose/Red
  shortBreak: '160', // Teal
  longBreak: '210', // Blue
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [isDark, setIsDark] = useState(true);
  const [modeColors, setModeColors] = useState<ModeColors>(DEFAULT_COLORS);
  const [mounted, setMounted] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const savedDark = localStorage.getItem('darkMode');
    const savedColors = localStorage.getItem('modeColors');
    
    if (savedDark !== null) {
      setIsDark(savedDark === 'true');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
    }
    
    if (savedColors !== null) {
      try {
        const parsed = JSON.parse(savedColors);
        setModeColors({ ...DEFAULT_COLORS, ...parsed });
      } catch (e) {
        console.error('Failed to load mode colors', e);
      }
    }
    
    setMounted(true);
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('darkMode', String(isDark));
  }, [isDark, mounted]);

  // Apply mode colors as CSS variables
  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    
    root.style.setProperty('--pomodoro-hue', modeColors.pomodoro);
    root.style.setProperty('--short-break-hue', modeColors.shortBreak);
    root.style.setProperty('--long-break-hue', modeColors.longBreak);
    
    localStorage.setItem('modeColors', JSON.stringify(modeColors));
  }, [modeColors, mounted]);

  const toggleDarkMode = useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  const setModeColor = useCallback((mode: keyof ModeColors, hue: string) => {
    setModeColors(prev => {
      const updated = { ...prev, [mode]: hue };
      // Also dispatch event so Timer can pick up changes immediately
      window.dispatchEvent(new CustomEvent('themeChanged'));
      return updated;
    });
  }, []);

  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleDarkMode, modeColors, setModeColor }}>
      {children}
    </ThemeContext.Provider>
  );
}
