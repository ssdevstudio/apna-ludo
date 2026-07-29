import { FormEvent, useEffect, useRef, useState, useCallback } from "react";
import type { Socket } from "socket.io-client";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import type {
  ClientToServerEvents, ServerToClientEvents, RoomSnapshot, ChatMessage,
  CommandResult, JoinResult, PlayerColor, RoomPlayerSnapshot
} from "@apna-ludo/shared";
import { FINISH_PROGRESS } from "@apna-ludo/shared";

import { playSound } from "../../utils/audio";
import { tr } from "../../utils/i18n";
import { AVATARS, COLOR_HEX } from "../../utils/constants";
import { ThemeToggle } from "../ui/ThemeToggle";
import { useTimer } from "../../hooks/useTimer";

import { SettingsPanel } from "../modals/SettingsPanel";
import { VictoryModal } from "../modals/VictoryModal";
import { Logo } from "../ui/Logo";
import { PlayerSeat, PlayerCorner } from "../game/PlayerCard";
import { LudoBoard } from "../game/LudoBoard";
import { ChatSidebar } from "../chat/ChatSidebar";
import { EmojiReactionSystem } from "../chat/EmojiReactionSystem";

function connect(): Socket<ServerToClientEvents, ClientToServerEvents> {
  const s = io({ transports: ["websocket", "polling"] });
  return s;
}

export function Room() {
  const {code=""}=useParams();
  const navigate=useNavigate();
  const [socket,setSocket]=useState<Socket<ServerToClientEvents,ClientToServerEvents>|null>(null);
  const [connState,setConnState]=useState<string>("connecting");
  const [snapshot,setSnapshot]=useState<RoomSnapshot|null>(null);
  const [playerId,setPlayerId]=useState<string|null>(()=>sessionStorage.getItem(`apna-playerid-${code}`));
  const [reconnectToken,setReconnectToken]=useState<string|null>(()=>sessionStorage.getItem(`apna-token-${code}`));
  const [copied,setCopied]=useState(false);
  const [chatOpen,setChatOpen]=useState(false);
  const chatOpenRef=useRef(false);
  const [unreadCount,setUnreadCount]=useState(0);
  useEffect(() => { if(chatOpen) setUnreadCount(0); }, [chatOpen]);
    useEffect(()=>{
    chatOpenRef.current=chatOpen;
    if(chatOpen)setUnreadCount(0);
  },[chatOpen]);
  const [reactionPickerOpen,setReactionPickerOpen]=useState(false);
  const [reactions,setReactions]=useState<{id:string, emoji:string, playerId:string}[]>([]);
  const [sentEmoji,setSentEmoji]=useState<string|null>(null);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [drawerOpen,setDrawerOpen]=useState(false);
  const [message,setMessage]=useState("");
  const [chatMsgs,setChatMsgs]=useState<ChatMessage[]>([]);
  const [skipMsg, setSkipMsg] = useState<{playerId: string, msg: string} | null>(null);
  const [rolling,setRolling]=useState(false);
  const [tokenAnimation,setTokenAnimation]=useState<string|null>(null);
    const [boardShake,setBoardShake]=useState(false);
  const [localDice,setLocalDice]=useState(6);
  const [lastRolls,setLastRolls]=useState<Record<string,number>>({});
  const chatEnd=useRef<HTMLDivElement>(null);
  const revisionRef=useRef(0);
  useEffect(()=>{if(snapshot)revisionRef.current=snapshot.revision;},[snapshot]);
  const cmdSeq=useRef(0);
  const moveTokenRef=useRef<(tokenId:string)=>void>(()=>{});

  const [globalTimeLeft, setGlobalTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (snapshot?.game?.phase !== "playing" || !snapshot?.game?.startTime) {
      setGlobalTimeLeft(null);
      return;
    }
    const updateTimer = () => {
      const elapsed = Date.now() - snapshot.game!.startTime!;
      const remaining = Math.max(0, 45 * 60 * 1000 - elapsed);
      setGlobalTimeLeft(remaining);
    };
    const interval = setInterval(updateTimer, 1000);
    updateTimer();
    return () => clearInterval(interval);
  }, [snapshot?.game?.startTime, snapshot?.game?.phase]);

  const formatGlobalTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const me=snapshot?.players.find(p=>p.id===playerId)??null;
  const isMyTurn=snapshot?.game?.currentPlayerId===playerId;
  const legalTokens=(isMyTurn&&snapshot?.game?.movableTokenIds)?snapshot.game.movableTokenIds:[];
  const canRoll=isMyTurn&&snapshot?.game?.dice===null&&!rolling;
  const canMove=legalTokens.length>0;
  const {timeLeft,timerRunning}=useTimer(isMyTurn??false,snapshot);
  const myAvatar=sessionStorage.getItem("apna-avatar")??"😀";

  // Block browser back while in game
  useEffect(()=>{
    if(!code)return;
    const handler=()=>{window.history.pushState(null,"",window.location.href);};
    window.history.pushState(null,"",window.location.href);
    window.addEventListener("popstate",handler);
    return ()=>window.removeEventListener("popstate",handler);
  },[code]);

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
          s.emit("room:join",{code:pc,name:n,color:joinColor as PlayerColor},(res:CommandResult<JoinResult>)=>{
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
      setChatMsgs(snap.chat || []);
      revisionRef.current=snap.revision;
      if(snap.game?.dice) {
        setLocalDice(snap.game.dice);
        setLastRolls(prev => ({...prev, [snap.game!.currentPlayerId]: snap.game!.dice!}));
      }
      if(snap.game?.lastAction?.type==="moved"){
        setTokenAnimation(snap.game.lastAction.tokenId??null);
        setTimeout(()=>setTokenAnimation(null),600);
      }
      if(snap.game?.lastAction?.type==="turn-skipped" && snap.game.lastAction.dice === 6) {
        setLocalDice(6);
        setLastRolls(prev => ({...prev, [snap.game!.lastAction!.playerId!]: 6}));
        setSkipMsg({playerId: snap.game.lastAction.playerId!, msg: "3 Sixes! Turn Missed"});
        setTimeout(() => setSkipMsg(null), 3000);
      }
      if(snap.game?.phase==="finished"&&snap.game?.winners.includes(playerId??""))setTimeout(()=>playSound("win"),200);
      if(snap.game?.currentPlayerId===playerId&&snap.game?.dice===null)playSound("turn");
      if(snap.game?.movableTokenIds?.length===1&&snap.game.currentPlayerId===playerId){setTimeout(()=>{moveTokenRef.current(snap.game!.movableTokenIds[0]!);},300);}
    });
    s.on("chat:message",(msg:ChatMessage)=>{
      setChatMsgs(p=>{const next=[...p,msg];return next.length>120?next.slice(-120):next;});
      setUnreadCount(prev => chatOpenRef.current ? 0 : prev + 1);
    });
    s.on("room:reaction", (payload) => {
      const id = Math.random().toString(36).substring(2);
      setReactions(prev => [...prev, { id, emoji: payload.emoji, playerId: payload.playerId }]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== id));
      }, 3000);
    });
    s.on("room:rematchRequested", (payload) => {
      if (payload.playerId !== playerId) {
        playSound("turn");
      }
    });
    return ()=>{s.close();};
  },[]); // eslint-disable-line

  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[chatMsgs]);
  
  const copyInvite=useCallback(async()=>{try{await navigator.clipboard.writeText(`${window.location.origin}/room/${snapshot?.code??code}`);}catch{}setCopied(true);setTimeout(()=>setCopied(false),1800);},[snapshot,code]);
  const toggleReady=()=>{if(!socket||!snapshot)return;cmdSeq.current+=1;socket.emit("room:ready",{expectedRevision:revisionRef.current},()=>{});};
  const startGame=()=>{if(!socket)return;socket.emit("room:start",{expectedRevision:revisionRef.current},()=>{});};
  const rollDice=()=>{
    if(!socket||!canRoll)return;
    playSound("dice");
    const startTime = Date.now();
    setRolling(true);
    cmdSeq.current+=1;
    const spinInterval = setInterval(() => {
        setLocalDice(Math.floor(Math.random() * 6) + 1);
    }, 60);
    socket.emit("game:roll",{expectedRevision:revisionRef.current},(res: any)=>{
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 450 - elapsed);
        setTimeout(() => {
            clearInterval(spinInterval);
            setRolling(false);
            if(res && res.dice) {
                setLocalDice(res.dice);
                playSound("land");
                setBoardShake(true);
                setTimeout(()=>setBoardShake(false),200);
            }
        }, delay);
    });
};
  const moveToken=(tokenId:string)=>{if(!socket||!canMove)return;cmdSeq.current+=1;setTokenAnimation(tokenId);socket.emit("game:move",{tokenId,expectedRevision:revisionRef.current},()=>{setTokenAnimation(null);});};
  moveTokenRef.current=moveToken;

  const handleCapture = useCallback(() => {
    playSound("capture");
    setBoardShake(true);
    setTimeout(() => setBoardShake(false), 300);
  }, []);

  const sendChat=(e:FormEvent)=>{e.preventDefault();if(!message.trim()||!socket)return;socket.emit("chat:send",{text:message.trim()},()=>{});setMessage("");};
  
  const sendReaction = (emoji: string) => {
    setSentEmoji(emoji);
    setTimeout(() => setSentEmoji(null), 1000);
    setReactionPickerOpen(false);
    if (!socket) return;
    socket.emit("room:react", { emoji }, (ack: any) => {
      if (ack && !ack.ok) {
        console.error("Reaction failed:", ack);
        if (ack.code !== "RATE_LIMITED") {
          alert("Could not send emoji: " + ack.message);
        }
      }
    });
  };
  const leaveRoom=()=>{if(socket)socket.emit("room:leave",{},()=>{});sessionStorage.removeItem(`apna-token-${snapshot?.code??code}`);navigate("/");};
  const rematchRoom=()=>{if(socket)socket.emit("room:rematch",{expectedRevision:revisionRef.current},()=>{});};

  const displayPlayers:(RoomPlayerSnapshot|undefined)[]=snapshot?[...snapshot.players,...Array(Math.max(0,4-snapshot.players.length)).fill(undefined)]:[];
  const finished=snapshot?.game?.phase==="finished";
  const winners=snapshot?.game?.winners??[];
  const iWon=winners.includes(playerId??"");
  const allChatMessages = chatMsgs;

  const renderCorner = (color: PlayerColor, pos: 'top-left'|'top-right'|'bottom-left'|'bottom-right') => {
    const p = snapshot?.game ? snapshot.game.players.find(p=>p.color===color) : snapshot?.players.find(p=>p.color===color);
    const isActive = snapshot?.phase === "playing" && snapshot?.game?.currentPlayerId === p?.id;
    const isMe = p?.id === playerId;
    const visualActivePlayerId = rolling ? playerId : snapshot?.game?.currentPlayerId;
    
    let displayDice = 1;
    if (isActive && localDice) displayDice = localDice;
    else if (p?.id && lastRolls[p.id]) displayDice = lastRolls[p.id];

    const gp = p && snapshot?.game?.players.find(gp2 => gp2.id === p.id);
    return <PlayerCorner
      key={color}
      player={p}
      position={pos}
      isActive={visualActivePlayerId === p?.id && snapshot?.game?.phase === "playing"}
      diceValue={displayDice}
      isRolling={visualActivePlayerId === p?.id && rolling}
      canRoll={canRoll && isMe}
      canMove={canMove && isMe}
      onRoll={rollDice}
      avatar={isMe ? myAvatar : ""}
      skipMsg={skipMsg?.playerId === p?.id ? skipMsg?.msg : undefined}
      timeLeft={timerRunning ? timeLeft : undefined}
      missedCount={gp?.missedTurnCount ?? 0}
    />
  };

  const baseColors = ['green', 'yellow', 'blue', 'red'] as const;
  const myPlayer = snapshot?.game?.players.find(p => p.id === playerId) || snapshot?.players.find(p => p.id === playerId);
  const myColor = myPlayer?.color || 'red';
  
  const shift = (myColor === 'green' || myColor === 'yellow') ? 2 : 0;
  
  const shifted = [...baseColors.slice(4 - shift), ...baseColors.slice(0, 4 - shift)];

  const tlColor = shifted[0];
  const trColor = shifted[1];
  const brColor = shifted[2];
  const blColor = shifted[3];
  const boardRotation = shift * 90;
  const isBotGame = snapshot?.players.some(p => p.id.startsWith("bot-") || (p as any).isBot);

  return <main className="room-page">
    <header className="room-header"><Logo compact/>
      <div className="room-code">
        {!isBotGame ? <>
          <span>ROOM</span><button onClick={copyInvite} aria-label="Copy room code">{(snapshot?.code??code).toUpperCase()} <small>{copied?tr("copy.code"):"COPY"}</small></button>
        </> : <span>SINGLE PLAYER</span>}
        {globalTimeLeft !== null && (
          <span className="global-timer" style={{ 
            marginLeft: 20, 
            padding: '4px 12px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: '20px',
            fontWeight: "bold", 
            color: globalTimeLeft < 60000 ? "var(--red)" : "inherit" 
          }}>
            🕒 {formatGlobalTime(globalTimeLeft)}
          </span>
        )}
      </div>
      <div className="header-actions">
        <button className="icon-btn drawer-toggle" onClick={()=>setDrawerOpen(o=>!o)} aria-label="Menu">{drawerOpen?"✕":"☰"}</button>
        <div className={`drawer-items ${drawerOpen?"drawer--open":""}`}>
          <ThemeToggle />
          <div className="reaction-wrapper" style={{position:"relative"}}>
            <button className="icon-btn" onClick={()=>setReactionPickerOpen(o=>!o)} aria-label="React">😄</button>
            {reactionPickerOpen && <div className="emoji-grid-popup">
                {["\u{1F600}","\u{1F602}","\u{1F621}","\u{1F62D}","\u{1F60E}","\u{1F44F}","\u{1F525}","\u{2764}\u{FE0F}","\u{1F44D}","\u{1F389}","\u{1F634}","\u{1F914}"].map(e=><button key={e} onClick={()=>sendReaction(e)} className={`emoji-btn ${sentEmoji===e?"emoji-btn--sent":""}`}>{e}</button>)}
              </div>}
          </div>
          <button className="icon-btn" onClick={()=>setChatOpen(c=>!c)} aria-label="Toggle chat">💬 {unreadCount>0&&<span className="badge">{unreadCount}</span>}</button>
          <button className="icon-btn" onClick={()=>setSettingsOpen(true)}>⚙️</button>
          <button className="icon-btn exit-btn" onClick={leaveRoom} aria-label="Exit game">🚪</button>
        </div>
      </div>
    </header>
    <div className="game-layout">
        <EmojiReactionSystem reactions={reactions} />
      <aside className="players-panel">
        <div className="panel-heading"><span>PLAYERS</span><b>{snapshot?.players.length}/4</b></div>
        {snapshot?.players.map(p=>{
          const gp = snapshot?.game?.players.find(gp=>gp.id===p.id);
          return <PlayerSeat
            key={p.id} player={p}
            active={snapshot?.game?.currentPlayerId===p.id}
            avatar={p.id===playerId?myAvatar:undefined}
            timeLeft={timerRunning ? timeLeft : undefined}
            missedCount={gp?.missedTurnCount ?? 0}
          />;
        })}
        {(snapshot?.players.length??0)<4 && !isBotGame && <button className="invite-button" onClick={copyInvite}>+ Invite Player</button>}
        {snapshot?.game&&<div className="game-stats">
          <div className="panel-heading" style={{marginTop:10}}><span>STATUS</span></div>
          {snapshot.game.players.map((p,i)=>
        <div key={p.id} className={`stat-chip ${p.id===playerId?"stat-chip--me":""}`}>
          <span className="stat-color" style={{background:COLOR_HEX[p.color]}}/>
          <span className="stat-name">{p.name} {p.id===playerId?"(You)":""}</span>
          <span className="stat-info">
            <span title="Home 🏠">🏠{p.tokens.filter(t=>t.progress===FINISH_PROGRESS).length}</span>
            <span title="Track 🎲">🎲{p.tokens.filter(t=>t.progress>=0&&t.progress<FINISH_PROGRESS).length}</span>
            <span title="Yard 🅿️">🅿️{p.tokens.filter(t=>t.progress===-1).length}</span>
          </span>
        </div>)}</div>}
      </aside>

      <section className="table-area">
        <div className="board-container">
          {renderCorner(tlColor, 'top-left')}
          {renderCorner(trColor, 'top-right')}
          
          <div className={`board-center ${boardShake ? "board-shake" : ""}`}>
            {snapshot?.game ? <LudoBoard 
              game={snapshot.game} 
              myPlayerId={playerId} 
              legalTokens={legalTokens} 
              onMove={moveToken} 
              tokenAnimation={tokenAnimation} 
              boardRotation={boardRotation}
              activeTokenId={tokenAnimation}
              onCapture={handleCapture}
            /> : <div className="board-shell" style={{ transform: `rotate(${boardRotation}deg)`, transition: 'transform 0.5s ease-in-out' }}><div className="ludo-board" role="grid" aria-label="Empty Ludo board" style={{maxHeight:"620px"}}><div className="home-yard yard-red">{[0,1,2,3].map(i=><img key={i} src="/token-red.png" alt="red" className="yard-token" style={{transform:`rotate(-${boardRotation}deg)`}}/>)}</div><div className="home-yard yard-blue">{[0,1,2,3].map(i=><img key={i} src="/token-blue.png" alt="blue" className="yard-token" style={{transform:`rotate(-${boardRotation}deg)`}}/>)}</div><div className="home-yard yard-green">{[0,1,2,3].map(i=><img key={i} src="/token-green.png" alt="green" className="yard-token" style={{transform:`rotate(-${boardRotation}deg)`}}/>)}</div><div className="home-yard yard-yellow">{[0,1,2,3].map(i=><img key={i} src="/token-yellow.png" alt="yellow" className="yard-token" style={{transform:`rotate(-${boardRotation}deg)`}}/>)}</div></div></div>}
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
      <ChatSidebar 
        chatOpen={chatOpen}
        setChatOpen={setChatOpen}
        chatMsgs={chatMsgs}
        playerId={playerId}
        message={message}
        setMessage={setMessage}
        sendChat={sendChat}
        chatEnd={chatEnd}
      />
    </div>
    {settingsOpen&&<SettingsPanel onClose={()=>setSettingsOpen(false)}/>}
    {finished&&<VictoryModal 
        snapshot={snapshot} 
        playerId={playerId} 
        iWon={iWon} 
        myAvatar={myAvatar} 
        onRematch={rematchRoom} 
        onLeave={leaveRoom} 
      />}
  </main>;
}
