import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import GameCard from "@/components/casino/GameCard";
import LiveFeed from "@/components/casino/LiveFeed";
import { GAMES } from "@/lib/games";
import { Users, TrendingUp, Activity } from "lucide-react";

const CATEGORIES = ["All", "Multiplayer", "Classic", "Strategy", "Simple", "Pool", "Card Game"];

const Lobby = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = activeCategory === "All"
    ? GAMES
    : GAMES.filter((g) => g.category === activeCategory);

  const totalPlayers = GAMES.reduce((s, g) => s + g.players, 0);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#0a0a0f" }}>
      <Navbar onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Stats bar */}
          <div
            className="px-6 py-3 flex items-center gap-6 flex-wrap"
            style={{ borderBottom: "1px solid rgba(245,158,11,0.08)", background: "rgba(15,15,26,0.5)" }}
          >
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" style={{ color: "#10b981" }} />
              <span className="text-gray-400">Online:</span>
              <span className="font-semibold text-white">{totalPlayers}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4" style={{ color: "#f59e0b" }} />
              <span className="text-gray-400">Games Active:</span>
              <span className="font-semibold text-white">{GAMES.length}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4" style={{ color: "#6366f1" }} />
              <span className="text-gray-400">Biggest Win Today:</span>
              <span className="font-semibold" style={{ color: "#10b981" }}>$142,500</span>
            </div>
          </div>

          <div className="flex gap-6 p-6">
            {/* Games area */}
            <div className="flex-1 min-w-0">
              {/* Page header */}
              <div className="mb-6">
                <h1 className="font-display text-2xl font-bold text-white mb-1">Game Lobby</h1>
                <p className="text-sm text-gray-500">Select a game and start betting</p>
              </div>

              {/* Category filter */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0"
                    style={{
                      background: activeCategory === cat ? "rgba(245,158,11,0.2)" : "rgba(19,19,31,0.8)",
                      border: `1px solid ${activeCategory === cat ? "rgba(245,158,11,0.4)" : "rgba(245,158,11,0.1)"}`,
                      color: activeCategory === cat ? "#f59e0b" : "#9ca3af",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Game grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((game, i) => (
                  <GameCard key={game.id} game={game} index={i} />
                ))}
              </div>
            </div>

            {/* Live feed sidebar — desktop only */}
            <div
              className="hidden lg:flex flex-col w-72 flex-shrink-0 rounded-xl overflow-hidden"
              style={{
                background: "rgba(13,13,20,0.8)",
                border: "1px solid rgba(245,158,11,0.1)",
                height: "fit-content",
                maxHeight: "calc(100vh - 120px)",
                position: "sticky",
                top: "0",
              }}
            >
              <div
                className="px-4 py-3 flex items-center gap-2"
                style={{ borderBottom: "1px solid rgba(245,158,11,0.1)" }}
              >
                <div className="w-2 h-2 rounded-full live-pulse" style={{ background: "#10b981" }} />
                <span className="text-sm font-semibold text-white">Live Bets</span>
                <span className="ml-auto text-xs text-gray-500">Real-time</span>
              </div>
              <div className="p-2 overflow-y-auto flex-1">
                <LiveFeed />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Lobby;
