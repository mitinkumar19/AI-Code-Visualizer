import React, { memo } from 'react';
import { motion } from 'framer-motion';

/**
 * VariableNode — a compact variable name label with an animated connector line
 * pointing to its associated MemoryBlock.
 */
const VariableNode = memo(({ name, address, isNew, isChanged }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="flex items-center gap-2"
    >
      {/* Variable name pill */}
      <motion.div
        animate={isChanged ? {
          boxShadow: [
            '0 0 0px rgba(139, 92, 246, 0)',
            '0 0 12px rgba(139, 92, 246, 0.5)',
            '0 0 0px rgba(139, 92, 246, 0)',
          ],
        } : {}}
        transition={{ duration: 1, ease: 'easeInOut' }}
        className={`px-3 py-1.5 rounded-lg font-mono text-sm font-bold border transition-all duration-300 ${
          isChanged
            ? 'bg-purple-500/20 border-purple-400/40 text-purple-300 shadow-[0_0_10px_rgba(139,92,246,0.2)]'
            : isNew
            ? 'bg-blue-500/20 border-blue-400/40 text-blue-300'
            : 'bg-white/5 border-white/10 text-white/70'
        }`}
      >
        {name}
      </motion.div>

      {/* Connector line */}
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 40, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center"
      >
        <div className="h-[1px] flex-1 bg-gradient-to-r from-white/30 to-white/10" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.25) 0, rgba(255,255,255,0.25) 4px, transparent 4px, transparent 8px)' }} />
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="text-white/30 text-xs ml-0.5"
        >
          ►
        </motion.span>
      </motion.div>
    </motion.div>
  );
});

VariableNode.displayName = 'VariableNode';

export default VariableNode;
