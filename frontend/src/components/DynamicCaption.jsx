import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Generates a human-readable caption from a code line and execution context.
 */
const generateCaption = (line, variables, prevVariables, codeLines, currentLineNum, nextLineNum) => {
  const trimmed = line.trim();

  // Assignment (but not ==, !=, <=, >=)
  if (trimmed.match(/^[a-zA-Z_]\w*\s*=\s*/) && !trimmed.includes('==') && !trimmed.startsWith('if ') && !trimmed.startsWith('elif ') && !trimmed.startsWith('while ') && !trimmed.startsWith('for ')) {
    const parts = trimmed.split('=');
    const varName = parts[0].trim();
    const value = variables[varName];
    const displayVal = value !== undefined ? JSON.stringify(value) : parts.slice(1).join('=').trim();
    return `Assigning ${varName} = ${displayVal}`;
  }

  // if statement
  if (trimmed.startsWith('if ')) {
    const condition = trimmed.replace(/^if\s+/, '').replace(/:$/, '');
    // Determine if the condition was true or false by checking where execution goes next
    if (nextLineNum !== null && nextLineNum !== undefined) {
      const ifIndent = line.search(/\S/);
      const nextLine = codeLines[nextLineNum - 1] || '';
      const nextIndent = nextLine.search(/\S/);
      if (nextIndent > ifIndent) {
        return `Checking: ${condition} → TRUE ✓ entering IF block`;
      } else {
        return `Checking: ${condition} → FALSE ✗ skipping IF block`;
      }
    }
    return `Checking condition: ${condition}…`;
  }

  // elif
  if (trimmed.startsWith('elif ')) {
    const condition = trimmed.replace(/^elif\s+/, '').replace(/:$/, '');
    if (nextLineNum !== null && nextLineNum !== undefined) {
      const elifIndent = line.search(/\S/);
      const nextLine = codeLines[nextLineNum - 1] || '';
      const nextIndent = nextLine.search(/\S/);
      if (nextIndent > elifIndent) {
        return `Checking: ${condition} → TRUE ✓ entering ELIF block`;
      } else {
        return `Checking: ${condition} → FALSE ✗ skipping ELIF`;
      }
    }
    return `Checking elif: ${condition}…`;
  }

  // else
  if (trimmed.startsWith('else') && trimmed.includes(':')) {
    return `Entering ELSE block`;
  }

  // for loop
  if (trimmed.startsWith('for ')) {
    const match = trimmed.match(/^for\s+(\w+)\s+in\s+(.+?)\s*:/);
    if (match) {
      const loopVar = match[1];
      const iterable = match[2];
      const currentVal = variables[loopVar];
      if (currentVal !== undefined) {
        return `Loop: ${loopVar} = ${JSON.stringify(currentVal)} (iterating over ${iterable})`;
      }
      return `Starting loop: ${loopVar} in ${iterable}`;
    }
  }

  // while loop
  if (trimmed.startsWith('while ')) {
    const condition = trimmed.replace(/^while\s+/, '').replace(/:$/, '');
    return `While loop: checking ${condition}…`;
  }

  // print statement
  if (trimmed.includes('print(')) {
    const match = trimmed.match(/print\((.+)\)/);
    if (match) {
      // Try to resolve the printed value from output
      return `Printing → ${match[1]}`;
    }
    return `Executing print statement`;
  }

  // return
  if (trimmed.startsWith('return')) {
    const val = trimmed.replace(/^return\s*/, '');
    return `Returning ${val || 'None'}`;
  }

  // def
  if (trimmed.startsWith('def ')) {
    const match = trimmed.match(/^def\s+(\w+)/);
    if (match) {
      return `Defining function ${match[1]}()`;
    }
  }

  // break / continue
  if (trimmed === 'break') return `Breaking out of loop`;
  if (trimmed === 'continue') return `Continuing to next iteration`;

  // Default
  return `Executing: ${trimmed}`;
};

/**
 * DynamicCaption component — renders animated typewriter-style captions
 * synced to the current execution step.
 */
const DynamicCaption = ({ code, steps, currentStepIndex }) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const intervalRef = useRef(null);

  const codeLines = code.split('\n');
  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;
  const prevStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] : { variables: {} };
  const nextStep = currentStepIndex < steps.length - 1 ? steps[currentStepIndex + 1] : null;

  const caption = currentStep
    ? generateCaption(
        codeLines[currentStep.lineNumber - 1] || '',
        currentStep.variables || {},
        prevStep.variables || {},
        codeLines,
        currentStep.lineNumber,
        nextStep ? nextStep.lineNumber : null
      )
    : 'Ready to animate…';

  // Fetch AI explanation when step changes in animation mode
  useEffect(() => {
    if (!currentStep) {
      setAiExplanation('');
      return;
    }

    setLoadingExplanation(true);
    setAiExplanation('');

    const lineContent = codeLines[currentStep.lineNumber - 1] || "Evaluation";
    
    fetch('http://localhost:8000/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        line: lineContent,
        state: currentStep.variables || {}
      })
    })
      .then(res => res.json())
      .then(data => {
        setAiExplanation(data.explanation || '');
        setLoadingExplanation(false);
      })
      .catch(err => {
        console.error("Error fetching explanation:", err);
        setLoadingExplanation(false);
      });
  }, [currentStepIndex, currentStep, codeLines]);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    setDisplayText('');
    setIsTyping(true);

    let charIndex = 0;
    intervalRef.current = setInterval(() => {
      if (charIndex < caption.length) {
        setDisplayText(caption.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(intervalRef.current);
        setIsTyping(false);
      }
    }, 25); // 25ms per character

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [caption]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentStepIndex}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className="text-sm leading-relaxed space-y-3"
      >
        {/* Typewriter caption */}
        <div className="flex items-start gap-2">
          <span className="text-purple-300 font-semibold text-lg">▶</span>
          <span className="text-purple-100/90 font-medium flex-1">
            {displayText}
            {isTyping && <span className="typewriter-cursor" />}
          </span>
        </div>

        {/* AI-generated explanation */}
        {aiExplanation && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="pl-6 border-l-2 border-purple-400/40"
          >
            <div className="text-xs text-purple-300/70 font-semibold uppercase tracking-wide mb-1">
              💡 AI Insight
            </div>
            <div className="text-sm text-purple-100/80 leading-relaxed">
              {aiExplanation}
            </div>
          </motion.div>
        )}

        {/* Loading state */}
        {loadingExplanation && !aiExplanation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pl-6 border-l-2 border-purple-400/20"
          >
            <div className="text-xs text-purple-300/50 italic">
              ✨ Generating AI explanation...
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default DynamicCaption;
