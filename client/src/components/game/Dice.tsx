export function Die({ value, rolling }: { value:number; rolling:boolean }) {
  const validValue = (value >= 1 && value <= 6) ? value : 1;
  
  let finalX = "0deg";
  let finalY = "0deg";
  if (validValue === 1) { finalX = "0deg"; finalY = "0deg"; }
  else if (validValue === 2) { finalX = "0deg"; finalY = "-90deg"; }
  else if (validValue === 3) { finalX = "-90deg"; finalY = "0deg"; }
  else if (validValue === 4) { finalX = "90deg"; finalY = "0deg"; }
  else if (validValue === 5) { finalX = "0deg"; finalY = "90deg"; }
  else if (validValue === 6) { finalX = "0deg"; finalY = "180deg"; }

  return (
    <span className={`die ${rolling ? 'die--rolling' : ''}`} aria-label={`Dice shows ${validValue}`}>
      <div className="dice-cube-wrapper">
        <div 
          className="dice-cube" 
          style={{
            transform: rolling ? undefined : `rotateX(${finalX}) rotateY(${finalY})`,
            "--final-x": finalX,
            "--final-y": finalY
          } as React.CSSProperties}
        >
          <img src="/assets/dice/dice-1.svg" className="dice-face dice-face-front" alt="" draggable="false"/>
          <img src="/assets/dice/dice-6.svg" className="dice-face dice-face-back" alt="" draggable="false"/>
          <img src="/assets/dice/dice-2.svg" className="dice-face dice-face-right" alt="" draggable="false"/>
          <img src="/assets/dice/dice-5.svg" className="dice-face dice-face-left" alt="" draggable="false"/>
          <img src="/assets/dice/dice-3.svg" className="dice-face dice-face-top" alt="" draggable="false"/>
          <img src="/assets/dice/dice-4.svg" className="dice-face dice-face-bottom" alt="" draggable="false"/>
        </div>
      </div>
      <div className="die-shadow"></div>
    </span>
  );
}
