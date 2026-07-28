import re

with open('client/src/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

css = re.sub(r'  to \{ transform: translateX\(-8px\); \}\n\}\n', '', css)

with open('client/src/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print('styles.css cleaned')
