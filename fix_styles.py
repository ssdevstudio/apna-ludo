import re

with open('client/src/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Fix pawn centering
css = css.replace(
    '.game-pawn-wrapper{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);',
    '.game-pawn-wrapper{position:absolute;top:50%;left:50%;transform:translate(-50%,-80%);transform-origin:bottom center;'
)

# Fix turn-indicator absolute positioning
css = re.sub(
    r'\.turn-indicator\s*\{[^}]*position:\s*absolute;[^}]*\}',
    '.turn-indicator { font-size: 24px; color: #ff9800; animation: bounceX 0.6s infinite alternate; }',
    css
)
css = re.sub(
    r'\.corner-[^{]*\.turn-indicator\s*\{[^}]*\}',
    '',
    css
)

# Fix die 3D animation to 2D flip to look like Ludo King
css = css.replace(
    '.die--rolling .die-inner{animation:cubeSpin 0.45s ease-out forwards}',
    '.die--rolling .die-inner{animation:diceFlip 0.2s linear infinite}'
)
css = css.replace(
    '@keyframes cubeSpin{0%{transform:rotateX(0deg) rotateY(0deg)} 25%{transform:rotateX(180deg) rotateY(90deg)} 50%{transform:rotateX(360deg) rotateY(180deg)} 100%{transform:rotateX(720deg) rotateY(360deg)}}',
    '@keyframes diceFlip{0%{transform:rotateY(0deg) scale(1)} 50%{transform:rotateY(180deg) scale(1.2)} 100%{transform:rotateY(360deg) scale(1)}}'
)
css = css.replace(
    '.die-face--1{transform:rotateY(0deg) translateZ(22px)}',
    '.die-face--1{transform:rotateY(0deg) translateZ(0)}'
)
css = css.replace(
    '.die-face--2{transform:rotateX(-90deg) translateZ(22px)}',
    '.die-face--2{transform:rotateX(-90deg) translateZ(0)}'
)
css = css.replace(
    '.die-face--3{transform:rotateY(90deg) translateZ(22px)}',
    '.die-face--3{transform:rotateY(90deg) translateZ(0)}'
)
css = css.replace(
    '.die-face--4{transform:rotateY(-90deg) translateZ(22px)}',
    '.die-face--4{transform:rotateY(-90deg) translateZ(0)}'
)
css = css.replace(
    '.die-face--5{transform:rotateX(90deg) translateZ(22px)}',
    '.die-face--5{transform:rotateX(90deg) translateZ(0)}'
)
css = css.replace(
    '.die-face--6{transform:rotateX(180deg) translateZ(22px)}',
    '.die-face--6{transform:rotateX(180deg) translateZ(0)}'
)

with open('client/src/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print('CSS updated')
