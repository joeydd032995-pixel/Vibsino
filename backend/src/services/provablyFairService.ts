import { generateGameHash, generateServerSeed, hashServerSeed } from "../utils/hash";
import { playCrash } from "../engines/crash";
import { spinRoulette } from "../engines/roulette";
import { playCoinflip } from "../engines/coinflip";
import { placeMines } from "../engines/mines";
import { spinSlots } from "../engines/slots";
import { dealPokerHand } from "../engines/poker";

export interface VerificationInput {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  gameType: string;
  mineCount?: number;
}

export interface VerificationResult {
  valid: boolean;
  hash: string;
  serverSeedHash: string;
  outcome: Record<string, unknown>;
  float: number;
}

export function hashToFloat(hash: string): number {
  const bytes = Buffer.from(hash.slice(0, 8), "hex");
  const int = bytes.readUInt32BE(0);
  return int / 0xffffffff;
}

export function verifyGameRound(input: VerificationInput): VerificationResult {
  const { serverSeed, clientSeed, nonce, gameType, mineCount = 3 } = input;
  const hash = generateGameHash(serverSeed, clientSeed, nonce);
  const serverSeedHash = hashServerSeed(serverSeed);
  const float = hashToFloat(hash);

  let outcome: Record<string, unknown>;

  switch (gameType) {
    case "coinflip": {
      const result = playCoinflip({ serverSeed, clientSeed, nonce, choice: "heads" });
      outcome = { result: result.result, float, note: "choice=heads used for verification; actual result is independent of choice" };
      break;
    }
    case "crash": {
      const result = playCrash({ serverSeed, clientSeed, nonce });
      outcome = { crashPoint: result.crashPoint, float };
      break;
    }
    case "roulette": {
      const result = spinRoulette(serverSeed, clientSeed, nonce);
      outcome = { number: result.number, color: result.color, isOdd: result.isOdd, isHigh: result.isHigh, float };
      break;
    }
    case "mines": {
      const result = placeMines({ serverSeed, clientSeed, nonce, mineCount });
      outcome = { minePositions: result.minePositions, mineCount, float };
      break;
    }
    case "slots": {
      const result = spinSlots(serverSeed, clientSeed, nonce);
      outcome = { reels: result.reels, payoutMultiplier: result.payoutMultiplier, float };
      break;
    }
    case "jackpot": {
      outcome = { note: "Jackpot verification requires participant ticket data", float };
      break;
    }
    case "poker": {
      const result = dealPokerHand(serverSeed, clientSeed, nonce);
      outcome = { initialHand: result.initialHand, float, note: "Full deck available for draw verification" };
      break;
    }
    default:
      outcome = { float };
  }

  return { valid: true, hash, serverSeedHash, outcome, float };
}

export function generateNewSeedPair(): { serverSeed: string; serverSeedHash: string } {
  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);
  return { serverSeed, serverSeedHash };
}
