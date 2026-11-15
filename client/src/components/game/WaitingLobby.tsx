import { PlayerColor, PLAYER_COLORS, RoomSnapshot } from "@apna-ludo/shared";
import { COLOR_HEX } from "../../utils/constants";
import { playSound } from "../../utils/audio";

interface WaitingLobbyProps {
  snapshot: RoomSnapshot;
  playerId: string | null;
  myAvatar: string;
  isHost: boolean;
  onStart: () => void;
  onToggleReady: () => void;
  onCopyInvite: () => void;
  copied: boolean;
  potAmount: number;
  isBotGame: boolean;
}

export function WaitingLobby({
  snapshot,
  playerId,
  myAvatar,
  isHost,
  onStart,
  onToggleReady,
  onCopyInvite,
  copied,
  potAmount,
  isBotGame,
}: WaitingLobbyProps) {
  const me = snapshot.players.find((p) => p.id === playerId);
  const currentCount = snapshot.players.length;
  const maxCount = snapshot.maxPlayers;
  const isFull = currentCount === maxCount;
  const allReady = snapshot.players.every((p) => p.ready);
  const canStart = isFull && allReady;

  const shareWhatsApp = () => {
    playSound("click");
    const url = `${window.location.origin}/room/${snapshot.code.toUpperCase()}`;
    const gameName =
      snapshot.gameType === "snake"
        ? "🐍 Saanp Seedhi (Snakes & Ladders)"
        : `🎲 Ludo (${snapshot.gameMode === "quick" ? "Quick Rush" : "Classic"})`;
    const text = `Join my ${gameName} match on Apna Ludo!\n\n🔑 Room Code: ${snapshot.code.toUpperCase()}\n🏆 Pot Prize: ${potAmount > 0 ? `${potAmount.toLocaleString()} Coins` : "Free"}\n\n👉 Tap to play: ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  // 2 to 4 seat colors
  const seatColors: PlayerColor[] = PLAYER_COLORS.slice(0, maxCount) as PlayerColor[];

  return (
    <div className="waiting-lobby-container">
      <div className={`waiting-lobby-card ${snapshot.gameType === "snake" ? "snake-lobby-theme" : "ludo-lobby-theme"}`}>
        {/* Header Ribbon */}
        <div className="lobby-header-ribbon">
          <div className="lobby-mode-badge">
            {snapshot.gameType === "snake" ? (
              <span>🐍 SAANP SEEDHI (100 TILES)</span>
            ) : (
              <span>🎲 LUDO • {snapshot.gameMode === "quick" ? "⚡ QUICK RUSH (2 TOKENS)" : "CLASSIC (4 TOKENS)"}</span>
            )}
          </div>
          {potAmount > 0 && (
            <div className="lobby-pot-badge">
              🏆 WIN POT: <b>{potAmount.toLocaleString()} 🪙</b>
            </div>
          )}
        </div>

        {/* Room Code & Fast Share Bar */}
        {!isBotGame && (
          <div className="lobby-code-pod">
            <div className="lobby-code-display">
              <span className="lobby-code-tag">ROOM CODE</span>
              <span className="lobby-code-digits">{snapshot.code.toUpperCase()}</span>
            </div>

            <div className="lobby-share-actions">
              <button
                type="button"
                className={`lobby-copy-btn ${copied ? "copied" : ""}`}
                onClick={() => {
                  playSound("click");
                  onCopyInvite();
                }}
              >
                {copied ? "COPIED! ✓" : "COPY CODE 📋"}
              </button>
              <button
                type="button"
                className="lobby-whatsapp-btn"
                onClick={shareWhatsApp}
              >
                <span>📲</span> WHATSAPP
              </button>
            </div>
          </div>
        )}

        {/* 4-Player Table Seats Podium */}
        <div className="lobby-podium-section">
          <div className="lobby-podium-header">
            <span>TABLE PLAYERS</span>
            <b>{currentCount} / {maxCount} JOINED</b>
          </div>

          <div className="lobby-seats-row">
            {seatColors.map((color) => {
              const player = snapshot.players.find((p) => p.color === color);
              const isMe = player?.id === playerId;
              const av = player?.isBot ? "🤖" : isMe ? myAvatar : "😀";

              if (player) {
                return (
                  <div
                    key={color}
                    className={`lobby-seat-card seat-filled seat-${color}`}
                    style={{ borderColor: COLOR_HEX[color] }}
                  >
                    <div
                      className="seat-avatar"
                      style={{ background: COLOR_HEX[color] }}
                    >
                      {av}
                      {player.isHost && <span className="host-crown-badge" title="Room Host">👑</span>}
                    </div>
                    <span className="seat-player-name">
                      {player.name} {isMe ? "(You)" : ""}
                    </span>
                    <span className={`seat-ready-pill ${player.ready ? "is-ready" : "is-waiting"}`}>
                      {player.ready ? "READY ✓" : "WAITING ⏳"}
                    </span>
                  </div>
                );
              }

              return (
                <button
                  key={color}
                  type="button"
                  className={`lobby-seat-card seat-empty seat-empty-${color}`}
                  onClick={() => {
                    playSound("click");
                    onCopyInvite();
                  }}
                  title="Click to copy invite link"
                >
                  <div className="seat-avatar empty-avatar">+</div>
                  <span className="seat-player-name" style={{ color: "var(--text-secondary)" }}>
                    Open Seat
                  </span>
                  <span className="seat-invite-hint">
                    Invite Friend
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Center Footer */}
        <div className="lobby-footer-actions">
          {isHost ? (
            <div className="host-controls-wrap">
              {!isFull && (
                <p className="lobby-status-hint">
                  ⏳ Waiting for <b>{maxCount - currentCount}</b> more friend{maxCount - currentCount > 1 ? "s" : ""} to join the table...
                </p>
              )}
              {isFull && !allReady && (
                <p className="lobby-status-hint">
                  ⏳ All players joined! Waiting for everyone to be <b>READY</b>...
                </p>
              )}
              {canStart && (
                <p className="lobby-status-hint ready-hint">
                  ✨ Everyone is ready! Launch the game now!
                </p>
              )}

              <button
                type="button"
                className={`lobby-start-button ${canStart ? "can-start" : "disabled-start"}`}
                onClick={() => {
                  playSound("click");
                  onStart();
                }}
                disabled={!canStart}
              >
                {canStart ? "START GAME 🎲" : `START GAME (${currentCount}/${maxCount})`}
              </button>
            </div>
          ) : (
            <div className="guest-controls-wrap">
              <p className="lobby-status-hint">
                {me?.ready
                  ? "✓ You are ready! Waiting for the host to start..."
                  : "👉 Tap the button below to confirm you are ready!"}
              </p>
              <button
                type="button"
                className={`lobby-ready-toggle-btn ${me?.ready ? "ready-on" : "ready-off"}`}
                onClick={() => {
                  playSound("click");
                  onToggleReady();
                }}
              >
                {me?.ready ? "YOU ARE READY ✓" : "CLICK WHEN READY ⏳"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
