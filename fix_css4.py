import re

with open('client/src/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

css = re.sub(r'\} 50%\{transform:rotateY\(180deg\) scale\(1\.2\)\} 100%\{transform:rotateY\(360deg\) scale\(1\)\}\}', '}', css)

with open('client/src/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print('styles.css cleaned part 2')
