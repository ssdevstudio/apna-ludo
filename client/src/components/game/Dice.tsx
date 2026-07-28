export function Die({ value, rolling }: { value:number; rolling:boolean }) {
  const dots:Record<number,number[]>={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
  const faces=[1,2,3,4,5,6];
  
  if (!rolling) {
    return <span className="die" aria-label={`Dice shows ${value}`}>
      <span className="die-face die-face--static">
        {Array.from({length:9},(_,i)=><i key={i} className={dots[value]?.includes(i)?"dot":""}/>)}
      </span>
    </span>;
  }

  return <span className={`die die--rolling`} aria-label={`Dice shows ${value}`}>
    <div className="die-inner">
      {faces.map(f=><span key={f} className={`die-face die-face--${f}`}>
        {Array.from({length:9},(_,i)=><i key={i} className={dots[f]?.includes(i)?"dot":""}/>)}
      </span>)}
    </div>
  </span>;
}
