import React from 'react';
import { PlayerColor } from '@apna-ludo/shared';

interface Props {
  color: PlayerColor;
  direction: 'left' | 'right';
}

export function PlayerTurnIndicator({ color, direction }: Props) {
  // If direction is 'right' (arrow sits outside on right side of the box), point LEFT (◀) into the box.
  // If direction is 'left' (arrow sits outside on left side of the box), point RIGHT (▶) into the box.
  const pathD = direction === 'right'
    ? "M19 4 L5 12 L19 20 Z" // Sharp triangle pointing LEFT (◀) into the box
    : "M5 4 L19 12 L5 20 Z"; // Sharp triangle pointing RIGHT (▶) into the box

  return (
    <div className={`turn-indicator-wrapper turn-${direction}`} aria-hidden="true">
      <div className={`turn-glow-ring ring-${color}`} />
      <div className={`turn-arrow arrow-${direction}`}>
        <svg viewBox="0 0 24 24" width="28" height="28">
          <path d={pathD} fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}
