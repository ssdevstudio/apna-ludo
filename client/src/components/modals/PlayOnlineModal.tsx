import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlayerColor, PLAYER_COLORS } from "@apna-ludo/shared";
import { playSound } from "../../utils/audio";
import { deductCoins, getProgression } from "../../utils/progression";

interface PlayOnlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBonus: () => void;
  playerName: string;
  avatar: string;
}

export function PlayOnlineModal({
  isOpen,
  onClose,
  onOpenBonus,
  playerName,
  avatar,
}: PlayOnlineModalProps) {
  const navigate = useNavigate();
  const [maxPlayers, setMaxPlayers] = useState<2 | 4>(2);
  const [gameType, setGameType] = useState<"ludo" | "snake">("ludo");
  const [gameMode, setGameMode] = useState<"classic" | "quick">("classic");
  const [preferredColor, setPreferredColor] = useState<PlayerColor>("red");
  const [entryFee, setEntryFee] = useState<number>(500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleMatchmake = async () => {
    playSound("click");
    setError("");

    if (!playerName.trim()) {
      setError("Please set a player name first!");
      return;
    }

    if (entryFee > 0 && !deductCoins(entryFee)) {
      setError("Not enough coins! Spin the wheel to get free coins 🪙");
      onOpenBonus();
      return;
    }

    setLoading(true);
    sessionStorage.setItem("apna-player", playerName.trim());
    sessionStorage.setItem("apna-avatar", avatar);
    sessionStorage.setItem("apna-bet", String(entryFee));

    try {
      const res = await fetch("/api/matchmake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: playerName.trim(),
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
        setError(data.message || "Failed to find a match. Please try again.");
      }
    } catch {
      setError("Server unreachable. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const winPot = entryFee * maxPlayers;
  const progression = getProgression();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="local-setup-modal play-online-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="bonus-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="local-modal-header online-modal-header">
          <span className="local-modal-icon">🌐</span>
          <h2>PLAY ONLINE</h2>
          <p>Instant multiplayer matchmaking with players worldwide!</p>
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
                ⚡ Quick Rush (2 Tokens)
              </button>
            </div>
          </div>
        )}

        {/* Player Count & Color */}
        <div style={{ display: "flex", gap: "14px" }}>
          <div className="setup-section" style={{ flex: 1 }}>
            <label>Players</label>
            <div className="player-count-picker">
              {[2, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  className={maxPlayers === num ? "active" : ""}
                  onClick={() => setMaxPlayers(num as 2 | 4)}
                >
                  {num}P
                </button>
              ))}
            </div>
          </div>
          <div className="setup-section" style={{ flex: 1 }}>
            <label>Color</label>
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

        {/* Bet Selection & Pot Prize */}
        <div className="setup-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <label style={{ margin: 0 }}>Entry Fee</label>
            <span className="pot-prize-badge">
              🏆 Win Pot: <b>{winPot.toLocaleString()} 🪙</b>
            </span>
          </div>
          <div className="bet-pills-row">
            {[500, 1000, 2500, 5000, 10000].map((fee) => (
              <button
                key={fee}
                type="button"
                className={`bet-pill ${entryFee === fee ? "active" : ""}`}
                onClick={() => setEntryFee(fee)}
              >
                🪙 {fee >= 1000 ? `${fee / 1000}K` : fee}
              </button>
            ))}
          </div>
          <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
            <span>Your Balance: <b>{progression.coins.toLocaleString()} 🪙</b></span>
            {entryFee > progression.coins && (
              <button
                type="button"
                className="text-button"
                onClick={onOpenBonus}
                style={{ padding: 0, fontSize: "11px", color: "#eab308" }}
              >
                + Get Coins
              </button>
            )}
          </div>
        </div>

        {error && <p className="form-error" role="alert" style={{ margin: "8px 0" }}>{error}</p>}

        <button
          className="start-local-btn"
          type="button"
          onClick={handleMatchmake}
          disabled={loading}
          style={{
            background: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)",
            boxShadow: "0 4px 15px rgba(37, 99, 235, 0.4)",
          }}
        >
          {loading ? "SEARCHING TABLE..." : "FIND MATCH 🎲"}
        </button>
      </div>
    </div>
  );
}
