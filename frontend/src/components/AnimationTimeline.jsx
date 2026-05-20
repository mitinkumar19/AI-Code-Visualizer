import React from 'react';
import { motion } from 'framer-motion';

/**
 * AnimationTimeline — a visual execution progress bar with clickable step dots.
 */
const AnimationTimeline = ({ currentStep, totalSteps, onJumpToStep }) => {
  if (totalSteps <= 0) return null;

  const progress = totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 100;

  return (
    <div className="w-full px-1 py-2">
      {/* Progress bar container */}
      <div className="relative w-full h-2 bg-white/5 rounded-full overflow-visible">
        {/* Animated fill */}
        <motion.div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)',
            boxShadow: '0 0 12px rgba(139, 92, 246, 0.4)',
          }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />

        {/* Step dots */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const isActive = i === currentStep;
            const isPast = i < currentStep;

            return (
              <button
                key={i}
                onClick={() => onJumpToStep(i)}
                className={`relative w-3 h-3 rounded-full border-2 transition-all duration-300 cursor-pointer hover:scale-150 ${
                  isActive
                    ? 'bg-purple-400 border-purple-300 timeline-dot-active scale-125'
                    : isPast
                    ? 'bg-purple-500/60 border-purple-400/40'
                    : 'bg-white/10 border-white/15 hover:bg-white/20'
                }`}
                title={`Step ${i + 1}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeGlow"
                    className="absolute -inset-1 rounded-full bg-purple-400/20"
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step labels */}
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-white/30 font-mono">Step 1</span>
        <span className="text-[10px] text-purple-300/60 font-mono font-bold">
          {currentStep + 1} / {totalSteps}
        </span>
        <span className="text-[10px] text-white/30 font-mono">Step {totalSteps}</span>
      </div>
    </div>
  );
};

export default AnimationTimeline;
