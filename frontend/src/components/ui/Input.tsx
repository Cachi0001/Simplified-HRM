
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  darkMode?: boolean; // Accept darkMode but don't pass it to DOM
}

export const Input: React.FC<InputProps> = ({ label, id, className = "", darkMode: propDarkMode, ...props }) => {
  const { darkMode: contextDarkMode } = useTheme();
  const darkMode = propDarkMode !== undefined ? propDarkMode : contextDarkMode;

  return (
    <div>
      {label && (
        <label htmlFor={id} className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {label}
        </label>
      )}
      <div className={label ? "mt-1 relative" : "relative"}>
        <input
          id={id}
          {...props}
          className={`appearance-none block w-full px-3 py-2.5 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm h-10 ${
            darkMode 
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          } ${className}`.replace(/\s+/g, ' ').trim()}
        />
      </div>
    </div>
  );
};
