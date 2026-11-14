import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PlayerColor } from "@apna-ludo/shared";
import { tr } from "../../utils/i18n";
import { AVATARS, COLORS } from "../../utils/constants";
import { Logo } from "../ui/Logo";
import { MiniBoard } from "../ui/MiniBoard";
import { ThemeToggle } from "../ui/ThemeToggle";
import { SettingsPanel } from "../modals/SettingsPanel";
import { CoinHeader } from "../ui/CoinHeader";
import { LuckySpinWheelModal } from "../modals/LuckySpinWheelModal";
import { PassNPlayModal } from "../modals/PassNPlayModal";
import { BoardThemeModal } from "../modals/BoardThemeModal";
import { PlayerProfileModal } from "../modals/PlayerProfileModal";
import { deductCoins, getProgression } from "../../utils/progression";

export function Landing() {
  const navigate = useNavigate();
  const [joinOpen,setJoinOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [bonusOpen,setBonusOpen]=useState(false);
  const [name,setName]=useState(()=>sessionStorage.getItem("apna-player")??"");
  
  const initialCode = new URLSearchParams(window.location.search).get("join") || "";
  const [code,setCode]=useState(initialCode);
  const [error,setError]=useState("");
  const [avatar,setAvatar]=useState(()=>sessionStorage.getItem("apna-avatar")??"😀");
  const [showAvatars,setShowAvatars]=useState(false);
  const [maxPlayers,setMaxPlayers]=useState<2|3|4>(4);
  const [preferredColor,setPreferredColor]=useState<PlayerColor>("red");
  const [entryBet,setEntryBet]=useState<number>(500);
  const [gameMode,setGameMode]=useState<"ludo" | "snake">("ludo");
  const [ruleMode,setRuleMode]=useState<"classic" | "quick">("classic");
  const [passNPlayOpen,setPassNPlayOpen]=useState(false);
  const [themeModalOpen,setThemeModalOpen]=useState(false);
  const [profileModalOpen,setProfileModalOpen]=useState(false);
  
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
    if (entryBet > 0 && !deductCoins(entryBet)) {
      setError("Not enough coins! Claim your daily free bonus 🪙");
      setBonusOpen(true);
      return;
    }
    sessionStorage.setItem("apna-player",name.trim());
    sessionStorage.setItem("apna-avatar",avatar);
    sessionStorage.setItem("apna-bet",String(entryBet));
    try {
      const r=await fetch("/api/room",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name:name.trim(),maxPlayers,color:preferredColor,entryFee:entryBet,gameType:gameMode,gameMode:ruleMode})
      });
      const d=await r.json();
      if (d.ok) {
        sessionStorage.setItem(`apna-token-${d.room.code}`,d.reconnectToken);
        sessionStorage.setItem(`apna-playerid-${d.room.code}`,d.playerId);
        navigate(`/room/${d.room.code}`);
      } else setError("Failed.");
    } catch { setError("Server unreachable."); }
  };

  const playVsComputer = async () => {
    if (!name.trim()) return setError("Enter your name first.");
    if (entryBet > 0 && !deductCoins(entryBet)) {
      setError("Not enough coins! Claim your daily free bonus 🪙");
      setBonusOpen(true);
      return;
    }
    sessionStorage.setItem("apna-player",name.trim());
    sessionStorage.setItem("apna-avatar",avatar);
    sessionStorage.setItem("apna-bet",String(entryBet));
    try {
      const r=await fetch("/api/room",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name:name.trim(),vsComputer:true,color:preferredColor,maxPlayers,entryFee:entryBet,gameType:gameMode,gameMode:ruleMode})
      });
      const d=await r.json();
      if (d.ok) {
        sessionStorage.setItem(`apna-token-${d.room.code}`,d.reconnectToken);
        sessionStorage.setItem(`apna-playerid-${d.room.code}`,d.playerId);
        navigate(`/room/${d.room.code}`);
      } else setError("Failed.");
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
    const fee = previewData?.entryFee || 0;
    if (fee > 0 && !deductCoins(fee)) {
      setError(`This room requires ${fee} coins to enter! Claim your daily bonus 🪙`);
      setBonusOpen(true);
      return;
    }
    sessionStorage.setItem("apna-player",name.trim());
    sessionStorage.setItem("apna-avatar",avatar);
    sessionStorage.setItem("apna-bet",String(fee));
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
      <CoinHeader onOpenBonus={() => setBonusOpen(true)} />
      <ThemeToggle />
      <button className="icon-btn" onClick={()=>setProfileModalOpen(true)} title="My Profile" aria-label="Profile">👤</button>
      <button className="icon-btn" onClick={()=>setThemeModalOpen(true)} title="Board Themes" aria-label="Board Themes">🎨</button>
      <button className="icon-btn" onClick={()=>setSettingsOpen(true)} title="Settings" aria-label="Settings">⚙️</button>
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
          
          {/* Game Mode Selector */}
          <div className="game-mode-section" style={{marginTop:"12px"}}>
            <label style={{fontSize:"12px",marginBottom:"4px",display:"block"}}>Select Game</label>
            <div className="game-mode-toggle-group">
              <button
                type="button"
                className={`mode-toggle-btn ${gameMode === "ludo" ? "active" : ""}`}
                onClick={() => setGameMode("ludo")}
              >
                <span>🎲 Ludo</span>
              </button>
              <button
                type="button"
                className={`mode-toggle-btn mode-toggle-snake ${gameMode === "snake" ? "active" : ""}`}
                onClick={() => setGameMode("snake")}
              >
                <span>🐍 Saanp Seedhi</span>
              </button>
            </div>
          </div>

          {/* Rule Mode (Classic vs Quick Rush) */}
          {gameMode === "ludo" && (
            <div className="game-mode-section" style={{marginTop:"8px"}}>
              <label style={{fontSize:"12px",marginBottom:"4px",display:"block"}}>Rule Mode</label>
              <div className="game-mode-toggle-group">
                <button
                  type="button"
                  className={`mode-toggle-btn ${ruleMode === "classic" ? "active" : ""}`}
                  onClick={() => setRuleMode("classic")}
                >
                  Classic (4 Tokens)
                </button>
                <button
                  type="button"
                  className={`mode-toggle-btn ${ruleMode === "quick" ? "active" : ""}`}
                  onClick={() => setRuleMode("quick")}
                >
                  ⚡ Quick (2 Tokens)
                </button>
              </div>
            </div>
          )}

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

          {/* Ludo King Style Entry Bet Selector */}
          <div className="bet-selection-section">
            <div className="bet-header-row">
              <label style={{fontSize:"12px",display:"block"}}>Entry Bet</label>
              <span className="pot-prize-badge">
                🏆 Pot: <b>{entryBet > 0 ? `${(entryBet * maxPlayers).toLocaleString()} 🪙` : "Practice"}</b>
              </span>
            </div>
            <div className="bet-pills-row">
              {[0, 500, 1000, 2500, 5000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={`bet-pill ${entryBet === amount ? "active" : ""}`}
                  onClick={() => setEntryBet(amount)}
                >
                  {amount === 0 ? "Free" : `🪙 ${amount >= 1000 ? `${amount / 1000}K` : amount}`}
                </button>
              ))}
            </div>
          </div>
          
          <div className="name-row" style={{marginTop:"16px"}}>
            <button className="primary-button wide" type="button" onClick={createRoom}>{tr("create.room")} <span>→</span></button>
          </div>
          
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="button" className="join-inline" onClick={()=>{setJoinOpen(true);setJoinStep("code");}}>Already have a room code? <b>Join here</b></button>
        </form>
        <div style={{display: "flex", gap: "10px", marginTop: "12px", width: "100%"}}>
          <button
            className="primary-button"
            type="button"
            onClick={playVsComputer}
            style={{background:"var(--teal)", flex: 1}}
          >
            {tr("play.comp")} <span>🤖</span>
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => setPassNPlayOpen(true)}
            style={{background:"linear-gradient(135deg, #0284c7, #38bdf8)", flex: 1}}
          >
            Pass N Play <span>👥</span>
          </button>
        </div>
        <p className="trust-line"><span>◆</span> No sign-up <span>◆</span> 2–4 players <span>◆</span> Free to play</p>
      </div>
      <MiniBoard mode={gameMode}/>
    </section>
    <section className="how" id="how">
      <p className="section-kicker">Three moves to game night</p>
      <h2>Less setting up.<br/>More settling scores.</h2>
      <div className="steps">
        <article><span>1</span><h3>Make a room</h3><p>Pick your name. Your private table is ready in one tap.</p></article>
        <article><span>2</span><h3>Call your people</h3><p>Send the room code to friends or family. No accounts needed.</p></article>
        <article><span>3</span><h3>Roll &amp; rule</h3><p>Take your color, roll the dice, and bring every token home.</p></article>
        <article><span>4</span><h3>Life Lines</h3><p>Each player gets 5 life dots. Skip a turn — one dot turns red. All 5 gone? You're out. Last player standing wins.</p></article>
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
            <p style={{marginBottom:"12px",fontSize:"14px",color:"#666",display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
              <span>Room: <b>{code.toUpperCase()}</b> ({previewData?.currentPlayers}/{previewData?.maxPlayers} players)</span>
              {previewData?.gameType === "snake" && (
                <span style={{background:"#059669",color:"#fff",fontSize:"11px",padding:"2px 8px",borderRadius:"999px",fontWeight:700}}>🐍 Saanp Seedhi</span>
              )}
            </p>
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
    {settingsOpen && <SettingsPanel onClose={()=>setSettingsOpen(false)} />}
    {bonusOpen && <LuckySpinWheelModal isOpen={bonusOpen} onClose={()=>setBonusOpen(false)} />}
    {passNPlayOpen && <PassNPlayModal isOpen={passNPlayOpen} onClose={()=>setPassNPlayOpen(false)} />}
    {themeModalOpen && <BoardThemeModal isOpen={themeModalOpen} onClose={()=>setThemeModalOpen(false)} />}
    {profileModalOpen && (
      <PlayerProfileModal
        isOpen={profileModalOpen}
        onClose={()=>setProfileModalOpen(false)}
        playerName={name || "Player"}
        avatar={avatar}
      />
    )}
  </main>;
}
