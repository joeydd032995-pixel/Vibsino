import { generateGameHash } from "../utils/hash";

export type Rank = "2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"J"|"Q"|"K"|"A";
export type Suit = "H"|"D"|"C"|"S";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export interface PokerDealResult {
  deck: Card[];
  initialHand: Card[];
}

export interface PokerDrawResult {
  finalHand: Card[];
  handRank: string;
  payoutMultiplier: number;
}

const RANKS: Rank[] = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const SUITS: Suit[] = ["H","D","C","S"];

const RANK_VALUES: Record<Rank, number> = {
  "2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,
  "J":11,"Q":12,"K":13,"A":14,
};

function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

export function dealPokerHand(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): PokerDealResult {
  const hash = generateGameHash(serverSeed, clientSeed, nonce);
  const deck = buildDeck();

  let currentHash = hash;
  let byteOffset = 0;
  let hashChain = 0;

  function nextUint32(): number {
    if (byteOffset + 8 > currentHash.length) {
      hashChain++;
      currentHash = generateGameHash(
        serverSeed,
        `${clientSeed}:chain:${hashChain}`,
        nonce
      );
      byteOffset = 0;
    }
    const val = parseInt(currentHash.slice(byteOffset, byteOffset + 8), 16);
    byteOffset += 8;
    return val;
  }

  // Fisher-Yates shuffle
  for (let i = 51; i > 0; i--) {
    const j = nextUint32() % (i + 1);
    const temp = deck[i]!;
    deck[i] = deck[j]!;
    deck[j] = temp;
  }

  const initialHand = deck.slice(0, 5);
  return { deck, initialHand };
}

export function drawPokerCards(
  deck: Card[],
  heldIndices: number[]
): PokerDrawResult {
  let drawIndex = 5;
  const finalHand: Card[] = deck.slice(0, 5).map((card, i) => {
    if (heldIndices.includes(i)) return card;
    const drawn = deck[drawIndex] ?? deck[0]!;
    drawIndex++;
    return drawn;
  });

  const { handRank, payoutMultiplier } = evaluateHand(finalHand);
  return { finalHand, handRank, payoutMultiplier };
}

function countValues(values: number[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const v of values) {
    counts[v] = (counts[v] ?? 0) + 1;
  }
  return counts;
}

function checkStraight(sortedValues: number[]): boolean {
  if (new Set(sortedValues).size !== 5) return false;
  if ((sortedValues[4]! - sortedValues[0]!) === 4) return true;
  // Wheel: A-2-3-4-5 (ace low)
  if (sortedValues[4] === 14) {
    const withAceLow = [1, ...sortedValues.slice(0, 4)].sort((a, b) => a - b);
    return withAceLow[4]! - withAceLow[0]! === 4 && new Set(withAceLow).size === 5;
  }
  return false;
}

function getPairedValue(counts: Record<number, number>): number {
  for (const [val, count] of Object.entries(counts)) {
    if (count === 2) return parseInt(val);
  }
  return 0;
}

function evaluateHand(hand: Card[]): { handRank: string; payoutMultiplier: number } {
  const values = hand.map(c => RANK_VALUES[c.rank]).sort((a, b) => a - b);
  const suits = hand.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = checkStraight(values);
  const valueCounts = countValues(values);
  const counts = Object.values(valueCounts).sort((a, b) => b - a);

  // Royal Flush
  if (isFlush && isStraight && values[4] === 14 && values[0] === 10) {
    return { handRank: "Royal Flush", payoutMultiplier: 800 };
  }
  // Straight Flush
  if (isFlush && isStraight) {
    return { handRank: "Straight Flush", payoutMultiplier: 50 };
  }
  // Four of a Kind
  if (counts[0] === 4) {
    return { handRank: "Four of a Kind", payoutMultiplier: 25 };
  }
  // Full House
  if (counts[0] === 3 && counts[1] === 2) {
    return { handRank: "Full House", payoutMultiplier: 9 };
  }
  // Flush
  if (isFlush) {
    return { handRank: "Flush", payoutMultiplier: 6 };
  }
  // Straight
  if (isStraight) {
    return { handRank: "Straight", payoutMultiplier: 4 };
  }
  // Three of a Kind
  if (counts[0] === 3) {
    return { handRank: "Three of a Kind", payoutMultiplier: 3 };
  }
  // Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    return { handRank: "Two Pair", payoutMultiplier: 2 };
  }
  // Jacks or Better
  if (counts[0] === 2) {
    const pairedValue = getPairedValue(valueCounts);
    if (pairedValue >= 11) {
      return { handRank: "Jacks or Better", payoutMultiplier: 1 };
    }
  }
  return { handRank: "High Card", payoutMultiplier: 0 };
}
