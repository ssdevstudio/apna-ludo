import re

with open('client/src/App.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    'aria-label={Dice shows }',
    'aria-label={Dice shows }'
)
code = code.replace(
    'className={die die--rolling}',
    'className={die die--rolling}'
)
code = code.replace(
    'className={die-face die-face--}',
    'className={die-face die-face--}'
)

with open('client/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print('Die component fixed')
