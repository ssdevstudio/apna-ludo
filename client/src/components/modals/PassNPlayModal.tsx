import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlayerColor, PLAYER_COLORS } from "@apna-ludo/shared";
import { playSound } from "../../utils/audio";

interface PassNPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGameType?: "ludo" | "snake";
}

export function PassNPlayModal({
  isOpen,
  onClose,
  defaultGameType = "ludo",
}: PassNPlayModalProps) {
  const navigate = useNavigate();
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [gameType, setGameType] = useState<"ludo" | "snake">(defaultGameType);
  const [gameMode, setGameMode] = useState<"classic" | "quick">("classic");

  const [playerNames, setPlayerNames] = useState<Record<number, string>>({
    0: "Player 1",
    1: "Player 2",
    2: "Player 3",
    3: "Player 4",
  });

  if (!isOpen) return null;

  const handleStart = () => {
    playSound("click");
    // In 2-player match, players sit diagonally opposite (Red vs Yellow) - authentic Ludo King
    const localColors = playerCount === 2 ? (["red", "yellow"] as PlayerColor[]) : (PLAYER_COLORS as PlayerColor[]);
    const activePlayers = Array.from({ length: playerCount }).map((_, idx) => ({
      id: `local-p${idx + 1}`,
      name: playerNames[idx]?.trim() || `Player ${idx + 1}`,
      color: localColors[idx] as PlayerColor,
    }));

    const config = {
      players: activePlayers,
      gameType,
      gameMode,
    };

    sessionStorage.setItem("apna_local_game_config", JSON.stringify(config));
    navigate("/local");
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="local-setup-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="bonus-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="local-modal-header">
          <span className="local-modal-icon">👥</span>
          <h2>PASS N PLAY</h2>
          <p>Pass the device between friends to play locally offline!</p>
        </div>

        {/* Game Selection */}
        <div className="setup-section">
          <label>Game Type</label>
          <div className="game-mode-toggle-group">
            <button
              type="button"
              className={`mode-toggle-btn ${gameType === "ludo" ? "active" : ""}`}
              onClick={() => setGameType("ludo")}
            >
              🎲 Ludo
            </button>
            <button
              type="button"
              className={`mode-toggle-btn mode-toggle-snake ${gameType === "snake" ? "active" : ""}`}
              onClick={() => setGameType("snake")}
            >
              🐍 Saanp Seedhi
            </button>
          </div>
        </div>

        {/* Rule Selection (Ludo only) */}
        {gameType === "ludo" && (
          <div className="setup-section">
            <label>Rule Mode</label>
            <div className="game-mode-toggle-group">
              <button
                type="button"
                className={`mode-toggle-btn ${gameMode === "classic" ? "active" : ""}`}
                onClick={() => setGameMode("classic")}
              >
                Classic (4 Tokens)
              </button>
              <button
                type="button"
                className={`mode-toggle-btn ${gameMode === "quick" ? "active" : ""}`}
                onClick={() => setGameMode("quick")}
              >
                ⚡ Quick Rush (2 Tokens)
              </button>
            </div>
          </div>
        )}

        {/* Player Count */}
        <div className="setup-section">
          <label>Number of Players</label>
          <div className="player-count-picker">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                className={playerCount === n ? "active" : ""}
                onClick={() => setPlayerCount(n as any)}
              >
                {n} Players
              </button>
            ))}
          </div>
        </div>

        {/* Player Name Fields */}
        <div className="setup-section">
          <label>Player Names &amp; Colors</label>
          <div className="player-inputs-list">
            {Array.from({ length: playerCount }).map((_, idx) => {
              const localColors = playerCount === 2 ? (["red", "yellow"] as PlayerColor[]) : (PLAYER_COLORS as PlayerColor[]);
              const color = localColors[idx]!;
              return (
                <div key={idx} className="player-name-row">
                  <span className={`player-color-dot dot-${color}`} />
                  <input
                    value={playerNames[idx] || ""}
                    onChange={(e) =>
                      setPlayerNames({ ...playerNames, [idx]: e.target.value })
                    }
                    placeholder={`Player ${idx + 1}`}
                    maxLength={16}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="primary-button wide start-local-btn"
          onClick={handleStart}
        >
          START PASS N PLAY <span>→</span>
        </button>
      </div>
    </div>
  );
}
