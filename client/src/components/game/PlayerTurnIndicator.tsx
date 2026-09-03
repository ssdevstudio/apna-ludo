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
        {direction === 'right' ? (
          /* Arrow pointing LEFT (◀) directly at the die */
          <svg viewBox="0 0 40 36" width="36" height="32" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="goldGradL" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff176" />
                <stop offset="35%" stopColor="#ffb300" />
                <stop offset="100%" stopColor="#e65100" />
              </linearGradient>
              <filter id="shadowL" x="-20%" y="-20%" width="150%" height="150%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.6"/>
              </filter>
            </defs>
            <path
              d="M 4 18 L 18 4 L 18 10 L 36 10 L 36 26 L 18 26 L 18 32 Z"
              fill="url(#goldGradL)"
              stroke="#6b2600"
              strokeWidth="2.5"
              strokeLinejoin="round"
              filter="url(#shadowL)"
            />
            <path
              d="M 8 18 L 17 7 L 17 12 L 34 12"
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          /* Arrow pointing RIGHT (▶) directly at the die */
          <svg viewBox="0 0 40 36" width="36" height="32" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="goldGradR" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fff176" />
                <stop offset="35%" stopColor="#ffb300" />
                <stop offset="100%" stopColor="#e65100" />
              </linearGradient>
              <filter id="shadowR" x="-20%" y="-20%" width="150%" height="150%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.6"/>
              </filter>
            </defs>
            <path
              d="M 36 18 L 22 4 L 22 10 L 4 10 L 4 26 L 22 26 L 22 32 Z"
              fill="url(#goldGradR)"
              stroke="#6b2600"
              strokeWidth="2.5"
              strokeLinejoin="round"
              filter="url(#shadowR)"
            />
            <path
              d="M 32 18 L 23 7 L 23 12 L 6 12"
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
