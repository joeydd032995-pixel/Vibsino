import { Link } from "react-router-dom";
import { Users, TrendingUp, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GameInfo } from "@/lib/games";

interface GameCardProps {
  game: GameInfo;
  index?: number;
}

const GameCard = ({ game, index = 0 }: GameCardProps) => {
  return (
    <div
      className="group relative overflow-hidden rounded-xl cursor-pointer"
      style={{
        background: "linear-gradient(135deg, #13131f, #0f0f1a)",
        border: "1px solid rgba(245, 158, 11, 0.1)",
        transition: "border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease",
        animationDelay: `${index * 0.05}s`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.35)";
        e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(245,158,11,0.08)";
        e.currentTarget.style.transform = "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.1)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-60 group-hover:opacity-80 transition-opacity duration-300`} />

      {/* Glow effect on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top left, ${game.color}15, transparent 60%)`,
        }}
      />

      <Link to={game.available ? `/games/${game.id}` : "#"} className="relative z-10 block p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="text-4xl w-14 h-14 flex items-center justify-center rounded-xl"
            style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)" }}
          >
            {game.icon}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {game.badge ? (
              <Badge
                className="text-xs font-medium px-2 py-0.5"
                style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}
              >
                {game.badge}
              </Badge>
            ) : null}
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(0,0,0,0.3)", color: "#9ca3af" }}
            >
              {game.category}
            </span>
          </div>
        </div>

        {/* Game name */}
        <h3 className="text-lg font-bold text-white mb-1 font-display tracking-wide">
          {game.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-400 mb-4 leading-relaxed line-clamp-2">
          {game.description}
        </p>

        {/* Stats row */}
        <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Users className="h-3.5 w-3.5" />
            <span>{game.players} playing</span>
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: "#10b981" }}>
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Edge: {game.houseEdge}</span>
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: "#f59e0b" }}>
            <Zap className="h-3.5 w-3.5" />
            <span>Min: ${game.minBet}</span>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default GameCard;
