import React from 'react';
import { PlayerColor } from '@apna-ludo/shared';

interface Props {
  color: PlayerColor;
  direction: 'left' | 'right';
}

export function PlayerTurnIndicator({ color, direction }: Props) {
  // If direction is 'right' (arrow sits on right side of the box), point LEFT (◀) towards the box.
  // If direction is 'left' (arrow sits on left side of the box), point RIGHT (▶) towards the box.
  const pathD = direction === 'right'
    ? "M18 6 L6 12 L18 18 Z" // Points LEFT (◀) into the box
    : "M6 6 L18 12 L6 18 Z"; // Points RIGHT (▶) into the box

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
