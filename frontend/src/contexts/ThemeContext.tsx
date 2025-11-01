import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    
    // Check user preferences
    const userPrefs = localStorage.getItem('userPreferences');
    if (userPrefs) {
      try {
        const parsed = JSON.parse(userPrefs);
        return parsed.darkMode || false;
      } catch {
        return false;
      }
    }
    
    // Default to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Save to localStorage whenever darkMode changes
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    
    // Also update userPreferences if it exists
    const userPrefs = localStorage.getItem('userPreferences');
    if (userPrefs) {
      try {
        const parsed = JSON.parse(userPrefs);
        parsed.darkMode = darkMode;
        localStorage.setItem('userPreferences', JSON.stringify(parsed));
      } catch {
        // If parsing fails, just save the darkMode
      }
    }
    
    // Apply to document class for global CSS
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}