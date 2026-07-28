import re

with open('client/src/App.tsx', 'r', encoding='utf-8') as f:
    app = f.read()

confetti_elements = '<div className="confetti" style={{left:"10%", animationDelay:"0s"}}/><div className="confetti" style={{left:"30%", animationDelay:"0.2s"}}/><div className="confetti" style={{left:"50%", animationDelay:"0.5s"}}/><div className="confetti" style={{left:"70%", animationDelay:"0.1s"}}/><div className="confetti" style={{left:"90%", animationDelay:"0.4s"}}/>'

app = app.replace(
    '{finished&&<div className="modal-backdrop">',
    '{finished&&<div className="modal-backdrop">' + confetti_elements
)

with open('client/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(app)

print('App.tsx confetti added')
