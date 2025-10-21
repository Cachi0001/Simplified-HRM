
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

export const Input: React.FC<InputProps> = ({ label, id, ...props }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300">
        {label}
      </label>
      <div className="mt-1">
        <input
          id={id}
          {...props}
          className="appearance-none block w-full px-3 py-2 border border-accent bg-primary rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-highlight focus:border-highlight sm:text-sm text-light"
        />
      </div>
    </div>
  );
};
