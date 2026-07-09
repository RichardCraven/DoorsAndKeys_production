import React from 'react';

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
  width = '100%', 
  height = '100%', 
  distance = 30, 
  transitionDuration = '1s' 
}) => {
  // pieces can be an array of { name: 'top left', src: imageSource } 
  // or an object { 'top left': imageSource, 'bottom right': imageSource }
  const pieceArray = Array.isArray(pieces) 
    ? pieces 
    : Object.keys(pieces).map(key => ({ name: key, src: pieces[key] }));

  return (
    <div style={{
      width,
      height,
      position: 'relative'
    }}>
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
            transform: getAssemblyTransform(piece.name, isAssembled, distance) 
          }} 
        />
      ))}
    </div>
  );
};

export default AssemblyAnimation;
