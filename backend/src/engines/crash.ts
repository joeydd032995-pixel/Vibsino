import { generateGameHash } from "../utils/hash";

export interface CrashInput {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

export interface CrashResult {
  crashPoint: number;
  hash: string;
}

export function playCrash(input: CrashInput): CrashResult {
  const { serverSeed, clientSeed, nonce } = input;
  const hash = generateGameHash(serverSeed, clientSeed, nonce);
  const h = parseInt(hash.slice(0, 8), 16);

  // House edge: ~3% instant crash on h % 33 === 0
  if (h % 33 === 0) {
    return { crashPoint: 1.0, hash };
  }

  // crashPoint = floor(100 * 0.99 / (1 - h/2^32)) / 100
  const raw = Math.floor((100 * 0.99) / (1 - h / 0x100000000)) / 100;
  const crashPoint = Math.min(100000, Math.max(1.01, raw));

  return { crashPoint, hash };
}
