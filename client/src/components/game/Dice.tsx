export function Die({ value, rolling }: { value:number; rolling:boolean }) {
  // Ensure we fallback to 1 if value is invalid for some reason
  const validValue = (value >= 1 && value <= 6) ? value : 1;
  
  return (
    <span className={`die ${rolling ? 'die--rolling' : ''}`} aria-label={`Dice shows ${validValue}`}>
      <img src={`/assets/dice/dice-${validValue}.svg`} className="dice-artwork" alt={`Dice ${validValue}`} draggable="false" />
      <div className="die-shadow"></div>
    </span>
  );
}
