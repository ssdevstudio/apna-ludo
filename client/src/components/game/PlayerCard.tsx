import { GamePlayer, RoomPlayerSnapshot, PlayerColor } from "@apna-ludo/shared";
import { Die } from "./Dice";
import { tr } from "../../utils/i18n";
import { COLOR_HEX } from "../../utils/constants";

export function PlayerCorner({
  player,
  position,
  isActive,
  diceValue,
  isRolling,
  canRoll,
  canMove,
  onRoll,
  avatar
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
      <div className="corner-dice">
        <button 
          className="corner-roll-btn" 
          onClick={onRoll} 
          disabled={!canRoll && !canMove}
        >
          <Die value={diceValue ?? 1} rolling={isRolling} />
        </button>
        {isActive && canRoll && <div className="turn-indicator">←</div>}
      </div>
    </div>
  );
}

export function PlayerSeat({ player, active, avatar }: { player?:RoomPlayerSnapshot; active?:boolean; avatar?:string }) {
  if (!player) return <div className="player-seat empty-seat"><span>+</span><div><b>Open seat</b><small>Waiting for player</small></div></div>;
  return <div className={`player-seat seat-${player.color} ${active?"active-seat":""}`}>
    <span className="avatar" style={{background:COLOR_HEX[player.color]}}>{(player as any).isBot?"🤖":avatar??player.name[0]}</span>
    <div><b>{player.name}{player.isHost&&<sup> HOST</sup>}</b><small>{player.connected?player.ready?tr("ready"):tr("unready"):tr("reconnecting")}</small></div>
    {active&&<span className="turn-pip">TURN</span>}
  </div>;
}

export function renderPlayerRank(p: GamePlayer, i: number, winners: string[], playerId: string | null, avatar: string) {
  const homeCount = p.tokens.filter((t: any)=>t.progress===57).length;
  const isBot = p.id.startsWith("bot-");
  const av = isBot ? "🤖" : avatar;
  const stat = p.status==="won" ? "🏆 Finished" : p.status==="forfeited" ? "Forfeited" : homeCount + " home";
  return <li key={p.id}><b>{i+1}</b><span className="avatar" style={{background:COLOR_HEX[p.color as PlayerColor]}}>{av}</span><strong>{p.name}{isBot?" 🤖":""}{p.id===playerId?" (You)":""}</strong><small>{stat}</small></li>;
}
