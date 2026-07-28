import { useEffect, useRef, useState } from "react";
import { GameState, PlayerColor, CELL_COUNT, STAR_CELLS, SAFE_CELLS, cellType, YARD_POSITIONS, progressToCellIndex } from "@apna-ludo/shared";
import { playSound } from "../../utils/audio";

const TokenSvg = ({ color }: { color: string }) => {
  const colorMap = {
    red: { main: '#F40000', dark: '#8A0000', highlight: '#FF6B6B' },
    green: { main: '#008B00', dark: '#004A00', highlight: '#33FF33' },
    yellow: { main: '#FFD700', dark: '#997A00', highlight: '#FFFF66' },
    blue: { main: '#007BFF', dark: '#004499', highlight: '#66B2FF' },
  };
  const c = colorMap[color as keyof typeof colorMap] || colorMap.red;

  return (
    <svg viewBox="0 0 100 140" style={{ width: '100%', height: '100%', overflow: 'visible', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }} preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="baseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4a1811" />
          <stop offset="100%" stopColor="#2a0805" />
        </linearGradient>
        
        <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#f0f0f0" />
          <stop offset="80%" stopColor="#cccccc" />
          <stop offset="100%" stopColor="#999999" />
        </linearGradient>
        
        <radialGradient id="bodyBevel" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
        </radialGradient>

        <radialGradient id={`colorGrad-${color}`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor={c.highlight} />
          <stop offset="50%" stopColor={c.main} />
          <stop offset="100%" stopColor={c.dark} />
        </radialGradient>
        
        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.4" />
        </filter>
        <filter id="innerShadow">
          <feOffset dx="0" dy="2"/>
          <feGaussianBlur stdDeviation="1.5" result="offset-blur"/>
          <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
          <feFlood floodColor="black" floodOpacity="0.6" result="color"/>
          <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
          <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
        </filter>
      </defs>

      <ellipse cx="50" cy="125" rx="20" ry="8" fill="url(#baseGrad)" filter="url(#dropShadow)" />
      <ellipse cx="50" cy="123" rx="14" ry="5" fill="#1a0502" />

      <path 
        d="M 15.5 66.2 A 40 40 0 1 1 84.5 66.2 L 54 122 Q 50 130 46 122 Z" 
        fill="url(#silverGrad)" 
        stroke="#666"
        strokeWidth="0.5"
        filter="url(#dropShadow)"
      />
      <path 
        d="M 15.5 66.2 A 40 40 0 1 1 84.5 66.2 L 54 122 Q 50 130 46 122 Z" 
        fill="url(#bodyBevel)" 
      />

      <circle cx="50" cy="46" r="22" fill={`url(#colorGrad-${color})`} filter="url(#innerShadow)" />
      <circle cx="50" cy="46" r="22" fill="none" stroke="#222" strokeWidth="1" opacity="0.4" />
      
      <ellipse cx="50" cy="33" rx="12" ry="5" fill="rgba(255,255,255,0.75)" transform="rotate(-15 50 33)" />
      <path d="M 18 46 A 32 32 0 0 1 50 14 A 32 32 0 0 0 24 50 Z" fill="rgba(255,255,255,0.6)" />
    </svg>
  );
};

export const COLOR_HEX: Record<PlayerColor, string> = { red: '#F40000', green: '#008B00', yellow: '#FFD700', blue: '#007BFF' };

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
    red: [{ left: '13.333%', top: '73.333%' }, { left: '26.666%', top: '73.333%' }, { left: '13.333%', top: '86.666%' }, { left: '26.666%', top: '86.666%' }],
    green: [{ left: '13.333%', top: '13.333%' }, { left: '26.666%', top: '13.333%' }, { left: '13.333%', top: '26.666%' }, { left: '26.666%', top: '26.666%' }],
    yellow: [{ left: '73.333%', top: '13.333%' }, { left: '86.666%', top: '13.333%' }, { left: '73.333%', top: '26.666%' }, { left: '86.666%', top: '26.666%' }],
    blue: [{ left: '73.333%', top: '73.333%' }, { left: '86.666%', top: '73.333%' }, { left: '73.333%', top: '86.666%' }, { left: '86.666%', top: '86.666%' }],
  };

  const getTrackTokenStyle = (index: number, count: number): React.CSSProperties => {
    if (count === 1) return { transform: `translate(-50%, -90%) rotate(-${boardRotation}deg)` };
    const offsets = count === 2 ? [[-4, 0], [4, 0]] : count === 3 ? [[-6, -2], [6, -2], [0, 2]] : [[-8, -3], [8, -3], [-4, 3], [4, 3]];
    const angles = count === 2 ? [-15, 15] : count === 3 ? [-22, 22, 0] : [-28, 28, -10, 10];
    const [ox, oy] = offsets[index % offsets.length] ?? [0, 0];
    const ang = angles[index % angles.length] ?? 0;
    return { transform: `translate(calc(-50% + ${ox}%), calc(-90% + ${oy}%)) scale(${count === 1 ? 1 : count === 2 ? 0.85 : count === 3 ? 0.75 : 0.65}) rotate(calc(-${boardRotation}deg + ${ang}deg))` };
  };

  const allTokens:{id:string;color:PlayerColor;progress:number;ordinal:number}[]=[];
  for(const p of game.players)for(let idx=0;idx<p.tokens.length;idx++)allTokens.push({id:p.tokens[idx]!.id,color:p.color,progress:visualProgressRef.current[p.tokens[idx]!.id] ?? p.tokens[idx]!.progress,ordinal:idx+1});

  return <div className="board-shell" style={{ transform: `rotate(${boardRotation}deg)`, transition: 'transform 0.5s ease-in-out' }}>
    <div className="ludo-board" role="grid" aria-label="15 by 15 Ludo board">
    {footprints.map(f => (
      <div key={f.id} className="footprint-anim" style={{ position: 'absolute', top: f.top, left: f.left, transform: 'translate(-50%, -50%)', zIndex: 6, width: '24px', height: '24px', pointerEvents: 'none', backgroundColor: 'white', borderRadius: '50%', opacity: 0.6, boxShadow: `0 0 4px var(--${f.color}), inset 0 0 4px var(--${f.color})`, animation: 'footprintFade 0.6s ease-out forwards' }} />
    ))}
    {game.players.map(p => {
      if (game.currentPlayerId !== p.id) return null;
      const blinkStyle: React.CSSProperties = { position: 'absolute', width: '40%', height: '40%', zIndex: 10, pointerEvents: 'none', borderRadius: '12px' };
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
      let top, left, transform;
      if (isYard) {
        const pos = YARD_CIRCLE_COORDS[t.color][t.ordinal - 1];
        top = pos?.top; left = pos?.left;
        transform = `translate(-50%, -90%) rotate(-${boardRotation}deg)`;
      } else {
        const idx = tokenCellIndex(t.color, t.progress, t.ordinal - 1) ?? 0;
        top = `${(Math.floor(idx / 15) + 0.5) * (100 / 15)}%`;
        left = `${(idx % 15 + 0.5) * (100 / 15)}%`;
        const tokensHere = allTokens.filter(x => x.progress >= 0 && tokenCellIndex(x.color, x.progress, x.ordinal - 1) === idx);
        const styleObj = getTrackTokenStyle(tokensHere.findIndex(x => x.id === t.id), tokensHere.length);
        transform = styleObj.transform;
      }
      const isLegalToken = legalTokens.includes(t.id) && me?.tokens.some(mt => mt.id === t.id);
      const innerClass = `game-pawn-inner ${tokenAnimation===t.id ? "pawn--animate token-hop" : ""}`;
      const style: React.CSSProperties = { position: 'absolute', top, left, transform, transition: 'top 0.25s linear, left 0.25s linear, transform 0.25s linear', zIndex: isYard ? 5 : 10 + (allTokens.filter(x => x.progress >= 0 && tokenCellIndex(x.color, x.progress, x.ordinal - 1) === (isYard ? -1 : tokenCellIndex(t.color, t.progress, t.ordinal - 1) ?? 0)).findIndex(x => x.id === t.id)), width: 'clamp(20px,2.8vw,36px)', height: 'clamp(26px,3.6vw,46px)', '--token-color': COLOR_HEX[t.color] } as any;
      if(isLegalToken) {
        return (
          <button key={t.id} style={style} className="game-pawn-wrapper legal-token" onClick={()=>onMove(t.id)} aria-label={`Move ${t.color} token`}>
            <span className={innerClass}><TokenSvg color={t.color} /></span>
          </button>
        );
      }
      return (
        <div key={t.id} style={style} className="game-pawn-wrapper" aria-label={`${t.color} token`}>
          <div className={innerClass}><TokenSvg color={t.color} /></div>
        </div>
      );
    })}
  </div>
</div>;
}
