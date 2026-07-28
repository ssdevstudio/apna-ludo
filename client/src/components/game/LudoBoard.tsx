import { useEffect, useRef, useState } from "react";
import { GameState, PlayerColor, CELL_COUNT, STAR_CELLS, SAFE_CELLS, cellType, YARD_POSITIONS, progressToCellIndex } from "@apna-ludo/shared";
import { playSound } from "../../utils/audio";

const STAR_CELLS_SET=new Set(STAR_CELLS);
const SAFE_CELLS_SET=new Set(SAFE_CELLS);

function tokenCellIndex(color:PlayerColor,progress:number,tokenIdx=0):number|null{
  if(progress===-1){ return YARD_POSITIONS[color]?.[tokenIdx]??null; }
  return progressToCellIndex(color,progress);
}

export function LudoBoard({game,myPlayerId,legalTokens,onMove,tokenAnimation,boardRotation=0}:{game:GameState;myPlayerId:string|null;legalTokens:string[];onMove:(id:string)=>void;tokenAnimation:string|null;boardRotation?:number}){
  const me=game.players.find(p=>p.id===myPlayerId);
  const visualProgressRef = useRef<Record<string, number>>({});
  const [, setForceRender] = useState(0);
  const [footprints, setFootprints] = useState<{id:string;color:PlayerColor;top:string;left:string}[]>([]);

  useEffect(() => {
    const tokensToAnimate:{id:string;color:PlayerColor;start:number;end:number}[] = [];
    let instantChange = false;

    game.players.forEach(p => p.tokens.forEach(t => {
      let current = visualProgressRef.current[t.id];
      if (current === undefined) {
        current = t.progress;
        visualProgressRef.current[t.id] = t.progress;
      }

      if (current !== t.progress && current !== -1 && t.progress !== -1 && t.progress > current) {
        tokensToAnimate.push({id: t.id, color: p.color, start: current, end: t.progress});
      } else if (current !== t.progress) {
        visualProgressRef.current[t.id] = t.progress;
        instantChange = true;
      }
    }));

    if (instantChange && tokensToAnimate.length === 0) {
      setForceRender(x => x + 1);
      if (instantChange) playSound("capture");
    }

    if (tokensToAnimate.length > 0) {
      const t = tokensToAnimate[0]!;
      let step = t.start;
      const interval = setInterval(() => {
        if (step < t.end) {
          step++;
          visualProgressRef.current[t.id] = step;
          
          const cellIdx = tokenCellIndex(t.color, step - 1) ?? 0;
          const r = Math.floor(cellIdx / 15);
          const c = cellIdx % 15;
          const top = `${(r + 0.5) * (100 / 15)}%`;
          const left = `${(c + 0.5) * (100 / 15)}%`;
          setFootprints(prev => [...prev.slice(-4), { id: Math.random().toString(), color: t.color, top, left }]);

          setForceRender(x => x + 1);
          playSound("move");
        } else {
          clearInterval(interval);
        }
      }, 150);
      return () => clearInterval(interval);
    }
  }, [game]);

  const YARD_CIRCLE_COORDS: Record<PlayerColor, { left: string, top: string }[]> = {
    red: [
      { left: '13.333%', top: '73.333%' },
      { left: '26.666%', top: '73.333%' },
      { left: '13.333%', top: '86.666%' },
      { left: '26.666%', top: '86.666%' },
    ],
    green: [
      { left: '13.333%', top: '13.333%' },
      { left: '26.666%', top: '13.333%' },
      { left: '13.333%', top: '26.666%' },
      { left: '26.666%', top: '26.666%' },
    ],
    yellow: [
      { left: '73.333%', top: '13.333%' },
      { left: '86.666%', top: '13.333%' },
      { left: '73.333%', top: '26.666%' },
      { left: '86.666%', top: '26.666%' },
    ],
    blue: [
      { left: '73.333%', top: '73.333%' },
      { left: '86.666%', top: '73.333%' },
      { left: '73.333%', top: '86.666%' },
      { left: '86.666%', top: '86.666%' },
    ],
  };

  const getTrackTokenStyle = (index: number, count: number): React.CSSProperties => {
    if (count === 1) return { transform: `translate(-50%, -80%) rotate(-${boardRotation}deg)` };
    if (count === 2) {
      const offsets = [[-4, 0], [4, 0]];
      const angles = [-15, 15];
      const [ox, oy] = offsets[index] ?? [0, 0];
      const ang = angles[index] ?? 0;
      return { transform: `translate(calc(-50% + ${ox}%), calc(-80% + ${oy}%)) scale(0.85) rotate(calc(-${boardRotation}deg + ${ang}deg))` };
    }
    if (count === 3) {
      const offsets = [[-6, -2], [6, -2], [0, 2]];
      const angles = [-22, 22, 0];
      const [ox, oy] = offsets[index] ?? [0, 0];
      const ang = angles[index] ?? 0;
      return { transform: `translate(calc(-50% + ${ox}%), calc(-80% + ${oy}%)) scale(0.75) rotate(calc(-${boardRotation}deg + ${ang}deg))` };
    }
    const offsets = [[-8, -3], [8, -3], [-4, 3], [4, 3]];
    const angles = [-28, 28, -10, 10];
    const [ox, oy] = offsets[index % 4] ?? [0, 0];
    const ang = angles[index % 4] ?? 0;
    return { transform: `translate(calc(-50% + ${ox}%), calc(-80% + ${oy}%)) scale(0.65) rotate(calc(-${boardRotation}deg + ${ang}deg))` };
  };

  const allTokens:{id:string;color:PlayerColor;progress:number;ordinal:number}[]=[];
  for(const p of game.players)for(let idx=0;idx<p.tokens.length;idx++)allTokens.push({id:p.tokens[idx]!.id,color:p.color,progress:visualProgressRef.current[p.tokens[idx]!.id] ?? p.tokens[idx]!.progress,ordinal:idx+1});

  return <div className="board-shell" style={{ transform: `rotate(${boardRotation}deg)`, transition: 'transform 0.5s ease-in-out' }}>
    <div className="ludo-board" role="grid" aria-label="15 by 15 Ludo board">
    
    {footprints.map(f => (
      <div key={f.id} className="footprint-anim" style={{
        position: 'absolute', top: f.top, left: f.left,
        transform: 'translate(-50%, -50%)', zIndex: 6,
        width: '24px', height: '24px', pointerEvents: 'none',
        backgroundColor: 'white', borderRadius: '50%', opacity: 0.6,
        boxShadow: `0 0 4px var(--${f.color}), inset 0 0 4px var(--${f.color})`,
        animation: 'footprintFade 0.6s ease-out forwards'
      }} />
    ))}

    {game.players.map(p => {
    if (game.currentPlayerId !== p.id) return null;
    const blinkStyle: React.CSSProperties = {
      position: 'absolute', width: '40%', height: '40%', zIndex: 10, pointerEvents: 'none', borderRadius: '12px'
    };
    if (p.color === 'green') { blinkStyle.top = '0'; blinkStyle.left = '0'; }
    else if (p.color === 'yellow') { blinkStyle.top = '0'; blinkStyle.right = '0'; }
    else if (p.color === 'red') { blinkStyle.bottom = '0'; blinkStyle.left = '0'; }
    else if (p.color === 'blue') { blinkStyle.bottom = '0'; blinkStyle.right = '0'; }
    return <div key={p.id} style={blinkStyle} className={`yard-blink-overlay color-${p.color} turn-highlight-border`} />;
  })}
  {Array.from({length:CELL_COUNT},(_,i)=>{
    const ct=cellType(i);
    const starClass=STAR_CELLS_SET.has(i)?"star-cell":"";
    const safeClass=SAFE_CELLS_SET.has(i)?"safe-cell":"";
    return <div key={i} role="gridcell" className={`board-cell ${ct} ${starClass} ${safeClass}`} />;
  })}

  {allTokens.map((t) => {
    const isYard = t.progress === -1;
    let top: string | number | undefined, left: string | number | undefined, transform: string | undefined;

    if (isYard) {
      const pos = YARD_CIRCLE_COORDS[t.color][t.ordinal - 1];
      top = pos?.top;
      left = pos?.left;
      transform = `translate(-50%, -80%) rotate(-${boardRotation}deg)`;
    } else {
      const idx = tokenCellIndex(t.color, t.progress, t.ordinal - 1) ?? 0;
      const r = Math.floor(idx / 15);
      const c = idx % 15;
      top = `${(r + 0.75) * (100 / 15)}%`;
      left = `${(c + 0.5) * (100 / 15)}%`;

      const tokensHere = allTokens.filter(x => x.progress >= 0 && tokenCellIndex(x.color, x.progress, x.ordinal - 1) === idx);
      const stackIdx = tokensHere.findIndex(x => x.id === t.id);
      const styleObj = getTrackTokenStyle(stackIdx, tokensHere.length);
      transform = styleObj.transform;
    }

    const isLegalToken = legalTokens.includes(t.id) && me?.tokens.some(mt => mt.id === t.id);
    const innerClass = `game-pawn-inner pawn-color-${t.color} ${isLegalToken ? "legal-token premium-pulse" : ""} ${tokenAnimation===t.id ? "pawn--animate token-hop" : ""}`;
    
    let zIndex = isYard ? 5 : 10;
    if (!isYard) {
      const tokensHere = allTokens.filter(x => x.progress >= 0 && tokenCellIndex(x.color, x.progress, x.ordinal - 1) === (tokenCellIndex(t.color, t.progress, t.ordinal - 1) ?? 0));
      const stackIdx = tokensHere.findIndex(x => x.id === t.id);
      zIndex = 10 + stackIdx;
    }

    const style: React.CSSProperties = {
      position: 'absolute',
      top,
      left,
      transform,
      transition: 'top 0.25s linear, left 0.25s linear, transform 0.25s linear',
      zIndex,
      width: 'clamp(20px,2.8vw,36px)',
      height: 'clamp(26px,3.6vw,46px)'
    };

    if(isLegalToken) {
      return (
        <button key={t.id} style={style} className="game-pawn-wrapper legal-token" onClick={()=>onMove(t.id)} aria-label={`Move ${t.color} token`}>
          <span className={innerClass}>
            <div style={{ width: '100%', height: '100%' }}>
              <img src={`/token-${t.color}.png`} alt={t.color} draggable={false}/>
            </div>
          </span>
        </button>
      );
    }
    return (
      <div key={t.id} style={style} className="game-pawn-wrapper" aria-label={`${t.color} token`}>
        <div className={innerClass}>
          <div style={{ width: '100%', height: '100%' }}>
            <img src={`/token-${t.color}.png`} alt={t.color} draggable={false}/>
          </div>
        </div>
      </div>
    );
  })}
  <></>
</div></div>;
}
