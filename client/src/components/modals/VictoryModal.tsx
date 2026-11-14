import { useState, useEffect, useRef } from "react";
import { RoomSnapshot } from "@apna-ludo/shared";
import { tr } from "../../utils/i18n";
import { PlayerRankItem } from "../game/PlayerCard";
import {
  recordMatchResult,
  getLevelInfo,
  getProgression,
  PlayerProgression,
} from "../../utils/progression";
import { playSound } from "../../utils/audio";

export function VictoryModal({
  snapshot,
  playerId,
  iWon,
  myAvatar,
  tokensCaptured = 0,
  onRematch,
  onLeave,
}: {
  snapshot: RoomSnapshot | null;
  playerId: string | null;
  iWon: boolean;
  myAvatar: string;
  tokensCaptured?: number;
  onRematch: () => void;
  onLeave: () => void;
}) {
  const winners = snapshot?.game?.winners ?? [];
  const processedRef = useRef(false);
  const [rewardData, setRewardData] = useState<{
    coinsDiff: number;
    xpGained: number;
    leveledUp: boolean;
    newLevel: number;
    newTotalCoins: number;
  } | null>(null);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const entryFee =
      snapshot?.entryFee ??
      Number(sessionStorage.getItem("apna-bet")) ??
      0;
    const playerCount = snapshot?.players?.length || 2;

    const result = recordMatchResult(iWon, entryFee, playerCount, tokensCaptured);
    setRewardData(result);

    if (result.leveledUp) {
      setTimeout(() => playSound("levelUp"), 400);
    } else if (result.coinsDiff > 0) {
      setTimeout(() => playSound("coin"), 300);
    }
  }, [iWon, snapshot, tokensCaptured]);

  const currentProgression = getProgression();
  const levelInfo = getLevelInfo(currentProgression.xp);

  return (
    <div className="modal-backdrop">
      {iWon && (
        <>
          <div className="confetti" style={{ left: "10%", animationDelay: "0s" }} />
          <div className="confetti" style={{ left: "30%", animationDelay: "0.2s" }} />
          <div className="confetti" style={{ left: "50%", animationDelay: "0.5s" }} />
          <div className="confetti" style={{ left: "70%", animationDelay: "0.1s" }} />
          <div className="confetti" style={{ left: "90%", animationDelay: "0.4s" }} />
        </>
      )}
      <div
        className={`game-over ${iWon ? "game-over--win" : "game-over--lose"}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="winner-burst" aria-hidden>
          {iWon ? <span>✦<b>★</b>✦</span> : <span style={{ fontSize: "32px" }}>💔</span>}
        </div>
        <p className="section-kicker">{tr("game.over")}</p>
        <h2 className={iWon ? "modal-win-text" : "modal-lose-text"}>
          {iWon ? tr("win.msg") : tr("lose.msg")}
        </h2>
        <p>{iWon ? "All tokens home. Great game! 🏆" : "Better luck next time! 💔"}</p>

        {/* Ludo King Style Match Rewards Summary Card */}
        {rewardData && (
          <div className="match-rewards-card">
            <div className="rewards-row">
              <div className="reward-chip coins-chip">
                <span className="reward-label">Coins Won</span>
                <b className="reward-value">
                  {rewardData.coinsDiff > 0 ? `+${rewardData.coinsDiff.toLocaleString()} 🪙` : "0 🪙"}
                </b>
              </div>
              <div className="reward-chip xp-chip">
                <span className="reward-label">XP Gained</span>
                <b className="reward-value">+{rewardData.xpGained} ⭐</b>
              </div>
            </div>

            {rewardData.leveledUp && (
              <div className="level-up-banner animate-bounce">
                <span>🎉 LEVEL UP! Welcome to Level {rewardData.newLevel}! (+500 Coins Bonus)</span>
              </div>
            )}

            <div className="modal-level-progress">
              <div className="modal-level-text">
                <span>Level {levelInfo.level}</span>
                <span>
                  {levelInfo.currentLevelXp} / {levelInfo.neededLevelXp} XP
                </span>
              </div>
              <div className="modal-progress-track">
                <div
                  className="modal-progress-fill"
                  style={{ width: `${levelInfo.progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <ol>
          {snapshot?.game?.players
            .slice()
            .sort((a, b) => {
              const aW = winners.indexOf(a.id);
              const bW = winners.indexOf(b.id);
              const aRank = aW !== -1 ? aW : 999;
              const bRank = bW !== -1 ? bW : 999;
              if (aRank !== bRank) return aRank - bRank;
              const aHome = a.tokens.filter((t) => t.progress === 57).length;
              const bHome = b.tokens.filter((t) => t.progress === 57).length;
              return bHome - aHome;
            })
            .map((p, i) => (
              <PlayerRankItem
                key={p.id}
                p={p}
                i={i}
                winners={winners}
                playerId={playerId}
                avatar={myAvatar}
              />
            ))}
        </ol>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {(() => {
            const requests = snapshot?.rematchRequests || [];
            const hasRequested = playerId && requests.includes(playerId);
            const humanCount =
              snapshot?.players.filter((p) => !p.isBot && p.connected).length || 1;

            if (hasRequested) {
              return (
                <button
                  className="primary-button wide"
                  disabled
                  style={{ opacity: 0.7 }}
                >
                  Waiting ({requests.length}/{humanCount}) <span>⏳</span>
                </button>
              );
            } else if (requests.length > 0) {
              return (
                <button
                  className="primary-button wide"
                  onClick={onRematch}
                  style={{ background: "#4caf50" }}
                >
                  Accept Rematch ({requests.length}/{humanCount}) <span>✓</span>
                </button>
              );
            } else {
              return (
                <button className="primary-button wide" onClick={onRematch}>
                  Rematch <span>↻</span>
                </button>
              );
            }
          })()}
          <button
            className="text-button wide"
            onClick={onLeave}
            style={{
              background: "rgba(0,0,0,0.05)",
              padding: "12px",
              borderRadius: "8px",
              fontWeight: "bold",
              color: "#333",
            }}
          >
            Home <span>🏠</span>
          </button>
        </div>
      </div>
    </div>
  );
}
