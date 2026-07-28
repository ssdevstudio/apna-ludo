import { useState } from "react";
import { COLORS } from "../../utils/constants";

export function MiniBoard() {
  const [a,setA]=useState(0);
  return <div className="mini-stage">
    <p className="mini-note">Tap a token. Make the first move.</p>
    <div className="mini-board" aria-label="Interactive miniature Ludo board">
      {COLORS.map((c,i)=><button key={c} aria-label={`Move ${c} token`} className={`mini-home mini-home--${c}`} onClick={()=>setA(i)}>
        <span className={`pawn pawn--${c} ${a===i?"pawn--active":""}`}/>
      </button>)}
      <div className="mini-cross" aria-hidden><span/><span/><span/><span/></div>
      <div className="mini-center" aria-hidden/>
      <span className={`moving-pawn moving-pawn--${COLORS[a]}`} aria-hidden/>
    </div>
    <div className="mini-caption"><span>● LIVE TABLE</span><b>{a+2}</b><span>squares home</span></div>
  </div>;
}
