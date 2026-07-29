import { GamePlayer, RoomPlayerSnapshot, PlayerColor, FINISH_PROGRESS } from "@apna-ludo/shared";
import { Die } from "./Dice";
import { tr } from "../../utils/i18n";
import { COLOR_HEX } from "../../utils/constants";

import { PlayerTurnIndicator } from "./PlayerTurnIndicator";

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
  skipMsg
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
  const dots = [0,1,2,3,4].map(i => {
    const filled = missedCount !== undefined && i < missedCount;
    return <span key={i} className={`miss-dot ${filled?"miss-dot--red":"miss-dot--green"}`} />;
  });
  return <div className={`player-seat seat-${player.color} ${active?"active-seat":""}`}>
    <span className="avatar" style={{background:COLOR_HEX[player.color]}}>
      {(player as any).isBot?"🤖":avatar??player.name[0]}
      {active && timeLeft !== undefined && timeLeft <= 10 && (
        <span className="timer-ring" style={{
          position:'absolute', inset:-4, borderRadius:'50%', border:`3px solid ${timeLeft <= 3 ? '#e04040' : '#c9942a'}`,
          opacity: 0.8, background:'transparent', boxShadow:`0 0 8px ${timeLeft <= 3 ? '#e04040' : '#c9942a'}`
        }} />
      )}
    </span>
    <div>
      <b><span className="seat-name">{player.name}</span>{player.isHost&&<sup> HOST</sup>}</b>
      <div className="miss-dots-row">{dots}</div>
      <small>{player.connected?player.ready?tr("ready"):tr("unready"):tr("reconnecting")}</small>
    </div>
    {active&&<div className="turn-pip-wrap"><span className="turn-pip">TURN</span>{active && timeLeft !== undefined && <span className="timer-count" style={{color: timeLeft <= 3 ? '#e04040' : 'inherit'}}>{timeLeft}s</span>}</div>}
  </div>;
}

export function PlayerRankItem({ p, i, winners, playerId, avatar }: { p: GamePlayer, i: number, winners: string[], playerId: string | null, avatar: string }) {
  const homeCount = p.tokens.filter((t: any)=>t.progress===FINISH_PROGRESS).length;
  const isBot = p.id.startsWith("bot-");
  const av = isBot ? "🤖" : avatar;
  const stat = p.status==="won" ? "🏆 Finished" : p.status==="forfeited" ? "Forfeited" : homeCount + " home";
  return <li key={p.id}><b>{i+1}</b><span className="avatar" style={{background:COLOR_HEX[p.color as PlayerColor]}}>{av}</span><strong>{p.name}{isBot?" 🤖":""}{p.id===playerId?" (You)":""}</strong><small>{stat}</small></li>;
}
