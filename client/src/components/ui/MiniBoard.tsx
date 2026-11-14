import { useState } from "react";
import { COLORS } from "../../utils/constants";

export function MiniBoard({ mode = "ludo" }: { mode?: "ludo" | "snake" }) {
  const [a, setA] = useState(0);
  const [snakeTile, setSnakeTile] = useState(14);

  if (mode === "snake") {
    return (
      <div className="mini-stage">
        <p className="mini-note">Saanp Seedhi! Climb ladders 🪜, dodge snakes 🐍.</p>
        <div
          className="mini-board mini-board--snake"
          aria-label="Interactive miniature Snakes and Ladders board"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gridTemplateRows: "repeat(5, 1fr)",
            gap: "2px",
            padding: "4px",
            background: "#1e293b",
            borderRadius: "12px",
            position: "relative",
          }}
        >
          {Array.from({ length: 25 }, (_, i) => {
            const tile = 25 - i;
            const isTarget = tile === snakeTile;
            const isLadder = tile === 14 || tile === 7;
            const isSnake = tile === 19 || tile === 11;
            return (
              <button
                key={tile}
                type="button"
                onClick={() => setSnakeTile(tile === 7 ? 14 : tile === 19 ? 11 : tile)}
                style={{
                  background: isTarget
                    ? "#3b82f6"
                    : isLadder
                    ? "rgba(16, 185, 129, 0.25)"
                    : isSnake
                    ? "rgba(239, 68, 68, 0.25)"
                    : i % 2 === 0
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(255,255,255,0.03)",
                  border: isTarget ? "1px solid #60a5fa" : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "4px",
                  color: isTarget ? "#fff" : "rgba(255,255,255,0.7)",
                  fontSize: "9px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  position: "relative",
                  aspectRatio: "1",
                }}
              >
                {tile === 25 ? "🏆" : isLadder ? "🪜" : isSnake ? "🐍" : tile}
                {isTarget && (
                  <span
                    style={{
                      position: "absolute",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#ef4444",
                      boxShadow: "0 0 6px #ef4444",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="mini-caption">
          <span>● SNAKES &amp; LADDERS</span>
          <b>Tile {snakeTile}</b>
          <span>/ 100</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mini-stage">
      <p className="mini-note">Tap a token. Make the first move.</p>
      <div className="mini-board" aria-label="Interactive miniature Ludo board">
        {COLORS.map((c, i) => (
          <button
            key={c}
            aria-label={`Move ${c} token`}
            className={`mini-home mini-home--${c}`}
            onClick={() => setA(i)}
          >
            <span className={`pawn pawn--${c} ${a === i ? "pawn--active" : ""}`} />
          </button>
        ))}
        <div className="mini-cross" aria-hidden>
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="mini-center" aria-hidden />
        <span className={`moving-pawn moving-pawn--${COLORS[a]}`} aria-hidden />
      </div>
      <div className="mini-caption">
        <span>● LIVE TABLE</span>
        <b>{a + 2}</b>
        <span>squares home</span>
      </div>
    </div>
  );
}

