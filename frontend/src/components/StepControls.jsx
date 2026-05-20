import React from 'react';
import { Play, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import AnimationControls from './AnimationControls';
import AnimationTimeline from './AnimationTimeline';

const StepControls = ({ 
  onRun, onNext, onPrev, onReset, onSeek,
  currentStep, totalSteps, isRunning,
  // Animation mode props
  animationMode, isPlaying, onPlayPause, onRestart, speed, onSpeedChange, onJumpToStep
}) => {
  const isFinished = totalSteps > 0 && currentStep >= totalSteps - 1;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Top row: Run button is always visible + either manual or animation controls */}
      <div className="flex items-center gap-4 bg-white/5 p-4 rounded-lg border border-white/10">
        <button
          onClick={onRun}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-md transition-colors font-medium cursor-pointer"
          disabled={isRunning}
        >
          <Play size={18} fill="currentColor" />
          {totalSteps > 0 ? "Rerun" : "Run Code"}
        </button>

        <div className="h-6 w-[1px] bg-white/10 mx-2" />

        {!animationMode ? (
          /* Normal Mode: manual step controls */
          <>
            <button
              onClick={onPrev}
              disabled={currentStep <= 0}
              className="p-2 rounded-md hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-white/80 cursor-pointer"
            >
              <SkipBack size={20} />
            </button>

            <div className="text-white/60 text-sm font-mono min-w-[80px] text-center">
              Step {totalSteps > 0 ? currentStep + 1 : 0} / {totalSteps}
            </div>

            <button
              onClick={onNext}
              disabled={currentStep >= totalSteps - 1}
              className="p-2 rounded-md hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-white/80 cursor-pointer"
            >
              <SkipForward size={20} />
            </button>

            <div className="h-6 w-[1px] bg-white/10 mx-2" />

            <button
              onClick={onReset}
              className="p-2 rounded-md hover:bg-white/10 transition-colors text-white/80 ml-auto cursor-pointer"
              title="Reset"
            >
              <RotateCcw size={20} />
            </button>
          </>
        ) : (
          /* Animation Mode: show compact status */
          <div className="text-xs text-purple-300/50 font-mono ml-auto">
            Animation Mode Active
          </div>
        )}
      </div>

      {/* Bottom section: slider (normal) or animation controls + timeline (anim) */}
      {animationMode ? (
        <div className="flex flex-col gap-3">
          <AnimationControls
            isPlaying={isPlaying}
            onPlayPause={onPlayPause}
            onRestart={onRestart}
            speed={speed}
            onSpeedChange={onSpeedChange}
            currentStep={currentStep}
            totalSteps={totalSteps}
            isFinished={isFinished}
          />
          {totalSteps > 0 && (
            <div className="bg-white/5 px-4 py-3 rounded-lg border border-white/10">
              <AnimationTimeline
                currentStep={currentStep >= 0 ? currentStep : 0}
                totalSteps={totalSteps}
                onJumpToStep={onJumpToStep}
              />
            </div>
          )}
        </div>
      ) : (
        totalSteps > 0 && (
          <div className="flex items-center gap-3 bg-white/5 px-4 py-3 rounded-lg border border-white/10">
            <span className="text-xs text-white/40 font-mono">1</span>
            <input 
              type="range" 
              min="0" 
              max={totalSteps - 1} 
              value={currentStep >= 0 ? currentStep : 0} 
              onChange={onSeek}
              className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-xs text-white/40 font-mono">{totalSteps}</span>
          </div>
        )
      )}
    </div>
  );
};

export default StepControls;
