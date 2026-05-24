export interface GameInfo {
  id: string;
  name: string;
  description: string;
  houseEdge: string;
  minBet: number;
  maxBet: number;
  players: number;
  category: string;
  available: boolean;
  badge?: string;
  icon: string;
  gradient: string;
  color: string;
}

export const GAMES: GameInfo[] = [
  {
    id: "crash",
    name: "Crash",
    description: "Watch the multiplier rise — cash out before it crashes!",
    houseEdge: "1%",
    minBet: 0.1,
    maxBet: 1000,
    players: 47,
    category: "Multiplayer",
    available: true,
    icon: "🚀",
    gradient: "from-red-900/40 to-orange-900/40",
    color: "#ef4444",
  },
  {
    id: "roulette",
    name: "Roulette",
    description: "European roulette with 37 pockets and provably fair spins.",
    houseEdge: "2.7%",
    minBet: 0.1,
    maxBet: 500,
    players: 12,
    category: "Classic",
    available: true,
    icon: "🎡",
    gradient: "from-green-900/40 to-emerald-900/40",
    color: "#10b981",
  },
  {
    id: "coinflip",
    name: "Coinflip",
    description: "Heads or tails — 50/50 with a 1% house edge.",
    houseEdge: "1%",
    minBet: 0.01,
    maxBet: 2000,
    players: 28,
    category: "Simple",
    available: true,
    icon: "🪙",
    gradient: "from-yellow-900/40 to-amber-900/40",
    color: "#f59e0b",
  },
  {
    id: "mines",
    name: "Mines",
    description: "Reveal tiles, avoid mines. The deeper you go, the bigger the multiplier.",
    houseEdge: "1%",
    minBet: 0.1,
    maxBet: 500,
    players: 19,
    category: "Strategy",
    available: true,
    icon: "💣",
    gradient: "from-purple-900/40 to-violet-900/40",
    color: "#8b5cf6",
  },
  {
    id: "jackpot",
    name: "Jackpot",
    description: "Contribute to the pot. Your chance proportional to your deposit.",
    houseEdge: "5%",
    minBet: 0.5,
    maxBet: 100,
    players: 8,
    category: "Pool",
    available: true,
    icon: "🏆",
    gradient: "from-yellow-900/40 to-amber-800/40",
    color: "#f59e0b",
  },
  {
    id: "slots",
    name: "Slots",
    description: "Spin the reels. Hit the jackpot with up to 1000x multiplier.",
    houseEdge: "3%",
    minBet: 0.1,
    maxBet: 100,
    players: 34,
    category: "Classic",
    available: true,
    icon: "🎰",
    gradient: "from-pink-900/40 to-rose-900/40",
    color: "#ec4899",
  },
  {
    id: "poker",
    name: "Video Poker",
    description: "5-card draw video poker. Jacks or better to win.",
    houseEdge: "2%",
    minBet: 0.5,
    maxBet: 200,
    players: 6,
    category: "Card Game",
    available: true,
    icon: "🃏",
    gradient: "from-blue-900/40 to-indigo-900/40",
    color: "#6366f1",
  },
];

export const MOCK_BETS = [
  { user: "crypto_whale", game: "Crash", amount: 500, multiplier: "2.41x", win: true, payout: 1205 },
  { user: "lucky_star_99", game: "Roulette", amount: 50, multiplier: "35x", win: true, payout: 1750 },
  { user: "diamond_hands", game: "Coinflip", amount: 200, multiplier: "2x", win: false, payout: 0 },
  { user: "moon_trader", game: "Mines", amount: 100, multiplier: "4.5x", win: true, payout: 450 },
  { user: "satoshi_jr", game: "Slots", amount: 10, multiplier: "50x", win: true, payout: 500 },
  { user: "web3_player", game: "Jackpot", amount: 25, multiplier: "40x", win: false, payout: 0 },
  { user: "degen_bet", game: "Crash", amount: 1000, multiplier: "1.05x", win: false, payout: 0 },
  { user: "hodl_master", game: "Poker", amount: 75, multiplier: "4x", win: true, payout: 300 },
  { user: "ape_strong", game: "Roulette", amount: 150, multiplier: "3x", win: true, payout: 450 },
  { user: "block_chain_z", game: "Mines", amount: 50, multiplier: "8x", win: true, payout: 400 },
];
