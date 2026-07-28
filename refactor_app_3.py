import re

with open('client/src/App.tsx', 'r', encoding='utf-8') as f:
    app = f.read()

# Update emoji list in picker
old_emojis = '["dY?","dY~,","dY~","dY~","dY~r","dYZ"]'
new_emojis = '["??","??","??","??","??","??","??","??","??","??","??","??"]'
app = app.replace(old_emojis, new_emojis)

# Make reaction picker a proper grid
old_picker = '''{reactionPickerOpen && <div className="reaction-picker" style={{position:"absolute", right:0, top:"100%", background:"white", border:"1px solid #ddd", borderRadius:"8px", padding:"4px", display:"flex", gap:"4px", zIndex:100, boxShadow:"0 2px 8px rgba(0,0,0,0.1)"}}>
              {["??","??","??","??","??","??","??","??","??","??","??","??"].map(e=><button key={e} onClick={()=>sendReaction(e)} style={{background:"none", border:"none", fontSize:"1.2rem", cursor:"pointer", padding:"4px"}}>{e}</button>)}
            </div>}'''

new_picker = '''{reactionPickerOpen && <div className="emoji-grid-popup">
              {["??","??","??","??","??","??","??","??","??","??","??","??"].map(e=><button key={e} onClick={()=>sendReaction(e)} className="emoji-btn">{e}</button>)}
            </div>}'''

app = app.replace(old_picker, new_picker)

with open('client/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(app)

print('App.tsx emoji picker updated')
