import { useState, useEffect, useRef } from "react";
import { RoomSnapshot } from "@apna-ludo/shared";

export function useTimer(isMyTurn: boolean, snapshot: RoomSnapshot | null): { timeLeft: number; timerRunning: boolean } {
  const [timeLeft, setTimeLeft] = useState(10);
  const prevTurnId = useRef<string | null>(null);
  const currentPlayerId = snapshot?.game?.currentPlayerId ?? null;
  const phase = snapshot?.game?.phase;

  // Reset timer EVERY time currentPlayerId changes (any player turn)
  useEffect(() => {
    if (!snapshot?.game || phase !== "playing") {
      setTimeLeft(10);
      return;
    }
    if (currentPlayerId !== prevTurnId.current) {
      prevTurnId.current = currentPlayerId;
      setTimeLeft(10);
    }
  }, [currentPlayerId, phase]); // eslint-disable-line

  // Tick down only during my turn
  useEffect(() => {
    if (!isMyTurn || !snapshot?.game || phase !== "playing") return;
    const id = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isMyTurn, currentPlayerId, phase]); // eslint-disable-line

  return { timeLeft, timerRunning: isMyTurn && timeLeft > 0 };
}
