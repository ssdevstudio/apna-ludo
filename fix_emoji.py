import re

with open('client/src/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Merge duplicate .screen-emoji-animation definitions
css = css.replace('.screen-emoji-animation {\n  animation: emojiPopNew 2.5s ease-out forwards !important;\n}', '')

old_emoji = '''.screen-emoji-animation {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 5rem;
  z-index: 1000;
  pointer-events: none;
  animation: emojiPop 2.5s ease-in-out forwards;
  filter: drop-shadow(0 8px 24px rgba(0,0,0,0.6));
}'''

new_emoji = '''.screen-emoji-animation {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 8rem;
  z-index: 9999;
  pointer-events: none;
  animation: emojiPopNew 2.5s ease-out forwards !important;
  filter: drop-shadow(0 8px 24px rgba(0,0,0,0.6));
}'''

css = css.replace(old_emoji, new_emoji)

with open('client/src/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print('Emoji CSS updated')
