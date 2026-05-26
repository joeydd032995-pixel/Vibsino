import { generateGameHash } from "../utils/hash";

export type RouletteColor = "green" | "red" | "black";
export type RouletteBetType =
  | "straight" | "split" | "street" | "corner" | "sixline"
  | "column" | "dozen" | "red" | "black" | "odd" | "even" | "high" | "low";

export interface RouletteBetItem {
  type: RouletteBetType;
  value: number;        // bet amount (stake) in currency
  numbers?: number[];   // applicable numbers for straight/split/street/corner/sixline
  selection?: number;   // column (1|2|3) or dozen (1|2|3) identifier
}

export interface RouletteSpinResult {
  number: number;
  color: RouletteColor;
  isOdd: boolean;
  isHigh: boolean;
  hash: string;
}

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

export function spinRoulette(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): RouletteSpinResult {
  const hash = generateGameHash(serverSeed, clientSeed, nonce);
  const int = parseInt(hash.slice(0, 8), 16);
  // Use 0x100000000 so float ∈ [0,1) — prevents number from reaching 37
  const float = int / 0x100000000;
  const number = Math.floor(float * 37); // 0–36

  const color: RouletteColor =
    number === 0 ? "green" : RED_NUMBERS.has(number) ? "red" : "black";
  const isOdd = number > 0 && number % 2 === 1;
  const isHigh = number >= 19 && number <= 36;

  return { number, color, isOdd, isHigh, hash };
}

export function calculateRoulettePayout(
  spin: RouletteSpinResult,
  bets: RouletteBetItem[]
): number {
  let totalPayout = 0;
  const n = spin.number;

  for (const bet of bets) {
    let multiplier = 0;
    switch (bet.type) {
      case "straight":
        if (bet.numbers?.[0] === n) multiplier = 36;
        break;
      case "split":
        if (bet.numbers?.includes(n)) multiplier = 18;
        break;
      case "street":
        if (bet.numbers?.includes(n)) multiplier = 12;
        break;
      case "corner":
        if (bet.numbers?.includes(n)) multiplier = 9;
        break;
      case "sixline":
        if (bet.numbers?.includes(n)) multiplier = 6;
        break;
      case "column": {
        // Use selection for the column identifier; fall back to value for backwards compat
        const col = bet.selection ?? bet.value;
        if (n > 0 && n % 3 === (col === 3 ? 0 : col)) multiplier = 3;
        break;
      }
      case "dozen": {
        // Use selection for the dozen identifier; fall back to value for backwards compat
        const doz = bet.selection ?? bet.value;
        if (n > 0 && Math.ceil(n / 12) === doz) multiplier = 3;
        break;
      }
      case "red":
        if (spin.color === "red") multiplier = 2;
        break;
      case "black":
        if (spin.color === "black") multiplier = 2;
        break;
      case "odd":
        if (spin.isOdd) multiplier = 2;
        break;
      case "even":
        if (n > 0 && !spin.isOdd) multiplier = 2;
        break;
      case "high":
        if (spin.isHigh) multiplier = 2;
        break;
      case "low":
        if (n >= 1 && n <= 18) multiplier = 2;
        break;
    }
    totalPayout += bet.value * multiplier;
  }
  return totalPayout;
}
