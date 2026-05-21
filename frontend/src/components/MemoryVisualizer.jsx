import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MemoryBlock from './MemoryBlock';
import VariableNode from './VariableNode';
import ReferenceArrow from './ReferenceArrow';
import LoopVisualizer from './LoopVisualizer';

/**
 * MemoryVisualizer — the main container component that orchestrates
 * all memory visualization sub-components. Replaces the old VariablesPanel.
 * 
 * Displays:
 * - Memory blocks with addresses, types, and values
 * - Variable nodes with connector lines
 * - Reference arrows for shared mutable objects
 * - Loop iteration progress
 */
const MemoryVisualizer = memo(({ 
  memory = [], 
  references = [], 
  changedVariables = [], 
  loopInfo = null,
  prevMemory = [],
}) => {
  // Determine which variables are new (not in previous memory)
  const prevNames = new Set(prevMemory.map(m => m.name));
  
  // Group memory by referenceId to detect shared references
  const sharedRefIds = new Set();
  const refIdCount = {};
  memory.forEach(m => {
    if (m.referenceId) {
      refIdCount[m.referenceId] = (refIdCount[m.referenceId] || 0) + 1;
      if (refIdCount[m.referenceId] >= 2) {
        sharedRefIds.add(m.referenceId);
      }
    }
  });

  // Separate memory blocks into standalone and shared
  const standaloneBlocks = memory.filter(m => !m.referenceId || !sharedRefIds.has(m.referenceId));
  const sharedBlocks = memory.filter(m => m.referenceId && sharedRefIds.has(m.referenceId));

  const hasContent = memory.length > 0 || loopInfo;

  return (
    <div className="flex-1 bg-black/40 rounded-2xl overflow-hidden border border-white/5 flex flex-col min-h-0 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="px-6 py-4 bg-white/[0.03] border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-transparent via-white/5 to-transparent shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/40 uppercase tracking-[0.25em] font-black">
            Runtime Memory
          </span>
          {memory.length > 0 && (
            <span className="text-[10px] text-cyan-400/40 font-mono">
              {memory.length} allocation{memory.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          <div className={`w-2 h-2 rounded-full ${hasContent ? 'bg-cyan-500/50 animate-pulse' : 'bg-white/10'}`} />
          <div className={`w-2 h-2 rounded-full ${changedVariables.length > 0 ? 'bg-purple-400/50 animate-pulse' : 'bg-white/5'}`} />
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-6 space-y-5 anim-scrollbar scroll-smooth">
        <AnimatePresence mode="popLayout">
          {!hasContent ? (
            /* Empty state */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-white/5 italic text-center gap-4 py-16"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center">
                  <span className="text-2xl font-light text-white/10">⬡</span>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -inset-2 border border-white/5 rounded-2xl"
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium uppercase tracking-widest text-white/15">
                  Memory Empty
                </p>
                <p className="text-[10px] lowercase text-white/10">
                  Run code to see runtime memory allocations
                </p>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Loop visualizer (if active) */}
              {loopInfo && (
                <motion.div
                  layout
                  key="loop-visualizer"
                >
                  <LoopVisualizer loopInfo={loopInfo} />
                </motion.div>
              )}

              {/* Reference arrows (shared objects) */}
              {references.length > 0 && (
                <motion.div
                  layout
                  key="references"
                >
                  <ReferenceArrow references={references} memory={memory} />
                </motion.div>
              )}

              {/* Standalone memory blocks */}
              {standaloneBlocks.map((mem) => {
                const isChanged = changedVariables.includes(mem.name);
                const isNew = !prevNames.has(mem.name);

                return (
                  <motion.div
                    key={mem.name}
                    layout
                    className="flex items-start gap-0"
                  >
                    {/* Variable node with connector */}
                    <div className="shrink-0 pt-3">
                      <VariableNode
                        name={mem.name}
                        address={mem.address}
                        isNew={isNew}
                        isChanged={isChanged}
                      />
                    </div>

                    {/* Memory block */}
                    <div className="flex-1 min-w-0">
                      <MemoryBlock
                        name={mem.name}
                        value={mem.value}
                        type={mem.type}
                        address={mem.address}
                        isChanged={isChanged}
                        referenceId={mem.referenceId}
                      />
                    </div>
                  </motion.div>
                );
              })}

              {/* Shared reference blocks — show only once per shared group */}
              {sharedBlocks.length > 0 && (() => {
                // Group by referenceId, show as reference arrow only (already rendered above)
                // But also show individual blocks for variables not covered by ReferenceArrow
                const seenRefs = new Set();
                return sharedBlocks
                  .filter(mem => {
                    if (seenRefs.has(mem.referenceId)) return false;
                    seenRefs.add(mem.referenceId);
                    return true;
                  })
                  .map(mem => {
                    const isChanged = changedVariables.includes(mem.name);
                    return (
                      <motion.div
                        key={`shared-${mem.referenceId}`}
                        layout
                        className="flex items-start gap-0"
                      >
                        <div className="shrink-0 pt-3">
                          <VariableNode
                            name={`${sharedBlocks.filter(b => b.referenceId === mem.referenceId).map(b => b.name).join(', ')}`}
                            address={mem.address}
                            isNew={false}
                            isChanged={isChanged}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <MemoryBlock
                            name={sharedBlocks.filter(b => b.referenceId === mem.referenceId).map(b => b.name).join(' = ')}
                            value={mem.value}
                            type={mem.type}
                            address={mem.address}
                            isChanged={isChanged}
                            referenceId={mem.referenceId}
                          />
                        </div>
                      </motion.div>
                    );
                  });
              })()}

              {/* Changed variables summary bar */}
              {changedVariables.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/10"
                >
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.6 }}
                    className="w-1.5 h-1.5 rounded-full bg-blue-400"
                  />
                  <span className="text-[10px] text-blue-400/60 uppercase tracking-wider font-bold">
                    Modified:
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    {changedVariables.map(name => (
                      <span
                        key={name}
                        className="text-[10px] text-blue-300 font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/15"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

MemoryVisualizer.displayName = 'MemoryVisualizer';

export default MemoryVisualizer;
