export function Die({ value, rolling }: { value:number; rolling:boolean }) {
  const dots:Record<number,number[]>={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
  const faces=[1,2,3,4,5,6];
  
  const rotations: Record<number, string> = {
    1: 'rotateX(0deg) rotateY(0deg)',
    2: 'rotateX(90deg) rotateY(0deg)',
    3: 'rotateX(0deg) rotateY(-90deg)',
    4: 'rotateX(0deg) rotateY(90deg)',
    5: 'rotateX(-90deg) rotateY(0deg)',
    6: 'rotateX(180deg) rotateY(0deg)'
  };

  return <span className={`die ${rolling ? 'die--rolling' : ''}`} aria-label={`Dice shows ${value}`}>
    <div className="die-inner" style={!rolling ? { transform: rotations[value] } : undefined}>
      {faces.map(f=><span key={f} className={`die-face die-face--${f}`}>
        {Array.from({length:9},(_,i)=><i key={i} className={dots[f]?.includes(i)?"dot":""}/>)}
      </span>)}
    </div>
    <div className="die-shadow"></div>
  </span>;
}
