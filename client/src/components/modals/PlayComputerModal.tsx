import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlayerColor, PLAYER_COLORS } from "@apna-ludo/shared";
import { playSound } from "../../utils/audio";
import { deductCoins } from "../../utils/progression";

interface PlayComputerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBonus: () => void;
  playerName: string;
  avatar: string;
  defaultGameType?: "ludo" | "snake";
}

export function PlayComputerModal({
  isOpen,
  onClose,
  onOpenBonus,
  playerName,
  avatar,
  defaultGameType = "ludo",
}: PlayComputerModalProps) {
  const navigate = useNavigate();
  const [maxPlayers, setMaxPlayers] = useState<2 | 4>(2);
  const [gameType, setGameType] = useState<"ludo" | "snake">(defaultGameType);
  const [gameMode, setGameMode] = useState<"classic" | "quick">("classic");
  const [preferredColor, setPreferredColor] = useState<PlayerColor>("red");
  const [entryFee, setEntryFee] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleStart = async () => {
    playSound("click");
    setError("");

    if (!playerName.trim()) {
      setError("Please set a player name first!");
      return;
    }

    if (entryFee > 0 && !deductCoins(entryFee)) {
      setError("Not enough coins! Claim your daily bonus 🪙");
      onOpenBonus();
      return;
    }

    setLoading(true);
    sessionStorage.setItem("apna-player", playerName.trim());
    sessionStorage.setItem("apna-avatar", avatar);
    sessionStorage.setItem("apna-bet", String(entryFee));

    try {
      const res = await fetch("/api/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: playerName.trim(),
          vsComputer: true,
          color: preferredColor,
          maxPlayers,
          entryFee,
          gameType,
          gameMode,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem(`apna-token-${data.room.code}`, data.reconnectToken);
        sessionStorage.setItem(`apna-playerid-${data.room.code}`, data.playerId);
        onClose();
        navigate(`/room/${data.room.code}`);
      } else {
        setError("Failed to start bot match.");
      }
    } catch {
      setError("Server unreachable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="local-setup-modal play-computer-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="bonus-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="local-modal-header computer-modal-header">
          <span className="local-modal-icon">🤖</span>
          <h2>VS COMPUTER</h2>
          <p>Sharpen your strategy with intelligent AI opponents offline!</p>
        </div>

        {/* Game Type Selection */}
        <div className="setup-section">
          <label>Game Type</label>
          <div className="game-mode-toggle-group">
            <button
              type="button"
              className={`mode-toggle-btn ${gameType === "ludo" ? "active" : ""}`}
              onClick={() => setGameType("ludo")}
            >
              <span>🎲 Ludo</span>
            </button>
            <button
              type="button"
              className={`mode-toggle-btn mode-toggle-snake ${gameType === "snake" ? "active" : ""}`}
              onClick={() => setGameType("snake")}
            >
              <span>🐍 Saanp Seedhi</span>
            </button>
          </div>
        </div>

        {/* Rule Mode (Classic vs Quick) */}
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
                ⚡ Quick (2 Tokens)
              </button>
            </div>
          </div>
        )}

        {/* Players & Color */}
        <div style={{ display: "flex", gap: "14px" }}>
          <div className="setup-section" style={{ flex: 1 }}>
            <label>Match Size</label>
            <div className="player-count-picker">
              <button
                type="button"
                className={maxPlayers === 2 ? "active" : ""}
                onClick={() => setMaxPlayers(2)}
              >
                1 Bot (2P)
              </button>
              <button
                type="button"
                className={maxPlayers === 4 ? "active" : ""}
                onClick={() => setMaxPlayers(4)}
              >
                3 Bots (4P)
              </button>
            </div>
          </div>
          <div className="setup-section" style={{ flex: 1 }}>
            <label>Your Color</label>
            <div className="color-picker-row">
              {PLAYER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-btn ${c} ${preferredColor === c ? "active" : ""}`}
                  onClick={() => setPreferredColor(c)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bet Selection */}
        <div className="setup-section">
          <label>Practice Stakes</label>
          <div className="bet-pills-row">
            {[0, 500, 1000].map((fee) => (
              <button
                key={fee}
                type="button"
                className={`bet-pill ${entryFee === fee ? "active" : ""}`}
                onClick={() => setEntryFee(fee)}
              >
                {fee === 0 ? "Free Practice" : `🪙 ${fee}`}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="form-error" role="alert" style={{ margin: "8px 0" }}>{error}</p>}

        <button
          className="start-local-btn"
          type="button"
          onClick={handleStart}
          disabled={loading}
          style={{
            background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
            boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)",
          }}
        >
          {loading ? "STARTING..." : "START BOT MATCH 🤖"}
        </button>
      </div>
    </div>
  );
}
