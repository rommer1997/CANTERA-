import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export interface TourStep {
  targetId: string;
  title: string;
  text: string;
  isDecisionPoint?: boolean;
}

interface TutorialServiceProps {
  isActive: boolean;
  steps: TourStep[];
  currentStepIndex: number;
  onNext: () => void;
  onSkip: () => void;
  onFinish: () => void;
}

export default function TutorialService({
  isActive,
  steps,
  currentStepIndex,
  onNext,
  onSkip,
  onFinish
}: TutorialServiceProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[currentStepIndex];

  useEffect(() => {
    if (!isActive || !step) return;

    if (step.isDecisionPoint) {
      setRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.getElementById(step.targetId);
      if (el) {
        const r = el.getBoundingClientRect();
        // Add 8px padding around the target
        setRect({
          top: r.top - 8,
          left: r.left - 8,
          width: r.width + 16,
          height: r.height + 16,
          bottom: r.bottom + 8,
          right: r.right + 8,
          x: r.x - 8,
          y: r.y - 8,
          toJSON: () => {}
        } as DOMRect);
      }
    };

    // Initial update and setup interval for smooth tracking during animations/scrolls
    updateRect();
    const interval = setInterval(updateRect, 50);

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isActive, step]);

  if (!isActive || !step) return null;

  const isDecision = step.isDecisionPoint;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  
  // Determine tooltip position (above or below target)
  const tooltipPosition = rect 
    ? (rect.top > windowHeight / 2 ? 'top' : 'bottom') 
    : 'center';

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto overflow-hidden">
      
      {/* Skip Button (Permanent top right) */}
      <button 
        onClick={onSkip}
        className="fixed top-6 right-6 z-[110] text-[#707070] font-medium text-sm hover:text-white transition-colors"
      >
        Saltar
      </button>

      {/* Overlay Backgrounds (4 Divs to create a cutout with backdrop-blur) */}
      {!isDecision && rect && (
        <>
          {/* Top */}
          <div className="absolute top-0 left-0 right-0 bg-[#121212]/85 backdrop-blur-[12px] transition-all duration-300" style={{ height: Math.max(0, rect.top) }} />
          {/* Bottom */}
          <div className="absolute left-0 right-0 bottom-0 bg-[#121212]/85 backdrop-blur-[12px] transition-all duration-300" style={{ top: rect.bottom }} />
          {/* Left */}
          <div className="absolute left-0 bg-[#121212]/85 backdrop-blur-[12px] transition-all duration-300" style={{ top: Math.max(0, rect.top), height: rect.height, width: Math.max(0, rect.left) }} />
          {/* Right */}
          <div className="absolute right-0 bg-[#121212]/85 backdrop-blur-[12px] transition-all duration-300" style={{ top: Math.max(0, rect.top), height: rect.height, left: rect.right }} />
          
          {/* Highlight Border */}
          <div 
            className="absolute border-2 border-[#D4AF37] rounded-xl pointer-events-none transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          />
        </>
      )}

      {/* Full Overlay for Decision Point */}
      {isDecision && (
        <div className="absolute inset-0 bg-[#121212]/85 backdrop-blur-[12px]" />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "absolute w-[90%] max-w-[340px] bg-[#F5F5F5] rounded-[20px] p-6 shadow-2xl",
            isDecision ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : ""
          )}
          style={!isDecision && rect ? {
            left: '50%',
            transform: 'translateX(-50%)',
            ...(tooltipPosition === 'bottom' 
              ? { top: rect.bottom + 20 } 
              : { bottom: windowHeight - rect.top + 20 })
          } : {}}
        >
          <h3 className="text-[#121212] font-bold text-lg mb-2">{step.title}</h3>
          <p className="text-[#4A4A4A] text-sm leading-relaxed mb-6">{step.text}</p>
          
          <div className="flex justify-end items-center gap-4">
            {isDecision ? (
              <>
                <button 
                  onClick={onFinish}
                  className="text-[#707070] font-medium text-sm hover:text-[#121212] transition-colors"
                >
                  Comenzar ahora
                </button>
                <button 
                  onClick={onNext}
                  className="text-[#D4AF37] font-bold text-sm hover:opacity-80 transition-opacity"
                >
                  Siguiente
                </button>
              </>
            ) : (
              <button 
                onClick={currentStepIndex === steps.length - 1 ? onFinish : onNext}
                className="text-[#D4AF37] font-bold text-sm hover:opacity-80 transition-opacity"
              >
                {currentStepIndex === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
