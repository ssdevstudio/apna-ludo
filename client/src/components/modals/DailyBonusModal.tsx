import { useState, useEffect } from "react";
import {
  getProgression,
  claimDailyBonus,
  canClaimDailyBonus,
  getTimeUntilDailyBonus,
  DAILY_BONUS_AMOUNT,
  PlayerProgression,
} from "../../utils/progression";
import { playSound } from "../../utils/audio";

interface DailyBonusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DailyBonusModal({ isOpen, onClose }: DailyBonusModalProps) {
  const [progression, setProgression] = useState<PlayerProgression>(getProgression);
  const [canClaim, setCanClaim] = useState(canClaimDailyBonus());
  const [timeLeft, setTimeLeft] = useState(getTimeUntilDailyBonus());
  const [collectedAmount, setCollectedAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCollectedAmount(null);
      return;
    }
    const update = () => {
      setProgression(getProgression());
      setCanClaim(canClaimDailyBonus());
      setTimeLeft(getTimeUntilDailyBonus());
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClaim = () => {
    const res = claimDailyBonus();
    if (res.success) {
      playSound("coin");
      setCollectedAmount(res.amount);
      setProgression(getProgression());
      setCanClaim(false);
      setTimeLeft(getTimeUntilDailyBonus());
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="bonus-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="bonus-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="bonus-header-icon">
          <span className="crown-badge">👑</span>
          <div className="bonus-coin-glow">💰</div>
        </div>

        <h2>Lucky Daily Bonus</h2>
        <p className="bonus-subtitle">
          {progression.coins < 200
            ? "Out of coins? Here's an instant refill to keep playing!"
            : "Collect your daily coins reward to bet and win in matches!"}
        </p>

        <div className="bonus-balance-card">
          <span className="bonus-balance-label">Your Balance</span>
          <span className="bonus-balance-val">
            🪙 {progression.coins.toLocaleString()}
          </span>
        </div>

        {collectedAmount ? (
          <div className="bonus-claimed-badge">
            <span className="star-burst">✨</span>
            <b>+{collectedAmount.toLocaleString()} Coins Collected!</b>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", opacity: 0.85 }}>
              Ready to enter match lobbies!
            </p>
          </div>
        ) : canClaim ? (
          <button
            type="button"
            className="bonus-claim-btn animate-pulse"
            onClick={handleClaim}
          >
            Collect +{progression.coins < 200 ? "500" : DAILY_BONUS_AMOUNT.toLocaleString()} Coins 🪙
          </button>
        ) : (
          <div className="bonus-cooldown-box">
            <span>Next daily bonus in:</span>
            <b>⏳ {formatTime(timeLeft)}</b>
          </div>
        )}

        <div className="bonus-perks-row">
          <div className="bonus-perk">
            <span>Level {progression.level}</span>
            <small>⭐ {progression.xp} XP</small>
          </div>
          <div className="bonus-perk">
            <span>{progression.matchesWon} Wins</span>
            <small>🏆 {progression.matchesPlayed} Matches</small>
          </div>
        </div>
      </div>
    </div>
  );
}
