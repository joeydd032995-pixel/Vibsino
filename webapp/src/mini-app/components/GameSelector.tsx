import { motion } from "framer-motion";
import { useTelegram } from "../context/TelegramContext";

export type MiniGameType = "coinflip" | "roulette" | "slots" | "crash" | "mines" | "poker";

interface Game {
  id: MiniGameType;
  name: string;
  icon: string;
  gradient: string;
  houseEdge: string;
  badge?: string;
}

const DEMO_GAMES: Game[] = [
  {
    id: "coinflip",
    name: "Coinflip",
    icon: "🪙",
    gradient: "from-yellow-600 to-amber-700",
    houseEdge: "1%",
    badge: "Fast",
  },
  {
    id: "crash",
    name: "Crash",
    icon: "🚀",
    gradient: "from-red-600 to-rose-700",
    houseEdge: "1%",
    badge: "Hot",
  },
  {
    id: "mines",
    name: "Mines",
    icon: "💣",
    gradient: "from-purple-600 to-violet-700",
    houseEdge: "1%",
  },
  {
    id: "slots",
    name: "Slots",
    icon: "🎰",
    gradient: "from-pink-600 to-fuchsia-700",
    houseEdge: "3%",
    badge: "New",
  },
  {
    id: "roulette",
    name: "Roulette",
    icon: "🎡",
    gradient: "from-green-600 to-emerald-700",
    houseEdge: "2.7%",
  },
  {
    id: "poker",
    name: "Poker",
    icon: "🃏",
    gradient: "from-blue-600 to-indigo-700",
    houseEdge: "2%",
  },
];

interface GameSelectorProps {
  onSelectGame: (gameType: MiniGameType) => void;
}

export default function GameSelector({ onSelectGame }: GameSelectorProps) {
  const { haptic } = useTelegram();

  const handleSelect = (gameType: MiniGameType) => {
    haptic.tap();
    onSelectGame(gameType);
  };

  return (
    <div className="space-y-3">
      <h2 className="text-white font-bold text-lg px-1">Play Free</h2>
      <div className="grid grid-cols-3 gap-3">
        {DEMO_GAMES.map((game, i) => (
          <motion.button
            key={game.id}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${game.gradient} p-0.5 cursor-pointer`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => handleSelect(game.id)}
          >
            <div className="bg-[#0f0f1a]/80 rounded-[14px] p-3 h-full flex flex-col items-center gap-1.5">
              {game.badge ? (
                <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded-full leading-none">
                  {game.badge}
                </span>
              ) : null}
              <span className="text-3xl">{game.icon}</span>
              <span className="text-white text-xs font-semibold leading-tight text-center">
                {game.name}
              </span>
              <span className="text-white/40 text-[10px]">{game.houseEdge} edge</span>
            </div>
          </motion.button>
        ))}
      </div>
      <p className="text-center text-xs text-gray-500 mt-2">
        All games use provably fair algorithms
      </p>
    </div>
  );
}
