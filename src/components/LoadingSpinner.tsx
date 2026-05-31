import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} border-gray-600 border-t-orange-500 rounded-full animate-spin`}
      />
      {text && <span className="text-sm text-gray-400">{text}</span>}
    </div>
  );
};
