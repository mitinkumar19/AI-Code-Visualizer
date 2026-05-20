import React from 'react';
import { Sparkles, Loader2, Zap } from 'lucide-react';
import DynamicCaption from './DynamicCaption';

const ExplanationPanel = ({ explanation, onExplain, loading, animationMode, onToggleAnimationMode, code, steps, currentStepIndex }) => {
  return (
    <div className={`rounded-lg border p-4 max-h-[200px] flex flex-col transition-all duration-500 ${
      animationMode 
        ? 'bg-purple-900/15 border-purple-500/30 anim-panel-glow' 
        : 'bg-blue-900/10 border-blue-500/20'
    }`}>
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${
          animationMode ? 'text-purple-400' : 'text-blue-400'
        }`}>
          {animationMode ? <Zap size={14} /> : <Sparkles size={14} />}
          {animationMode ? 'Animation Mode' : 'AI Explanation'}
        </div>
        <div className="flex items-center gap-4">
          {/* Animate Flow toggle */}
          <label className="flex items-center gap-2 cursor-pointer group" title="Toggle animation mode">
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={animationMode || false} 
                onChange={onToggleAnimationMode} 
              />
              <div className={`block w-9 h-5 rounded-full transition-colors ${animationMode ? 'bg-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'bg-white/10'}`}></div>
              <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${animationMode ? 'translate-x-4' : ''}`}></div>
            </div>
            <span className={`text-xs font-medium transition-colors ${
              animationMode ? 'text-purple-300 group-hover:text-purple-200' : 'text-white/40 group-hover:text-white/60'
            }`}>
              Animate Flow
            </span>
          </label>

          {/* Explain Step button — only in normal mode */}
          {!animationMode && (
            <button
              onClick={onExplain}
              disabled={loading}
              className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-3 py-1 rounded border border-blue-500/30 transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : "Explain Step"}
            </button>
          )}
        </div>
      </div>

      {/* Content area: static explanation vs dynamic captions */}
      <div className="overflow-y-auto pr-2 anim-scrollbar">
        {animationMode ? (
          <DynamicCaption 
            code={code} 
            steps={steps} 
            currentStepIndex={currentStepIndex} 
          />
        ) : (
          <div className="text-sm text-blue-100/80 leading-relaxed">
            {explanation || "Click the button to get an AI-powered explanation of the current step."}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplanationPanel;
