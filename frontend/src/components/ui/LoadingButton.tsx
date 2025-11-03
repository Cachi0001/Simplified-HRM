import React from 'react';

interface LoadingButtonProps {
  loading: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
  loadingText?: string;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading,
  disabled = false,
  children,
  onClick,
  type = 'button',
  className = '',
  loadingText = 'Processing...'
}) => {
  const isDisabled = loading || disabled;
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        relative inline-flex items-center justify-center px-4 py-2 
        border border-transparent text-sm font-medium rounded-md 
        text-white bg-blue-600 hover:bg-blue-700 
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        ${className}
      `}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {loading ? loadingText : children}
    </button>
  );
};

export default LoadingButton;