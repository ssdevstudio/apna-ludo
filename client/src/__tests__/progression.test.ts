import { describe, it, expect, beforeEach } from "vitest";
import {
  getProgression,
  saveProgression,
  addCoins,
  deductCoins,
  addXP,
  recordMatchResult,
  claimDailyBonus,
  canClaimDailyBonus,
  getLevelInfo,
  DAILY_BONUS_AMOUNT,
} from "../utils/progression";

describe("Ludo King Economy & Player Progression System", () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mockStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
    (globalThis as any).localStorage = mockStorage;
  });

  it("initializes with default 2500 coins and level 1", () => {
    const p = getProgression();
    expect(p.coins).toBe(2500);
    expect(p.xp).toBe(0);
    expect(p.level).toBe(1);
    expect(p.matchesPlayed).toBe(0);
    expect(p.matchesWon).toBe(0);
  });

  it("handles adding and deducting coins accurately", () => {
    addCoins(500);
    expect(getProgression().coins).toBe(3000);

    const deducted = deductCoins(1000);
    expect(deducted).toBe(true);
    expect(getProgression().coins).toBe(2000);

    const overDeducted = deductCoins(5000);
    expect(overDeducted).toBe(false);
    expect(getProgression().coins).toBe(2000);
  });

  it("correctly calculates levels from XP and detects level up", () => {
    const info1 = getLevelInfo(0);
    expect(info1.level).toBe(1);

    const res = addXP(150);
    expect(res.leveledUp).toBe(true);
    expect(res.newLevel).toBe(2);
    expect(getProgression().level).toBe(2);
  });

  it("awards winner pot and XP on match win", () => {
    // Player enters with 500 bet in a 4-player game
    const result = recordMatchResult(true, 500, 4, 2);
    expect(result.coinsDiff).toBe(2000); // 500 * 4 = 2000 pot
    expect(result.xpGained).toBe(150 + 40); // 150 base + 2 * 20 capture = 190 XP
    expect(getProgression().coins).toBe(2500 + 2000 + (result.leveledUp ? 500 : 0));
    expect(getProgression().matchesWon).toBe(1);
    expect(getProgression().matchesPlayed).toBe(1);
    expect(getProgression().tokensCaptured).toBe(2);
  });

  it("allows daily bonus claim and enforces cooldown", () => {
    expect(canClaimDailyBonus()).toBe(true);
    const claim1 = claimDailyBonus();
    expect(claim1.success).toBe(true);
    expect(claim1.amount).toBe(DAILY_BONUS_AMOUNT);
    expect(getProgression().coins).toBe(2500 + DAILY_BONUS_AMOUNT);

    // Immediate second claim should be rejected by cooldown
    expect(canClaimDailyBonus()).toBe(false);
    const claim2 = claimDailyBonus();
    expect(claim2.success).toBe(false);
  });
});
