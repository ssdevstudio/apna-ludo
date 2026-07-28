import { RoomSnapshot } from "@apna-ludo/shared";
import { tr } from "../../utils/i18n";
import { PlayerRankItem } from "../game/PlayerCard";

export function VictoryModal({
  snapshot,
  playerId,
  iWon,
  myAvatar,
  onRematch,
  onLeave
}: {
  snapshot: RoomSnapshot | null;
  playerId: string | null;
  iWon: boolean;
  myAvatar: string;
  onRematch: () => void;
  onLeave: () => void;
}) {
  const winners = snapshot?.game?.winners ?? [];
  return (
    <div className="modal-backdrop">
      <div className="confetti" style={{left:"10%", animationDelay:"0s"}}/>
      <div className="confetti" style={{left:"30%", animationDelay:"0.2s"}}/>
      <div className="confetti" style={{left:"50%", animationDelay:"0.5s"}}/>
      <div className="confetti" style={{left:"70%", animationDelay:"0.1s"}}/>
      <div className="confetti" style={{left:"90%", animationDelay:"0.4s"}}/>
      <div className="game-over" role="dialog" aria-modal="true">
        <div className="winner-burst" aria-hidden><span>✦</span><b>★</b><span>✦</span></div>
        <p className="section-kicker">{tr("game.over")}</p>
        <h2>{iWon?tr("win.msg"):tr("lose.msg")}</h2>
        <p>All tokens home. Time for another round?</p>
        <ol>
          {snapshot?.game?.players.slice().sort((a,b)=>{
            const aW = winners.indexOf(a.id);
            const bW = winners.indexOf(b.id);
            const aRank = aW !== -1 ? aW : 999;
            const bRank = bW !== -1 ? bW : 999;
            if (aRank !== bRank) return aRank - bRank;
            const aHome = a.tokens.filter(t => t.progress === 57).length;
            const bHome = b.tokens.filter(t => t.progress === 57).length;
            return bHome - aHome;
          }).map((p,i)=><PlayerRankItem key={p.id} p={p} i={i} winners={winners} playerId={playerId} avatar={myAvatar} />)}
        </ol>
        <div style={{display:'flex',gap:10,marginTop:20}}>
          <button className="primary-button wide" onClick={onRematch}>Rematch <span>↻</span></button>
          <button className="text-button wide" onClick={onLeave} style={{background:'rgba(0,0,0,0.05)',padding:'12px',borderRadius:'8px',fontWeight:'bold',color:'#333'}}>Home <span>🏠</span></button>
        </div>
      </div>
    </div>
  );
}
