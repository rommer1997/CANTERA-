import React from 'react';
import { cn } from '../lib/utils';
import BrandMark from './BrandMark';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl md:text-5xl'
  };

  return (
    <div className={cn("font-bold select-none flex items-center gap-2 tracking-tight", sizeClasses[size], className)}>
      <BrandMark className="rounded-lg shrink-0" />
      <span className="text-charcoal dark:text-white transition-colors duration-300">LaCantera</span>
    </div>
  );
}
