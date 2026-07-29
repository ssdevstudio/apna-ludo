import { GamePlayer, RoomPlayerSnapshot, PlayerColor, FINISH_PROGRESS } from "@apna-ludo/shared";
import { Die } from "./Dice";
import { tr } from "../../utils/i18n";
import { COLOR_HEX } from "../../utils/constants";

import { PlayerTurnIndicator } from "./PlayerTurnIndicator";

/** Snake-style timer bar — animated depleting bar like Ludo King */
function SnakeTimerBar({ fraction }: { fraction: number }) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  const danger = fraction <= 0.3;
  const warn = fraction <= 0.6 && fraction > 0.3;
  const color = danger ? "var(--red)" : warn ? "var(--yellow)" : "var(--green)";
  return (
    <div className="snake-bar-wrap" aria-hidden="true">
      <div className="snake-bar-fill" style={{ width: `${pct}%`, background: color }}>
        <div className="snake-bar-head" />
      </div>
    </div>
  );
}

export function PlayerCorner({
  player,
  position,
  isActive,
  diceValue,
  isRolling,
  canRoll,
  canMove,
  onRoll,
  avatar,
  skipMsg,
  timeLeft,
  missedCount,
}: {
  player?: GamePlayer | RoomPlayerSnapshot;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  isActive: boolean;
  diceValue: number | null;
  isRolling: boolean;
  canRoll: boolean;
  canMove: boolean;
  onRoll: () => void;
  avatar: string;
  skipMsg?: string;
  timeLeft?: number;
  missedCount?: number;
}) {
  if (!player) {
    return <div className={`player-corner corner-${position} empty`}></div>;
  }

  const isBot = player.id.startsWith("bot-");
  const av = isBot ? "🤖" : avatar;

  return (
    <div className={`player-corner corner-${position} corner-${player.color} ${isActive ? "active" : ""}`}>
      <div className="corner-profile">
        <span className="avatar" style={{ background: COLOR_HEX[player.color as PlayerColor] }}>{av}</span>
        <b>{player.name}</b>
      </div>

      {missedCount !== undefined && (
        <div className="corner-dots-wrap">
          <span className="corner-dots">
            {[0,1,2,3,4].map(i => (
              <span key={i} className={`miss-dot ${i < missedCount ? "miss-dot--red" : "miss-dot--green"}`} />
            ))}
          </span>
        </div>
      )}

      {isActive && timeLeft !== undefined && timeLeft <= 10 && (
        <svg className={`corner-timer-svg ${timeLeft <= 3 ? "timer-danger" : timeLeft <= 6 ? "timer-warn" : ""}`} preserveAspectRatio="none">
          <rect x="0" y="0" width="100%" height="100%" rx="40" pathLength="100" style={{'--timer-pct': (1 - (timeLeft/10)) * 100} as any} />
        </svg>
      )}

      {isActive && (canRoll || canMove) && (
        <PlayerTurnIndicator
          color={player.color as PlayerColor}
          direction={position.includes('left') ? 'right' : 'left'}
        />
      )}

      <div className={`corner-dice ${isActive && (canRoll || canMove || isRolling) ? 'dice-active' : ''}`}>
        <button
          className="corner-roll-btn"
          onClick={onRoll}
          disabled={!canRoll && !canMove}
        >
          <Die value={diceValue ?? 1} rolling={isRolling} />
        </button>
        {skipMsg && <div className="skip-toast">{skipMsg}</div>}
      </div>
    </div>
  );
}

export function PlayerSeat({
  player, active, avatar, timeLeft, missedCount
}: {
  player?:RoomPlayerSnapshot; active?:boolean; avatar?:string;
  timeLeft?:number; missedCount?:number;
}) {
  if (!player) return <div className="player-seat empty-seat"><span>+</span><div><b>Open seat</b><small>Waiting for player</small></div></div>;
  const dots = [0,1,2,3,4].map(i => (
    <span key={i} className={`miss-dot ${missedCount !== undefined && i < missedCount ? "miss-dot--red" : "miss-dot--green"}`} />
  ));
  return <div className={`player-seat seat-${player.color} ${active?"active-seat":""}`}>
    <span className="avatar" style={{background:COLOR_HEX[player.color]}}>
      {(player as any).isBot?"🤖":avatar??player.name[0]}
      {active && timeLeft !== undefined && timeLeft <= 10 && (
        <span className={`timer-outer-ring ${timeLeft <= 3 ? "timer-danger" : timeLeft <= 6 ? "timer-warn" : ""}`} style={{'--timer-pct': `${(timeLeft/10)*100}%`} as any} />
      )}
    </span>
    <div className="seat-info">
      <div className="seat-top">
        <b className="seat-name">{player.name}</b>
        {player.isHost && <sup className="host-badge"> HOST</sup>}
      </div>
      <small>{player.connected ? (player.ready ? tr("ready") : tr("unready")) : tr("reconnecting")}</small>
      <div className="seat-dots">{dots}</div>
    </div>
    {active && <div className="turn-pip-wrap">
      <span className="turn-pip">TURN</span>
    </div>}
  </div>;
}

export function PlayerRankItem({ p, i, winners, playerId, avatar }: { p: GamePlayer, i: number, winners: string[], playerId: string | null, avatar: string }) {
  const homeCount = p.tokens.filter((t: any)=>t.progress===FINISH_PROGRESS).length;
  const isBot = p.id.startsWith("bot-");
  const av = isBot ? "🤖" : avatar;
  const stat = p.status==="won" ? "🏆 Finished" : p.status==="forfeited" ? "Forfeited" : homeCount + " home";
  return <li key={p.id}><b>{i+1}</b><span className="avatar" style={{background:COLOR_HEX[p.color as PlayerColor]}}>{av}</span><strong>{p.name}{isBot?" 🤖":""}{p.id===playerId?" (You)":""}</strong><small>{stat}</small></li>;
}
