import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingButtonProps {
  loading: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
  loadingText?: string;
}

export function LoadingButton({
  loading,
  disabled = false,
  children,
  onClick,
  type = 'button',
  className = '',
  loadingText = 'Processing...'
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`flex items-center justify-center gap-2 transition-all duration-200 ${
        loading || disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:opacity-90'
      } ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {loading ? loadingText : children}
    </button>
  );
}