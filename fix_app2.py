import re

with open('client/src/App.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix rollDice function
new_roll_dice = '''  const rollDice=()=>{
    if(!socket||!canRoll)return;
    playSound("dice");
    setRolling(true);
    setLocalDice(null);
    cmdSeq.current+=1;
    
    const spinInterval = setInterval(() => {
      setLocalDice(Math.floor(Math.random() * 6) + 1);
    }, 100);

    socket.emit("game:roll",{expectedRevision:revisionRef.current},(res: any)=>{
        setTimeout(() => {
            clearInterval(spinInterval);
            if (res.ok && res.dice) {
                setLocalDice(res.dice);
                setLastRolls(prev => ({...prev, [playerId!]: res.dice}));
            } else {
                setLocalDice(null);
            }
            setRolling(false);
        }, 500);
    });
  };'''

code = re.sub(
    r'const rollDice=\(\)=>{[^}]*socket\.emit\("game:roll"[^}]*\}\);\};',
    new_roll_dice,
    code
)

with open('client/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print('App.tsx updated')
