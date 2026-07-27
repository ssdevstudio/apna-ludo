import re

with open('client/src/styles.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix yard blink shadow
pattern = re.compile(r'@keyframes yardBlinkNew \{.*?\}', re.DOTALL)
replacement = r'''@keyframes yardBlinkNew {
    0% { box-shadow: inset 0 0 0 rgba(255,255,255,0); background-color: rgba(255,255,255,0); }
    50% { box-shadow: inset 0 0 10px rgba(255,255,255,0.8), 0 0 8px rgba(255,255,255,0.6); background-color: rgba(255,255,255,0.3); }
    100% { box-shadow: inset 0 0 0 rgba(255,255,255,0); background-color: rgba(255,255,255,0); }
  }'''
content = pattern.sub(replacement, content, count=1)

# Add die-face--static
if '.die-face--static' not in content:
    content += '\n.die-face--static { position: relative; z-index: 2; inset: auto; width: 100%; height: 100%; transform: none; }\n'

with open('client/src/styles.css', 'w', encoding='utf-8') as f:
    f.write(content)
