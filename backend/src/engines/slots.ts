import { generateGameHash } from "../utils/hash";

export type SlotSymbol = "7" | "BAR" | "BELL" | "GRAPE" | "CHERRY" | "ORANGE" | "LEMON";

export interface SlotsResult {
  reels: [SlotSymbol, SlotSymbol, SlotSymbol];
  payoutMultiplier: number;
  hash: string;
}

// 21 stops total: 7(1) BAR(2) BELL(3) GRAPE(3) CHERRY(4) ORANGE(4) LEMON(4)
const REEL_STRIP: SlotSymbol[] = [
  "7",
  "BAR", "BAR",
  "BELL", "BELL", "BELL",
  "GRAPE", "GRAPE", "GRAPE",
  "CHERRY", "CHERRY", "CHERRY", "CHERRY",
  "ORANGE", "ORANGE", "ORANGE", "ORANGE",
  "LEMON", "LEMON", "LEMON", "LEMON",
];

function getSymbol(hash: string, byteStart: number): SlotSymbol {
  const slice = hash.slice(byteStart, byteStart + 8);
  const int = parseInt(slice, 16);
  return REEL_STRIP[int % REEL_STRIP.length] ?? "LEMON";
}

function evaluatePayline(reels: [SlotSymbol, SlotSymbol, SlotSymbol]): number {
  const [a, b, c] = reels;
  if (a === b && b === c) {
    switch (a) {
      case "7":      return 100;
      case "BAR":    return 50;
      case "BELL":   return 25;
      case "GRAPE":  return 15;
      case "CHERRY": return 10;
      case "ORANGE": return 8;
      case "LEMON":  return 6;
    }
  }
  // Cherry in first reel = 2x bonus (when not 3-of-a-kind)
  if (a === "CHERRY") return 2;
  return 0;
}

export function spinSlots(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): SlotsResult {
  const hash = generateGameHash(serverSeed, clientSeed, nonce);
  const reel1 = getSymbol(hash, 0);
  const reel2 = getSymbol(hash, 8);
  const reel3 = getSymbol(hash, 16);
  const reels: [SlotSymbol, SlotSymbol, SlotSymbol] = [reel1, reel2, reel3];
  const payoutMultiplier = evaluatePayline(reels);
  return { reels, payoutMultiplier, hash };
}
