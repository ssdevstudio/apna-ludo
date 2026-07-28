import re

with open('client/src/App.tsx', 'r', encoding='utf-8') as f:
    app = f.read()

app = app.replace(
    'function playSound(type: "dice"|"move"|"capture"|"win"|"turn"|"click"|"enter"|"six"|"star") {',
    'function playSound(type: "dice"|"move"|"capture"|"win"|"turn"|"click"|"enter"|"six"|"star"|"land") {'
)

old_dice_sound = '''      if (type==="dice") {
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

new_sound_logic = '''      if (type==="dice") {
        for(let i=0; i<8; i++){
          const o2=ctx.createOscillator(), g2=ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.type="square"; o2.frequency.value = 150 + Math.random()*200;
          g2.gain.setValueAtTime(.05, n + i*.05);
          g2.gain.exponentialRampToValueAtTime(.001, n + i*.05 + .03);
          o2.start(n + i*.05); o2.stop(n + i*.05 + .04);
        }
        return;
      }
      if (type==="land") {
        const o=ctx.createOscillator(), g=ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type="sine";
        o.frequency.setValueAtTime(300, n);
        o.frequency.exponentialRampToValueAtTime(150, n+.1);
        g.gain.setValueAtTime(.2, n);
        g.gain.exponentialRampToValueAtTime(.01, n+.15);
        o.start(n); o.stop(n+.2);
        return;
      }'''
app = app.replace(old_dice_sound, new_sound_logic)

with open('client/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(app)

print('App.tsx sounds updated')
