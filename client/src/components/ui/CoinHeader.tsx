import { useState, useEffect } from "react";
import { getProgression, getLevelInfo, PlayerProgression } from "../../utils/progression";

interface CoinHeaderProps {
  onOpenBonus: () => void;
  compact?: boolean;
}

export function CoinHeader({ onOpenBonus, compact = false }: CoinHeaderProps) {
  const [progression, setProgression] = useState<PlayerProgression>(getProgression);
  const [showXpTooltip, setShowXpTooltip] = useState(false);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) setProgression(e.detail);
      else setProgression(getProgression());
    };
    window.addEventListener("progression-updated", handleUpdate);
    return () => window.removeEventListener("progression-updated", handleUpdate);
  }, []);

  const info = getLevelInfo(progression.xp);

  return (
    <div className={`coin-header-bar ${compact ? "coin-header-compact" : ""}`}>
      {/* Level Star Badge */}
      <div
        className="level-badge-pill"
        onClick={() => setShowXpTooltip(!showXpTooltip)}
        title={`Level ${info.level}: ${info.currentLevelXp} / ${info.neededLevelXp} XP (${info.progressPercent}%)`}
      >
        <span className="level-star">⭐</span>
        <span className="level-text">Lv.{info.level}</span>

        {showXpTooltip && (
          <div className="xp-tooltip" onClick={(e) => e.stopPropagation()}>
            <div className="xp-tooltip-header">
              <b>Level {info.level}</b>
              <span>{info.progressPercent}%</span>
            </div>
            <div className="xp-progress-track">
              <div
                className="xp-progress-fill"
                style={{ width: `${info.progressPercent}%` }}
              />
            </div>
            <small>
              {info.currentLevelXp} / {info.neededLevelXp} XP to Lv.{info.level + 1}
            </small>
          </div>
        )}
      </div>

      {/* Coin Balance Capsule */}
      <div className="coin-pill-capsule" onClick={onOpenBonus} title="Click to claim more coins!">
        <span className="coin-icon">🪙</span>
        <span className="coin-amount">{progression.coins.toLocaleString()}</span>
        <button
          type="button"
          className="coin-plus-btn"
          onClick={(e) => {
            e.stopPropagation();
            onOpenBonus();
          }}
          aria-label="Add Coins"
          title="Daily Free Coins"
        >
          +
        </button>
      </div>
    </div>
  );
}
