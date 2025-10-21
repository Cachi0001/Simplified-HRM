
import React from 'react';
import Logo from './Logo';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div className={`bg-secondary rounded-lg shadow-xl p-8 ${className}`}>
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
