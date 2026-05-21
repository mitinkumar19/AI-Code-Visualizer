import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ReferenceArrow — displays a visual indicator when multiple variables
 * share the same mutable object reference.
 * 
 * Uses CSS-based connectors with neon styling to show:
 *   a ─┐
 *      ├────► [shared object]
 *   b ─┘
 */
const ReferenceArrow = memo(({ references, memory }) => {
  if (!references || references.length === 0) return null;

  // Group references by target (referenceId)
  const groups = {};
  references.forEach(ref => {
    if (!groups[ref.to]) {
      groups[ref.to] = [];
    }
    groups[ref.to].push(ref.from);
  });

  // Only show groups with 2+ variables pointing to same target
  const sharedGroups = Object.entries(groups).filter(([_, names]) => names.length >= 2);

  if (sharedGroups.length === 0) return null;

  // Find the memory block for each reference
  const getMemoryBlock = (refId) => {
    return memory?.find(m => m.referenceId === refId);
  };

  return (
    <AnimatePresence>
      {sharedGroups.map(([refId, varNames]) => {
        const memBlock = getMemoryBlock(refId);
        if (!memBlock) return null;

        return (
          <motion.div
            key={refId}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="rounded-xl border border-purple-500/20 bg-purple-900/10 p-4 backdrop-blur-sm"
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-[10px] text-purple-400/70 uppercase tracking-[0.2em] font-bold">
                Shared Reference
              </span>
            </div>

            {/* Reference visualization */}
            <div className="flex items-center gap-3">
              {/* Variable names column */}
              <div className="flex flex-col items-end gap-1">
                {varNames.map((name, idx) => (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-sm font-mono font-bold text-purple-300">{name}</span>
                    <span className="text-white/20 text-xs">─</span>
                  </motion.div>
                ))}
              </div>

              {/* Connector bracket */}
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="flex flex-col items-center"
                style={{ originY: 0.5 }}
              >
                <div className="w-[2px] flex-1 bg-gradient-to-b from-purple-500/40 via-purple-400/60 to-purple-500/40 rounded-full reference-line-glow" 
                  style={{ minHeight: `${varNames.length * 24}px` }} 
                />
              </motion.div>

              {/* Arrow */}
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.35 }}
                className="flex items-center gap-2 overflow-hidden"
              >
                <div className="flex items-center">
                  <div className="w-6 h-[2px] bg-gradient-to-r from-purple-400/60 to-purple-400/30 reference-line-glow" />
                  <span className="text-purple-400/70 text-sm">►</span>
                </div>

                {/* Shared value block */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
                  className="px-3 py-2 rounded-lg border border-purple-500/30 bg-purple-500/10 font-mono text-sm text-purple-300"
                >
                  {formatSharedValue(memBlock.value)}
                </motion.div>
              </motion.div>
            </div>

            {/* Address */}
            <div className="mt-2 text-[10px] text-purple-400/30 font-mono text-right">
              {memBlock.address} • {memBlock.type}
            </div>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
});

function formatSharedValue(val) {
  if (val === null || val === undefined) return 'None';
  if (typeof val === 'boolean') return val ? 'True' : 'False';
  if (typeof val === 'string') return `'${val}'`;
  if (Array.isArray(val)) return `[${val.map(v => formatItemValue(v)).join(', ')}]`;
  if (typeof val === 'object') {
    const entries = Object.entries(val).map(([k, v]) => `'${k}': ${formatItemValue(v)}`);
    return `{${entries.join(', ')}}`;
  }
  return String(val);
}

function formatItemValue(val) {
  if (val === null || val === undefined) return 'None';
  if (typeof val === 'boolean') return val ? 'True' : 'False';
  if (typeof val === 'string') return `'${val}'`;
  return String(val);
}

ReferenceArrow.displayName = 'ReferenceArrow';

export default ReferenceArrow;
