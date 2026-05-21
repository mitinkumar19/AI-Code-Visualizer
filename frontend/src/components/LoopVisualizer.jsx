import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * LoopVisualizer — displays loop iteration progress with a visual
 * progress bar and iteration counter when a loop is active.
 */
const LoopVisualizer = memo(({ loopInfo }) => {
  if (!loopInfo) return null;

  const { variable, current, total, value } = loopInfo;
  const hasTotal = total !== null && total !== undefined && total > 0;
  const progress = hasTotal ? Math.min((current / total) * 100, 100) : null;
  const isComplete = hasTotal && current > total;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="rounded-xl border border-indigo-500/25 bg-indigo-900/10 p-4 backdrop-blur-sm overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-indigo-400/60 border-t-indigo-400 rounded-full"
            />
            <span className="text-[10px] text-indigo-400/70 uppercase tracking-[0.2em] font-bold">
              Loop Progress
            </span>
          </div>
          <span className="text-xs text-indigo-300/50 font-mono">
            for <span className="text-indigo-300 font-bold">{variable}</span>
          </span>
        </div>

        {/* Progress bar */}
        {hasTotal && (
          <div className="relative w-full h-2 bg-white/5 rounded-full overflow-hidden mb-3">
            <motion.div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #6366f1, #818cf8, #a5b4fc)',
                boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)',
              }}
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
            {/* Shimmer effect */}
            <motion.div
              className="absolute top-0 left-0 h-full w-[60%] rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
              }}
              animate={{ x: ['0%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}

        {/* Iteration counter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, scale: 0.8, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -5 }}
                transition={{ duration: 0.2 }}
                className="flex items-baseline gap-1.5"
              >
                <span className="text-xs text-white/40 font-medium">Iteration</span>
                <span className="text-lg font-bold text-indigo-300 font-mono tabular-nums">
                  {Math.min(current, total || current)}
                </span>
                {hasTotal && (
                  <>
                    <span className="text-white/20 text-sm">/</span>
                    <span className="text-sm text-white/40 font-mono">{total}</span>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Current value badge */}
          {value !== null && value !== undefined && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/20"
            >
              <span className="text-[10px] text-indigo-400/60 font-mono">{variable} =</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={String(value)}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-sm font-bold text-indigo-300 font-mono"
                >
                  {String(value)}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Iteration dots (for small totals) */}
        {hasTotal && total <= 20 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {Array.from({ length: total }).map((_, i) => {
              const isActive = i + 1 === Math.min(current, total);
              const isPast = i + 1 < current;

              return (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)] scale-125'
                      : isPast
                      ? 'bg-indigo-500/50'
                      : 'bg-white/10'
                  }`}
                />
              );
            })}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
});

LoopVisualizer.displayName = 'LoopVisualizer';

export default LoopVisualizer;
