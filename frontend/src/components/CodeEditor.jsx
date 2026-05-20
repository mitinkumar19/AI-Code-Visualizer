import React, { useRef, useEffect } from 'react';

const CodeEditor = ({ code, setCode, currentLine, animationMode }) => {
  const textareaRef = useRef(null);
  const allLines = code.split('\n');
  
  // Trim trailing blank lines for display — only show meaningful lines + 1 for typing
  let lastCodeIdx = 0;
  for (let i = allLines.length - 1; i >= 0; i--) {
    if (allLines[i].trim().length > 0) {
      lastCodeIdx = i;
      break;
    }
  }
  // Show up to lastCodeIdx + 1 extra blank line (for typing), minimum 1 line
  const displayLineCount = Math.max(lastCodeIdx + 2, 1);
  const displayLines = allLines.slice(0, displayLineCount);

  // Clamp highlight to only valid code lines (not blank trailing lines)
  const lastCodeLine = lastCodeIdx + 1; // 1-indexed
  const safeLine = currentLine !== null && currentLine > 0 && currentLine <= lastCodeLine
    ? currentLine
    : null;

  // Auto-resize textarea to fit content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [code]);

  const editorHeight = `${displayLineCount * 1.5 + 2}rem`; // 1.5rem per line + padding

  return (
    <div className={`bg-[#1a1a1a] rounded-lg overflow-hidden border flex flex-col transition-all duration-500 ${
      animationMode ? 'border-purple-500/30 shadow-[0_0_20px_rgba(139,92,246,0.1)]' : 'border-white/10'
    }`}>
      <div className={`px-4 py-2 border-b text-xs uppercase tracking-widest font-semibold flex justify-between items-center transition-colors shrink-0 ${
        animationMode ? 'bg-purple-500/5 border-purple-500/20 text-purple-300/60' : 'bg-white/5 border-white/10 text-white/50'
      }`}>
        <span>Python Code Editor</span>
        {animationMode && (
          <span className="text-[10px] text-purple-400/50 font-mono normal-case tracking-normal">read-only</span>
        )}
      </div>
      <div 
        className="overflow-auto font-mono text-sm leading-6 relative"
        style={{ minHeight: '6rem', maxHeight: '50vh', height: editorHeight }}
      >
        <div className="absolute top-0 left-0 w-full h-full p-4 flex">
          {/* Line numbers — only for meaningful lines */}
          <div className="w-8 text-right pr-4 text-white/20 select-none shrink-0">
            {displayLines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => !animationMode && setCode(e.target.value)}
            readOnly={animationMode}
            placeholder="Write your code here..."
            rows={displayLineCount}
            className={`flex-1 bg-transparent border-none outline-none resize-none z-10 whitespace-pre ${
              animationMode ? 'text-white/60 cursor-default' : 'text-white/90'
            } placeholder:text-white/15 placeholder:italic`}
            spellCheck="false"
          />
          {/* Highlight layer */}
          <div className="absolute top-4 left-0 w-full pointer-events-none">
            {safeLine !== null && (
              <div 
                className={`w-full absolute transition-all ${
                  animationMode ? 'line-highlight-anim duration-500' : 'line-highlight duration-200'
                }`}
                style={{ 
                  top: `${(safeLine - 1) * 1.5}rem`,
                  height: '1.5rem'
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
