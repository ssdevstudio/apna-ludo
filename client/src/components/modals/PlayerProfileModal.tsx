import { useState } from "react";
import {
  getProgression,
  getLevelInfo,
  setVipFrame,
  VipFrame,
  PlayerProgression,
} from "../../utils/progression";

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName?: string;
  avatar?: string;
}

const VIP_FRAMES: { id: VipFrame; name: string; icon: string; border: string; glow: string }[] = [
  { id: "none", name: "Classic", icon: "⚪", border: "transparent", glow: "none" },
  { id: "bronze", name: "Bronze VIP", icon: "🥉", border: "linear-gradient(135deg, #b45309, #d97706)", glow: "0 0 10px rgba(180, 83, 9, 0.5)" },
  { id: "silver", name: "Silver VIP", icon: "🥈", border: "linear-gradient(135deg, #94a3b8, #e2e8f0)", glow: "0 0 10px rgba(148, 163, 184, 0.5)" },
  { id: "gold", name: "Gold VIP", icon: "🥇", border: "linear-gradient(135deg, #ca8a04, #fef08a)", glow: "0 0 14px rgba(234, 179, 8, 0.7)" },
  { id: "diamond", name: "Diamond King", icon: "💎", border: "linear-gradient(135deg, #06b6d4, #67e8f9)", glow: "0 0 16px rgba(6, 182, 212, 0.8)" },
];

export function PlayerProfileModal({
  isOpen,
  onClose,
  playerName = "Player",
  avatar = "😀",
}: PlayerProfileModalProps) {
  const [progression, setProgression] = useState<PlayerProgression>(getProgression);
  const [selectedFrame, setSelectedFrame] = useState<VipFrame>(progression.vipFrame ?? "gold");

  if (!isOpen) return null;

  const levelInfo = getLevelInfo(progression.xp);
  const winRate = progression.matchesPlayed > 0
    ? Math.round((progression.matchesWon / progression.matchesPlayed) * 100)
    : 0;

  const getRankTitle = (lvl: number) => {
    if (lvl >= 10) return "👑 Ludo King Legend";
    if (lvl >= 6) return "⚔️ Board Champion";
    if (lvl >= 3) return "🎲 Dice Master";
    return "🌱 Rookie Roller";
  };

  const handleEquipFrame = (f: VipFrame) => {
    setSelectedFrame(f);
    setVipFrame(f);
    setProgression(getProgression());
  };

  const activeFrameData = VIP_FRAMES.find((f) => f.id === selectedFrame) || VIP_FRAMES[0]!;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="profile-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="bonus-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {/* Top Header */}
        <div className="profile-banner">
          <div
            className="profile-avatar-frame"
            style={{
              background: activeFrameData.border,
              boxShadow: activeFrameData.glow,
            }}
          >
            <div className="profile-avatar-inner">{avatar}</div>
          </div>
          <h2 className="profile-name">{playerName}</h2>
          <span className="profile-rank-tag">{getRankTitle(levelInfo.level)}</span>
        </div>

        {/* Level & XP Gauge */}
        <div className="profile-level-card">
          <div className="level-bar-labels">
            <b>Level {levelInfo.level}</b>
            <span>
              {levelInfo.currentLevelXp} / {levelInfo.neededLevelXp} XP
            </span>
          </div>
          <div className="level-progress-track">
            <div
              className="level-progress-fill"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Statistics Grid (Ludo King style) */}
        <div className="profile-stats-grid">
          <div className="stat-box">
            <span className="stat-box-val">🪙 {progression.coins.toLocaleString()}</span>
            <span className="stat-box-lbl">Total Coins</span>
          </div>
          <div className="stat-box">
            <span className="stat-box-val">🎮 {progression.matchesPlayed}</span>
            <span className="stat-box-lbl">Played</span>
          </div>
          <div className="stat-box">
            <span className="stat-box-val">🏆 {progression.matchesWon}</span>
            <span className="stat-box-lbl">Won</span>
          </div>
          <div className="stat-box">
            <span className="stat-box-val">📈 {winRate}%</span>
            <span className="stat-box-lbl">Win Ratio</span>
          </div>
          <div className="stat-box" style={{ gridColumn: "span 2" }}>
            <span className="stat-box-val">🎯 {progression.tokensCaptured}</span>
            <span className="stat-box-lbl">Total Tokens Captured</span>
          </div>
        </div>

        {/* VIP Avatar Frames Selector */}
        <div className="vip-frames-section">
          <h4>VIP Avatar Frames</h4>
          <div className="vip-frame-pills">
            {VIP_FRAMES.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`vip-frame-btn ${selectedFrame === f.id ? "active" : ""}`}
                onClick={() => handleEquipFrame(f.id)}
              >
                <span>{f.icon}</span>
                <small>{f.name}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
