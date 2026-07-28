export function EmojiReactionSystem({
  reactions
}: {
  reactions: {id:string, emoji:string, playerId:string}[]
}) {
  return (
    <>
      <div className="floating-reactions" style={{position:'fixed', inset:0, pointerEvents:'none', zIndex:999, overflow:'hidden'}}>
        {reactions.map(r => (
          <div key={r.id} style={{
            position:'absolute', left:'50%', top:'50%', fontSize:'48px',
            animation:'floatUp 2.5s ease-out forwards'
          }}>{r.emoji}</div>
        ))}
      </div>
      {reactions.map(r => (
        <div key={r.id} className="screen-emoji-animation">
          {r.emoji}
        </div>
      ))}
    </>
  );
}
