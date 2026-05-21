import React, { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

// Event type colors
const EVENT_COLORS = {
  assignment: { bg: 'bg-cyan-500', dot: '#06b6d4', label: 'Assign' },
  loop_iteration: { bg: 'bg-violet-500', dot: '#8b5cf6', label: 'Loop' },
  condition: { bg: 'bg-amber-500', dot: '#f59e0b', label: 'Condition' },
  output: { bg: 'bg-emerald-500', dot: '#10b981', label: 'Output' },
  error: { bg: 'bg-red-500', dot: '#ef4444', label: 'Error' },
  expression: { bg: 'bg-blue-500', dot: '#3b82f6', label: 'Expr' },
  return: { bg: 'bg-pink-500', dot: '#ec4899', label: 'Return' },
  import: { bg: 'bg-gray-500', dot: '#6b7280', label: 'Import' },
};

const DEFAULT_EVENT_COLOR = { bg: 'bg-blue-500', dot: '#3b82f6', label: 'Step' };

/**
 * ExecutionTimeline — an enhanced execution timeline slider with color-coded
 * step markers, tooltips, and smooth scrubbing.
 */
const ExecutionTimeline = memo(({ 
  steps, 
  currentStep, 
  totalSteps, 
  onJumpToStep, 
  codeLines 
}) => {
  const [hoveredStep, setHoveredStep] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  if (totalSteps <= 0) return null;

  const progress = totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 100;

  const getEventColor = (event) => EVENT_COLORS[event] || DEFAULT_EVENT_COLOR;

  const handleSliderChange = useCallback((e) => {
    const step = parseInt(e.target.value, 10);
    onJumpToStep(step);
  }, [onJumpToStep]);

  const handleMarkerClick = useCallback((idx) => {
    onJumpToStep(idx);
  }, [onJumpToStep]);

  // Determine if we should show individual markers (too many = just show slider)
  const showMarkers = totalSteps <= 50;

  return (
    <div className="w-full space-y-2">
      {/* Main timeline track */}
      <div className="relative w-full">
        {/* Background track */}
        <div className="relative w-full h-3 bg-white/5 rounded-full overflow-visible">
          {/* Animated progress fill */}
          <motion.div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)',
              boxShadow: '0 0 12px rgba(139, 92, 246, 0.4)',
            }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />

          {/* Step markers overlay */}
          {showMarkers && (
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-[2px]">
              {steps.map((step, i) => {
                const isActive = i === currentStep;
                const isPast = i < currentStep;
                const color = getEventColor(step.event);

                return (
                  <div
                    key={i}
                    className="relative"
                    onMouseEnter={() => setHoveredStep(i)}
                    onMouseLeave={() => setHoveredStep(null)}
                  >
                    <button
                      onClick={() => handleMarkerClick(i)}
                      className={`relative w-3 h-3 rounded-full border-2 transition-all duration-200 cursor-pointer hover:scale-150 z-10 ${
                        isActive
                          ? 'scale-125'
                          : isPast
                          ? 'opacity-80'
                          : 'opacity-40 hover:opacity-80'
                      }`}
                      style={{
                        backgroundColor: isActive || isPast ? color.dot : 'rgba(255,255,255,0.1)',
                        borderColor: isActive ? '#fff' : isPast ? color.dot : 'rgba(255,255,255,0.15)',
                        boxShadow: isActive ? `0 0 10px ${color.dot}, 0 0 20px ${color.dot}40` : 'none',
                      }}
                      title={`Step ${i + 1}: ${color.label}`}
                    />

                    {/* Tooltip on hover */}
                    {hoveredStep === i && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                      >
                        <div className="bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 shadow-xl min-w-[160px]">
                          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">
                            Step {i + 1}
                          </div>
                          <div className="text-xs text-white/80 font-mono truncate">
                            {step.line && codeLines ? codeLines[step.line - 1] || '' : ''}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: color.dot }}
                            />
                            <span className="text-[10px] font-medium" style={{ color: color.dot }}>
                              {color.label}
                            </span>
                            {step.line && (
                              <span className="text-[10px] text-white/30 ml-auto">
                                Line {step.line}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Tooltip arrow */}
                        <div className="w-2 h-2 bg-[#1a1a2e] border-b border-r border-white/10 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Range slider (invisible, on top for interaction) */}
        <input
          type="range"
          min="0"
          max={totalSteps - 1}
          value={currentStep >= 0 ? currentStep : 0}
          onChange={handleSliderChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          className="absolute top-0 left-0 w-full h-3 opacity-0 cursor-pointer z-20"
          style={{ margin: 0 }}
        />
      </div>

      {/* Labels row */}
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-white/30 font-mono">Step 1</span>
        
        {/* Event type legend (compact) */}
        <div className="flex items-center gap-3">
          {Object.entries(EVENT_COLORS)
            .filter(([key]) => {
              // Only show legend for event types present in current steps
              return steps.some(s => s.event === key);
            })
            .slice(0, 5)
            .map(([key, color]) => (
              <div key={key} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color.dot }} />
                <span className="text-[9px] text-white/25 font-mono">{color.label}</span>
              </div>
            ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-purple-300/60 font-mono font-bold">
            {currentStep + 1} / {totalSteps}
          </span>
          <span className="text-[10px] text-white/30 font-mono">Step {totalSteps}</span>
        </div>
      </div>
    </div>
  );
});

ExecutionTimeline.displayName = 'ExecutionTimeline';

export default ExecutionTimeline;
