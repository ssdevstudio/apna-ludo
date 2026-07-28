import re

with open('client/src/App.tsx', 'r', encoding='utf-8') as f:
    app = f.read()

# Add boardShake and captureEffect state
app = app.replace(
    'const [tokenAnimation,setTokenAnimation]=useState<string|null>(null);',
    'const [tokenAnimation,setTokenAnimation]=useState<string|null>(null);\n    const [boardShake,setBoardShake]=useState(false);\n    const [captureEffect,setCaptureEffect]=useState<{id:string, top:string, left:string}[]>([]);'
)

# Apply board-shake class to LudoBoard container
app = app.replace(
    '<div className="board-center">',
    '<div className={oard-center }>'
)

# Trigger capture effect when capturedTokenIds is present
capture_logic = '''if(snap.game?.lastAction?.type==="moved"){setTokenAnimation(snap.game.lastAction.tokenId??null);setTimeout(()=>setTokenAnimation(null),600);if(snap.game.lastAction.capturedTokenIds?.length){playSound("capture");setBoardShake(true);setTimeout(()=>setBoardShake(false),300);}}'''
app = app.replace(
    'if(snap.game?.lastAction?.type==="moved"){setTokenAnimation(snap.game.lastAction.tokenId??null);setTimeout(()=>setTokenAnimation(null),600);if(snap.game.lastAction.capturedTokenIds?.length)playSound("capture");}',
    capture_logic
)

with open('client/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(app)

print('App.tsx capture effect state applied')
