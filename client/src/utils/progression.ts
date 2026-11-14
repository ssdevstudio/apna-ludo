export type VipFrame = "none" | "bronze" | "silver" | "gold" | "diamond";

export interface PlayerProgression {
  coins: number;
  xp: number;
  level: number;
  matchesPlayed: number;
  matchesWon: number;
  tokensCaptured: number;
  lastDailyBonus: number;
  vipFrame?: VipFrame;
}

const STORAGE_KEY = "apna_ludo_progression_v1";
const DEFAULT_COINS = 2500;
const DAILY_BONUS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
export const DAILY_BONUS_AMOUNT = 1000;

export function getLevelThreshold(level: number): number {
  // Level 1: 100 XP, Level 2: 250 XP, Level 3: 450 XP, Level 4: 700 XP, etc.
  return Math.floor(50 * level * (level + 1));
}

export function getLevelInfo(totalXp: number): {
  level: number;
  currentLevelXp: number;
  neededLevelXp: number;
  progressPercent: number;
} {
  let level = 1;
  while (totalXp >= getLevelThreshold(level)) {
    level++;
  }
  const prevThreshold = level === 1 ? 0 : getLevelThreshold(level - 1);
  const nextThreshold = getLevelThreshold(level);
  const currentLevelXp = totalXp - prevThreshold;
  const neededLevelXp = nextThreshold - prevThreshold;
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentLevelXp / neededLevelXp) * 100)));

  return { level, currentLevelXp, neededLevelXp, progressPercent };
}

export function getProgression(): PlayerProgression {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const level = getLevelInfo(data.xp || 0).level;
      return {
        coins: typeof data.coins === "number" ? data.coins : DEFAULT_COINS,
        xp: typeof data.xp === "number" ? data.xp : 0,
        level,
        matchesPlayed: data.matchesPlayed || 0,
        matchesWon: data.matchesWon || 0,
        tokensCaptured: data.tokensCaptured || 0,
        lastDailyBonus: data.lastDailyBonus || 0,
      };
    }
  } catch {}

  const initial: PlayerProgression = {
    coins: DEFAULT_COINS,
    xp: 0,
    level: 1,
    matchesPlayed: 0,
    matchesWon: 0,
    tokensCaptured: 0,
    lastDailyBonus: 0,
  };
  saveProgression(initial);
  return initial;
}

export function saveProgression(progression: PlayerProgression): void {
  try {
    progression.level = getLevelInfo(progression.xp).level;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progression));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("progression-updated", { detail: progression }));
    }
  } catch {}
}

export function addCoins(amount: number): PlayerProgression {
  const p = getProgression();
  p.coins = Math.max(0, p.coins + amount);
  saveProgression(p);
  return p;
}

export function deductCoins(amount: number): boolean {
  const p = getProgression();
  if (p.coins < amount) return false;
  p.coins -= amount;
  saveProgression(p);
  return true;
}

export function addXP(amount: number): {
  progression: PlayerProgression;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
} {
  const p = getProgression();
  const oldLevel = getLevelInfo(p.xp).level;
  p.xp += amount;
  const newLevel = getLevelInfo(p.xp).level;
  p.level = newLevel;
  saveProgression(p);
  return {
    progression: p,
    oldLevel,
    newLevel,
    leveledUp: newLevel > oldLevel,
  };
}

export function recordMatchResult(
  won: boolean,
  entryFee: number,
  playerCount: number,
  tokensCaptured: number = 0
): {
  coinsDiff: number;
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
  newTotalCoins: number;
} {
  const p = getProgression();
  p.matchesPlayed += 1;
  p.tokensCaptured += tokensCaptured;

  let coinsDiff = 0;
  if (won) {
    p.matchesWon += 1;
    // Total prize pool: entryFee * playerCount.
    // If player already paid entryFee at start, net gain is entryFee * (playerCount - 1),
    // but here we pay out the whole prize pot if bet was placed.
    coinsDiff = entryFee > 0 ? entryFee * playerCount : 100; // free games reward 100 coins
    p.coins += coinsDiff;
  } else {
    // Consolation for finished match
    coinsDiff = 0;
  }

  // Base XP: 150 XP for win, 40 XP for completion, +20 XP per token captured
  const baseXP = won ? 150 : 40;
  const captureXP = tokensCaptured * 20;
  const xpGained = baseXP + captureXP;

  const oldLevel = getLevelInfo(p.xp).level;
  p.xp += xpGained;
  const newLevel = getLevelInfo(p.xp).level;
  p.level = newLevel;

  // Level-up reward: +500 coins per level up!
  if (newLevel > oldLevel) {
    p.coins += (newLevel - oldLevel) * 500;
  }

  saveProgression(p);

  return {
    coinsDiff,
    xpGained,
    leveledUp: newLevel > oldLevel,
    newLevel,
    newTotalCoins: p.coins,
  };
}

export function canClaimDailyBonus(): boolean {
  const p = getProgression();
  if (p.coins < 200) return true; // Emergency refill if broke!
  return Date.now() - p.lastDailyBonus >= DAILY_BONUS_COOLDOWN_MS;
}

export function getTimeUntilDailyBonus(): number {
  const p = getProgression();
  const elapsed = Date.now() - p.lastDailyBonus;
  return Math.max(0, DAILY_BONUS_COOLDOWN_MS - elapsed);
}

export function claimDailyBonus(): { success: boolean; amount: number } {
  if (!canClaimDailyBonus()) return { success: false, amount: 0 };
  const p = getProgression();
  const amount = p.coins < 200 ? 500 : DAILY_BONUS_AMOUNT;
  p.coins += amount;
  p.lastDailyBonus = Date.now();
  saveProgression(p);
  return { success: true, amount };
}

export function claimLuckySpin(amount: number): { success: boolean; newTotal: number } {
  const p = getProgression();
  p.coins += amount;
  p.lastDailyBonus = Date.now();
  saveProgression(p);
  return { success: true, newTotal: p.coins };
}

export function setVipFrame(frame: VipFrame): void {
  const p = getProgression();
  p.vipFrame = frame;
  saveProgression(p);
}
