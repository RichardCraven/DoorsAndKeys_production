import React, { useState, useEffect, useRef } from 'react';

export const getAssemblyTransform = (pieceName, isAssembled, distance = 30) => {
  if (isAssembled) return 'translate(0, 0)';
  
  // Normalize piece name (allow spaces, underscores, dots) to match cases robustly
  const normalized = pieceName.toLowerCase().replace(/[^a-z]/g, '');
  
  switch(normalized) {
    case 'bottomleft': return `translate(-${distance}px, ${distance}px)`;
    case 'bottomright': return `translate(${distance}px, ${distance}px)`;
    case 'topcenter': return `translate(0, -${distance}px)`;
    case 'topleft': return `translate(-${distance}px, -${distance}px)`;
    case 'topright': return `translate(${distance}px, -${distance}px)`;
    case 'centerleft': return `translate(-${distance}px, 0)`;
    case 'centerright': return `translate(${distance}px, 0)`;
    case 'bottomcenter': return `translate(0, ${distance}px)`;
    default: return 'translate(0, 0)';
  }
};

const AssemblyAnimation = ({ 
  pieces, 
  isAssembled, 
  glowingImg,
  width = '100%', 
  height = '100%', 
  distance = 30, 
  transitionDuration = '1s' 
}) => {
  const [shardsAssembled, setShardsAssembled] = useState(isAssembled);
  const [glowVisible, setGlowVisible] = useState(isAssembled);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setShardsAssembled(isAssembled);
      setGlowVisible(isAssembled);
      return;
    }

    let timer;

    if (isAssembled) {
      // Step 1: Start shard assembly immediately (takes 1s)
      setShardsAssembled(true);
      
      // Step 2: 0.5s after shards have come together (1s move + 0.5s delay = 1.5s), fade in base glowing icon
      timer = setTimeout(() => {
        setGlowVisible(true);
      }, 1500);
    } else {
      // Step 1: Fade out glowing base icon immediately (0.4s fade)
      setGlowVisible(false);

      // Step 2: After glow icon finishes fading out (0.4s delay), reverse shards back to starting positions
      timer = setTimeout(() => {
        setShardsAssembled(false);
      }, 400);
    }

    return () => clearTimeout(timer);
  }, [isAssembled, glowingImg]);

  const pieceArray = Array.isArray(pieces) 
    ? pieces 
    : Object.keys(pieces).map(key => ({ name: key, src: pieces[key] }));

  return (
    <div style={{
      width,
      height,
      position: 'relative'
    }}>
      {/* Shards Layer */}
      {pieceArray.map((piece, index) => (
        <img 
          key={piece.id || piece.name || index}
          src={piece.src} 
          alt={piece.name || 'shard'} 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            objectFit: 'contain', 
            transition: `transform ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1)`, 
            transform: getAssemblyTransform(piece.name, shardsAssembled, distance) 
          }} 
        />
      ))}

      {/* Base Glowing Icon Overlay */}
      {glowingImg && (
        <img
          src={glowingImg}
          alt="Glowing Rune"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
            opacity: glowVisible ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out',
            zIndex: 2
          }}
        />
      )}
    </div>
  );
};

export default AssemblyAnimation;
