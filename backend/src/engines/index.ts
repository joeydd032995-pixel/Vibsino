export { playCrash } from "./crash";
export type { CrashInput, CrashResult } from "./crash";

export { spinRoulette, calculateRoulettePayout } from "./roulette";
export type { RouletteSpinResult, RouletteBetItem, RouletteBetType, RouletteColor } from "./roulette";

export { playCoinflip } from "./coinflip";
export type { CoinflipInput, CoinflipResult } from "./coinflip";

export { placeMines, calculateMinesMultiplier } from "./mines";
export type { MinesInput, MinesResult } from "./mines";

export { spinSlots } from "./slots";
export type { SlotsResult, SlotSymbol } from "./slots";

export { resolveJackpot } from "./jackpot";
export type { JackpotInput, JackpotResult, JackpotParticipant } from "./jackpot";

export { dealPokerHand, drawPokerCards } from "./poker";
export type { Card, PokerDealResult, PokerDrawResult, Rank, Suit } from "./poker";
