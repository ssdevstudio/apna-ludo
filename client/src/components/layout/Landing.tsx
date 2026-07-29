import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PlayerColor } from "@apna-ludo/shared";
import { tr } from "../../utils/i18n";
import { AVATARS, COLORS } from "../../utils/constants";
import { Logo } from "../ui/Logo";
import { MiniBoard } from "../ui/MiniBoard";
import { ThemeToggle } from "../ui/ThemeToggle";

export function Landing() {
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
      const r=await fetch("/api/room",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:name.trim(),vsComputer:true,color:preferredColor,maxPlayers})});
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
    <nav className="landing-nav">
      <Logo />
      <div className="nav-links">
        <a href="#how">How it works</a>
        <a href="#why">Why Apna?</a>
      </div>
      <ThemeToggle />
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
