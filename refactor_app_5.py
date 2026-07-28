import re

with open('client/src/App.tsx', 'r', encoding='utf-8') as f:
    app = f.read()

# Add spin interval to rollDice
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

print('App.tsx rollDice updated')
