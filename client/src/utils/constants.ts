import type { PlayerColor } from "@apna-ludo/shared";

export type ConnState = "connecting"|"online"|"offline"|"reconnecting";
export const COLORS: PlayerColor[] = ["red","green","yellow","blue"];
export const COLOR_HEX: Record<PlayerColor,string> = { red:"#DF4C4B", blue:"#3783BA", yellow:"#E7B93F", green:"#3B9C70" };
export const AVATARS = ["😀","😎","🤩","🦁","🐯","🐸","🚀","🎯","💎","🔥","🌟","🎲"];
