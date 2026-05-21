import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Type-specific color schemes
const TYPE_COLORS = {
  int: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', glow: 'rgba(6, 182, 212, 0.4)', badge: 'bg-cyan-500/20 text-cyan-300' },
  float: { text: 'text-cyan-300', bg: 'bg-cyan-500/10', border: 'border-cyan-500/25', glow: 'rgba(6, 182, 212, 0.3)', badge: 'bg-cyan-500/20 text-cyan-300' },
  str: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', glow: 'rgba(16, 185, 129, 0.4)', badge: 'bg-emerald-500/20 text-emerald-300' },
  list: { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', glow: 'rgba(139, 92, 246, 0.4)', badge: 'bg-violet-500/20 text-violet-300' },
  tuple: { text: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-500/25', glow: 'rgba(139, 92, 246, 0.3)', badge: 'bg-violet-500/20 text-violet-300' },
  dict: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', glow: 'rgba(245, 158, 11, 0.4)', badge: 'bg-amber-500/20 text-amber-300' },
  set: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', glow: 'rgba(244, 63, 94, 0.4)', badge: 'bg-rose-500/20 text-rose-300' },
  bool: { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30', glow: 'rgba(236, 72, 153, 0.4)', badge: 'bg-pink-500/20 text-pink-300' },
  NoneType: { text: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30', glow: 'rgba(156, 163, 175, 0.3)', badge: 'bg-gray-500/20 text-gray-300' },
};

const DEFAULT_COLOR = { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', glow: 'rgba(59, 130, 246, 0.4)', badge: 'bg-blue-500/20 text-blue-300' };

const formatValue = (val) => {
  if (val === null || val === undefined) return 'None';
  if (typeof val === 'boolean') return val ? 'True' : 'False';
  if (typeof val === 'string') return `'${val}'`;
  if (Array.isArray(val)) return `[${val.map(v => formatValue(v)).join(', ')}]`;
  if (typeof val === 'object') {
    const entries = Object.entries(val).map(([k, v]) => `'${k}': ${formatValue(v)}`);
    return `{${entries.join(', ')}}`;
  }
  return String(val);
};

/**
 * MemoryBlock — renders a single memory allocation block with type coloring,
 * address display, and glow animation when the value changes.
 */
const MemoryBlock = memo(({ name, value, type, address, isChanged, referenceId }) => {
  const colors = TYPE_COLORS[type] || DEFAULT_COLOR;
  const displayValue = formatValue(value);
  const isComplex = Array.isArray(value) || (typeof value === 'object' && value !== null);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85, y: 20 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        boxShadow: isChanged
          ? `0 0 20px ${colors.glow}, 0 0 40px ${colors.glow.replace('0.4', '0.15')}`
          : '0 4px 20px rgba(0,0,0,0.3)',
      }}
      exit={{ opacity: 0, scale: 0.85, y: -10 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className={`relative rounded-xl border ${colors.border} ${colors.bg} backdrop-blur-sm overflow-hidden memory-block-entry`}
      id={`memory-block-${name}`}
    >
      {/* Changed indicator pulse overlay */}
      {isChanged && (
        <motion.div
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ background: `radial-gradient(ellipse at center, ${colors.glow} 0%, transparent 70%)` }}
        />
      )}

      {/* Header: variable name + type badge */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <motion.span
            className="text-sm font-bold text-white/90 tracking-wide"
            animate={isChanged ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.4 }}
          >
            {name}
          </motion.span>
          {isChanged && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="w-1.5 h-1.5 rounded-full neon-dot"
              style={{ backgroundColor: colors.glow.replace(/[^#\w,.\s()]/g, '').includes('rgba') ? colors.text.replace('text-', '') : '#60a5fa' }}
            />
          )}
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${colors.badge} uppercase tracking-wider`}>
          {type}
        </span>
      </div>

      {/* Value display */}
      <div className="px-4 py-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={JSON.stringify(value)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className={`font-mono font-bold ${colors.text} ${isComplex ? 'text-sm' : 'text-xl'}`}
          >
            {isComplex ? (
              <div className="space-y-1">
                {Array.isArray(value) ? (
                  <div className="flex flex-wrap gap-1.5">
                    {value.map((item, idx) => (
                      <motion.span
                        key={`${idx}-${item}`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md border ${colors.border} ${colors.bg} text-sm font-bold`}
                      >
                        {formatValue(item)}
                      </motion.span>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {Object.entries(value).map(([k, v], idx) => (
                      <div key={k} className="flex items-center gap-2 text-xs">
                        <span className="text-white/50 font-bold">{k}:</span>
                        <span className={colors.text}>{formatValue(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              displayValue
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Address footer */}
      <div className="px-4 py-1.5 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-white/20 font-mono tracking-wider">{address}</span>
        {referenceId && (
          <span className="text-[10px] text-purple-400/40 font-mono">⟁ shared</span>
        )}
      </div>
    </motion.div>
  );
});

MemoryBlock.displayName = 'MemoryBlock';

export default MemoryBlock;
