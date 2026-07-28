import re

with open('client/src/App.tsx', 'r', encoding='utf-8') as f:
    app = f.read()

# Replace crypto.randomUUID()
app = app.replace('crypto.randomUUID()', 'Math.random().toString(36).substring(2)')

# Update arrow indicator
app = app.replace(
    '{isActive && canRoll && <div className="turn-indicator">?</div>}',
    '{isActive && canRoll && <div className="turn-indicator">{position.includes("left") ? "?" : "?"}</div>}'
)

# Update dice sound
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

with open('client/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(app)

print('App.tsx updated')
