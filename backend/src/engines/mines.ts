import { generateGameHash } from "../utils/hash";

export interface MinesInput {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  mineCount: number;
}

export interface MinesResult {
  minePositions: number[];
  mineCount: number;
  hash: string;
}

export function placeMines(input: MinesInput): MinesResult {
  const { serverSeed, clientSeed, nonce, mineCount } = input;
  const hash = generateGameHash(serverSeed, clientSeed, nonce);

  // Fisher-Yates partial shuffle of [0..24]
  const positions: number[] = Array.from({ length: 25 }, (_, i) => i);

  let hashPool = hash;
  let byteOffset = 0;
  let chainNonce = 0;

  function nextFloat(): number {
    if (byteOffset + 8 > hashPool.length) {
      chainNonce++;
      hashPool = generateGameHash(
        serverSeed,
        `${clientSeed}:chain:${chainNonce}`,
        nonce + 1
      );
      byteOffset = 0;
    }
    const slice = hashPool.slice(byteOffset, byteOffset + 8);
    byteOffset += 8;
    return parseInt(slice, 16) / 0xffffffff;
  }

  // Partial Fisher-Yates: shuffle last mineCount positions
  for (let i = 24; i >= 25 - mineCount; i--) {
    const j = Math.floor(nextFloat() * (i + 1));
    const temp = positions[i] ?? i;
    positions[i] = positions[j] ?? j;
    positions[j] = temp;
  }

  const minePositions = positions.slice(25 - mineCount);
  return { minePositions, mineCount, hash };
}

export function calculateMinesMultiplier(
  mineCount: number,
  safeRevealed: number,
  houseEdge: number = 0.01
): number {
  if (safeRevealed === 0) return 1.0;
  let probability = 1.0;
  for (let k = 0; k < safeRevealed; k++) {
    const safeRemaining = 25 - mineCount - k;
    const totalRemaining = 25 - k;
    if (safeRemaining <= 0 || totalRemaining <= 0) return 0;
    probability *= safeRemaining / totalRemaining;
  }
  if (probability <= 0) return 0;
  return Math.round((1 / probability) * (1 - houseEdge) * 100) / 100;
}
