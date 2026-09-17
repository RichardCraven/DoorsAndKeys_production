import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';

const Typewriter = ({ text, delay, align = 'left' }) => {
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

      if (foundKey !== null) {
        lineMap.get(foundKey).push(tokens[index]);
      } else {
        lineMap.set(top, [tokens[index]]);
      }
    });

    const detectedLines = Array.from(lineMap.values()).map(words => words.join(' '));
    setLines(detectedLines);
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

  // Compute timing for each line to run sequentially
  const lineAnimations = useMemo(() => {
    let currentDelay = 0;
    return lines.map(line => {
      const charCount = line.length;
      const duration = charCount * (delay || 30);
      const anim = {
        text: line,
        delay: currentDelay,
        duration: Math.max(duration, 50)
      };
      currentDelay += duration;
      return anim;
    });
  }, [lines, delay]);

  // If no text, render empty
  if (!text) return null;

  // Measurement render: invisible layout to discover word wrapping
  if (!measured) {
    return (
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          visibility: 'hidden',
          pointerEvents: 'none',
          height: 0,
          overflow: 'hidden',
          textAlign: align,
          width: '100%'
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
            justifyContent: align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start'),
            width: '100%'
          }}
        >
          <div
            style={{
              display: 'inline-block',
              textAlign: align,
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