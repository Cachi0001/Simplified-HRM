import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  size?: 'sm' | 'default' | 'lg';
}

export function Badge({
  children,
  className = '',
  variant = 'default',
  size = 'default'
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center rounded-full font-medium';

  const variantClasses = {
    default: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    destructive: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    outline: 'border border-gray-300 text-gray-800 dark:border-gray-600 dark:text-gray-300'
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    default: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
}
