export function Die({ value, rolling }: { value:number; rolling:boolean }) {
  const dots:Record<number,number[]>={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
  const faces=[1,2,3,4,5,6];
  
  return (
    <div className={`die-container ${rolling ? 'die--rolling' : ''}`} aria-label={`Dice shows ${value}`}>
      <div className={`die-inner ${rolling ? 'tumbling' : `show-${value}`}`}>
        {faces.map(f => (
          <div key={f} className={`die-face die-face--${f}`}>
            {Array.from({length:9},(_,i)=><i key={i} className={dots[f]?.includes(i)?"dot":""}/>)}
          </div>
        ))}
      </div>
    </div>
  );
}
