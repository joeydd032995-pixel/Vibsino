import { generateGameHash } from "../utils/hash";

export interface CoinflipInput {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  choice: "heads" | "tails";
}

export interface CoinflipResult {
  result: "heads" | "tails";
  win: boolean;
  multiplier: number;
  hash: string;
}

export function playCoinflip(input: CoinflipInput): CoinflipResult {
  const { serverSeed, clientSeed, nonce, choice } = input;
  const hash = generateGameHash(serverSeed, clientSeed, nonce);
  const float = parseInt(hash.slice(0, 8), 16) / 0xffffffff;
  const result: "heads" | "tails" = float < 0.5 ? "heads" : "tails";
  const win = result === choice;
  return { result, win, multiplier: win ? 1.98 : 0, hash };
}
