import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const OutputPanel = ({ output, finalOutput, isLastStep }) => {
  const currentLines = output ? output.split('\n').filter(l => l.length > 0) : [];
  const finalLines = finalOutput ? finalOutput.split('\n').filter(l => l.length > 0) : [];
  const hasFinalOutput = finalLines.length > 0;

  return (
    <div className="flex-1 bg-black rounded-lg overflow-hidden border border-white/10 flex flex-col min-h-0">
      <div className="px-4 py-2 bg-white/5 border-b border-white/10 text-xs text-white/50 uppercase tracking-widest font-semibold flex justify-between items-center shrink-0">
        <span>Output</span>
        {currentLines.length > 0 && (
          <span className="text-green-400/50 text-[10px] font-mono normal-case tracking-normal">
            {currentLines.length} line{currentLines.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4 font-mono text-sm anim-scrollbar">
        {currentLines.length === 0 && !isLastStep ? (
          <span className="text-white/10 italic">No output yet...</span>
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
                    className="text-green-400 leading-relaxed"
                  >
                    {line}
                  </motion.div>
                ))}
              </AnimatePresence>
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
                    className="text-cyan-300/80 leading-relaxed"
                  >
                    {line}
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;
