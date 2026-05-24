import crypto from "crypto";
import { generateServerSeed, hashServerSeed, generateGameHash } from "../utils/hash";

export interface VerificationInput {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  gameType: string;
}

export interface VerificationResult {
  valid: boolean;
  hash: string;
  serverSeedHash: string;
  outcome: Record<string, unknown>;
  float: number;
}

export function verifyGameRound(input: VerificationInput): VerificationResult {
  const { serverSeed, clientSeed, nonce, gameType } = input;
  const hash = generateGameHash(serverSeed, clientSeed, nonce);
  const serverSeedHash = hashServerSeed(serverSeed);
  const float = hashToFloat(hash);
  const outcome = deriveOutcome(float, hash, gameType);
  return { valid: true, hash, serverSeedHash, outcome, float };
}

function hashToFloat(hash: string): number {
  const bytes = Buffer.from(hash.slice(0, 8), "hex");
  const int = bytes.readUInt32BE(0);
  return int / 0xffffffff;
}

function deriveOutcome(
  float: number,
  hash: string,
  gameType: string
): Record<string, unknown> {
  switch (gameType) {
    case "coinflip":
      return { result: float < 0.5 ? "heads" : "tails", float };
    case "crash": {
      const houseEdge = 0.01;
      if (float < houseEdge) return { multiplier: 1.0, crashed: true, float };
      const multiplier =
        Math.floor(((1 / (1 - float)) * (1 - houseEdge)) * 100) / 100;
      return { multiplier: Math.max(1.01, multiplier), crashed: false, float };
    }
    case "roulette": {
      const slot = Math.floor(float * 37);
      const colors: Record<number, string> = {
        0: "green",
        1: "red",
        2: "black",
        3: "red",
        4: "black",
        5: "red",
        6: "black",
        7: "red",
        8: "black",
        9: "red",
        10: "black",
        11: "black",
        12: "red",
        13: "black",
        14: "red",
        15: "black",
        16: "red",
        17: "black",
        18: "red",
        19: "red",
        20: "black",
        21: "red",
        22: "black",
        23: "red",
        24: "black",
        25: "red",
        26: "black",
        27: "red",
        28: "black",
        29: "black",
        30: "red",
        31: "black",
        32: "red",
        33: "black",
        34: "red",
        35: "black",
        36: "red",
      };
      return { slot, color: colors[slot] ?? "green", float };
    }
    case "mines": {
      // Use hash to generate mine positions for a 5x5 grid with 3 mines
      const positions: number[] = [];
      for (let i = 0; i < 25 && positions.length < 3; i++) {
        const posHash = crypto
          .createHmac("sha256", hash)
          .update(String(i))
          .digest("hex");
        const posFloat =
          Buffer.from(posHash.slice(0, 8), "hex").readUInt32BE(0) / 0xffffffff;
        const pos = Math.floor(posFloat * 25);
        if (!positions.includes(pos)) positions.push(pos);
      }
      return { mines: positions, float };
    }
    case "slots": {
      const symbols = ["cherry", "orange", "lemon", "grape", "diamond", "seven", "star"];
      const reel1 = symbols[Math.floor(float * symbols.length)];
      const float2 = hashToFloat(hash.slice(8, 16) + hash.slice(0, 8));
      const reel2 = symbols[Math.floor(float2 * symbols.length)];
      const float3 = hashToFloat(hash.slice(16, 24) + hash.slice(8, 16));
      const reel3 = symbols[Math.floor(float3 * symbols.length)];
      return { reels: [reel1, reel2, reel3], float };
    }
    default:
      return { float };
  }
}

export function generateNewSeedPair(): {
  serverSeed: string;
  serverSeedHash: string;
} {
  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);
  return { serverSeed, serverSeedHash };
}
