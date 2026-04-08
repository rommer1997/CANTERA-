import React from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-lg tracking-[0.2em]',
    md: 'text-xl tracking-[0.3em]',
    lg: 'text-2xl tracking-[0.4em]',
    xl: 'text-3xl md:text-5xl tracking-[0.4em] md:tracking-[0.5em]'
  };

  return (
    <div className={cn("font-bold select-none flex items-baseline", sizeClasses[size], className)}>
      <span className="text-charcoal dark:text-white transition-colors duration-300 uppercase">CANTERA</span>
      <span className="text-red-600 ml-0.5 md:ml-1">.</span>
    </div>
  );
}
