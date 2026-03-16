import * as React from 'react';
import { cn } from '../lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <svg
      className={cn('animate-spin text-brand', sizes[size], className)}
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
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function PageLoader() {
  return (
    <div className="flex h-full min-h-[200px] w-full items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}

export { LoadingSpinner, PageLoader };
