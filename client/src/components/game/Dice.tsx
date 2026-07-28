export function Die({ value, rolling }: { value:number; rolling:boolean }) {
  const dots:Record<number,number[]>={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
  
  return (
    <span className={`die ${rolling ? 'die--rolling' : ''}`} aria-label={`Dice shows ${value}`}>
      <span className="die-face">
        {Array.from({length:9},(_,i)=><i key={i} className={dots[value]?.includes(i)?"dot":""}/>)}
      </span>
      <div className="die-shadow"></div>
    </span>
  );
}
