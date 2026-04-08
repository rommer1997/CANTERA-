import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface BackButtonProps {
  className?: string;
  label?: string;
}

export default function BackButton({ className, label }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className={cn(
        "flex items-center gap-1 text-charcoal/60 dark:text-gray-400 hover:text-charcoal dark:hover:text-white transition-colors group",
        className
      )}
    >
      <div className="p-1.5 rounded-full bg-black/5 dark:bg-white/5 group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
        <ChevronLeft size={18} />
      </div>
      {label && <span className="text-sm font-medium">{label}</span>}
    </button>
  );
}
