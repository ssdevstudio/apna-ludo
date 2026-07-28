import re

with open('client/src/App.tsx', 'r', encoding='utf-8') as f:
    app = f.read()

app = re.sub(
    r'\{reactionPickerOpen && <div className="reaction-picker".*?</div>\}',
    '''{reactionPickerOpen && <div className="emoji-grid-popup">
              {["??","??","??","??","??","??","??","??","??","??","??","??"].map(e=><button key={e} onClick={()=>sendReaction(e)} className="emoji-btn">{e}</button>)}
            </div>}''',
    app,
    flags=re.DOTALL
)

with open('client/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(app)

print('Emoji picker replaced')
