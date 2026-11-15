import { useEffect, useRef, useState, useMemo } from "react";
import {
  GameState,
  PlayerColor,
  SNAKES,
  LADDERS,
  SNAKE_BOARD_SIZE,
  getTileCoordinates,
} from "@apna-ludo/shared";
import { playSound } from "../../utils/audio";
import { TokenSvg, COLOR_HEX } from "./LudoBoard";

export interface SnakeBoardProps {
  game: GameState;
  myPlayerId: string | null;
  legalTokens: string[];
  onMove: (id: string) => void;
  tokenAnimation?: string | null;
  boardRotation?: number;
}

interface BannerEvent {
  id: string;
  type: "ladder" | "snake" | "win";
  text: string;
  from: number;
  to: number;
  color: PlayerColor;
}

export function SnakeBoard({
  game,
  myPlayerId,
  legalTokens,
  onMove,
  tokenAnimation,
  boardRotation = 0,
}: SnakeBoardProps) {
  const me = game.players.find((p) => p.id === myPlayerId);
  const visualProgressRef = useRef<Record<string, number>>({});
  const [, setForceRender] = useState(0);
  const [activeBanner, setActiveBanner] = useState<BannerEvent | null>(null);
  const [slidingToken, setSlidingToken] = useState<{ id: string; type: "ladder" | "snake" } | null>(null);
  const [tile100Won, setTile100Won] = useState<{ id: string; color: PlayerColor } | null>(null);

  // Generate 100 cells in 10x10 grid order: row 0 (top) to row 9 (bottom)
  const cells = useMemo(() => {
    const list: { tile: number; row: number; col: number; colorIndex: number }[] = [];
    for (let r = 0; r < 10; r++) {
      const rowFromBottom = 9 - r;
      for (let c = 0; c < 10; c++) {
        const colFromLeft = rowFromBottom % 2 === 0 ? c : 9 - c;
        const tile = rowFromBottom * 10 + colFromLeft + 1;
        // 5 alternating cheerful pastel colors
        const colorIndex = (r + c + (rowFromBottom % 2)) % 5;
        list.push({ tile, row: r, col: c, colorIndex });
      }
    }
    return list;
  }, []);

  // Sync token animations step by step
  useEffect(() => {
    const tokensToHop: {
      id: string;
      color: PlayerColor;
      start: number;
      target: number;
      intermediate: number;
      ladder?: { from: number; to: number };
      snake?: { from: number; to: number };
    }[] = [];

    let instant = false;

    game.players.forEach((p) => {
      const token = p.tokens[0];
      if (!token) return;
      let curr = visualProgressRef.current[token.id];
      if (curr === undefined) {
        curr = token.progress;
        visualProgressRef.current[token.id] = token.progress;
      }

      if (token.progress > curr) {
        // Player moved forward
        const lastAction = game.lastAction;
        const ladder = lastAction?.ladderClimbed;
        const snake = lastAction?.snakeBitten;
        const intermediate = ladder ? ladder.from : snake ? snake.from : token.progress;

        tokensToHop.push({
          id: token.id,
          color: p.color,
          start: curr,
          target: token.progress,
          intermediate,
          ladder,
          snake,
        });
      } else if (token.progress !== curr) {
        // Instant sync (e.g. game reset)
        visualProgressRef.current[token.id] = token.progress;
        instant = true;
      }
    });

    if (instant && tokensToHop.length === 0) {
      setForceRender((x) => x + 1);
    }

    if (tokensToHop.length > 0) {
      const t = tokensToHop[0]!;
      let step = t.start;

      // Hop 1 tile at a time to intermediate position
      const hopInterval = setInterval(() => {
        if (step < t.intermediate) {
          step++;
          visualProgressRef.current[t.id] = step;
          setForceRender((x) => x + 1);

          if (step === SNAKE_BOARD_SIZE) {
            playSound("home");
            setTile100Won({ id: Math.random().toString(), color: t.color });
            setTimeout(() => setTile100Won(null), 3000);
          } else {
            playSound("move");
          }
        } else {
          clearInterval(hopInterval);

          // Now handle ladder climb or snake bite slide
          if (t.ladder) {
            setActiveBanner({
              id: Math.random().toString(),
              type: "ladder",
              text: `🪜 CLIMBED! ${t.ladder.from} ➔ ${t.ladder.to}`,
              from: t.ladder.from,
              to: t.ladder.to,
              color: t.color,
            });
            setTimeout(() => {
              setSlidingToken({ id: t.id, type: "ladder" });
              visualProgressRef.current[t.id] = t.target;
              setForceRender((x) => x + 1);
              if (t.target === SNAKE_BOARD_SIZE) {
                playSound("home");
                setTile100Won({ id: Math.random().toString(), color: t.color });
                setTimeout(() => setTile100Won(null), 3000);
              } else {
                playSound("ladder");
              }
              setTimeout(() => setSlidingToken(null), 850);
            }, 300);
            setTimeout(() => setActiveBanner(null), 1800);
          } else if (t.snake) {
            setActiveBanner({
              id: Math.random().toString(),
              type: "snake",
              text: `🐍 BITTEN! ${t.snake.from} ➔ ${t.snake.to}`,
              from: t.snake.from,
              to: t.snake.to,
              color: t.color,
            });
            setTimeout(() => {
              setSlidingToken({ id: t.id, type: "snake" });
              visualProgressRef.current[t.id] = t.target;
              setForceRender((x) => x + 1);
              playSound("snake");
              setTimeout(() => setSlidingToken(null), 850);
            }, 300);
            setTimeout(() => setActiveBanner(null), 1800);
          } else {
            visualProgressRef.current[t.id] = t.target;
            setForceRender((x) => x + 1);
            if (t.target === SNAKE_BOARD_SIZE) {
              playSound("home");
              setTile100Won({ id: Math.random().toString(), color: t.color });
              setTimeout(() => setTile100Won(null), 3000);
            }
          }
        }
      }, 130);

      return () => clearInterval(hopInterval);
    }
  }, [game]);

  // Center coordinate helper in SVG 1000x1000 view
  const getCenter = (tile: number) => {
    const coords = getTileCoordinates(tile);
    return {
      x: (coords.col + 0.5) * 100,
      y: (coords.row + 0.5) * 100,
    };
  };

  // Group tokens currently on the same tile to offset them gracefully
  const playersOnBoard = game.players.map((p) => {
    const token = p.tokens[0];
    const progress = visualProgressRef.current[token?.id ?? ""] ?? token?.progress ?? 0;
    return {
      player: p,
      tokenId: token?.id ?? `${p.id}:0`,
      progress,
    };
  });

  return (
    <div
      className="board-shell snake-board-shell"
      style={{
        transform: `rotate(${boardRotation}deg)`,
        transition: "transform 0.5s ease-in-out",
      }}
    >
      <div
        className="snake-board"
        role="grid"
        aria-label="Snakes and Ladders board"
      >
        {/* Floating Ladder/Snake Banner Notification */}
        {activeBanner && (
          <div
            className={`snake-event-banner banner-${activeBanner.type}`}
            style={{ transform: `rotate(-${boardRotation}deg)` }}
          >
            <span>{activeBanner.text}</span>
          </div>
        )}

        {/* Floating Tile 100 Victory Celebration */}
        {tile100Won && (
          <div
            className="tile-100-banner"
            style={{ transform: `translate(-50%, -50%) rotate(-${boardRotation}deg)` }}
          >
            🏆 100 REACHED! VICTORY!
          </div>
        )}

        {/* 100 Grid Cells */}
        {cells.map(({ tile, row, col, colorIndex }) => {
          const isWinningTile = tile === SNAKE_BOARD_SIZE;
          const isStartTile = tile === 1;
          const hasSnakeHead = Boolean(SNAKES[tile]);
          const hasLadderBase = Boolean(LADDERS[tile]);

          return (
            <div
              key={tile}
              role="gridcell"
              className={`snake-cell snake-cell-palette-${colorIndex} ${
                isWinningTile ? "winning-tile" : ""
              } ${isStartTile ? "start-tile" : ""} ${
                hasSnakeHead ? "has-snake-head" : ""
              } ${hasLadderBase ? "has-ladder-base" : ""}`}
              style={{
                gridRow: row + 1,
                gridColumn: col + 1,
              }}
            >
              <span
                className="tile-number"
                style={{ transform: `rotate(-${boardRotation}deg)` }}
              >
                {tile}
              </span>

              {isWinningTile && (
                <div
                  className="trophy-badge"
                  style={{ transform: `rotate(-${boardRotation}deg)` }}
                  title="Winner!"
                >
                  🏆
                </div>
              )}

              {isStartTile && (
                <div
                  className="start-badge"
                  style={{ transform: `rotate(-${boardRotation}deg)` }}
                  title="Start"
                >
                  🏁
                </div>
              )}
            </div>
          );
        })}

        {/* SVG Overlay for Ladders and Snakes */}
        <svg
          className="snake-svg-overlay"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            {/* Filter for realistic 3D drop shadow */}
            <filter id="ladder-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="5" stdDeviation="4" floodOpacity="0.45" />
            </filter>
            <filter id="snake-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="3" dy="6" stdDeviation="5" floodOpacity="0.5" />
            </filter>

            {/* Gradients for Ladders */}
            <linearGradient id="ladderRailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="35%" stopColor="#d97706" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>

            <linearGradient id="ladderRungGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            {/* Gradients for Snakes */}
            <linearGradient id="snakeSkinGreen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#047857" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>

            <linearGradient id="snakeSkinCoral" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="50%" stopColor="#be123c" />
              <stop offset="100%" stopColor="#881337" />
            </linearGradient>

            <linearGradient id="snakeSkinPurple" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#6d28d9" />
              <stop offset="100%" stopColor="#4c1d95" />
            </linearGradient>

            <linearGradient id="snakeSkinYellow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#eab308" />
              <stop offset="50%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#854d0e" />
            </linearGradient>
          </defs>

          {/* Render all 8 Ladders */}
          {Object.entries(LADDERS).map(([fromStr, to]) => {
            const from = Number(fromStr);
            const p1 = getCenter(from);
            const p2 = getCenter(to);

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy);
            if (len === 0) return null;

            const nx = -dy / len;
            const ny = dx / len;
            const halfW = 9; // Ladder width

            // Left rail
            const x1L = p1.x - halfW * nx;
            const y1L = p1.y - halfW * ny;
            const x2L = p2.x - halfW * nx;
            const y2L = p2.y - halfW * ny;

            // Right rail
            const x1R = p1.x + halfW * nx;
            const y1R = p1.y + halfW * ny;
            const x2R = p2.x + halfW * nx;
            const y2R = p2.y + halfW * ny;

            // Rungs
            const rungCount = Math.max(3, Math.floor(len / 22));
            const rungs: { xA: number; yA: number; xB: number; yB: number }[] = [];
            for (let i = 1; i <= rungCount; i++) {
              const t = i / (rungCount + 1);
              const cx = p1.x + t * dx;
              const cy = p1.y + t * dy;
              rungs.push({
                xA: cx - halfW * nx,
                yA: cy - halfW * ny,
                xB: cx + halfW * nx,
                yB: cy + halfW * ny,
              });
            }

            return (
              <g key={`ladder-${from}-${to}`} filter="url(#ladder-shadow)">
                {/* Rails */}
                <line
                  x1={x1L}
                  y1={y1L}
                  x2={x2L}
                  y2={y2L}
                  stroke="url(#ladderRailGrad)"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                />
                <line
                  x1={x1R}
                  y1={y1R}
                  x2={x2R}
                  y2={y2R}
                  stroke="url(#ladderRailGrad)"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                />

                {/* Rungs */}
                {rungs.map((r, rIdx) => (
                  <line
                    key={rIdx}
                    x1={r.xA}
                    y1={r.yA}
                    x2={r.xB}
                    y2={r.yB}
                    stroke="url(#ladderRungGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                ))}

                {/* Subtle base & top caps */}
                <circle cx={p1.x} cy={p1.y} r="6" fill="#fbbf24" opacity="0.8" />
                <circle cx={p2.x} cy={p2.y} r="7" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
              </g>
            );
          })}

          {/* Render all 8 Snakes */}
          {Object.entries(SNAKES).map(([headStr, tail], sIdx) => {
            const head = Number(headStr);
            const p1 = getCenter(head); // Head
            const p2 = getCenter(tail); // Tail

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy);
            if (len === 0) return null;

            const nx = -dy / len;
            const ny = dx / len;

            // Dynamic sine wave curvature
            const waveAmp = Math.min(32, len * 0.16) * (sIdx % 2 === 0 ? 1 : -1);
            const c1x = p1.x + 0.28 * dx + waveAmp * nx;
            const c1y = p1.y + 0.28 * dy + waveAmp * ny;
            const c2x = p1.x + 0.68 * dx - waveAmp * 0.85 * nx;
            const c2y = p1.y + 0.68 * dy - waveAmp * 0.85 * ny;

            const snakeGradients = [
              "url(#snakeSkinGreen)",
              "url(#snakeSkinCoral)",
              "url(#snakeSkinPurple)",
              "url(#snakeSkinYellow)",
            ];
            const skinGrad = snakeGradients[sIdx % snakeGradients.length]!;

            // Angle of head
            const headAngle = (Math.atan2(c1y - p1.y, c1x - p1.x) * 180) / Math.PI;

            return (
              <g key={`snake-${head}-${tail}`} filter="url(#snake-shadow)">
                {/* Thick body background for depth */}
                <path
                  d={`M ${p1.x} ${p1.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`}
                  fill="none"
                  stroke="#1c1917"
                  strokeWidth="19"
                  strokeLinecap="round"
                  opacity="0.3"
                />

                {/* Main Snake Body */}
                <path
                  d={`M ${p1.x} ${p1.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`}
                  fill="none"
                  stroke={skinGrad}
                  strokeWidth="15"
                  strokeLinecap="round"
                />

                {/* Decorative scales / stripes along the spine */}
                <path
                  d={`M ${p1.x} ${p1.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`}
                  fill="none"
                  stroke="#fef08a"
                  strokeWidth="5"
                  strokeDasharray="4,10"
                  strokeLinecap="round"
                  opacity="0.85"
                />

                {/* Snake Tail Taper */}
                <circle cx={p2.x} cy={p2.y} r="5.5" fill="#fef08a" stroke="#451a03" strokeWidth="1.5" />

                {/* Snake Head */}
                <g transform={`translate(${p1.x}, ${p1.y}) rotate(${headAngle + 180})`}>
                  {/* Flicking Forked Tongue */}
                  <path
                    d="M 12 0 L 22 -4 M 12 0 L 22 4 M 0 0 L 14 0"
                    stroke="#dc2626"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Head base */}
                  <ellipse cx="2" cy="0" rx="14" ry="11" fill={skinGrad} stroke="#1c1917" strokeWidth="1.5" />

                  {/* Left Eye */}
                  <circle cx="4" cy="-6" r="3.8" fill="#ffffff" />
                  <circle cx="5" cy="-6" r="2.2" fill="#000000" />
                  <circle cx="6" cy="-7" r="0.9" fill="#ffffff" />

                  {/* Right Eye */}
                  <circle cx="4" cy="6" r="3.8" fill="#ffffff" />
                  <circle cx="5" cy="6" r="2.2" fill="#000000" />
                  <circle cx="6" cy="5" r="0.9" fill="#ffffff" />

                  {/* Nostrils */}
                  <circle cx="10" cy="-2" r="0.8" fill="#1c1917" />
                  <circle cx="10" cy="2" r="0.8" fill="#1c1917" />
                </g>
              </g>
            );
          })}
        </svg>

        {/* Start / Yard Dock for Tokens with progress = 0 */}
        <div
          className="snake-start-dock"
          style={{ transform: `rotate(-${boardRotation}deg)` }}
        >
          <span className="dock-label">START 0</span>
        </div>

        {/* Render Players' Tokens */}
        {playersOnBoard.map(({ player: p, tokenId, progress }) => {
          const isAtStart = progress === 0;
          let top: string;
          let left: string;
          let transform: string;

          if (isAtStart) {
            // Position in start dock (bottom left outside tile 1)
            top = "95%";
            const pIdx = game.players.findIndex((gp) => gp.id === p.id);
            left = `${2 + pIdx * 4}%`;
            transform = `translate(-50%, -90%) rotate(-${boardRotation}deg)`;
          } else {
            const coords = getTileCoordinates(progress);
            top = `${coords.yPercent}%`;
            left = `${coords.xPercent}%`;

            // Offset multiple tokens on same tile
            const sameTileTokens = playersOnBoard.filter(
              (x) => x.progress === progress && x.progress > 0
            );
            const myIdx = sameTileTokens.findIndex((x) => x.player.id === p.id);
            const offsetCount = sameTileTokens.length;

            if (offsetCount > 1) {
              const xOff = (myIdx - (offsetCount - 1) / 2) * 14;
              const yOff = myIdx % 2 === 0 ? -4 : 4;
              transform = `translate(calc(-50% + ${xOff}px), calc(-90% + ${yOff}px)) rotate(-${boardRotation}deg)`;
            } else {
              transform = `translate(-50%, -90%) rotate(-${boardRotation}deg)`;
            }
          }

          const isLegal = legalTokens.includes(tokenId) && me?.id === p.id;
          const isAnimating = tokenAnimation === tokenId;
          const isSlidingLadder = slidingToken?.id === tokenId && slidingToken.type === "ladder";
          const isSlidingSnake = slidingToken?.id === tokenId && slidingToken.type === "snake";
          const isSliding = isSlidingLadder || isSlidingSnake;
          const isAt100 = progress >= SNAKE_BOARD_SIZE;

          const innerClass = `game-pawn-inner ${
            isAnimating ? "pawn--animate token-hop" : ""
          } ${isSlidingLadder ? "pawn--sliding-ladder" : ""} ${
            isSlidingSnake ? "pawn--sliding-snake" : ""
          } ${isAt100 ? "pawn--home" : ""}`;

          const style: React.CSSProperties = {
            position: "absolute",
            top,
            left,
            transform,
            transition: isSliding
              ? "top 0.8s cubic-bezier(0.25, 1, 0.5, 1), left 0.8s cubic-bezier(0.25, 1, 0.5, 1), transform 0.8s ease"
              : "top 0.16s ease-out, left 0.16s ease-out, transform 0.16s ease-out",
            zIndex: 20 + (isLegal ? 5 : 0) + (isSliding ? 30 : 0) + (isAt100 ? 15 : 0),
            "--token-color": COLOR_HEX[p.color],
          } as any;

          if (isLegal) {
            return (
              <button
                key={tokenId}
                style={style}
                className="game-pawn-wrapper legal-token premium-pulse"
                onClick={() => onMove(tokenId)}
                aria-label={`Move ${p.color} pawn`}
              >
                {isAt100 && <span className="home-crown-badge">👑</span>}
                <span className={innerClass}>
                  <TokenSvg color={p.color} />
                </span>
              </button>
            );
          }

          return (
            <div
              key={tokenId}
              style={style}
              className="game-pawn-wrapper"
              aria-label={`${p.color} pawn`}
            >
              {isAt100 && <span className="home-crown-badge">👑</span>}
              <div className={innerClass}>
                <TokenSvg color={p.color} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
