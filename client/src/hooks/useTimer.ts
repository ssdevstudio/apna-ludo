import { useState, useEffect, useRef } from "react";
import { RoomSnapshot } from "@apna-ludo/shared";

export function useTimer(isMyTurn: boolean, snapshot: RoomSnapshot | null): { timeLeft: number; timerRunning: boolean } {
  const [timeLeft, setTimeLeft] = useState(10);
  const prevCurrentPlayerId = useRef<string | null>(null);
  const currentPlayerId = snapshot?.game?.currentPlayerId ?? null;
  const phase = snapshot?.game?.phase;

  // Reset timer when it becomes my turn (after another player's turn ends)
  useEffect(() => {
    if (!snapshot?.game || phase !== "playing") {
      setTimeLeft(10);
      return;
    }
    if (currentPlayerId && currentPlayerId !== prevCurrentPlayerId.current) {
      prevCurrentPlayerId.current = currentPlayerId;
      if (isMyTurn) setTimeLeft(10);
    }
  }, [currentPlayerId, isMyTurn, phase, snapshot?.game]);

  // Tick down while it's my turn
  useEffect(() => {
    if (!isMyTurn || !snapshot?.game || phase !== "playing") return;
    const id = setInterval(() => {
      setTimeLeft(t => t <= 0 ? 0 : t - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [isMyTurn, snapshot?.game, phase]);

  return { timeLeft, timerRunning: isMyTurn && timeLeft > 0 };
}
