export const SNAKE_BOARD_SIZE = 100;

// Standard Classic Snakes (Head -> Tail)
export const SNAKES: Record<number, number> = {
  17: 7,
  54: 34,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  99: 78,
};

// Standard Classic Ladders (Bottom -> Top)
export const LADDERS: Record<number, number> = {
  4: 14,
  9: 31,
  20: 38,
  28: 84,
  40: 59,
  51: 67,
  63: 81,
  71: 91,
};

/**
 * Returns grid row (0-9 from top) and col (0-9 from left)
 * for any tile number from 1 to 100 on a 10x10 boustrophedon board.
 */
export function getTileCoordinates(tile: number): {
  row: number;
  col: number;
  xPercent: number;
  yPercent: number;
} {
  const boundedTile = Math.max(1, Math.min(100, tile));
  const rowFromBottom = Math.floor((boundedTile - 1) / 10);
  const row = 9 - rowFromBottom; // 0 is top row (91-100), 9 is bottom row (1-10)

  // Alternating direction:
  // even rows from bottom (0, 2, 4, 6, 8) go Left -> Right
  // odd rows from bottom (1, 3, 5, 7, 9) go Right -> Left
  const colFromLeft = (boundedTile - 1) % 10;
  const col = rowFromBottom % 2 === 0 ? colFromLeft : 9 - colFromLeft;

  // Center coordinate in percent (0% to 100%)
  const xPercent = (col + 0.5) * 10;
  const yPercent = (row + 0.5) * 10;

  return { row, col, xPercent, yPercent };
}

export function canMoveTokenSnake(progress: number, dice: number): boolean {
  if (dice < 1 || dice > 6) return false;
  return progress + dice <= SNAKE_BOARD_SIZE;
}

export function calculateSnakeMove(
  currentPos: number,
  dice: number
): {
  target: number;
  intermediatePos: number;
  ladder?: { from: number; to: number };
  snake?: { from: number; to: number };
} {
  const intermediatePos = currentPos + dice;
  if (intermediatePos > SNAKE_BOARD_SIZE) {
    return { target: currentPos, intermediatePos: currentPos };
  }

  if (LADDERS[intermediatePos]) {
    const to = LADDERS[intermediatePos]!;
    return {
      target: to,
      intermediatePos,
      ladder: { from: intermediatePos, to },
    };
  }

  if (SNAKES[intermediatePos]) {
    const to = SNAKES[intermediatePos]!;
    return {
      target: to,
      intermediatePos,
      snake: { from: intermediatePos, to },
    };
  }

  return { target: intermediatePos, intermediatePos };
}
