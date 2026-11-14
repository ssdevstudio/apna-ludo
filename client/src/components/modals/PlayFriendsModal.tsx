import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlayerColor, PLAYER_COLORS } from "@apna-ludo/shared";
import { playSound } from "../../utils/audio";
import { deductCoins, getProgression } from "../../utils/progression";

interface PlayFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBonus: () => void;
  playerName: string;
  avatar: string;
  initialCode?: string;
}

export function PlayFriendsModal({
  isOpen,
  onClose,
  onOpenBonus,
  playerName,
  avatar,
  initialCode = "",
}: PlayFriendsModalProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"create" | "join">(initialCode ? "join" : "create");
  
  // Create Room state
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(4);
  const [gameType, setGameType] = useState<"ludo" | "snake">("ludo");
  const [gameMode, setGameMode] = useState<"classic" | "quick">("classic");
  const [createColor, setCreateColor] = useState<PlayerColor>("red");
  const [entryFee, setEntryFee] = useState<number>(500);

  // Join Room state
  const [code, setCode] = useState(initialCode);
  const [joinStep, setJoinStep] = useState<"code" | "preview">("code");
  const [previewData, setPreviewData] = useState<any>(null);
  const [joinColor, setJoinColor] = useState<PlayerColor>("red");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleCreate = async () => {
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
      const res = await fetch("/api/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: playerName.trim(),
          maxPlayers,
          color: createColor,
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
        setError("Failed to create room.");
      }
    } catch {
      setError("Server unreachable.");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    playSound("click");
    setError("");

    if (!playerName.trim()) {
      setError("Please set a player name first!");
      return;
    }

    const r = code.trim().toUpperCase();
    if (!r) {
      setError("Please enter a room code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/room/${r}/preview`);
      const data = await res.json();
      if (data.ok) {
        if (data.phase !== "lobby") {
          setError("Game already started.");
          return;
        }
        if (data.currentPlayers >= data.maxPlayers) {
          setError("Room is full.");
          return;
        }
        setPreviewData(data);
        const available = PLAYER_COLORS.find((c) => !data.usedColors.includes(c));
        if (available) setJoinColor(available);
        setJoinStep("preview");
      } else {
        setError(data.error === "ROOM_NOT_FOUND" ? "Room not found." : "Failed to fetch room.");
      }
    } catch {
      setError("Server unreachable.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    playSound("click");
    const r = code.trim().toUpperCase();
    const fee = previewData?.entryFee || 0;

    if (fee > 0 && !deductCoins(fee)) {
      setError(`This room requires ${fee} coins to enter! Spin the wheel to get coins 🪙`);
      onOpenBonus();
      return;
    }

    sessionStorage.setItem("apna-player", playerName.trim());
    sessionStorage.setItem("apna-avatar", avatar);
    sessionStorage.setItem("apna-bet", String(fee));
    sessionStorage.setItem(`apna-join-color-${r}`, joinColor);
    sessionStorage.removeItem(`apna-token-${r}`);
    sessionStorage.removeItem(`apna-playerid-${r}`);
    onClose();
    navigate(`/room/${r}`);
  };

  const winPot = entryFee * maxPlayers;
  const progression = getProgression();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="local-setup-modal play-friends-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="bonus-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="local-modal-header friends-modal-header">
          <span className="local-modal-icon">👥</span>
          <h2>PLAY WITH FRIENDS</h2>
          <p>Create a private room or enter a 6-digit code to play together!</p>
        </div>

        {/* Tab Selector */}
        <div className="friends-tab-bar">
          <button
            type="button"
            className={`friends-tab-btn ${activeTab === "create" ? "active" : ""}`}
            onClick={() => { setActiveTab("create"); setError(""); }}
          >
            Create Room
          </button>
          <button
            type="button"
            className={`friends-tab-btn ${activeTab === "join" ? "active" : ""}`}
            onClick={() => { setActiveTab("join"); setError(""); setJoinStep("code"); }}
          >
            Join Room
          </button>
        </div>

        {activeTab === "create" ? (
          <>
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
                <label>Players</label>
                <div className="player-count-picker">
                  {[2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={maxPlayers === num ? "active" : ""}
                      onClick={() => setMaxPlayers(num as 2 | 3 | 4)}
                    >
                      {num}P
                    </button>
                  ))}
                </div>
              </div>
              <div className="setup-section" style={{ flex: 1 }}>
                <label>Your Color</label>
                <div className="color-picker-row">
                  {PLAYER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`color-btn ${c} ${createColor === c ? "active" : ""}`}
                      onClick={() => setCreateColor(c)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Entry Bet */}
            <div className="setup-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ margin: 0 }}>Entry Fee</label>
                <span className="pot-prize-badge">
                  🏆 Win Pot: <b>{winPot > 0 ? `${winPot.toLocaleString()} 🪙` : "Free"}</b>
                </span>
              </div>
              <div className="bet-pills-row">
                {[0, 500, 1000, 2500, 5000].map((fee) => (
                  <button
                    key={fee}
                    type="button"
                    className={`bet-pill ${entryFee === fee ? "active" : ""}`}
                    onClick={() => setEntryFee(fee)}
                  >
                    {fee === 0 ? "Free" : `🪙 ${fee >= 1000 ? `${fee / 1000}K` : fee}`}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="form-error" role="alert" style={{ margin: "8px 0" }}>{error}</p>}

            <button
              className="start-local-btn"
              type="button"
              onClick={handleCreate}
              disabled={loading}
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                boxShadow: "0 4px 15px rgba(124, 58, 237, 0.4)",
              }}
            >
              {loading ? "CREATING ROOM..." : "CREATE PRIVATE ROOM 👥"}
            </button>
          </>
        ) : (
          /* Join Room Tab */
          <div>
            {joinStep === "code" ? (
              <form onSubmit={handlePreview} style={{ marginTop: "12px" }}>
                <div className="setup-section">
                  <label>Room Code</label>
                  <input
                    className="code-input"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/[^a-z0-9]/gi, ""));
                      setError("");
                    }}
                    placeholder="ABC123"
                    maxLength={8}
                    autoCapitalize="characters"
                    autoFocus
                    style={{
                      width: "100%",
                      fontSize: "24px",
                      letterSpacing: "4px",
                      textAlign: "center",
                      fontWeight: 800,
                      padding: "12px",
                      borderRadius: "12px",
                      border: "2px solid var(--line)",
                    }}
                  />
                </div>

                {error && <p className="form-error" role="alert" style={{ margin: "8px 0" }}>{error}</p>}

                <button
                  className="start-local-btn"
                  type="submit"
                  disabled={loading || !code.trim()}
                  style={{
                    background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
                    boxShadow: "0 4px 15px rgba(2, 132, 199, 0.4)",
                    marginTop: "16px",
                  }}
                >
                  {loading ? "SEARCHING ROOM..." : "FIND ROOM 🔎"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoin} style={{ marginTop: "12px" }}>
                <div className="preview-info-box" style={{ padding: "12px", borderRadius: "12px", background: "rgba(0,0,0,0.06)", marginBottom: "16px" }}>
                  <p style={{ margin: "0 0 6px 0", fontWeight: 700, fontSize: "14px" }}>
                    Room: <b>{code.toUpperCase()}</b> ({previewData?.currentPlayers}/{previewData?.maxPlayers} players)
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
                    Mode: {previewData?.gameType === "snake" ? "🐍 Saanp Seedhi" : "🎲 Ludo"} ({previewData?.gameMode === "quick" ? "⚡ Quick" : "Classic"})
                    {previewData?.entryFee > 0 && ` • Entry: ${previewData.entryFee} 🪙`}
                  </p>
                </div>

                <div className="setup-section">
                  <label>Pick Your Seat Color</label>
                  <div className="color-picker-row" style={{ justifyContent: "center", gap: "12px" }}>
                    {PLAYER_COLORS.map((c) => {
                      const taken = previewData?.usedColors.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          disabled={taken}
                          title={taken ? "Color already taken" : ""}
                          className={`color-btn ${c} ${joinColor === c ? "active" : ""} ${taken ? "taken" : ""}`}
                          onClick={() => setJoinColor(c)}
                        />
                      );
                    })}
                  </div>
                </div>

                {error && <p className="form-error" role="alert" style={{ margin: "8px 0" }}>{error}</p>}

                <button
                  className="start-local-btn"
                  type="submit"
                  disabled={!joinColor}
                  style={{
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)",
                    marginTop: "16px",
                  }}
                >
                  ENTER TABLE 🚀
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
