import { useEffect, useRef, useState } from "react";
import { RoomSnapshot } from "@apna-ludo/shared";

export function useTimer(isMyTurn:boolean,snapshot:RoomSnapshot|null):{timeLeft:number;timerRunning:boolean}{
  const [timeLeft,setTimeLeft]=useState(30);
  const activeRef=useRef(isMyTurn);
  activeRef.current=isMyTurn;
  const currentPlayerId=snapshot?.game?.currentPlayerId;
  const phase=snapshot?.game?.phase;
  useEffect(()=>{
    if(!snapshot?.game||phase!=="playing"){setTimeLeft(30);return;}
    if(isMyTurn){setTimeLeft(30);}
    const id=setInterval(()=>{setTimeLeft(t=>{if(t<=1){if(activeRef.current)return 0;return 0;}return t-1;});},1000);
    return ()=>clearInterval(id);
  },[isMyTurn,currentPlayerId,phase]);
  return {timeLeft,timerRunning:isMyTurn&&timeLeft>0};
}
