import re

with open('client/src/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Update turn indicator CSS
old_indicator = '.turn-indicator { font-size: 24px; color: #ff9800; animation: bounceX 0.6s infinite alternate; }'
new_indicator = '''/* Arrow indicator outside the player box */
.turn-indicator {
  position: absolute;
  font-size: 32px;
  font-weight: bold;
  color: #ff9800;
  z-index: 20;
  text-shadow: 0 0 8px rgba(255,255,255,1), 0 0 4px rgba(0,0,0,0.5);
}
.corner-bottom-left .turn-indicator, .corner-top-left .turn-indicator {
  right: -50px;
  animation: pointLeft 0.5s infinite alternate ease-in-out;
}
.corner-bottom-right .turn-indicator, .corner-top-right .turn-indicator {
  left: -50px;
  animation: pointRight 0.5s infinite alternate ease-in-out;
}

@keyframes pointLeft {
  from { transform: translateX(0); }
  to { transform: translateX(-15px); }
}
@keyframes pointRight {
  from { transform: translateX(0); }
  to { transform: translateX(15px); }
}'''
css = css.replace(old_indicator, new_indicator)
css = re.sub(r'@keyframes bounceX\s*\{[^}]*\}', '', css)

# Update dice rolling animation to Ludo King style rattle
css = css.replace(
    '.die--rolling .die-inner{animation:diceFlip 0.2s linear infinite}',
    '.die--rolling .die-inner{animation:diceRattle 0.3s linear infinite}'
)

new_rattle = '''@keyframes diceRattle {
  0% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(15deg) scale(1.1); }
  50% { transform: rotate(0deg) scale(1.2); }
  75% { transform: rotate(-15deg) scale(1.1); }
  100% { transform: rotate(0deg) scale(1); }
}'''
css = re.sub(r'@keyframes diceFlip\s*\{[^}]*\}', new_rattle, css)

with open('client/src/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print('styles.css updated')
