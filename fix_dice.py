import re

with open('client/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'function Die\(\{ value, rolling \}\: \{ value\:number; rolling\:boolean \}\) \{.*?</span>;\s*\}', re.DOTALL)
replacement = r'''function Die({ value, rolling }: { value:number; rolling:boolean }) {
    const dots:Record<number,number[]>={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
    const faces=[1,2,3,4,5,6];
    
    if (!rolling) {
      return <span className="die" aria-label={Dice shows }>
        <span className="die-face die-face--static">
          {Array.from({length:9},(_,i)=><i key={i} className={dots[value]?.includes(i)?"dot":""}/>)}
        </span>
      </span>;
    }
  
    return <span className={die die--rolling} aria-label={Dice shows }>
      <div className="die-inner">
        {faces.map(f=><span key={f} className={die-face die-face--}>
          {Array.from({length:9},(_,i)=><i key={i} className={dots[f]?.includes(i)?"dot":""}/>)}
        </span>)}
      </div>
    </span>;
  }'''
content = pattern.sub(replacement, content, count=1)

with open('client/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
