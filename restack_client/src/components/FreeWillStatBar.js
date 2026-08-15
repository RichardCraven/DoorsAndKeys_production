import React, { useState, useEffect } from 'react';
import './FreeWillStatBar.css';

/**
 * FreeWillStatBar
 * Displays user Free Will level progress in 10 rectangular segments (matching Screenshot 2).
 * Every 10 points of Free Will = 1 User Level (Level 0 to Level 10 MAX).
 * 
 * Props:
 *  - freeWill (number): target freeWill points (0 - 100)
 *  - initialFreeWill (number): starting freeWill points for delayed fill animation
 *  - animateOnMount (boolean): if true, animates from initialFreeWill to freeWill after delay
 *  - delayMs (number): delay before triggering fill animation (default 600ms)
 *  - showLevel (boolean): whether to display user level label (default true)
 */
const FreeWillStatBar = ({
  freeWill = 0,
  initialFreeWill = null,
  animateOnMount = false,
  delayMs = 600,
  showLevel = true,
  className = ''
}) => {
  const targetVal = Math.min(100, Math.max(0, typeof freeWill === 'number' ? freeWill : 0));
  const startVal = animateOnMount
    ? (initialFreeWill !== null ? Math.min(100, Math.max(0, initialFreeWill)) : Math.max(0, targetVal - 1))
    : targetVal;

  const [currentVal, setCurrentVal] = useState(startVal);
  const [isLevelingUp, setIsLevelingUp] = useState(false);

  useEffect(() => {
    if (animateOnMount) {
      const timer = setTimeout(() => {
        setCurrentVal(targetVal);
        const oldLvl = Math.min(10, Math.floor(startVal / 10));
        const newLvl = Math.min(10, Math.floor(targetVal / 10));
        if (newLvl > oldLvl) {
          setIsLevelingUp(true);
        }
      }, delayMs);
      return () => clearTimeout(timer);
    } else {
      setCurrentVal(targetVal);
    }
  }, [animateOnMount, targetVal, startVal, delayMs]);

  const userLevel = Math.min(10, Math.floor(currentVal / 10));
  const segmentsFilled = userLevel === 10 ? 10 : (currentVal % 10);

  return (
    <div className={`freewill-statbar-container ${className} ${isLevelingUp ? 'level-up-glow' : ''}`}>
      <div className="freewill-header-row">
        {showLevel && (
          <div className="freewill-label-group">
            <span className="freewill-title">USER LEVEL</span>
            <span className="freewill-level-badge">LVL {userLevel}</span>
          </div>
        )}
        <div className="freewill-meta-info">
          <span className="freewill-pts-count">{currentVal} / 100 PTS</span>
          {isLevelingUp && <span className="freewill-level-up-toast">LEVEL UP!</span>}
        </div>
      </div>

      <div className="freewill-statbar-track">
        <div className="freewill-label-name">FREE WILL</div>
        <div className="freewill-segments-row">
          {Array.from({ length: 10 }).map((_, idx) => {
            const isFilled = idx < segmentsFilled;
            const isJustAdded = animateOnMount && isFilled && idx >= (startVal % 10);
            return (
              <div
                key={idx}
                className={`freewill-segment ${isFilled ? 'filled' : 'empty'} ${isJustAdded ? 'just-filled' : ''}`}
                style={{
                  transitionDelay: animateOnMount && isFilled ? `${(idx - (startVal % 10)) * 120}ms` : '0ms'
                }}
              />
            );
          })}
        </div>
        <div className="freewill-numeric-val">
          {userLevel === 10 ? 'MAX' : `${segmentsFilled}/10`}
        </div>
      </div>
    </div>
  );
};

export default FreeWillStatBar;
