import React from 'react';
import { PlayerColor } from '@apna-ludo/shared';

interface Props {
  color: PlayerColor;
  direction: 'left' | 'right';
}

export function PlayerTurnIndicator({ color, direction }: Props) {
  return (
    <div className={`turn-indicator-wrapper turn-${direction}`} aria-hidden="true">
      <div className={`turn-glow-ring ring-${color}`} />
      <div className={`turn-arrow arrow-${direction}`}>
        <svg viewBox="0 0 24 24" width="32" height="32">
          <path 
            d={direction === 'left' ? "M18 6 L6 12 L18 18 Z" : "M6 6 L18 12 L6 18 Z"} 
            fill="currentColor" 
          />
        </svg>
      </div>
    </div>
  );
}
