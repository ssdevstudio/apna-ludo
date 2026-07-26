import { FormEvent, useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { Socket } from "socket.io-client";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import type {
  ClientToServerEvents, ServerToClientEvents, RoomSnapshot, ChatMessage,
  CommandResult, JoinResult, RoomPlayerSnapshot, GameState, PlayerColor,
  GamePlayer, TokenState,
} from "@apna-ludo/shared";
import {
  GRID_SIZE, CELL_COUNT, CENTER_CELL,
  PATH, START_OFFSETS, SAFE_SQUARES, STAR_SQUARES,
  HOME_LANES, YARD_POSITIONS, STAR_CELLS, START_CELLS, SAFE_CELLS,
  cellType, progressToCellIndex,
} from "@apna-ludo/shared";

/* ─── Sound effects ──────────────────────────────────────────── */
const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
let audioCtx: AudioContext | null = null;
function getCtx() { if (!audioCtx) audioCtx = new AudioCtx(); return audioCtx; }
function loadBool(key: string, def: boolean): boolean { try { const v = localStorage.getItem(key); return v === null ? def : v === "true"; } catch { return def; } }
const soundEnabled = { current: loadBool("apna-sound", true) };
function playSound(type: "dice"|"move"|"capture"|"win"|"turn"|"click"|"enter"|"six"|"star") {
  if (!soundEnabled.current) return;
  try {
    const ctx = getCtx();
    const n = ctx.currentTime;
    if (type==="win") {
      // Triumphant fanfare: C5-E5-G5-C6 with chord
      [523.25, 659.25, 783.99, 1046.5].forEach((f,i)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);
        o.frequency.value=f;g.gain.setValueAtTime(.15,n+i*.18);
        g.gain.exponentialRampToValueAtTime(.001,n+i*.18+.25);
        o.start(n+i*.18);o.stop(n+i*.18+.25);
      });
      return;
    }
    if (type==="six") {
      // Bright ding for rolling 6
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);
      o.type="sine";o.frequency.setValueAtTime(880,n);o.frequency.exponentialRampToValueAtTime(1320,n+.12);
      g.gain.setValueAtTime(.15,n);g.gain.exponentialRampToValueAtTime(.001,n+.15);
      o.start(n);o.stop(n+.15);
      return;
    }
    if (type==="star") {
      // Sparkle: quick ascending arpeggio
      [880,1108.73,1318.51,1760].forEach((f,i)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);
        o.frequency.value=f;g.gain.setValueAtTime(.08,n+i*.06);
        g.gain.exponentialRampToValueAtTime(.001,n+i*.06+.1);
        o.start(n+i*.06);o.stop(n+i*.06+.1);
      });
      return;
    }
    // Single-note sounds container
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); gain.gain.setValueAtTime(.12, n);
    gain.gain.exponentialRampToValueAtTime(.001, n+.22);
    if (type==="dice") {
      // Rattle: noise-like multiple clicks
      gain.gain.setValueAtTime(.08,n);
      for(let i=0;i<4;i++){
        const o2=ctx.createOscillator(),g2=ctx.createGain();
        o2.connect(g2);g2.connect(ctx.destination);
        o2.type="triangle";o2.frequency.value=200+Math.random()*600;
        g2.gain.setValueAtTime(.06,n+i*.04);
        g2.gain.exponentialRampToValueAtTime(.001,n+i*.04+.03);
        o2.start(n+i*.04);o2.stop(n+i*.04+.04);
      }
      osc.frequency.setValueAtTime(300,n);osc.frequency.exponentialRampToValueAtTime(1200,n+.15);
      osc.start(n);osc.stop(n+.18);
    }
    else if (type==="move") { osc.frequency.setValueAtTime(500,n); osc.frequency.exponentialRampToValueAtTime(800,n+.08); osc.start(n); osc.stop(n+.1); }
    else if (type==="capture") { osc.type="sawtooth"; osc.frequency.setValueAtTime(400,n); osc.frequency.exponentialRampToValueAtTime(150,n+.25); osc.start(n); osc.stop(n+.3); }
    else if (type==="turn") { osc.frequency.value=660; gain.gain.setValueAtTime(.1,n); gain.gain.exponentialRampToValueAtTime(.001,n+.1); osc.start(n); osc.stop(n+.1); }
    else { osc.frequency.value=800; osc.start(n); osc.stop(n+.05); }
  } catch {}
}

/* ─── i18n ─────────────────────────────────────────────────────── */
function loadLang(): "en"|"hi" { try { const v = localStorage.getItem("apna-lang"); return v === "hi" ? "hi" : "en"; } catch { return "en"; } }
const lang = { current: loadLang() as "en"|"hi" };
const T: Record<string, {en:string,hi:string}> = {
  "your.turn": {en:"Your turn",hi:"आपकी बारी"},
  "roll.dice": {en:"Roll dice",hi:"पासा फेंके"},
  "choose.token": {en:"Choose a token",hi:"मोहरा चुनें"},
  "waiting": {en:"Wait",hi:"प्रतीक्षा करें"},
  "game.active": {en:"GAME ACTIVE",hi:"खेल शुरू"},
  "room.lobby": {en:"ROOM LOBBY",hi:"कमरे में प्रतीक्षा"},
  "opp.turn": {en:"Opponent's turn",hi:"प्रतिद्वंद्वी की बारी"},
  "legal.moves": {en:"Legal moves",hi:"चलने योग्य मोहरे"},
  "roll.the.dice": {en:"Roll the dice",hi:"पासा फेंकें"},
  "win.msg": {en:"You won! 🎉",hi:"आप जीत गए! 🎉"},
  "lose.msg": {en:"You lost!",hi:"आप हार गए!"},
  "game.over": {en:"Game over",hi:"खेल समाप्त"},
  "play.again": {en:"Play again",hi:"फिर से खेलें"},
  "back.home": {en:"Back home",hi:"होम जाएं"},
  "ready": {en:"Ready",hi:"तैयार"},
  "unready": {en:"Unready",hi:"तैयार नहीं"},
  "start.game": {en:"Start game",hi:"खेल शुरू करें"},
  "wait.players": {en:"Waiting for players",hi:"खिलाड़ियों का इंतज़ार"},
  "name.placeholder": {en:"Your name",hi:"आपका नाम"},
  "name.label": {en:"What should friends call you?",hi:"दोस्त आपको क्या बुलाएं?"},
  "quick.play": {en:"Quick Play",hi:"त्वरित खेल"},
  "play.comp": {en:"Play Computer",hi:"कंप्यूटर से खेलें"},
  "create.room": {en:"Create Room",hi:"कमरा बनाएं"},
  "join": {en:"Join",hi:"शामिल हों"},
  "sound": {en:"Sound",hi:"ध्वनि"},
  "settings": {en:"Settings",hi:"सेटिंग्स"},
  "language": {en:"Language",hi:"भाषा"},
  "copy.code": {en:"Copy",hi:"कॉपी करें"},
  "invite": {en:"Invite players",hi:"खिलाड़ियों को बुलाएं"},
  "connected": {en:"Connected",hi:"जुड़े"},
  "disconnected": {en:"Offline",hi:"ऑफलाइन"},
  "reconnecting": {en:"Reconnecting",hi:"पुनः जुड़ रहे"},
};
function tr(k: string) { return T[k]?.[lang.current] ?? k; }

/* ─── socket helper ────────────────────────────────────────── */
function connect(): Socket<ServerToClientEvents, ClientToServerEvents> {
  const s = io({ transports: ["websocket", "polling"] });
  return s;
}

/* ─── types ─────────────────────────────────────────────────── */
type ConnState = "connecting"|"online"|"offline"|"reconnecting";
const COLORS: PlayerColor[] = ["red","green","yellow","blue"];
const COLOR_HEX: Record<PlayerColor,string> = { red:"#DF4C4B", blue:"#3783BA", yellow:"#E7B93F", green:"#3B9C70" };
const AVATARS = ["😀","😎","🤩","🦁","🐯","🐸","🚀","🎯","💎","🔥","🌟","🎲"];

/* ─── Settings Panel ────────────────────────────────────────── */
function SettingsPanel({ onClose }: { onClose:()=>void }) {
  const [snd, setSnd] = useState(soundEnabled.current);
  const [lng, setLng] = useState(lang.current);
  return (
    <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
      <div className="settings-panel" role="dialog" aria-modal="true">
        <button className="close-button" onClick={onClose}>×</button>
        <p className="section-kicker">{tr("settings")}</p>
        <h2>{tr("settings")}</h2>
        <div className="setting-row">
          <span>{tr("sound")}</span>
          <button className={`toggle ${snd?"toggle--on":""}`} onClick={()=>{soundEnabled.current=!soundEnabled.current;setSnd(soundEnabled.current);try{localStorage.setItem("apna-sound",String(soundEnabled.current));}catch{}}}>
          <span className="toggle-knob"/>
        </button>
        </div>
        <div className="setting-row">
          <span>{tr("language")}</span>
          <button className="lang-btn" onClick={()=>{lang.current=lng==="en"?"hi":"en";setLng(lang.current);try{localStorage.setItem("apna-lang",lang.current);}catch{}}}>
            <span className={lng==="en"?"lang-active":""}>EN</span>
            <span className={lng==="hi"?"lang-active":""}>हि</span>
          </button>
        </div>
        <p className="setting-note">Apna Ludo v1.0</p>
      </div>
    </div>
  );
}

/* ─── Logo ──────────────────────────────────────────────────── */
function Logo({ compact=false }: { compact?:boolean }) {
  return <a className={`logo ${compact?"logo--compact":""}`} href="/" aria-label="Apna Ludo home">
    <span className="logo-mark" aria-hidden><i/><i/><i/><i/></span>
    <span><b>APNA</b><em>LUDO</em></span>
  </a>;
}

/* ─── MiniBoard ──────────────────────────────────────────────── */
function MiniBoard() {
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

/* ─── Landing page ──────────────────────────────────────────── */
function Landing() {
  const navigate = useNavigate();
  const [joinOpen,setJoinOpen]=useState(false);
  const [name,setName]=useState(()=>sessionStorage.getItem("apna-player")??"");
  
  const initialCode = new URLSearchParams(window.location.search).get("join") || "";
  const [code,setCode]=useState(initialCode);
  const [error,setError]=useState("");
  const [avatar,setAvatar]=useState(()=>sessionStorage.getItem("apna-avatar")??"😀");
  const [showAvatars,setShowAvatars]=useState(false);
  const [maxPlayers,setMaxPlayers]=useState<2|3|4>(4);
  const [preferredColor,setPreferredColor]=useState<PlayerColor>("red");
  
  // Join flow states
  const [joinStep, setJoinStep] = useState<"code"|"preview">("code");
  const [previewData, setPreviewData] = useState<any>(null);
  const [joinColor, setJoinColor] = useState<PlayerColor>("red");

  useEffect(() => {
    if (initialCode) {
      setJoinOpen(true);
      setJoinStep("code");
    }
  }, [initialCode]);

  const createRoom = async () => {
    if (!name.trim()) return setError("Enter your name first.");
    sessionStorage.setItem("apna-player",name.trim());
    sessionStorage.setItem("apna-avatar",avatar);
    try {
      const r=await fetch("/api/room",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:name.trim(),maxPlayers,color:preferredColor})});
      const d=await r.json();
      if (d.ok) { sessionStorage.setItem(`apna-token-${d.room.code}`,d.reconnectToken);sessionStorage.setItem(`apna-playerid-${d.room.code}`,d.playerId);navigate(`/room/${d.room.code}`); }
      else setError("Failed.");
    } catch { setError("Server unreachable."); }
  };
  const playVsComputer = async () => {
    if (!name.trim()) return setError("Enter your name first.");
    sessionStorage.setItem("apna-player",name.trim());sessionStorage.setItem("apna-avatar",avatar);
    try {
      const r=await fetch("/api/room",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:name.trim(),vsComputer:true,color:preferredColor})});
      const d=await r.json();
      if (d.ok) { sessionStorage.setItem(`apna-token-${d.room.code}`,d.reconnectToken);sessionStorage.setItem(`apna-playerid-${d.room.code}`,d.playerId);navigate(`/room/${d.room.code}`); }
      else setError("Failed.");
    } catch { setError("Server unreachable."); }
  };

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Enter your name.");
    const r = code.trim().toUpperCase();
    if (!r) return setError("Enter room code.");
    try {
      const res = await fetch(`/api/room/${r}/preview`);
      const data = await res.json();
      if (data.ok) {
        if (data.phase !== "lobby") return setError("Game already started.");
        if (data.currentPlayers >= data.maxPlayers) return setError("Room is full.");
        setPreviewData(data);
        const available = COLORS.find(c => !data.usedColors.includes(c));
        if (available) setJoinColor(available);
        setJoinStep("preview");
        setError("");
      } else {
        setError(data.error === "ROOM_NOT_FOUND" ? "Room not found." : "Failed to fetch room.");
      }
    } catch { setError("Server unreachable."); }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const r = code.trim().toUpperCase();
    sessionStorage.setItem("apna-player",name.trim());
    sessionStorage.setItem("apna-avatar",avatar);
    sessionStorage.setItem(`apna-join-color-${r}`, joinColor);
    sessionStorage.removeItem(`apna-token-${r}`);
    sessionStorage.removeItem(`apna-playerid-${r}`);
    navigate(`/room/${r}`);
  };

  return <main className="landing">
    <nav className="landing-nav"><Logo/><div className="nav-links"><a href="#how">How it works</a><a href="#why">Why Apna?</a></div>
      <button className="text-button" onClick={()=>{setJoinOpen(true);setJoinStep("code");}}>Join a room <span>↗</span></button>
    </nav>
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow"><span/> Your room. Your rules.</p>
        <h1>Game night,<br/><em>ghar jaisi.</em></h1>
        <p className="hero-lede">Private Ludo rooms for the people who make every win sweeter — and every loss louder.</p>
        <form className="play-card">
          <label>{tr("name.label")}</label>
          <div className="name-row">
            <button type="button" className="avatar-picker" onClick={()=>setShowAvatars(!showAvatars)} title="Pick avatar">{avatar}</button>
            <input value={name} onChange={e=>{setName(e.target.value);setError("")}} placeholder={tr("name.placeholder")} maxLength={20} autoComplete="nickname"/>
          </div>
          {showAvatars && <div className="avatar-grid">{AVATARS.map(a=><button key={a} className={avatar===a?"avatar-selected":""} onClick={()=>{setAvatar(a);setShowAvatars(false)}}>{a}</button>)}</div>}
          
          <div style={{display:"flex",gap:"16px",marginTop:"12px"}}>
            <div style={{flex:1}}>
              <label style={{fontSize:"12px",marginBottom:"4px",display:"block"}}>Players</label>
              <div className="player-count-picker">
                {[2,3,4].map(n=>(
                  <button key={n} type="button" className={maxPlayers===n?"active":""} onClick={()=>setMaxPlayers(n as any)}>{n}</button>
                ))}
              </div>
            </div>
            <div style={{flex:1}}>
              <label style={{fontSize:"12px",marginBottom:"4px",display:"block"}}>Color</label>
              <div className="color-picker-row">
                {COLORS.map(c=>(
                  <button key={c} type="button" className={`color-btn ${c} ${preferredColor===c?"active":""}`} onClick={()=>setPreferredColor(c)}/>
                ))}
              </div>
            </div>
          </div>
          
          <div className="name-row" style={{marginTop:"16px"}}>
            <button className="primary-button wide" type="button" onClick={createRoom}>{tr("create.room")} <span>→</span></button>
          </div>
          
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="button" className="join-inline" onClick={()=>{setJoinOpen(true);setJoinStep("code");}}>Already have a room code? <b>Join here</b></button>
        </form>
        <button className="primary-button" type="button" onClick={playVsComputer} style={{background:"var(--teal)",marginTop:12}}>{tr("play.comp")} <span>🤖</span></button>
        <p className="trust-line"><span>◆</span> No sign-up <span>◆</span> 2–4 players <span>◆</span> Free to play</p>
      </div>
      <MiniBoard/>
    </section>
    <section className="how" id="how">
      <p className="section-kicker">Three moves to game night</p>
      <h2>Less setting up.<br/>More settling scores.</h2>
      <div className="steps">
        <article><span>1</span><h3>Make a room</h3><p>Pick your name. Your private table is ready in one tap.</p></article>
        <article><span>2</span><h3>Call your people</h3><p>Send the room code to friends or family. No accounts needed.</p></article>
        <article><span>3</span><h3>Roll &amp; rule</h3><p>Take your color, roll the dice, and bring every token home.</p></article>
      </div>
    </section>
    <section className="why" id="why">
      <div><p className="section-kicker">Made for your people</p><h2>Distance off.<br/><em>Masti on.</em></h2></div>
      <blockquote>“The board we grew up with,<br/>now wherever we are.”<cite>— the idea behind Apna Ludo</cite></blockquote>
    </section>
    <footer><Logo compact/><p>Made for long calls, loud laughs, and one more game.</p><small>© 2026 Apna Ludo</small></footer>
    {joinOpen && <div className="modal-backdrop" role="presentation" onMouseDown={e=>e.target===e.currentTarget&&setJoinOpen(false)}>
      <div className="join-modal" role="dialog" aria-modal="true" aria-labelledby="join-title">
        <button className="close-button" onClick={()=>setJoinOpen(false)}>×</button>
        <p className="section-kicker">{joinStep==="code" ? "Take your seat" : "Pick your color"}</p>
        <h2 id="join-title">{joinStep==="code" ? "Join the room" : "Room Preview"}</h2>
        
        {joinStep === "code" ? (
          <form onSubmit={handlePreview}>
            <input value={name} onChange={e=>{setName(e.target.value);setError("")}} placeholder={tr("name.placeholder")} autoFocus maxLength={20}/>
            <input className="code-input" value={code} onChange={e=>{setCode(e.target.value.replace(/[^a-z0-9]/gi,""));setError("")}} placeholder="ABC123" maxLength={8} autoCapitalize="characters"/>
            {error&&<p className="form-error" role="alert">{error}</p>}
            <button className="primary-button wide" type="submit">Preview Room <span>→</span></button>
          </form>
        ) : (
          <form onSubmit={handleJoin}>
            <p style={{marginBottom:"12px",fontSize:"14px",color:"#666"}}>Room: <b>{code.toUpperCase()}</b> ({previewData?.currentPlayers}/{previewData?.maxPlayers} players)</p>
            <div className="color-picker-row" style={{justifyContent:"center",marginBottom:"16px",gap:"12px"}}>
              {COLORS.map(c=>{
                const taken = previewData?.usedColors.includes(c);
                return <button key={c} type="button" disabled={taken} title={taken ? "Already taken" : ""} className={`color-btn ${c} ${joinColor===c?"active":""} ${taken?"taken":""}`} onClick={()=>setJoinColor(c)}/>
              })}
            </div>
            {error&&<p className="form-error" role="alert">{error}</p>}
            <button className="primary-button wide" type="submit" disabled={!joinColor}>{tr("join")} room <span>→</span></button>
          </form>
        )}
      </div>
    </div>}
  </main>;
}

/* ─── Dice (3D cube) ───────────────────────────────────────── */
function Die({ value, rolling }: { value:number; rolling:boolean }) {
  const dots:Record<number,number[]>={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
  const faces=[1,2,3,4,5,6];
  return <span className={`die ${rolling?"die--rolling":""}`} aria-label={`Dice shows ${value}`}>
    {faces.map(f=><span key={f} className={`die-face die-face--${f} ${value===f?"die-face--show":""}`}>
      {Array.from({length:9},(_,i)=><i key={i} className={dots[f]?.includes(i)?"dot":""}/>)}
    </span>)}
  </span>;
}

/* ─── PlayerCorner ─────────────────────────────────────────────── */
function PlayerCorner({
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

/* ─── PlayerSeat ─────────────────────────────────────────────── */
const STORED_AVATAR = sessionStorage.getItem("apna-avatar") ?? "😀";
function PlayerSeat({ player, active, avatar }: { player?:RoomPlayerSnapshot; active?:boolean; avatar?:string }) {
  if (!player) return <div className="player-seat empty-seat"><span>+</span><div><b>Open seat</b><small>Waiting for player</small></div></div>;
  return <div className={`player-seat seat-${player.color} ${active?"active-seat":""}`}>
    <span className="avatar" style={{background:COLOR_HEX[player.color]}}>{(player as any).isBot?"🤖":avatar??player.name[0]}</span>
    <div><b>{player.name}{player.isHost&&<sup> HOST</sup>}</b><small>{player.connected?player.ready?tr("ready"):tr("unready"):tr("reconnecting")}</small></div>
    {active&&<span className="turn-pip">TURN</span>}
  </div>;
}

/* ─── Board helpers (from shared/src/board.ts — single source of truth) ── */
function tokenCellIndex(color:PlayerColor,progress:number,tokenIdx=0):number|null{
  if(progress===-1){ return YARD_POSITIONS[color]?.[tokenIdx]??null; }
  return progressToCellIndex(color,progress);
}

/* ─── Game Board ─────────────────────────────────────────────── */
const STAR_CELLS_SET=new Set(STAR_CELLS);
const SAFE_CELLS_SET=new Set(SAFE_CELLS);
function LudoBoard({game,myPlayerId,legalTokens,onMove,tokenAnimation,boardRotation=0}:{game:GameState;myPlayerId:string|null;legalTokens:string[];onMove:(id:string)=>void;tokenAnimation:string|null;boardRotation?:number}){
  const me=game.players.find(p=>p.id===myPlayerId);
  const visualProgressRef = useRef<Record<string, number>>({});
  const [, setForceRender] = useState(0);

  useEffect(() => {
    const tokensToAnimate:{id:string;start:number;end:number}[] = [];
    let instantChange = false;

    game.players.forEach(p => p.tokens.forEach(t => {
      let current = visualProgressRef.current[t.id];
      if (current === undefined) {
        current = t.progress;
        visualProgressRef.current[t.id] = t.progress;
      }

      if (current !== t.progress && current !== -1 && t.progress !== -1 && t.progress > current) {
        tokensToAnimate.push({id: t.id, start: current, end: t.progress});
      } else if (current !== t.progress) {
        visualProgressRef.current[t.id] = t.progress;
        instantChange = true;
      }
    }));

    if (instantChange && tokensToAnimate.length === 0) {
      setForceRender(x => x + 1);
    }

    if (tokensToAnimate.length > 0) {
      const t = tokensToAnimate[0]!;
      let step = t.start;
      const interval = setInterval(() => {
        if (step < t.end) {
          step++;
          visualProgressRef.current[t.id] = step;
          setForceRender(x => x + 1);
          playSound("move");
        } else {
          clearInterval(interval);
        }
      }, 250);
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
    const baseRotation = `rotate(-${boardRotation}deg)`;
    if (count === 1) return { transform: `translate(-50%, -50%) ${baseRotation}` };
    if (count === 2) {
      const offsets = [[-25, 0], [25, 0]];
      const [ox, oy] = offsets[index] ?? [0, 0];
      return { transform: `translate(calc(-50% + ${ox}%), calc(-50% + ${oy}%)) scale(0.8) ${baseRotation}` };
    }
    if (count === 3) {
      const offsets = [[-35, 0], [0, 0], [35, 0]];
      const [ox, oy] = offsets[index] ?? [0, 0];
      return { transform: `translate(calc(-50% + ${ox}%), calc(-50% + ${oy}%)) scale(0.75) ${baseRotation}` };
    }
    const pos = [{x:-25,y:-25},{x:25,y:-25},{x:-25,y:25},{x:25,y:25}];
    const p = pos[index % 4]!;
    return { transform: `translate(calc(-50% + ${p.x}%), calc(-50% + ${p.y}%)) scale(0.6) ${baseRotation}` };
  };

  const allTokens:{id:string;color:PlayerColor;progress:number;ordinal:number}[]=[];
  for(const p of game.players)for(let idx=0;idx<p.tokens.length;idx++)allTokens.push({id:p.tokens[idx]!.id,color:p.color,progress:visualProgressRef.current[p.tokens[idx]!.id] ?? p.tokens[idx]!.progress,ordinal:idx+1});

  return <div className="board-shell" style={{ transform: `rotate(${boardRotation}deg)`, transition: 'transform 0.5s ease-in-out' }}><div className="ludo-board" role="grid" aria-label="15 by 15 Ludo board">
    {allTokens.filter(t => t.progress === -1).map(t => {
      const pos = YARD_CIRCLE_COORDS[t.color][t.ordinal - 1];
      const style: React.CSSProperties = {
        top: pos?.top,
        left: pos?.left,
        transform: `translate(-50%, -50%) rotate(-${boardRotation}deg)`
      };
      const isLegalToken = legalTokens.includes(t.id) && me?.tokens.some(mt => mt.id === t.id);
      const innerClass = `game-pawn-inner pawn-color-${t.color} ${isLegalToken ? "legal-token" : ""} ${tokenAnimation===t.id ? "pawn--animate" : ""}`;
      
      if(isLegalToken) {
        return (
          <button key={t.id} style={style} className="game-pawn-wrapper legal-token" onClick={()=>onMove(t.id)} aria-label={`Move ${t.color} token from yard`}>
            <span className={innerClass}>
              <div style={{ transform: 'translateY(-35%)', width: '100%', height: '100%' }}>
                <img src={`/token-${t.color}.png`} alt={t.color} draggable={false}/>
              </div>
            </span>
          </button>
        );
      }
      return (
        <div key={t.id} style={style} className="game-pawn-wrapper" aria-label={`${t.color} token in yard`}>
          <div className={innerClass}>
            <div style={{ transform: 'translateY(-35%)', width: '100%', height: '100%' }}>
              <img src={`/token-${t.color}.png`} alt={t.color} draggable={false}/>
            </div>
          </div>
        </div>
      );
    })}
    {Array.from({length:CELL_COUNT},(_,i)=>{
      const tokensHere=allTokens.filter(t=>t.progress >= 0 && tokenCellIndex(t.color,t.progress,t.ordinal-1)===i);
      const ct=cellType(i);
      const starClass=STAR_CELLS_SET.has(i)?"star-cell":"";
      const safeClass=SAFE_CELLS_SET.has(i)?"safe-cell":"";
      return <div key={i} role="gridcell" className={`board-cell ${ct} ${starClass} ${safeClass}`}>{
      }{tokensHere.map((t, idx)=>{
        const style = getTrackTokenStyle(idx, tokensHere.length);
        const isLegalToken = legalTokens.includes(t.id) && me?.tokens.some(mt => mt.id === t.id);
        const innerClass = `game-pawn-inner pawn-color-${t.color} ${isLegalToken ? "legal-token" : ""} ${tokenAnimation===t.id ? "pawn--animate" : ""}`;
        
        if(isLegalToken) {
          return (
            <button key={t.id} style={style} className="game-pawn-wrapper legal-token" onClick={()=>onMove(t.id)} aria-label={`Move ${t.color} token`}>
              <span className={innerClass}>
                <div style={{ transform: 'translateY(-35%)', width: '100%', height: '100%' }}>
                  <img src={`/token-${t.color}.png`} alt={t.color} draggable={false}/>
                </div>
              </span>
            </button>
          );
        }
        return (
          <div key={t.id} style={style} className="game-pawn-wrapper" aria-label={`${t.color} token`}>
            <div className={innerClass}>
              <div style={{ transform: 'translateY(-35%)', width: '100%', height: '100%' }}>
                <img src={`/token-${t.color}.png`} alt={t.color} draggable={false}/>
              </div>
            </div>
          </div>
        );
      })}</div>;
    })}
    <></>
  </div></div>;
}

/* ─── Timer hook ─────────────────────────────────────────────── */
function useTimer(isMyTurn:boolean,snapshot:RoomSnapshot|null):{timeLeft:number;timerRunning:boolean}{
  const [timeLeft,setTimeLeft]=useState(30);
  const activeRef=useRef(isMyTurn);
  activeRef.current=isMyTurn;
  const currentPlayerId=snapshot?.game?.currentPlayerId;
  const phase=snapshot?.game?.phase;
  useEffect(()=>{
    if(!snapshot?.game||phase!=="playing"){setTimeLeft(30);return;}
    // Only reset timer when turn changes to this player (not on every snapshot)
    if(isMyTurn){setTimeLeft(30);}
    const id=setInterval(()=>{setTimeLeft(t=>{if(t<=1){if(activeRef.current)return 0;return 0;}return t-1;});},1000);
    return ()=>clearInterval(id);
  },[isMyTurn,currentPlayerId,phase]);
  return {timeLeft,timerRunning:isMyTurn&&timeLeft>0};
}

/* ─── Player rank for results ──────────────────────────────────── */
function renderPlayerRank(p: GamePlayer, i: number, winners: string[], playerId: string | null, avatar: string) {
  const homeCount = p.tokens.filter((t: any)=>t.progress===57).length;
  const isBot = p.id.startsWith("bot-");
  const av = isBot ? "🤖" : avatar;
  const stat = p.status==="won" ? "🏆 Finished" : p.status==="forfeited" ? "Forfeited" : homeCount + " home";
  return <li key={p.id}><b>{i+1}</b><span className="avatar" style={{background:COLOR_HEX[p.color as PlayerColor]}}>{av}</span><strong>{p.name}{isBot?" 🤖":""}{p.id===playerId?" (You)":""}</strong><small>{stat}</small></li>;
}

/* ─── Room page ──────────────────────────────────────────────── */
function Room() {
  const {code=""}=useParams();
  const navigate=useNavigate();
  const [socket,setSocket]=useState<Socket<ServerToClientEvents,ClientToServerEvents>|null>(null);
  const [connState,setConnState]=useState<ConnState>("connecting");
  const [snapshot,setSnapshot]=useState<RoomSnapshot|null>(null);
  const [playerId,setPlayerId]=useState<string|null>(()=>sessionStorage.getItem(`apna-playerid-${code}`));
  const [reconnectToken,setReconnectToken]=useState<string|null>(()=>sessionStorage.getItem(`apna-token-${code}`));
  const [copied,setCopied]=useState(false);
  const [chatOpen,setChatOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [message,setMessage]=useState("");
  const [chatMsgs,setChatMsgs]=useState<ChatMessage[]>([]);
  const [localMsgs,setLocalMsgs]=useState<{name:string;text:string}[]>([]);
  const [rolling,setRolling]=useState(false);
  const [tokenAnimation,setTokenAnimation]=useState<string|null>(null);
  const [localDice,setLocalDice]=useState(6);
  const [lastRolls,setLastRolls]=useState<Record<string,number>>({});
  const chatEnd=useRef<HTMLDivElement>(null);
  const revisionRef=useRef(0);
  const cmdSeq=useRef(0);
  const moveTokenRef=useRef<(tokenId:string)=>void>(()=>{});

  const me=snapshot?.players.find(p=>p.id===playerId)??null;
  const isMyTurn=snapshot?.game?.currentPlayerId===playerId;
  const legalTokens=(isMyTurn&&snapshot?.game?.movableTokenIds)?snapshot.game.movableTokenIds:[];
  const canRoll=isMyTurn&&snapshot?.game?.dice===null&&!rolling;
  const canMove=legalTokens.length>0;
  const {timeLeft,timerRunning}=useTimer(isMyTurn??false,snapshot);
  const myAvatar=sessionStorage.getItem("apna-avatar")??"😀";

  // --- socket lifecycle ---
  useEffect(()=>{
    const s=connect();setSocket(s);
    s.on("connect",()=>{
      setConnState("online");
      const pc=code||"";
      const sp=sessionStorage.getItem(`apna-playerid-${pc}`);
      const st=sessionStorage.getItem(`apna-token-${pc}`);
      if(pc==="quick"){const n=sessionStorage.getItem("apna-player")??"Player";s.emit("room:createWithBot" as any,{name:n,maxPlayers:2},(res:CommandResult<JoinResult>)=>{if(res.ok){setPlayerId(res.playerId);setReconnectToken(res.reconnectToken);setSnapshot(res.room);sessionStorage.setItem(`apna-token-${res.room.code}`,res.reconnectToken);sessionStorage.setItem(`apna-playerid-${res.room.code}`,res.playerId);window.history.replaceState(null,"",`/room/${res.room.code}`);}else navigate("/");});}
      else if(pc&&st){s.emit("room:join",{code:pc,reconnectToken:st},(res:CommandResult<JoinResult>)=>{if(res.ok){setPlayerId(res.playerId);setReconnectToken(res.reconnectToken);setSnapshot(res.room);sessionStorage.setItem(`apna-token-${pc}`,res.reconnectToken);}else{sessionStorage.removeItem(`apna-token-${pc}`);navigate("/");}});}
      else if(pc&&sp&&!st){fetch(`/api/room/${pc}/claim`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({playerId:sp})}).then(r=>r.json()).then(d=>{if(d.ok){sessionStorage.setItem(`apna-token-${pc}`,d.reconnectToken);s.emit("room:join",{code:pc,reconnectToken:d.reconnectToken},(res:CommandResult<JoinResult>)=>{if(res.ok){setPlayerId(res.playerId);setReconnectToken(res.reconnectToken);setSnapshot(res.room);}else{sessionStorage.removeItem(`apna-token-${pc}`);navigate("/");}});}else navigate("/");}).catch(()=>{});}
      else if(pc&&!st){
        const joinColor = sessionStorage.getItem(`apna-join-color-${pc}`);
        if (!joinColor) {
          navigate(`/?join=${pc}`);
        } else {
          const n=sessionStorage.getItem("apna-player")??"Player";
          s.emit("room:join",{code:pc,name:n,color:joinColor as import("@apna-ludo/shared").PlayerColor},(res:CommandResult<JoinResult>)=>{
            if(res.ok){
              setPlayerId(res.playerId);
              setReconnectToken(res.reconnectToken);
              setSnapshot(res.room);
              sessionStorage.setItem(`apna-token-${pc}`,res.reconnectToken);
              sessionStorage.setItem(`apna-playerid-${pc}`,res.playerId);
            } else navigate("/");
          });
        }
      }
    });
    s.io.on("reconnect",()=>setConnState("online"));
    s.io.on("reconnect_attempt",()=>setConnState("reconnecting"));
    s.on("disconnect",()=>setConnState("offline"));
    s.on("room:snapshot",(snap:RoomSnapshot)=>{
      setSnapshot(snap);
      revisionRef.current=snap.revision;
      if(snap.game?.dice) {
        setLocalDice(snap.game.dice);
        setLastRolls(prev => ({...prev, [snap.game!.currentPlayerId]: snap.game!.dice!}));
      }
      if(snap.game?.lastAction?.type==="moved"){setTokenAnimation(snap.game.lastAction.tokenId??null);setTimeout(()=>setTokenAnimation(null),600);if(snap.game.lastAction.capturedTokenIds?.length)playSound("capture");}
      if(snap.game?.phase==="finished"&&snap.game?.winners.includes(playerId??""))setTimeout(()=>playSound("win"),200);
      if(snap.game?.currentPlayerId===playerId&&snap.game?.dice===null)playSound("turn");
      if(snap.game?.movableTokenIds?.length===1&&snap.game.currentPlayerId===playerId){setTimeout(()=>{moveTokenRef.current(snap.game!.movableTokenIds[0]!);},300);}
    });
    s.on("chat:message",(msg:ChatMessage)=>{setChatMsgs(p=>{const next=[...p,msg];return next.length>120?next.slice(-120):next;});});
    return ()=>{s.close();};
  },[]); // eslint-disable-line

  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[chatMsgs,localMsgs]);
  
  const copyInvite=useCallback(async()=>{try{await navigator.clipboard.writeText(`${window.location.origin}/room/${snapshot?.code??code}`);}catch{}setCopied(true);setTimeout(()=>setCopied(false),1800);},[snapshot,code]);
  const toggleReady=()=>{if(!socket||!snapshot)return;cmdSeq.current+=1;socket.emit("room:ready",{expectedRevision:revisionRef.current},()=>{});};
  const startGame=()=>{if(!socket)return;socket.emit("room:start",{expectedRevision:revisionRef.current},()=>{});};
  const rollDice=()=>{if(!socket||!canRoll)return;playSound("dice");setRolling(true);cmdSeq.current+=1;socket.emit("game:roll",{expectedRevision:revisionRef.current},()=>{setRolling(false);});};
  const moveToken=(tokenId:string)=>{if(!socket||!canMove)return;cmdSeq.current+=1;setTokenAnimation(tokenId);socket.emit("game:move",{tokenId,expectedRevision:revisionRef.current},()=>{setTokenAnimation(null);});};
  moveTokenRef.current=moveToken;
  const sendChat=(e:FormEvent)=>{e.preventDefault();if(!message.trim()||!socket)return;socket.emit("chat:send",{text:message.trim()},()=>{});setLocalMsgs(p=>[...p,{name:me?.name??"You",text:message.trim()}].slice(-120));setMessage("");};
  const leaveRoom=()=>{if(socket)socket.emit("room:leave",{},()=>{});sessionStorage.removeItem(`apna-token-${snapshot?.code??code}`);navigate("/");};
  const rematchRoom=()=>{if(socket)socket.emit("room:rematch",{expectedRevision:revisionRef.current},()=>{});};

  const displayPlayers:(RoomPlayerSnapshot|undefined)[]=snapshot?[...snapshot.players,...Array(Math.max(0,4-snapshot.players.length)).fill(undefined)]:[];
  const finished=snapshot?.game?.phase==="finished";
  const winners=snapshot?.game?.winners??[];
  const iWon=winners.includes(playerId??"");
  const allChatMessages=useMemo(()=>{const msgs=[...chatMsgs];for(const m of localMsgs.slice(-120))msgs.push({id:String(Date.now()),playerId:"",playerName:m.name,text:m.text,sentAt:new Date().toISOString()});return msgs.slice(-120);},[chatMsgs,localMsgs]);

  const renderCorner = (color: PlayerColor, pos: 'top-left'|'top-right'|'bottom-left'|'bottom-right') => {
    const p = snapshot?.game ? snapshot.game.players.find(p=>p.color===color) : snapshot?.players.find(p=>p.color===color);
    const isActive = snapshot?.phase === "playing" && snapshot?.game?.currentPlayerId === p?.id;
    const isMe = p?.id === playerId;
    
    let displayDice = 1;
    if (isActive && localDice) displayDice = localDice;
    else if (p?.id && lastRolls[p.id]) displayDice = lastRolls[p.id];

    return <PlayerCorner 
      key={color}
      player={p}
      position={pos}
      isActive={isActive}
      diceValue={displayDice}
      isRolling={isActive && rolling}
      canRoll={canRoll && isMe}
      canMove={canMove && isMe}
      onRoll={rollDice}
      avatar={isMe ? myAvatar : ""}
    />
  };

  const baseColors = ['green', 'yellow', 'blue', 'red'] as const;
  const myPlayer = snapshot?.game?.players.find(p => p.id === playerId) || snapshot?.players.find(p => p.id === playerId);
  const myColor = myPlayer?.color || 'red';
  
  // Only rotate 0deg or 180deg to keep local player on the bottom row.
  // Red/Blue are naturally on the bottom row (0deg).
  // Green/Yellow are naturally on the top row, so we rotate 180deg (shift 2).
  const shift = (myColor === 'green' || myColor === 'yellow') ? 2 : 0;
  
  const shifted = [...baseColors.slice(4 - shift), ...baseColors.slice(0, 4 - shift)];

  const tlColor = shifted[0];
  const trColor = shifted[1];
  const brColor = shifted[2];
  const blColor = shifted[3];
  const boardRotation = shift * 90;

  return <main className="room-page">
    <header className="room-header"><Logo compact/>
      <div className="room-code"><span>ROOM</span><button onClick={copyInvite} aria-label="Copy room code">{(snapshot?.code??code).toUpperCase()} <small>{copied?tr("copy.code"):"COPY"}</small></button></div>
      <div className="header-actions">
        <button className="icon-btn" onClick={()=>setChatOpen(c=>!c)} aria-label="Toggle chat">💬 {allChatMessages.length>0&&<span className="badge">{allChatMessages.length}</span>}</button>
        <button className="icon-btn" onClick={()=>setSettingsOpen(true)}>⚙️</button>
      </div>
    </header>
    <div className="game-layout">
      <aside className="players-panel">
        <div className="panel-heading"><span>PLAYERS</span><b>{snapshot?.players.length}/4</b></div>
        {snapshot?.players.map(p=><PlayerSeat key={p.id} player={p} active={snapshot?.game?.currentPlayerId===p.id} avatar={p.id===playerId?myAvatar:undefined}/>)}
        {(snapshot?.players.length??0)<4&&<button className="invite-button" onClick={copyInvite}>+ Invite Player</button>}
        {snapshot?.game&&<div className="game-stats">
          <div className="panel-heading" style={{marginTop:10}}><span>STATUS</span></div>
          {snapshot.game.players.map((p,i)=>
        <div key={p.id} className={`stat-chip ${p.id===playerId?"stat-chip--me":""}`}>
          <span className="stat-color" style={{background:COLOR_HEX[p.color]}}/>
          <span className="stat-name">{p.name} {p.id===playerId?"(You)":""}</span>
          <span className="stat-info">
            <span title="Home 🏠">🏠{p.tokens.filter(t=>t.progress===57).length}</span>
            <span title="Track 🎲">🎲{p.tokens.filter(t=>t.progress>=0&&t.progress<57).length}</span>
            <span title="Yard 🅿️">🅿️{p.tokens.filter(t=>t.progress===-1).length}</span>
          </span>
        </div>)}</div>}
      </aside>
      <section className="table-area">
        <div className="board-container">
          {renderCorner(tlColor, 'top-left')}
          {renderCorner(trColor, 'top-right')}
          
          <div className="board-center">
            {snapshot?.game ? <LudoBoard game={snapshot.game} myPlayerId={playerId} legalTokens={legalTokens} onMove={moveToken} tokenAnimation={tokenAnimation} boardRotation={boardRotation}/> : <div className="board-shell" style={{ transform: `rotate(${boardRotation}deg)`, transition: 'transform 0.5s ease-in-out' }}><div className="ludo-board" role="grid" aria-label="Empty Ludo board" style={{minHeight:"50vw",maxHeight:"620px"}}><div className="home-yard yard-red">{[0,1,2,3].map(i=><img key={i} src="/token-red.png" alt="red" className="yard-token" style={{transform:`rotate(-${boardRotation}deg)`}}/>)}</div><div className="home-yard yard-blue">{[0,1,2,3].map(i=><img key={i} src="/token-blue.png" alt="blue" className="yard-token" style={{transform:`rotate(-${boardRotation}deg)`}}/>)}</div><div className="home-yard yard-green">{[0,1,2,3].map(i=><img key={i} src="/token-green.png" alt="green" className="yard-token" style={{transform:`rotate(-${boardRotation}deg)`}}/>)}</div><div className="home-yard yard-yellow">{[0,1,2,3].map(i=><img key={i} src="/token-yellow.png" alt="yellow" className="yard-token" style={{transform:`rotate(-${boardRotation}deg)`}}/>)}</div><></></div></div>}
          </div>

          {renderCorner(blColor, 'bottom-left')}
          {renderCorner(brColor, 'bottom-right')}
        </div>

        <div className="lobby-controls">
          {snapshot?.phase==="lobby"?<>
            <div className="lobby-note"><span>✦</span><div><b>Your private table is ready</b><small>Invite friends via the room code above.</small></div></div>
            {me?.isHost?<button className="primary-button start-button" onClick={startGame} disabled={(snapshot?.players??[]).length !== snapshot?.maxPlayers || !(snapshot?.players??[]).every(p=>p.ready)}>{tr("start.game")} <span>→</span></button>:<button className="primary-button start-button" onClick={toggleReady}>{me?.ready?tr("unready"):tr("ready")}</button>}
          </>:finished?<div className="lobby-note"><span>🏆</span><div><b>{iWon?tr("win.msg"):`Winner: ${snapshot?.game?.players.find(p=>p.id===winners[0])?.name??"Someone"}`}</b><small><button className="text-button" onClick={leaveRoom} style={{fontSize:10}}>{tr("back.home")}</button></small></div></div>:null}
        </div>
      </section>
      <aside className={`chat-panel ${chatOpen?"chat-panel--open":""}`}>
        <div className="chat-heading"><div><span>TABLE TALK</span><b>Friends & family only.</b></div><button onClick={()=>setChatOpen(false)}>×</button></div>
        <div className="messages" aria-live="polite">{allChatMessages.map(m=><div key={m.id} className={`message ${m.playerId===playerId?"message--mine":""}`}><span>{m.playerName[0]}</span><div><small>{m.playerName} · {new Date(m.sentAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</small><p>{m.text}</p></div></div>)}<div ref={chatEnd}/></div>
        <form className="chat-form" onSubmit={sendChat}><input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Say something…" maxLength={180}/><button type="submit" aria-label="Send message">↑</button></form>
      </aside>
    </div>
    {settingsOpen&&<SettingsPanel onClose={()=>setSettingsOpen(false)}/>}
    {finished&&<div className="modal-backdrop"><div className="game-over" role="dialog" aria-modal="true"><div className="winner-burst" aria-hidden><span>✦</span><b>★</b><span>✦</span></div><p className="section-kicker">{tr("game.over")}</p><h2>{iWon?tr("win.msg"):`${snapshot?.game?.players.find(p=>p.id===winners[0])?.name??"Someone"} ${tr("win.msg")}`}</h2>
      <p>All tokens home. Time for another round?</p><ol>{snapshot?.game?.players.slice().sort((a,b)=>{const aW=winners.includes(a.id)?0:1,bW=winners.includes(b.id)?0:1;return aW-bW;}).map((p,i)=>renderPlayerRank(p,i,winners,playerId,myAvatar))}</ol>
      <div style={{display:'flex',gap:10,marginTop:20}}>
        <button className="primary-button wide" onClick={rematchRoom}>Rematch <span>↻</span></button>
        <button className="text-button wide" onClick={leaveRoom} style={{background:'rgba(0,0,0,0.05)',padding:'12px',borderRadius:'8px',fontWeight:'bold',color:'#333'}}>Home <span>🏠</span></button>
      </div>
    </div></div>}
  </main>;
}

/* ─── Error Boundary ───────────────────────────────────────────── */
import { Component } from "react";
class ErrorBoundary extends Component<{children:React.ReactNode},{hasError:boolean;error:Error|null}> {
  constructor(props:{children:React.ReactNode}){super(props);this.state={hasError:false,error:null};}
  static getDerivedStateFromError(e:Error){return{hasError:true,error:e};}
  render(){if(this.state.hasError)return <main className="landing" style={{display:'grid',placeItems:'center',minHeight:'100vh',textAlign:'center',padding:20}}><div><h1 style={{fontSize:60}}>💥</h1><h2 style={{fontFamily:"'Yeseva One',serif",fontSize:32,margin:'10px 0'}}>Something broke!</h2><p style={{color:'#657875',fontSize:13,marginBottom:20,fontFamily:'DM Mono,monospace'}}>{this.state.error?.message??"Unknown"}</p><button className="primary-button" onClick={()=>{this.setState({hasError:false,error:null});window.location.reload()}}>Reload <span>↻</span></button></div></main>;return this.props.children;}
}

/* ─── App ────────────────────────────────────────────────────── */
export default function App() {
  useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key.toLowerCase()==="r" && !["INPUT","TEXTAREA","SELECT"].includes((e.target as HTMLElement)?.tagName))document.querySelector<HTMLButtonElement>(".roll-button:not(:disabled)")?.click();};window.addEventListener("keydown",onKey);return ()=>window.removeEventListener("keydown",onKey);},[]);
  return <ErrorBoundary><Routes><Route path="/" element={<Landing/>}/><Route path="/room/:code" element={<Room/>}/><Route path="*" element={<Landing/>}/></Routes></ErrorBoundary>;
}



































