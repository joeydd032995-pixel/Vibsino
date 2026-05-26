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

/**
 * Pick a symbol using rejection sampling to eliminate modulo bias.
 * Advances byteStart within the 64-char hash; retries up to 8 times.
 * Returns the chosen symbol and the next byteStart for chaining.
 */
function getSymbol(hash: string, startByte: number): { symbol: SlotSymbol; nextByte: number } {
  // limit = largest multiple of REEL_STRIP.length that fits in uint32
  const limit = Math.floor(0x100000000 / REEL_STRIP.length) * REEL_STRIP.length;
  let byteStart = startByte;

  for (let attempt = 0; attempt < 8; attempt++) {
    const end = byteStart + 8;
    const slice = end <= hash.length
      ? hash.slice(byteStart, end)
      : hash.slice(byteStart); // shouldn't happen with 64-char hash
    byteStart = end < hash.length ? end : 0; // wrap only on overflow
    const int = parseInt(slice.padEnd(8, "0"), 16);
    if (int < limit) {
      return { symbol: REEL_STRIP[int % REEL_STRIP.length] ?? "LEMON", nextByte: byteStart };
    }
  }
  // Fallback: astronomically unlikely (reject probability ≈ 0.006% per attempt)
  return { symbol: "LEMON", nextByte: byteStart };
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
  const r1 = getSymbol(hash, 0);
  const r2 = getSymbol(hash, r1.nextByte);
  const r3 = getSymbol(hash, r2.nextByte);
  const reels: [SlotSymbol, SlotSymbol, SlotSymbol] = [r1.symbol, r2.symbol, r3.symbol];
  const payoutMultiplier = evaluatePayline(reels);
  return { reels, payoutMultiplier, hash };
}
