
import React from 'react';
import Logo from './Logo';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  darkMode?: boolean; // Accept darkMode but don't use it (for compatibility)
}

export const Card: React.FC<CardProps> = ({ children, className, darkMode }) => {
  // Use darkMode prop to determine background color
  const bgColor = darkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  
  return (
    <div className={`${bgColor} ${textColor} rounded-lg shadow-xl p-8 ${className}`}>
      {children}
    </div>
  );
};

interface AuthCardProps {
    children: React.ReactNode;
    title: string;
    subtitle: string;
}

export const AuthCard: React.FC<AuthCardProps> = ({ children, title, subtitle }) => {
    return (
        <Card className="w-full max-w-md">
            <div className="text-center mb-8">
                <div className="mx-auto h-12 w-auto mb-4">
                     <Logo className="h-12 w-auto" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-light">{title}</h2>
                <p className="mt-2 text-sm text-gray-400">{subtitle}</p>
            </div>
            {children}
        </Card>
    )
}
