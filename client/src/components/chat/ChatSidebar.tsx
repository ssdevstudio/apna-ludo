import { FormEvent } from "react";
import { ChatMessage } from "@apna-ludo/shared";

export function ChatSidebar({
  chatOpen,
  setChatOpen,
  chatMsgs,
  playerId,
  message,
  setMessage,
  sendChat,
  chatEnd
}: {
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  chatMsgs: ChatMessage[];
  playerId: string | null;
  message: string;
  setMessage: (m: string) => void;
  sendChat: (e: FormEvent) => void;
  chatEnd: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <aside className={`chat-panel ${chatOpen?"chat-panel--open":""}`}>
      <div className="chat-heading">
        <div><span>TABLE TALK</span><b>Friends & family only.</b></div>
        <button onClick={()=>setChatOpen(false)}>×</button>
      </div>
      <div className="messages" aria-live="polite">
        {chatMsgs.map(m => (
          <div key={m.id} className={`message ${m.playerId===playerId?"message--mine":""}`}>
            <span>{m.playerName[0]}</span>
            <div>
              <small>{m.playerName} · {new Date(m.sentAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</small>
              <p>{m.text}</p>
            </div>
          </div>
        ))}
        <div ref={chatEnd}/>
      </div>
      <form className="chat-form" onSubmit={sendChat}>
        <input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Say something…" maxLength={180}/>
        <button type="submit" aria-label="Send message">↑</button>
      </form>
    </aside>
  );
}
