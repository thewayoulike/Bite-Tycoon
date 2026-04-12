import React from 'react';

// Shared styles
const strokeWidth = "3";
const strokeColor = "#292524"; // Dark stone for outlines

export const CustomerSprite = ({ patience, state, seed }: { patience: number, state: string, seed: string }) => {
  const charCode = seed.charCodeAt(0) + seed.charCodeAt(seed.length - 1) + seed.length;
  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];
  const skinTones = ['#ffdbac', '#f1c27d', '#e0ac69', '#8d5524', '#c68642'];
  const hairColors = ['#090806', '#2c222b', '#71635a', '#b7a69e', '#dcd0ba', '#fff5e1', '#e5c8a8', '#b55239', '#8d4a43', '#533d32'];
  
  const shirtColor = colors[charCode % colors.length];
  const skinColor = skinTones[charCode % skinTones.length];
  const hairColor = hairColors[charCode % hairColors.length];
  const hairStyle = charCode % 4; 

  let expression = <path d="M 40 65 Q 50 75 60 65" stroke={strokeColor} strokeWidth={strokeWidth} fill="transparent" strokeLinecap="round" />; // smile
  if (state === 'eating') {
    expression = <path d="M 40 65 Q 50 75 60 65 L 60 70 Q 50 80 40 70 Z" fill={strokeColor} stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" />; // open mouth
  } else if (patience < 25) {
    expression = <path d="M 40 70 Q 50 60 60 70" stroke={strokeColor} strokeWidth={strokeWidth} fill="transparent" strokeLinecap="round" />; // sad/angry
  } else if (patience < 50) {
    expression = <line x1="45" y1="68" x2="55" y2="68" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />; // neutral
  }

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl overflow-visible">
      {/* Back Hair */}
      {hairStyle === 0 && <path d="M 20 40 Q 50 10 80 40 Q 90 70 70 85 Q 50 90 30 85 Q 10 70 20 40 Z" fill={hairColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />}
      {hairStyle === 3 && <path d="M 25 40 L 15 70 L 30 80 L 50 85 L 70 80 L 85 70 L 75 40 Z" fill={hairColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />}

      {/* Body */}
      <path d="M 30 100 L 35 65 L 65 65 L 70 100 Z" fill={shirtColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
      
      {/* Arms */}
      <path d="M 35 65 L 25 90" stroke={skinColor} strokeWidth="10" strokeLinecap="round" />
      <path d="M 35 65 L 25 90" stroke={strokeColor} strokeWidth="14" strokeLinecap="round" className="-z-10" />
      <path d="M 65 65 L 75 90" stroke={skinColor} strokeWidth="10" strokeLinecap="round" />
      <path d="M 65 65 L 75 90" stroke={strokeColor} strokeWidth="14" strokeLinecap="round" className="-z-10" />
      
      {/* Head */}
      <ellipse cx="50" cy="45" rx="32" ry="26" fill={skinColor} stroke={strokeColor} strokeWidth={strokeWidth} />
      
      {/* Eyes */}
      <ellipse cx="38" cy="40" rx="3.5" ry="5.5" fill={strokeColor} />
      <ellipse cx="62" cy="40" rx="3.5" ry="5.5" fill={strokeColor} />
      
      {/* Angry eyebrows */}
      {patience < 25 && state !== 'eating' && (
        <>
          <line x1="28" y1="30" x2="45" y2="35" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <line x1="72" y1="30" x2="55" y2="35" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      )}
      
      {/* Nose */}
      <path d="M 50 45 Q 54 50 48 52" stroke={strokeColor} strokeWidth="2.5" fill="transparent" strokeLinecap="round" />

      {/* Mouth */}
      {expression}

      {/* Front Hair */}
      {hairStyle === 1 && <path d="M 18 45 Q 50 5 82 45 Q 60 20 18 45 Z" fill={hairColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />}
      {hairStyle === 2 && <path d="M 18 45 Q 35 15 50 20 Q 65 15 82 45 Q 60 30 50 30 Q 40 30 18 45 Z" fill={hairColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />}
      {hairStyle === 3 && <path d="M 18 45 Q 50 15 82 45 Q 70 35 50 35 Q 30 35 18 45 Z" fill={hairColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />}
    </svg>
  );
};

export const ChefSprite = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-xl overflow-visible">
    {/* Body */}
    <path d="M 30 100 L 35 65 L 65 65 L 70 100 Z" fill="#f8fafc" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
    <line x1="50" y1="65" x2="50" y2="100" stroke={strokeColor} strokeWidth={strokeWidth} />
    {/* Head */}
    <ellipse cx="50" cy="50" rx="30" ry="24" fill="#fcd34d" stroke={strokeColor} strokeWidth={strokeWidth} />
    {/* Eyes */}
    <ellipse cx="40" cy="45" rx="3" ry="5" fill={strokeColor} />
    <ellipse cx="60" cy="45" rx="3" ry="5" fill={strokeColor} />
    {/* Mustache */}
    <path d="M 30 55 Q 50 45 70 55 Q 50 65 30 55 Z" fill="#475569" stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" />
    {/* Chef Hat */}
    <path d="M 25 30 C 15 15, 40 5, 50 10 C 60 5, 85 15, 75 30 C 85 45, 60 45, 50 40 C 40 45, 15 45, 25 30 Z" fill="#ffffff" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
    <path d="M 32 25 L 68 25 L 65 40 L 35 40 Z" fill="#ffffff" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
  </svg>
);

export const WaiterSprite = () => (
  <svg viewBox="0 0 100 100" className="w-14 h-14 drop-shadow-xl overflow-visible">
    {/* Body */}
    <path d="M 30 100 L 35 65 L 65 65 L 70 100 Z" fill="#1e293b" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
    {/* Shirt insert */}
    <polygon points="40,65 60,65 50,85" fill="#ffffff" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
    {/* Bowtie */}
    <path d="M 42 70 L 42 80 L 50 75 L 58 80 L 58 70 L 50 75 Z" fill="#ef4444" stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" />
    {/* Head */}
    <ellipse cx="50" cy="45" rx="28" ry="24" fill="#fcd34d" stroke={strokeColor} strokeWidth={strokeWidth} />
    {/* Eyes */}
    <ellipse cx="40" cy="40" rx="3" ry="5" fill={strokeColor} />
    <ellipse cx="60" cy="40" rx="3" ry="5" fill={strokeColor} />
    {/* Smile */}
    <path d="M 40 50 Q 50 58 60 50" stroke={strokeColor} strokeWidth={strokeWidth} fill="transparent" strokeLinecap="round" />
  </svg>
);

export const TableSprite = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl overflow-visible">
    {/* Not used in the new 2.5D layout, but kept for compatibility if needed */}
  </svg>
);
