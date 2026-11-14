import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  GameState,
  PlayerColor,
  createGame,
  applyRoll,
  applyMove,
  legalTokenIds,
  GameType,
  GameMode,
  RoomSnapshot,
} from "@apna-ludo/shared";
import { LudoBoard, COLOR_HEX } from "../game/LudoBoard";
import { SnakeBoard } from "../game/SnakeBoard";
import { PlayerCorner } from "../game/PlayerCard";
import { VictoryModal } from "../modals/VictoryModal";
import { QuickChatModal } from "../modals/QuickChatModal";
import { BoardThemeModal } from "../modals/BoardThemeModal";
import { Logo } from "../ui/Logo";
import { ThemeToggle } from "../ui/ThemeToggle";
import { playSound, toggleSound } from "../../utils/audio";
import { getActiveBoardTheme } from "../../utils/boardTheme";

export function LocalRoom() {
  const navigate = useNavigate();
  const [game, setGame] = useState<GameState | null>(null);
  const [rollingPlayerId, setRollingPlayerId] = useState<string | null>(null);
  const [tokenAnimation, setTokenAnimation] = useState<string | null>(null);
  const [lastRolls, setLastRolls] = useState<Record<string, number>>({});
  const [quickChatOpen, setQuickChatOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [boardTheme, setBoardTheme] = useState(getActiveBoardTheme);

  // Active quick chat bubbles over player corners
  const [speechBubbles, setSpeechBubbles] = useState<Record<string, string>>({});

  // Initialize game from session config
  useEffect(() => {
    const raw = sessionStorage.getItem("apna_local_game_config");
    if (!raw) {
      navigate("/");
      return;
    }
    try {
      const config = JSON.parse(raw);
      const initialGame = createGame(
        config.players,
        (config.gameType as GameType) || "ludo",
        (config.gameMode as GameMode) || "classic"
      );
      setGame(initialGame);
    } catch {
      navigate("/");
    }

    const onThemeChange = () => setBoardTheme(getActiveBoardTheme());
    window.addEventListener("board-theme-changed", onThemeChange);
    return () => window.removeEventListener("board-theme-changed", onThemeChange);
  }, [navigate]);

  const currentPlayer = game?.players.find((p) => p.id === game.currentPlayerId);
  const legalTokens = game?.dice
    ? legalTokenIds(game, game.currentPlayerId, game.dice)
    : [];

  const handleRoll = () => {
    if (!game || game.phase !== "playing" || game.dice !== null || rollingPlayerId) return;

    playSound("dice");
    const cpId = game.currentPlayerId;
    setRollingPlayerId(cpId);

    // Roll random 1-6
    const rolledDice = Math.floor(Math.random() * 6) + 1;

    setTimeout(() => {
      setRollingPlayerId(null);
      setLastRolls((prev) => ({ ...prev, [cpId]: rolledDice }));
      playSound("land");

      const next = applyRoll(game, cpId, rolledDice);
      setGame(next);

      // Auto-move if only 1 legal token or no legal tokens
      const legal = next.dice ? legalTokenIds(next, cpId, next.dice) : [];
      if (legal.length === 1) {
        setTimeout(() => {
          handleMove(legal[0]!);
        }, 320);
      }
    }, 450);
  };

  const handleMove = (tokenId: string) => {
    if (!game || game.phase !== "playing" || game.dice === null) return;

    setTokenAnimation(tokenId);
    setTimeout(() => setTokenAnimation(null), 500);

    try {
      const next = applyMove(game, game.currentPlayerId, tokenId);
      setGame(next);
      if (next.phase === "finished") {
        playSound("win");
      }
    } catch {
      // Ignored
    }
  };

  const handleQuickChatSelect = (text: string) => {
    if (!currentPlayer) return;
    playSound("pop");
    setSpeechBubbles((prev) => ({ ...prev, [currentPlayer.id]: text }));
    setTimeout(() => {
      setSpeechBubbles((prev) => {
        const copy = { ...prev };
        delete copy[currentPlayer.id];
        return copy;
      });
    }, 3200);
  };

  const handleRematch = () => {
    if (!game) return;
    const cleanPlayers = game.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
    }));
    const newGame = createGame(cleanPlayers, game.gameType ?? "ludo", game.gameMode ?? "classic");
    setGame(newGame);
    setLastRolls({});
    setSpeechBubbles({});
  };

  if (!game) return null;

  const baseColors = ["green", "yellow", "blue", "red"] as const;
  const renderCorner = (
    color: PlayerColor,
    pos: "top-left" | "top-right" | "bottom-left" | "bottom-right"
  ) => {
    const p = game.players.find((player) => player.color === color);
    if (!p) return null;

    const isActive = game.currentPlayerId === p.id;
    const displayDice = lastRolls[p.id] || 1;
    const bubble = speechBubbles[p.id];

    return (
      <div key={color} style={{ position: "relative" }}>
        {/* Floating Quick Chat Speech Bubble */}
        {bubble && (
          <div className={`player-speech-bubble bubble-${pos}`}>
            <span>{bubble}</span>
          </div>
        )}
        <PlayerCorner
          player={p}
          position={pos}
          isActive={isActive && game.phase === "playing"}
          diceValue={displayDice}
          isRolling={rollingPlayerId === p.id}
          canRoll={isActive && game.dice === null && !rollingPlayerId}
          canMove={isActive && legalTokens.length > 0}
          onRoll={handleRoll}
          avatar="😀"
          missedCount={0}
        />
      </div>
    );
  };

  const winners = game.winners;
  const isFinished = game.phase === "finished";

  return (
    <main className="room-page" data-board-theme={boardTheme}>
      <header className="room-header">
        <Logo compact />
        <div className="room-header-center">
          <div className="room-code">
            <span
              className="mode-badge"
              style={{ background: "linear-gradient(135deg, #0284c7, #38bdf8)", color: "#fff" }}
            >
              👥 PASS N PLAY
            </span>
            {game.gameType === "snake" && (
              <span
                className="mode-badge"
                style={{ background: "#059669", color: "#fff", marginLeft: "4px" }}
              >
                🐍 SAANP SEEDHI
              </span>
            )}
            {game.gameMode === "quick" && (
              <span
                className="mode-badge"
                style={{ background: "#f59e0b", color: "#fff", marginLeft: "4px" }}
              >
                ⚡ QUICK RUSH
              </span>
            )}
          </div>
        </div>

        <div className="header-actions">
          <ThemeToggle />
          <button
            className="icon-btn"
            onClick={() => setThemeModalOpen(true)}
            aria-label="Board Themes"
            title="Themes"
          >
            🎨
          </button>
          <button
            className="icon-btn"
            onClick={() => setQuickChatOpen(true)}
            aria-label="Quick Phrases"
            title="Taunts &amp; Chat"
          >
            💬
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              const next = toggleSound();
              setSoundOn(next);
            }}
            aria-label="Sound"
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
          <button
            className="icon-btn exit-btn"
            onClick={() => navigate("/")}
            aria-label="Quit"
          >
            🚪
          </button>
        </div>
      </header>

      {/* Ludo King Active Pass-Turn Banner */}
      {game.phase === "playing" && currentPlayer && (
        <div
          className="pass-device-banner"
          style={{
            borderColor: COLOR_HEX[currentPlayer.color],
          }}
        >
          <span className="pass-arrow">👉</span>
          <span>
            Pass device to <b>{currentPlayer.name}</b> (
            <span style={{ color: COLOR_HEX[currentPlayer.color], fontWeight: 900 }}>
              {currentPlayer.color.toUpperCase()}
            </span>
            )
          </span>
        </div>
      )}

      <div className="game-layout game-playing">
        <section className="table-area">
          <div className="board-container">
            {renderCorner("green", "top-left")}
            {renderCorner("yellow", "top-right")}

            <div className="board-center">
              {game.gameType === "snake" ? (
                <SnakeBoard
                  game={game}
                  myPlayerId={game.currentPlayerId}
                  legalTokens={legalTokens}
                  onMove={handleMove}
                  tokenAnimation={tokenAnimation}
                />
              ) : (
                <LudoBoard
                  game={game}
                  myPlayerId={game.currentPlayerId}
                  legalTokens={legalTokens}
                  onMove={handleMove}
                  tokenAnimation={tokenAnimation}
                />
              )}
            </div>

            {renderCorner("red", "bottom-left")}
            {renderCorner("blue", "bottom-right")}
          </div>
        </section>
      </div>

      {/* Victory Celebration */}
      {isFinished && (
        <VictoryModal
          snapshot={{
            code: "LOCAL",
            phase: "finished",
            revision: game.revision,
            maxPlayers: game.players.length,
            players: game.players.map((p) => ({
              id: p.id,
              name: p.name,
              color: p.color,
              ready: true,
              connected: true,
              isHost: false,
            })),
            game,
            chat: [],
          }}
          playerId={winners[0] || null}
          iWon={true}
          myAvatar="😀"
          tokensCaptured={0}
          onRematch={handleRematch}
          onLeave={() => navigate("/")}
        />
      )}

      {/* Quick Chat Modal */}
      <QuickChatModal
        isOpen={quickChatOpen}
        onClose={() => setQuickChatOpen(false)}
        onSelectPhrase={handleQuickChatSelect}
      />

      {/* Board Theme Modal */}
      <BoardThemeModal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
      />
    </main>
  );
}
