import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to determine display type of a value
const getVarType = (val) => {
  if (val === null || val === undefined) return 'null';
  if (Array.isArray(val)) return 'sequence';
  if (typeof val === 'object') return 'object';
  return 'scalar';
};

// Filter out garbage values that shouldn't be displayed
const isDisplayable = (key, val) => {
  // Skip internal/private names
  if (key.startsWith('_')) return false;
  // Skip string values that look like function/class/module representations
  if (typeof val === 'string') {
    if (val.startsWith('<function ')) return false;
    if (val.startsWith('<class ')) return false;
    if (val.startsWith('<module ')) return false;
    if (val.startsWith('<built-in ')) return false;
    if (val.includes('__execute_user_code__')) return false;
  }
  return true;
};

// Format a value for display
const formatValue = (val) => {
  if (val === null || val === undefined) return 'None';
  if (typeof val === 'boolean') return val ? 'True' : 'False';
  if (typeof val === 'string') return `'${val}'`;
  return String(val);
};

const ScalarBox = ({ value, hasChanged }) => (
  <motion.div
    layout
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ 
      scale: 1, 
      opacity: 1,
      backgroundColor: hasChanged ? "rgba(59, 130, 246, 0.15)" : "rgba(255, 255, 255, 0.03)",
      borderColor: hasChanged ? "rgba(59, 130, 246, 0.4)" : "rgba(255, 255, 255, 0.1)",
      boxShadow: hasChanged ? "0 0 20px rgba(59, 130, 246, 0.1)" : "none"
    }}
    className="px-4 py-3 rounded-lg border font-mono text-blue-400 min-w-[120px] text-center transition-colors duration-500 backdrop-blur-sm"
  >
    <AnimatePresence mode="wait">
      <motion.div
        key={String(value)}
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -5, opacity: 0 }}
        className="text-lg font-bold"
      >
        {formatValue(value)}
      </motion.div>
    </AnimatePresence>
  </motion.div>
);

const ObjectBox = ({ value, prevValue }) => {
  const entries = Object.entries(value);
  
  return (
    <div className="rounded-lg border border-white/10 overflow-hidden bg-white/[0.02]">
      {entries.length === 0 ? (
        <div className="px-3 py-2 text-white/20 font-mono text-xs italic">{'{}'}</div>
      ) : (
        entries.map(([k, v], i) => {
          const prevVal = prevValue && typeof prevValue === 'object' ? prevValue[k] : undefined;
          const hasChanged = prevVal !== undefined && JSON.stringify(prevVal) !== JSON.stringify(v);
          
          return (
            <motion.div
              key={k}
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: 1,
                backgroundColor: hasChanged ? "rgba(59, 130, 246, 0.08)" : "transparent"
              }}
              className={`flex items-center gap-2 px-3 py-1.5 font-mono text-xs ${i > 0 ? 'border-t border-white/5' : ''}`}
            >
              <span className="text-purple-400/70 font-bold shrink-0">{String(k)}</span>
              <span className="text-white/20">:</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={JSON.stringify(v)}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 4 }}
                  className={`text-blue-300 truncate ${hasChanged ? 'font-bold' : ''}`}
                >
                  {formatValue(v)}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          );
        })
      )}
    </div>
  );
};

const SequenceGrid = ({ values, prevValues }) => (
  <div className="flex flex-wrap gap-2.5 p-1">
    <AnimatePresence mode="popLayout">
      {values.map((item, idx) => {
        const prevItem = (prevValues && Array.isArray(prevValues)) ? prevValues[idx] : undefined;
        const hasChanged = prevItem !== undefined && prevItem !== item;
        
        return (
          <motion.div 
            key={`${idx}-${item}`}
            layout
            initial={{ scale: 0.8, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="flex flex-col items-center gap-1.5"
          >
            <motion.div
              animate={{ 
                backgroundColor: hasChanged ? "rgba(59, 130, 246, 0.25)" : "rgba(255, 255, 255, 0.08)",
                borderColor: hasChanged ? "rgba(59, 130, 246, 0.5)" : "rgba(255, 255, 255, 0.15)",
                boxShadow: hasChanged ? "0 0 15px rgba(59, 130, 246, 0.2)" : "none"
              }}
              className="w-14 h-14 flex items-center justify-center rounded-lg border text-white font-bold text-xl relative overflow-hidden transition-colors duration-500 backdrop-blur-sm"
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={item}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {formatValue(item)}
                </motion.span>
              </AnimatePresence>
              {hasChanged && (
                <motion.div 
                  initial={{ opacity: 0.5, scale: 0 }}
                  animate={{ opacity: 0, scale: 2 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 bg-blue-400 pointer-events-none"
                />
              )}
            </motion.div>
            <span className="text-[10px] text-white/20 font-mono font-bold">{idx}</span>
          </motion.div>
        );
      })}
    </AnimatePresence>
  </div>
);

const VariablesPanel = ({ variables, prevVariables }) => {
  // Filter out non-displayable variables
  const varKeys = Object.keys(variables).filter(key => isDisplayable(key, variables[key]));

  return (
    <div className="flex-1 bg-black/40 rounded-2xl overflow-hidden border border-white/5 flex flex-col min-h-0 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      <div className="px-6 py-4 bg-white/[0.03] border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-transparent via-white/5 to-transparent">
        <span className="text-[10px] text-white/40 uppercase tracking-[0.25em] font-black">Memory Monitor</span>
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500/30 animate-pulse"></div>
          <div className="w-2 h-2 rounded-full bg-blue-400/10"></div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-8 space-y-10 scrollbar-thin scrollbar-thumb-white/5 scroll-smooth">
        <AnimatePresence mode="popLayout">
          {varKeys.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-white/5 italic text-center gap-4 py-20"
            >
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/5 flex items-center justify-center rotate-45">
                <span className="text-3xl font-light">-</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium uppercase tracking-widest opacity-50">Memory Empty</p>
                <p className="text-[10px] lowercase opacity-30">No variables defined yet</p>
              </div>
            </motion.div>
          ) : (
            varKeys.map((key) => {
              const val = variables[key];
              const prevVal = prevVariables[key];
              const type = getVarType(val);
              const hasChanged = JSON.stringify(prevVal) !== JSON.stringify(val);

              return (
                <motion.div 
                  key={key} 
                  layout
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-4 group">
                    <span className="text-xs font-black text-white/60 uppercase tracking-widest group-hover:text-blue-400 transition-colors">{key}</span>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                    {hasChanged && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30"
                      >
                        <motion.span 
                          animate={{ x: [0, 3, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="text-blue-400 text-[10px]"
                        >
                          →
                        </motion.span>
                        <span className="text-[9px] text-blue-400 font-extrabold uppercase tracking-tighter">Modified</span>
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="pl-2">
                    {type === 'sequence' ? (
                      <SequenceGrid values={val} prevValues={prevVal} />
                    ) : type === 'object' ? (
                      <ObjectBox value={val} prevValue={prevVal} />
                    ) : (
                      <ScalarBox value={val} hasChanged={hasChanged} />
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VariablesPanel;
