import { useState, useEffect, useRef } from "react";
import {
  getProgression,
  claimLuckySpin,
  canClaimDailyBonus,
  getTimeUntilDailyBonus,
  PlayerProgression,
} from "../../utils/progression";
import { playSound } from "../../utils/audio";

interface LuckySpinWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WHEEL_PRIZES = [
  { amount: 500, label: "500", color: "#3b82f6", text: "#fff" },
  { amount: 1000, label: "1,000", color: "#10b981", text: "#fff" },
  { amount: 250, label: "250", color: "#f59e0b", text: "#fff" },
  { amount: 5000, label: "5,000", color: "#ec4899", text: "#fff" },
  { amount: 25000, label: "25K 👑", color: "#eab308", text: "#78350f" }, // JACKPOT
  { amount: 500, label: "500", color: "#8b5cf6", text: "#fff" },
  { amount: 2000, label: "2,000", color: "#06b6d4", text: "#fff" },
  { amount: 10000, label: "10K 💎", color: "#ef4444", text: "#fff" },
];

const SLICE_DEGREE = 360 / WHEEL_PRIZES.length; // 45 deg

export function LuckySpinWheelModal({ isOpen, onClose }: LuckySpinWheelModalProps) {
  const [progression, setProgression] = useState<PlayerProgression>(getProgression);
  const [canSpin, setCanSpin] = useState(canClaimDailyBonus());
  const [timeLeft, setTimeLeft] = useState(getTimeUntilDailyBonus());
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<{ amount: number; label: string } | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setWonPrize(null);
      return;
    }
    const update = () => {
      setProgression(getProgression());
      setCanSpin(canClaimDailyBonus());
      setTimeLeft(getTimeUntilDailyBonus());
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSpin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setWonPrize(null);

    // Pick target prize (weighted slightly towards middle prizes, with chance of jackpot!)
    const rand = Math.random();
    let prizeIdx = 0;
    if (rand < 0.35) prizeIdx = 0; // 500
    else if (rand < 0.60) prizeIdx = 1; // 1,000
    else if (rand < 0.75) prizeIdx = 6; // 2,000
    else if (rand < 0.88) prizeIdx = 3; // 5,000
    else if (rand < 0.96) prizeIdx = 7; // 10,000
    else prizeIdx = 4; // 25,000 JACKPOT! (4% chance)

    const selectedPrize = WHEEL_PRIZES[prizeIdx]!;

    // Calculate rotation: 5 full rounds + slice offset
    // Pointer is at TOP (270 deg or 0 deg depending on orientation).
    // Each slice starts at sliceIdx * 45. Center of slice is (prizeIdx + 0.5) * 45.
    // To align slice at top (0 deg): rotation = 360 - centerOfSlice
    const targetSliceCenter = (prizeIdx + 0.5) * SLICE_DEGREE;
    const extraRounds = 360 * 6; // 6 full turns
    const finalAngle = extraRounds + (360 - targetSliceCenter);

    setRotation(finalAngle);

    // Audio clicks while spinning
    let clickCount = 0;
    tickIntervalRef.current = setInterval(() => {
      clickCount++;
      playSound("tick");
      if (clickCount > 28) {
        if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      }
    }, 120);

    // Finish spin after 3.8s
    setTimeout(() => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      setIsSpinning(false);
      claimLuckySpin(selectedPrize.amount);
      playSound("levelUp");
      playSound("coin");
      setWonPrize(selectedPrize);
      setProgression(getProgression());
      setCanSpin(false);
      setTimeLeft(getTimeUntilDailyBonus());
    }, 3800);
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
        className="lucky-wheel-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="bonus-modal-close"
          onClick={onClose}
          aria-label="Close"
          disabled={isSpinning}
        >
          ✕
        </button>

        <div className="lucky-wheel-header">
          <span className="wheel-crown">👑</span>
          <h2>LUCKY SPIN WHEEL</h2>
          <p className="wheel-subtitle">Spin every 24h for free coins &amp; jackpots!</p>
        </div>

        {/* Balance Card */}
        <div className="wheel-balance-pill">
          <span>Coins:</span>
          <b>🪙 {progression.coins.toLocaleString()}</b>
        </div>

        {/* Wheel Container */}
        <div className="wheel-stage">
          {/* Top Pointer Needle */}
          <div className="wheel-pointer">
            <svg viewBox="0 0 40 40" width="36" height="36">
              <path
                d="M 20 38 L 8 10 A 12 12 0 1 1 32 10 Z"
                fill="#f59e0b"
                stroke="#78350f"
                strokeWidth="2.5"
                filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"
              />
              <circle cx="20" cy="14" r="5" fill="#fef08a" />
            </svg>
          </div>

          {/* Rotating Wheel Disk */}
          <div
            className="wheel-disk"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning
                ? "transform 3.8s cubic-bezier(0.12, 0.85, 0.15, 1)"
                : "none",
            }}
          >
            <svg viewBox="0 0 400 400" className="wheel-svg">
              <defs>
                <filter id="wheelShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.45" />
                </filter>
                <radialGradient id="hubGrad" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="60%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#78350f" />
                </radialGradient>
              </defs>

              {/* Outer Golden Rim */}
              <circle cx="200" cy="200" r="195" fill="#78350f" filter="url(#wheelShadow)" />
              <circle cx="200" cy="200" r="188" fill="#d97706" stroke="#fef08a" strokeWidth="4" />

              {/* Decorative Perimeter Lights / Pegs */}
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i * 360) / 24;
                const rad = (angle * Math.PI) / 180;
                const cx = 200 + 191 * Math.cos(rad);
                const cy = 200 + 191 * Math.sin(rad);
                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r="3.5"
                    fill={i % 2 === 0 ? "#fef08a" : "#ffffff"}
                    stroke="#78350f"
                    strokeWidth="1"
                  />
                );
              })}

              {/* 8 Colored Wheel Slices */}
              {WHEEL_PRIZES.map((prize, i) => {
                const startAngle = i * SLICE_DEGREE - 90;
                const endAngle = (i + 1) * SLICE_DEGREE - 90;
                const r = 184;

                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;

                const x1 = 200 + r * Math.cos(startRad);
                const y1 = 200 + r * Math.sin(startRad);
                const x2 = 200 + r * Math.cos(endRad);
                const y2 = 200 + r * Math.sin(endRad);

                const midAngle = (startAngle + endAngle) / 2;
                const midRad = (midAngle * Math.PI) / 180;
                const textR = 125;
                const tx = 200 + textR * Math.cos(midRad);
                const ty = 200 + textR * Math.sin(midRad);

                return (
                  <g key={i}>
                    {/* Wedge Slice */}
                    <path
                      d={`M 200 200 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                      fill={prize.color}
                      stroke="#fef08a"
                      strokeWidth="2.5"
                    />

                    {/* Text Label */}
                    <text
                      x={tx}
                      y={ty}
                      fill={prize.text}
                      fontSize="14"
                      fontWeight="900"
                      fontFamily="'Fredoka', sans-serif"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${midAngle + 90}, ${tx}, ${ty})`}
                      style={{
                        textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {prize.label}
                    </text>
                  </g>
                );
              })}

              {/* Center Hub */}
              <circle cx="200" cy="200" r="38" fill="url(#hubGrad)" stroke="#451a03" strokeWidth="3" />
              <circle cx="200" cy="200" r="28" fill="#451a03" />
              <circle cx="200" cy="200" r="22" fill="#eab308" />
              <text
                x="200"
                y="204"
                fill="#78350f"
                fontSize="12"
                fontWeight="900"
                textAnchor="middle"
              >
                APNA
              </text>
            </svg>
          </div>
        </div>

        {/* Won Banner Celebration */}
        {wonPrize && (
          <div className="wheel-win-alert">
            <span className="win-sparkle">🎉</span>
            <b>+{wonPrize.label} Coins Won!</b>
            <p>Added to your coin balance. Go win some matches!</p>
          </div>
        )}

        {/* Action Button / Countdown */}
        <div className="wheel-action-section">
          {canSpin || progression.coins < 200 ? (
            <button
              className="wheel-spin-btn"
              onClick={handleSpin}
              disabled={isSpinning}
            >
              {isSpinning ? "SPINNING..." : "SPIN FOR FREE! 🎲"}
            </button>
          ) : (
            <div className="wheel-cooldown-badge">
              <span className="timer-icon">⏳</span>
              <div>
                <span>Next Free Spin In:</span>
                <b>{formatTime(timeLeft)}</b>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
