import re

with open('client/src/App.tsx', 'r', encoding='utf-8') as f:
    app = f.read()

# Update blinkStyle and yard-blink-overlay
app = re.sub(
    r'const blinkStyle: React\.CSSProperties = \{.*?\};',
    '''const blinkStyle: React.CSSProperties = {
        position: 'absolute', width: '40%', height: '40%', zIndex: 10, pointerEvents: 'none', borderRadius: '12px'
      };''',
    app,
    flags=re.DOTALL
)

app = app.replace(
    '''return <div key={p.id} style={blinkStyle} className={yard-blink-overlay color-} />;''',
    '''return <div key={p.id} style={blinkStyle} className={yard-blink-overlay color- turn-highlight-border} />;'''
)

# Update Token Movement (pawn--animate)
app = app.replace(
    'const innerClass = game-pawn-inner pawn-color-  ;',
    'const innerClass = game-pawn-inner pawn-color-  ;'
)

with open('client/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(app)

print('App.tsx partial updates applied')
