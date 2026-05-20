import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import CodeEditor from './CodeEditor';
import VariablesPanel from './VariablesPanel';
import StepControls from './StepControls';
import OutputPanel from './OutputPanel';
import ExplanationPanel from './ExplanationPanel';

const API_BASE = 'http://localhost:8000';

const Visualizer = () => {
  const [code, setCode] = useState('');
  const [steps, setSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);
  const [truncated, setTruncated] = useState(false);

  // ── Animation Mode State ──
  const [animationMode, setAnimationMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1); // 0.5, 1, 2
  const animIntervalRef = useRef(null);

  // ── Animation playback engine ──
  useEffect(() => {
    // Clear any existing interval
    if (animIntervalRef.current) {
      clearInterval(animIntervalRef.current);
      animIntervalRef.current = null;
    }

    if (animationMode && isPlaying && steps.length > 0 && currentStepIndex < steps.length - 1) {
      const delay = 1000 / animationSpeed;
      animIntervalRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= steps.length - 1) {
            // Reached end — stop playing
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, delay);
    }

    // If we've reached the end, stop playing
    if (currentStepIndex >= steps.length - 1 && isPlaying) {
      setIsPlaying(false);
    }

    return () => {
      if (animIntervalRef.current) {
        clearInterval(animIntervalRef.current);
        animIntervalRef.current = null;
      }
    };
  }, [animationMode, isPlaying, animationSpeed, steps.length, currentStepIndex]);

  // ── Run code ──
  const runCode = async () => {
    setIsRunning(true);
    setIsPlaying(false);
    setTruncated(false);
    try {
      const response = await axios.post(`${API_BASE}/run`, { code });
      const rawSteps = response.data.steps;
      const wasTruncated = response.data.truncated || false;
      
      // Merge variables across steps so memory persists
      const processedSteps = rawSteps.reduce((acc, step, idx) => {
        const prevVariables = idx > 0 ? acc[idx - 1].variables : {};
        const mergedVariables = { ...prevVariables, ...step.variables };
        acc.push({ ...step, variables: mergedVariables });
        return acc;
      }, []);

      setSteps(processedSteps);
      setCurrentStepIndex(0);
      setExplanation('');
      setTruncated(wasTruncated);

      // If animation mode is on, auto-start playback after run
      if (animationMode) {
        setTimeout(() => setIsPlaying(true), 100);
      }
    } catch (error) {
      console.error("Error running code:", error);
      alert("Failed to run code. Make sure the backend is running.");
    } finally {
      setIsRunning(false);
    }
  };

  // ── Manual step controls (normal mode) ──
  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setExplanation('');
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setExplanation('');
    }
  };

  const handleReset = () => {
    setSteps([]);
    setCurrentStepIndex(-1);
    setExplanation('');
    setIsPlaying(false);
    setTruncated(false);
  };

  const handleSeek = (e) => {
    const step = parseInt(e.target.value, 10);
    setCurrentStepIndex(step);
    setExplanation('');
  };

  // ── Animation mode controls ──
  const toggleAnimationMode = () => {
    const next = !animationMode;
    setAnimationMode(next);
    if (!next) {
      // Turning off animation mode
      setIsPlaying(false);
    } else {
      // Turning on animation mode — if we already have steps, start from beginning
      if (steps.length > 0) {
        setCurrentStepIndex(0);
        setIsPlaying(true);
      }
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      // If at the end, restart first
      if (currentStepIndex >= steps.length - 1) {
        setCurrentStepIndex(0);
      }
      setIsPlaying(true);
    }
  };

  const handleAnimRestart = () => {
    setCurrentStepIndex(0);
    setIsPlaying(true);
  };

  const handleSpeedChange = (newSpeed) => {
    setAnimationSpeed(newSpeed);
  };

  const handleJumpToStep = (stepIndex) => {
    setCurrentStepIndex(stepIndex);
    setIsPlaying(false);
    setExplanation('');
  };

  // ── AI Explanation (only in normal mode) ──
  const handleExplain = React.useCallback(async () => {
    if (animationMode) return; // Skip API calls in animation mode
    if (currentStepIndex < 0 || currentStepIndex >= steps.length) return;
    
    const step = steps[currentStepIndex];
    if (step.error) return;

    setExplaining(true);
    try {
      const lineContent = code.split('\n')[step.line - 1] || "Evaluation";
      const response = await axios.post(`${API_BASE}/explain`, {
        line: lineContent,
        state: step.variables
      });
      setExplanation(response.data.explanation);
    } catch (error) {
      console.error("Error getting explanation:", error);
      setExplanation("Could not get explanation.");
    } finally {
      setExplaining(false);
    }
  }, [currentStepIndex, steps, code, animationMode]);

  // Auto-explain only in normal mode
  useEffect(() => {
    if (!animationMode && currentStepIndex >= 0 && steps.length > 0) {
      handleExplain();
    }
  }, [currentStepIndex, steps.length, handleExplain, animationMode]);

  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;
  const prevStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] : { variables: {} };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white p-6 gap-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            AI Code Visualizer
          </h1>
          <p className="text-white/40 text-sm">Step through Python code and understand its logic</p>
        </div>
        {animationMode && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-xs text-purple-300 font-medium">Animation Mode</span>
          </div>
        )}
      </header>

      {truncated && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs">
          <span className="text-yellow-400">⚠</span>
          <span>Execution truncated for visualization — showing first {steps.length} steps. Try simplifying your code or reducing loop/recursion depth.</span>
        </div>
      )}

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left Side: Code Editor */}
        <div className="flex-[0.8] flex flex-col gap-4 min-w-[300px]">
          <CodeEditor 
            code={code} 
            setCode={setCode} 
            currentLine={currentStep ? currentStep.line : null}
            animationMode={animationMode}
          />
          <StepControls 
            onRun={runCode}
            onNext={handleNext}
            onPrev={handlePrev}
            onReset={handleReset}
            onSeek={handleSeek}
            currentStep={currentStepIndex}
            totalSteps={steps.length}
            isRunning={isRunning}
            // Animation mode props
            animationMode={animationMode}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onRestart={handleAnimRestart}
            speed={animationSpeed}
            onSpeedChange={handleSpeedChange}
            onJumpToStep={handleJumpToStep}
          />
        </div>

        {/* Right Side: Data Panels */}
        <div className="flex-[1.2] flex flex-col gap-4 min-w-[500px]">
          <ExplanationPanel 
            explanation={explanation}
            onExplain={handleExplain}
            loading={explaining}
            animationMode={animationMode}
            onToggleAnimationMode={toggleAnimationMode}
            code={code}
            steps={steps}
            currentStepIndex={currentStepIndex}
          />
          
          <div className="flex-1 flex gap-4 min-h-0">
            <VariablesPanel 
              variables={currentStep ? currentStep.variables : {}} 
              prevVariables={prevStep ? prevStep.variables : {}}
            />
            <div className="w-1/3 flex flex-col gap-4">
              <OutputPanel 
                output={currentStep ? currentStep.output : ""} 
                finalOutput={steps.length > 0 ? steps[steps.length - 1].output : ""}
                isLastStep={steps.length > 0 && currentStepIndex === steps.length - 1}
              />
              {currentStep?.error && (
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-xs overflow-auto">
                  <div className="font-bold mb-1 uppercase tracking-tighter">Error:</div>
                  {currentStep.error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visualizer;
