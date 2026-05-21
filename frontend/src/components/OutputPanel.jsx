import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const OutputPanel = ({ output, finalOutput, isLastStep }) => {
  const currentLines = output ? output.split('\n').filter(l => l.length > 0) : [];
  const finalLines = finalOutput ? finalOutput.split('\n').filter(l => l.length > 0) : [];
  const hasFinalOutput = finalLines.length > 0;

  return (
    <div className="flex-1 bg-[#0d1117] rounded-xl overflow-hidden border border-white/10 flex flex-col min-h-0 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
      {/* Terminal-style header */}
      <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/10 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
          </div>
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Output</span>
        </div>
        {currentLines.length > 0 && (
          <span className="text-green-400/40 text-[10px] font-mono tracking-normal">
            {currentLines.length} line{currentLines.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Terminal content */}
      <div className="flex-1 overflow-auto p-4 font-mono text-sm anim-scrollbar">
        {currentLines.length === 0 && !isLastStep ? (
          <div className="flex items-center gap-1.5">
            <span className="text-green-500/30">$</span>
            <span className="text-white/10 italic">Waiting for output...</span>
            <span className="terminal-cursor" />
          </div>
        ) : (
          <div className="space-y-0">
            {/* Progressive step output — builds up as execution proceeds */}
            {currentLines.length > 0 && (
              <AnimatePresence mode="popLayout">
                {currentLines.map((line, i) => (
                  <motion.div
                    key={`step-${i}-${line}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="flex items-center gap-2 leading-relaxed"
                  >
                    <span className="text-green-500/30 select-none shrink-0">›</span>
                    <span className="text-green-400">{line}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {/* Blinking cursor at end */}
            {currentLines.length > 0 && !isLastStep && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-green-500/30 select-none">›</span>
                <span className="terminal-cursor" />
              </div>
            )}

            {/* Final Output — only shown when at the LAST step */}
            {isLastStep && hasFinalOutput && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-3 pt-3 border-t border-cyan-500/20"
              >
                <div className="text-[10px] text-cyan-400/60 uppercase tracking-widest font-bold mb-2 flex items-center gap-2">
                  <span>✓ Final Output</span>
                  <div className="h-[1px] flex-1 bg-cyan-400/10" />
                </div>
                {finalLines.map((line, i) => (
                  <div
                    key={`final-${i}`}
                    className="flex items-center gap-2 text-cyan-300/80 leading-relaxed"
                  >
                    <span className="text-cyan-500/30 select-none shrink-0">›</span>
                    <span>{line}</span>
                  </div>
                ))}
                {/* Completed indicator */}
                <div className="flex items-center gap-2 mt-2 text-[10px] text-green-400/40">
                  <span>$</span>
                  <span>Process exited with code 0</span>
                  <span className="terminal-cursor" />
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;
