import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from './Button';

interface DarkModeToggleProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

export function DarkModeToggle({ darkMode, setDarkMode }: DarkModeToggleProps) {
  return (
    <Button
      onClick={() => setDarkMode(!darkMode)}
      className={`relative ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
    >
      {darkMode ? (
        <Sun className="h-5 w-5 text-yellow-500" />
      ) : (
        <Moon className="h-5 w-5 text-gray-600" />
      )}
    </Button>
  );
}
