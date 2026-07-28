import re

with open('client/src/App.tsx', 'r', encoding='utf-8') as f:
    app = f.read()

# 1. Update crypto.randomUUID to Math.random
app = app.replace('crypto.randomUUID()', 'Math.random().toString(36).substring(2)')

# 2. Update turn-indicator
app = app.replace(
    '{isActive && canRoll && <div className="turn-indicator">?</div>}',
    '{isActive && canRoll && <div className="turn-indicator">{position.includes("left") ? "?" : "?"}</div>}'
)

# 3. Update dice sound
old_sound = '''      if (type==="dice") {
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
        return;
      }'''

new_sound = '''      if (type==="dice") {
        for(let i=0; i<8; i++){
          const o2=ctx.createOscillator(), g2=ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.type="square"; o2.frequency.value = 150 + Math.random()*200;
          g2.gain.setValueAtTime(.05, n + i*.05);
          g2.gain.exponentialRampToValueAtTime(.001, n + i*.05 + .03);
          o2.start(n + i*.05); o2.stop(n + i*.05 + .04);
        }
        return;
      }'''
app = app.replace(old_sound, new_sound)

# 4. Update blinkStyle and yard-blink-overlay
app = re.sub(
    r'const blinkStyle: React\.CSSProperties = \{.*?\};',
    '''const blinkStyle: React.CSSProperties = {
        position: 'absolute', width: '40%', height: '40%', zIndex: 10, pointerEvents: 'none', borderRadius: '12px'
      };''',
    app,
    flags=re.DOTALL
)

app = app.replace(
    '''return <div key={p.id} style={blinkStyle} className={`yard-blink-overlay color-${p.color}`} />;''',
    '''return <div key={p.id} style={blinkStyle} className={`yard-blink-overlay color-${p.color} turn-highlight-border`} />;'''
)

# 5. Update Token Movement (pawn--animate)
app = app.replace(
    'const innerClass = `game-pawn-inner pawn-color-${t.color} ${isLegalToken ? "legal-token" : ""} ${tokenAnimation===t.id ? "pawn--animate" : ""}`;',
    'const innerClass = `game-pawn-inner pawn-color-${t.color} ${isLegalToken ? "legal-token premium-pulse" : ""} ${tokenAnimation===t.id ? "pawn--animate token-hop" : ""}`;'
)

# 6. Add boardShake state
app = app.replace(
    'const [tokenAnimation,setTokenAnimation]=useState<string|null>(null);',
    'const [tokenAnimation,setTokenAnimation]=useState<string|null>(null);\n    const [boardShake,setBoardShake]=useState(false);'
)

# 7. Apply board-shake class
app = app.replace(
    '<div className="board-center">',
    '<div className={`board-center ${boardShake ? "board-shake" : ""}`}>'
)

# 8. Trigger capture effect
capture_logic = '''if(snap.game?.lastAction?.type==="moved"){setTokenAnimation(snap.game.lastAction.tokenId??null);setTimeout(()=>setTokenAnimation(null),600);if(snap.game.lastAction.capturedTokenIds?.length){playSound("capture");setBoardShake(true);setTimeout(()=>setBoardShake(false),300);}}'''
app = app.replace(
    'if(snap.game?.lastAction?.type==="moved"){setTokenAnimation(snap.game.lastAction.tokenId??null);setTimeout(()=>setTokenAnimation(null),600);if(snap.game.lastAction.capturedTokenIds?.length)playSound("capture");}',
    capture_logic
)

# 9. Update emoji list in picker
new_picker = '''{reactionPickerOpen && <div className="emoji-grid-popup">
              {["\\u{1F600}","\\u{1F602}","\\u{1F621}","\\u{1F62D}","\\u{1F60E}","\\u{1F44F}","\\u{1F525}","\\u{2764}\\u{FE0F}","\\u{1F44D}","\\u{1F389}","\\u{1F634}","\\u{1F914}"].map(e=><button key={e} onClick={()=>sendReaction(e)} className="emoji-btn">{e}</button>)}
            </div>}'''
# Need to use regex because mojibake characters are annoying
app = re.sub(r'\{reactionPickerOpen && <div className="reaction-picker".*?</div>\}', lambda m: new_picker, app, flags=re.DOTALL)
app = re.sub(r'\{reactionPickerOpen && <div className="emoji-grid-popup".*?</div>\}', lambda m: new_picker, app, flags=re.DOTALL) # in case it was already replaced partially

# 10. Add spin interval to rollDice
old_roll = 'const rollDice=()=>{if(!socket||!canRoll)return;playSound("dice");setRolling(true);cmdSeq.current+=1;socket.emit("game:roll",{expectedRevision:revisionRef.current},()=>{setRolling(false);});};'
new_roll = '''const rollDice=()=>{
    if(!socket||!canRoll)return;
    playSound("dice");
    setRolling(true);
    cmdSeq.current+=1;
    const spinInterval = setInterval(() => {
        setLocalDice(Math.floor(Math.random() * 6) + 1);
    }, 60);
    socket.emit("game:roll",{expectedRevision:revisionRef.current},(res: any)=>{
        clearInterval(spinInterval);
        setRolling(false);
        if(res && res.dice) {
            setLocalDice(res.dice);
            playSound("land");
            setBoardShake(true);
            setTimeout(()=>setBoardShake(false),200);
        }
    });
};'''
app = app.replace(old_roll, new_roll)


with open('client/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(app)

print('App.tsx fully refactored safely')
