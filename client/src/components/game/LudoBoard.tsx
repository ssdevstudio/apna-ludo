import { useEffect, useRef, useState, Fragment } from "react";
import { GameState, PlayerColor, CELL_COUNT, STAR_CELLS, SAFE_CELLS, cellType, YARD_POSITIONS, progressToCellIndex } from "@apna-ludo/shared";
import { playSound } from "../../utils/audio";

export const TokenSvg = ({ color }: { color: string }) => {
  const colorMap = {
    red: { main: '#c13535', dark: '#7a1c1c', highlight: '#e06565' },
    green: { main: '#238352', dark: '#12452a', highlight: '#48b878' },
    yellow: { main: '#c9942a', dark: '#7a5a12', highlight: '#e8b84a' },
    blue: { main: '#1f6eb0', dark: '#0e3d64', highlight: '#4a94d4' },
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

export const COLOR_HEX: Record<PlayerColor, string> = { red: '#c13535', green: '#238352', yellow: '#c9942a', blue: '#1f6eb0' };

const STAR_CELLS_SET=new Set(STAR_CELLS);
const SAFE_CELLS_SET=new Set(SAFE_CELLS);

/**
 * Positions tokens precisely inside their respective color triangle
 * in the center 3x3 region of the 15x15 Ludo board (Ludo King style).
 */
export function getHomeTriangleCoords(color: PlayerColor, index: number, total: number): { left: string; top: string } {
  if (color === 'red') {
    // Red: Bottom triangle pointing UP into center (50%, 50%)
    if (total <= 1) return { left: '50%', top: '56.5%' };
    if (total === 2) return index === 0 ? { left: '46.5%', top: '57%' } : { left: '53.5%', top: '57%' };
    if (total === 3) {
      if (index === 0) return { left: '45%', top: '58%' };
      if (index === 1) return { left: '55%', top: '58%' };
      return { left: '50%', top: '54%' };
    }
    const slots = [
      { left: '44%', top: '58%' },
      { left: '56%', top: '58%' },
      { left: '47%', top: '54%' },
      { left: '53%', top: '54%' },
    ];
    return slots[index % 4] ?? { left: '50%', top: '56.5%' };
  }
  if (color === 'yellow') {
    // Yellow: Top triangle pointing DOWN into center (50%, 50%)
    if (total <= 1) return { left: '50%', top: '43.5%' };
    if (total === 2) return index === 0 ? { left: '46.5%', top: '43%' } : { left: '53.5%', top: '43%' };
    if (total === 3) {
      if (index === 0) return { left: '45%', top: '42%' };
      if (index === 1) return { left: '55%', top: '42%' };
      return { left: '50%', top: '46%' };
    }
    const slots = [
      { left: '44%', top: '42%' },
      { left: '56%', top: '42%' },
      { left: '47%', top: '46%' },
      { left: '53%', top: '46%' },
    ];
    return slots[index % 4] ?? { left: '50%', top: '43.5%' };
  }
  if (color === 'green') {
    // Green: Left triangle pointing RIGHT into center (50%, 50%)
    if (total <= 1) return { left: '43.5%', top: '50%' };
    if (total === 2) return index === 0 ? { left: '43%', top: '46.5%' } : { left: '43%', top: '53.5%' };
    if (total === 3) {
      if (index === 0) return { left: '42%', top: '45%' };
      if (index === 1) return { left: '42%', top: '55%' };
      return { left: '46%', top: '50%' };
    }
    const slots = [
      { left: '42%', top: '44%' },
      { left: '42%', top: '56%' },
      { left: '46%', top: '47%' },
      { left: '46%', top: '53%' },
    ];
    return slots[index % 4] ?? { left: '43.5%', top: '50%' };
  }
  // blue: Right triangle pointing LEFT into center (50%, 50%)
  if (total <= 1) return { left: '56.5%', top: '50%' };
  if (total === 2) return index === 0 ? { left: '57%', top: '46.5%' } : { left: '57%', top: '53.5%' };
  if (total === 3) {
    if (index === 0) return { left: '58%', top: '45%' };
    if (index === 1) return { left: '58%', top: '55%' };
    return { left: '54%', top: '50%' };
  }
  const slots = [
    { left: '58%', top: '44%' },
    { left: '58%', top: '56%' },
    { left: '54%', top: '47%' },
    { left: '54%', top: '53%' },
  ];
  return slots[index % 4] ?? { left: '56.5%', top: '50%' };
}

function tokenCellIndex(color:PlayerColor,progress:number,tokenIdx=0):number|null{
  if(progress===-1){ return YARD_POSITIONS[color]?.[tokenIdx]??null; }
  return progressToCellIndex(color,progress);
}

export function LudoBoard({game,myPlayerId,legalTokens,onMove,tokenAnimation,boardRotation=0,activeTokenId,onCapture}:{game:GameState;myPlayerId:string|null;legalTokens:string[];onMove:(id:string)=>void;tokenAnimation:string|null;boardRotation?:number;activeTokenId?: string | null; onCapture?: () => void;}){
  const me=game.players.find(p=>p.id===myPlayerId);
  const visualProgressRef = useRef<Record<string, number>>({});
  const [, setForceRender] = useState(0);
  const [footprints, setFootprints] = useState<{id:string;color:PlayerColor;top:string;left:string}[]>([]);
  const [capturedFlyingIds, setCapturedFlyingIds] = useState<Set<string>>(new Set());
  const [captureBursts, setCaptureBursts] = useState<{id:string;top:string;left:string;color:PlayerColor}[]>([]);
  const [captureBanner, setCaptureBanner] = useState<{id:string;text:string}|null>(null);
  const [justPocketedId, setJustPocketedId] = useState<string|null>(null);
  const [homeCelebrationBanner, setHomeCelebrationBanner] = useState<{id:string;text:string;color:PlayerColor}|null>(null);
  const [homeConfetti, setHomeConfetti] = useState<{id:string;top:string;left:string;dx:number;dy:number;rot:number;color:string;size:number;symbol:string}[]>([]);

  useEffect(() => {
    const tokensToAnimate:{id:string;color:PlayerColor;start:number;end:number}[] = [];
    const tokensToCapture:{id:string;color:PlayerColor}[] = [];
    let instantChange = false;

    game.players.forEach(p => p.tokens.forEach(t => {
      let current = visualProgressRef.current[t.id];
      if (current === undefined) {
        current = t.progress;
        visualProgressRef.current[t.id] = t.progress;
      }

      if (current !== t.progress && current !== -1 && t.progress !== -1 && t.progress > current) {
        tokensToAnimate.push({id: t.id, color: p.color, start: current, end: t.progress});
      } else if (current !== -1 && t.progress === -1) {
        tokensToCapture.push({id: t.id, color: p.color});
      } else if (current !== t.progress) {
        visualProgressRef.current[t.id] = t.progress;
        instantChange = true;
      }
    }));

    if (instantChange && tokensToAnimate.length === 0 && tokensToCapture.length === 0) {
      setForceRender(x => x + 1);
    }

    const triggerCapture = (toCapture: {id:string;color:PlayerColor}[]) => {
      toCapture.forEach(cap => {
        const prevProg = visualProgressRef.current[cap.id];
        if (prevProg !== undefined && prevProg >= 0) {
          const cellIdx = tokenCellIndex(cap.color, prevProg) ?? 0;
          const r = Math.floor(cellIdx / 15);
          const c = cellIdx % 15;
          const top = `${(r + 0.5) * (100 / 15)}%`;
          const left = `${(c + 0.5) * (100 / 15)}%`;
          const burstId = Math.random().toString();
          setCaptureBursts(prev => [...prev, { id: burstId, top, left, color: cap.color }]);
          setTimeout(() => {
            setCaptureBursts(prev => prev.filter(b => b.id !== burstId));
          }, 600);
        }
        setCapturedFlyingIds(prev => new Set(prev).add(cap.id));
        visualProgressRef.current[cap.id] = -1;
        setTimeout(() => {
          setCapturedFlyingIds(prev => {
            const next = new Set(prev);
            next.delete(cap.id);
            return next;
          });
        }, 600);
      });
      // Knockout celebration banner & punchy sound
      setCaptureBanner({ id: Math.random().toString(), text: "💥 KNOCKOUT! +1 EXTRA ROLL 🎲" });
      setTimeout(() => setCaptureBanner(null), 1800);
      playSound("capture");
      if (onCapture) onCapture();
      setForceRender(x => x + 1);
    };

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

          // If reached center home (progress 56 / pil jana)
          if (step === 56) {
            playSound("home");
            setJustPocketedId(t.id);
            setTimeout(() => setJustPocketedId(null), 1400);

            setHomeCelebrationBanner({
              id: Math.random().toString(),
              text: "🎉 HOME! +1 BONUS ROLL 🎲",
              color: t.color,
            });
            setTimeout(() => setHomeCelebrationBanner(null), 2000);

            // Generate 16 radial celebration confetti particles
            const symbols = ["✨", "⭐", "🎉", "🌟", "🪙"];
            const colors = [COLOR_HEX[t.color], "#ffd700", "#ffffff", "#f59e0b", "#38bdf8"];
            const particles = Array.from({ length: 16 }).map((_, i) => {
              const angle = (i / 16) * 2 * Math.PI;
              const dist = 40 + Math.random() * 55;
              return {
                id: Math.random().toString(),
                top: "50%",
                left: "50%",
                dx: Math.cos(angle) * dist,
                dy: Math.sin(angle) * dist,
                rot: (Math.random() - 0.5) * 360,
                color: colors[i % colors.length]!,
                size: 14 + Math.floor(Math.random() * 12),
                symbol: symbols[i % symbols.length]!,
              };
            });
            setHomeConfetti(particles);
            setTimeout(() => setHomeConfetti([]), 1400);
          } else {
            playSound("move");
          }
        } else {
          clearInterval(interval);
          if (tokensToCapture.length > 0) {
            triggerCapture(tokensToCapture);
          }
        }
      }, 150);
      return () => clearInterval(interval);
    } else if (tokensToCapture.length > 0) {
      triggerCapture(tokensToCapture);
    }
  }, [game]);

  const YARD_CIRCLE_COORDS: Record<PlayerColor, { left: string, top: string }[]> = {
    red: [{ left: '13.48%', top: '73.52%' }, { left: '26.35%', top: '73.52%' }, { left: '13.48%', top: '86.40%' }, { left: '26.35%', top: '86.40%' }],
    green: [{ left: '13.48%', top: '13.47%' }, { left: '26.35%', top: '13.47%' }, { left: '13.48%', top: '26.35%' }, { left: '26.35%', top: '26.35%' }],
    yellow: [{ left: '73.52%', top: '13.47%' }, { left: '86.40%', top: '13.47%' }, { left: '73.52%', top: '26.35%' }, { left: '86.40%', top: '26.35%' }],
    blue: [{ left: '73.52%', top: '73.52%' }, { left: '86.40%', top: '73.52%' }, { left: '73.52%', top: '86.40%' }, { left: '86.40%', top: '86.40%' }],
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
    {captureBursts.map(b => (
      <div key={b.id} className="capture-burst-anim" style={{ position: 'absolute', top: b.top, left: b.left, transform: 'translate(-50%, -50%)', zIndex: 35, pointerEvents: 'none' }}>
        <span className="burst-sparkle">💥</span>
      </div>
    ))}

    {/* Knockout Floating Toast Banner */}
    {captureBanner && (
      <div className="capture-event-banner" style={{ transform: `translate(-50%, -50%) rotate(-${boardRotation}deg)` }}>
        <span>{captureBanner.text}</span>
      </div>
    )}

    {/* Home Pocket Celebration Banner & Confetti Particles */}
    {homeCelebrationBanner && (
      <div className={`home-pocket-banner banner-color-${homeCelebrationBanner.color}`} style={{ transform: `translate(-50%, -50%) rotate(-${boardRotation}deg)` }}>
        <div className="home-banner-sparkle">⭐</div>
        <div className="home-banner-text-box">
          <span className="home-banner-main">HOME!</span>
          <span className="home-banner-sub">+1 EXTRA ROLL 🎲</span>
        </div>
        <div className="home-banner-sparkle">⭐</div>
      </div>
    )}

    {homeConfetti.map(c => (
      <span
        key={c.id}
        className="home-confetti-particle"
        style={{
          top: c.top,
          left: c.left,
          color: c.color,
          fontSize: `${c.size}px`,
          ['--p-dx' as any]: `${c.dx}px`,
          ['--p-dy' as any]: `${c.dy}px`,
          ['--p-rot' as any]: `${c.rot}deg`,
        }}
      >
        {c.symbol}
      </span>
    ))}

    {game.players.map(p => {
      const isCurrent = game.currentPlayerId === p.id;
      const isOut = p.status === "forfeited" || p.status === "timed_out";
      const displayName = p.id === myPlayerId ? (p.name || "You") : p.name;
      const isTop = p.color === 'green' || p.color === 'yellow';

      return (
        <Fragment key={p.id}>
          {isCurrent && !isOut && (
            <div className={`yard-overlay yard-overlay-${p.color} yard-blink-overlay color-${p.color} turn-highlight-border`} />
          )}
          
          <div className={`yard-overlay yard-overlay-${p.color}`}>
            <div 
              className={`yard-name-clean ${isTop ? 'yard-name-top' : 'yard-name-bottom'} ${isCurrent ? 'yard-name--active' : ''}`}
              style={{ transform: `translateX(-50%) rotate(-${boardRotation}deg)` }}
            >
              {displayName}
            </div>
          </div>

          {isOut && (
            <div className={`yard-overlay yard-overlay-${p.color} yard-out-overlay`}>
              <span style={{
                color: 'var(--red)',
                fontSize: 'clamp(20px, 4vw, 36px)',
                fontWeight: 900,
                letterSpacing: '4px',
                textShadow: '0 2px 4px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
                transform: `rotate(-${boardRotation}deg)`,
                fontFamily: '"Fredoka", sans-serif',
                WebkitTextStroke: '1px white'
              }}>
                OUT
              </span>
            </div>
          )}
        </Fragment>
      );
    })}
    {Array.from({length:CELL_COUNT},(_,i)=>{
      const ct=cellType(i);
      const starClass=STAR_CELLS_SET.has(i)?"star-cell":"";
      const safeClass=SAFE_CELLS_SET.has(i)?"safe-cell":"";
      return <div key={i} role="gridcell" className={`board-cell ${ct} ${starClass} ${safeClass}`} />;
    })}
    {allTokens.map((t) => {
      const isYard = t.progress === -1;
      const isHome = t.progress >= 56;
      let top, left, transform;

      if (isYard) {
        const pos = YARD_CIRCLE_COORDS[t.color][t.ordinal - 1];
        top = pos?.top; left = pos?.left;
        transform = `translate(-50%, -90%) rotate(-${boardRotation}deg)`;
      } else if (isHome) {
        const homeColorTokens = allTokens.filter(x => x.color === t.color && x.progress >= 56);
        const homeSlotIdx = homeColorTokens.findIndex(x => x.id === t.id);
        const slot = getHomeTriangleCoords(t.color, homeSlotIdx >= 0 ? homeSlotIdx : 0, homeColorTokens.length);
        top = slot.top;
        left = slot.left;
        transform = `translate(-50%, -90%) scale(0.76) rotate(-${boardRotation}deg)`;
      } else {
        const idx = tokenCellIndex(t.color, t.progress, t.ordinal - 1) ?? 0;
        top = `${(Math.floor(idx / 15) + 0.5) * (100 / 15)}%`;
        left = `${(idx % 15 + 0.5) * (100 / 15)}%`;
        const tokensHere = allTokens.filter(x => x.progress >= 0 && x.progress < 56 && tokenCellIndex(x.color, x.progress, x.ordinal - 1) === idx);
        const styleObj = getTrackTokenStyle(tokensHere.findIndex(x => x.id === t.id), tokensHere.length);
        transform = styleObj.transform;
      }

      const isLegalToken = legalTokens.includes(t.id) && me?.tokens.some(mt => mt.id === t.id);
      const isCapturedFlying = capturedFlyingIds.has(t.id);
      const isJustPocketed = justPocketedId === t.id;
      const isYardBouncing = isYard && isLegalToken && game.dice === 6;

      const innerClass = `game-pawn-inner ${tokenAnimation===t.id ? "pawn--animate token-hop" : ""} ${isCapturedFlying ? "pawn-spin-shrink" : ""} ${isHome ? "pawn--home" : ""} ${isJustPocketed ? "pawn--home-landing" : ""} ${isYardBouncing ? "yard-pawn--bouncing" : ""}`;
      
      const homeColorTokens = isHome ? allTokens.filter(x => x.color === t.color && x.progress >= 56) : [];
      const homeSlotIdx = isHome ? homeColorTokens.findIndex(x => x.id === t.id) : 0;
      const tokensOnTrack = (!isYard && !isHome) ? allTokens.filter(x => x.progress >= 0 && x.progress < 56 && tokenCellIndex(x.color, x.progress, x.ordinal - 1) === (tokenCellIndex(t.color, t.progress, t.ordinal - 1) ?? 0)) : [];
      
      const zIndexVal = isCapturedFlying
        ? 45
        : isJustPocketed
        ? 40
        : isHome
        ? 20 + (homeSlotIdx >= 0 ? homeSlotIdx : 0)
        : isYard
        ? 5
        : 10 + tokensOnTrack.findIndex(x => x.id === t.id);

      const style: React.CSSProperties = {
        position: 'absolute',
        top,
        left,
        transform,
        transition: isCapturedFlying
          ? 'top 0.55s cubic-bezier(0.25, 1, 0.5, 1), left 0.55s cubic-bezier(0.25, 1, 0.5, 1), transform 0.55s ease'
          : 'top 0.25s linear, left 0.25s linear, transform 0.25s linear',
        zIndex: zIndexVal,
        '--token-color': COLOR_HEX[t.color]
      } as any;

      const handleTokenClick = () => {
        if (isYard) {
          playSound("enter");
        }
        onMove(t.id);
      };

      if(isLegalToken) {
        return (
          <button key={t.id} style={style} className="game-pawn-wrapper legal-token" onClick={handleTokenClick} aria-label={`Move ${t.color} token`}>
            {isYardBouncing && <div className="yard-token-ring-pulse" />}
            {isHome && <span className="home-crown-badge">👑</span>}
            <span className={innerClass}><TokenSvg color={t.color} /></span>
          </button>
        );
      }
      return (
        <div key={t.id} style={style} className="game-pawn-wrapper" aria-label={`${t.color} token`}>
          {isYardBouncing && <div className="yard-token-ring-pulse" />}
          {isHome && <span className="home-crown-badge">👑</span>}
          <div className={innerClass}><TokenSvg color={t.color} /></div>
        </div>
      );
    })}
  </div>
</div>;
}
