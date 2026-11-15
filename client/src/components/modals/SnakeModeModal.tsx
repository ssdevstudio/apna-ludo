import { playSound } from "../../utils/audio";

interface SnakeModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVsComputer: () => void;
  onSelectPlayWithFriends: () => void;
  onSelectPassNPlay: () => void;
}

export function SnakeModeModal({
  isOpen,
  onClose,
  onSelectVsComputer,
  onSelectPlayWithFriends,
  onSelectPassNPlay,
}: SnakeModeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="local-setup-modal snake-mode-launcher-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="bonus-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="local-modal-header" style={{ borderBottomColor: "#10b981" }}>
          <span className="local-modal-icon" style={{ filter: "drop-shadow(0 2px 8px rgba(16, 185, 129, 0.4))" }}>
            🐍
          </span>
          <h2 style={{ color: "#10b981" }}>SAANP SEEDHI</h2>
          <p>Classic 100-Tile Snakes &amp; Ladders! Choose your game mode:</p>
        </div>

        <div className="snake-launcher-grid">
          {/* Option 1: Play With Friends */}
          <button
            type="button"
            className="snake-launch-card card-friends"
            onClick={() => {
              playSound("click");
              onSelectPlayWithFriends();
            }}
          >
            <div className="launch-card-icon">👥</div>
            <div className="launch-card-body">
              <h4>PLAY WITH FRIENDS</h4>
              <p>Private table with 6-digit code &amp; custom bets</p>
            </div>
            <span className="launch-card-arrow">→</span>
          </button>

          {/* Option 2: Vs Computer */}
          <button
            type="button"
            className="snake-launch-card card-computer"
            onClick={() => {
              playSound("click");
              onSelectVsComputer();
            }}
          >
            <div className="launch-card-icon">🤖</div>
            <div className="launch-card-body">
              <h4>VS COMPUTER</h4>
              <p>Practice offline against smart AI bots (1–3 bots)</p>
            </div>
            <span className="launch-card-arrow">→</span>
          </button>

          {/* Option 3: Pass N Play */}
          <button
            type="button"
            className="snake-launch-card card-local"
            onClick={() => {
              playSound("click");
              onSelectPassNPlay();
            }}
          >
            <div className="launch-card-icon">📱</div>
            <div className="launch-card-body">
              <h4>PASS N PLAY</h4>
              <p>Local multiplayer for 2–4 players on this device</p>
            </div>
            <span className="launch-card-arrow">→</span>
          </button>
        </div>

        <div className="snake-rules-note">
          <span>📜 Rules:</span> Exact roll needed to reach 100 • Extra roll on 6 • 8 Ladders &amp; 8 Snakes
        </div>
      </div>
    </div>
  );
}
