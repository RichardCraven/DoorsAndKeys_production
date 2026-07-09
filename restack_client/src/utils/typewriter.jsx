import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';

const Typewriter = ({ text, delay }) => {
  const containerRef = useRef(null);
  const [lines, setLines] = useState([]);
  const [measured, setMeasured] = useState(false);
  const [prevText, setPrevText] = useState(text);

  // If the text prop changes, reset measurement state
  if (text !== prevText) {
    setPrevText(text);
    setMeasured(false);
  }

  // Split text by whitespace into words to measure wrapping
  const tokens = useMemo(() => {
    if (!text) return [];
    return text.split(/\s+/).filter(w => w.length > 0);
  }, [text]);

  useLayoutEffect(() => {
    if (!containerRef.current || tokens.length === 0) {
      setLines([]);
      setMeasured(false);
      return;
    }

    const spans = containerRef.current.querySelectorAll('.word-span');
    if (spans.length === 0) return;

    const lineMap = new Map();
    spans.forEach((span, index) => {
      const rect = span.getBoundingClientRect();
      const top = Math.round(rect.top);

      // Group tops within a tolerance of 4px to account for zoom or subpixel layout
      let foundKey = null;
      for (const key of lineMap.keys()) {
        if (Math.abs(key - top) <= 4) {
          foundKey = key;
          break;
        }
      }

      const key = foundKey !== null ? foundKey : top;
      if (!lineMap.has(key)) {
        lineMap.set(key, []);
      }
      lineMap.get(key).push(tokens[index]);
    });

    // Sort lines by their vertical position (top)
    const sortedTops = Array.from(lineMap.keys()).sort((a, b) => a - b);
    const calculatedLines = sortedTops.map(top => lineMap.get(top).join(' '));

    setLines(calculatedLines);
    setMeasured(true);
  }, [tokens]);

  // Recalculate wrapping on window resize
  useEffect(() => {
    const handleResize = () => {
      setMeasured(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute staggered animation durations and delays for each line
  const lineAnimations = useMemo(() => {
    let currentDelay = 0;
    return lines.map((line) => {
      // Calculate duration proportional to line length (approx 20ms per character)
      const lineDuration = line.length * (delay || 20);
      const startDelay = currentDelay;
      // Stagger next line to start exactly as the current one finishes
      currentDelay += lineDuration;
      return {
        text: line,
        duration: lineDuration,
        delay: startDelay
      };
    });
  }, [lines, delay]);

  if (!text) return null;

  // Render hidden tokens to measure line breaks
  if (!measured && tokens.length > 0) {
    return (
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          display: 'block',
          width: '100%',
          textAlign: 'center',
          whiteSpace: 'pre-wrap',
          visibility: 'hidden',
          height: 0,
          overflow: 'hidden'
        }}
      >
        {tokens.map((token, idx) => (
          <React.Fragment key={idx}>
            <span className="word-span" style={{ display: 'inline-block' }}>
              {token}
            </span>
            {idx < tokens.length - 1 && ' '}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', display: 'block', width: '100%' }}>
      <style>{`
        @keyframes smoothReveal {
          from {
            clip-path: inset(0 100% 0 0);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }
      `}</style>
      {lineAnimations.map((anim, idx) => (
        <div
          key={`${text}-${idx}`}
          style={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%'
          }}
        >
          <div
            style={{
              display: 'inline-block',
              textAlign: 'center',
              whiteSpace: 'pre-wrap',
              clipPath: 'inset(0 100% 0 0)',
              animation: `smoothReveal ${anim.duration}ms linear ${anim.delay}ms forwards`
            }}
          >
            {anim.text}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Typewriter;