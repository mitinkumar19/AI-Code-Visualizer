import React from 'react';
import { Play, Pause, RotateCcw, Gauge } from 'lucide-react';

const SPEED_OPTIONS = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
];

/**
 * AnimationControls — Play/Pause, Restart, Speed selector for animation mode.
 */
const AnimationControls = ({ isPlaying, onPlayPause, onRestart, speed, onSpeedChange, currentStep, totalSteps, isFinished }) => {
  return (
    <div className="flex items-center gap-3 bg-purple-900/10 p-3 rounded-lg border border-purple-500/20">
      {/* Play / Pause */}
      <button
        onClick={onPlayPause}
        disabled={isFinished && !isPlaying}
        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all cursor-pointer ${
          isPlaying
            ? 'bg-purple-500/30 border border-purple-400/50 text-purple-300 shadow-[0_0_15px_rgba(139,92,246,0.3)]'
            : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30'
        }`}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
      </button>

      {/* Restart */}
      <button
        onClick={onRestart}
        className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all cursor-pointer"
        title="Restart"
      >
        <RotateCcw size={16} />
      </button>

      <div className="h-6 w-[1px] bg-purple-500/20 mx-1" />

      {/* Speed selector */}
      <div className="flex items-center gap-1">
        <Gauge size={14} className="text-purple-400/60 mr-1" />
        {SPEED_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSpeedChange(opt.value)}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              speed === opt.value
                ? 'bg-purple-500/30 text-purple-300 border border-purple-400/40 shadow-[0_0_8px_rgba(139,92,246,0.2)]'
                : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 hover:text-white/60'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="h-6 w-[1px] bg-purple-500/20 mx-1" />

      {/* Step counter */}
      <div className="text-xs text-purple-300/60 font-mono ml-auto">
        {isFinished ? (
          <span className="text-green-400/80">✓ Complete</span>
        ) : (
          <span>Step {totalSteps > 0 ? currentStep + 1 : 0} / {totalSteps}</span>
        )}
      </div>
    </div>
  );
};

export default AnimationControls;
