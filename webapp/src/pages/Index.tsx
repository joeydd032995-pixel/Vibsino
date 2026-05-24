import { Link } from "react-router-dom";
import { ArrowRight, Shield, Zap, Trophy, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCounter from "@/components/casino/StatCounter";
import { GAMES } from "@/lib/games";

// Floating decorative elements
const FloatingChips = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    {/* Large chip top-right */}
    <div
      className="absolute top-16 right-12 w-20 h-20 rounded-full flex items-center justify-center text-3xl float opacity-30"
      style={{
        background: "linear-gradient(135deg, rgba(245,158,11,0.3), rgba(217,119,6,0.2))",
        border: "2px solid rgba(245,158,11,0.4)",
        boxShadow: "0 0 30px rgba(245,158,11,0.2)",
      }}
    >
      🎰
    </div>
    {/* Small chip left */}
    <div
      className="absolute top-1/3 left-8 w-14 h-14 rounded-full flex items-center justify-center text-2xl float-delay-2 opacity-20"
      style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.2))",
        border: "2px solid rgba(16,185,129,0.3)",
      }}
    >
      🃏
    </div>
    {/* Card bottom-right */}
    <div
      className="absolute bottom-1/4 right-1/4 text-5xl float-delay-1 opacity-15"
    >
      ♠
    </div>
    {/* Dice bottom-left */}
    <div
      className="absolute bottom-1/3 left-1/4 text-4xl float-delay-3 opacity-20"
    >
      🎲
    </div>
    {/* Coin top-center */}
    <div
      className="absolute top-1/4 left-1/2 -translate-x-1/2 text-3xl float-delay-4 opacity-15"
    >
      🪙
    </div>
    {/* Rocket */}
    <div
      className="absolute top-1/2 right-16 text-3xl float-delay-2 opacity-20"
    >
      🚀
    </div>
  </div>
);

const FEATURES = [
  {
    icon: Shield,
    title: "Provably Fair",
    desc: "Every game outcome is cryptographically verifiable on-chain. Zero trust required.",
    color: "#10b981",
  },
  {
    icon: Zap,
    title: "Instant Payouts",
    desc: "Winnings sent directly to your wallet in seconds. No delays, no withdrawal limits.",
    color: "#f59e0b",
  },
  {
    icon: Trophy,
    title: "7 Casino Games",
    desc: "Crash, Roulette, Coinflip, Mines, Jackpot, Slots and Video Poker — more coming.",
    color: "#6366f1",
  },
  {
    icon: Globe,
    title: "Web3 Native",
    desc: "Connect MetaMask or Phantom. Play with ETH, SOL, or platform credits.",
    color: "#ec4899",
  },
];

const LIVE_STATS = [
  { label: "Active Players", value: 1247, suffix: "" },
  { label: "Games Played Today", value: 48392, suffix: "" },
  { label: "Biggest Win Today", value: 142500, prefix: "$" },
  { label: "Total Wagered", value: 8743291, prefix: "$" },
];

const Index = () => {
  return (
    <div className="min-h-screen casino-bg text-white">
      {/* Top nav */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16"
        style={{
          background: "rgba(10,10,15,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(245,158,11,0.1)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
          >
            V
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-base font-bold" style={{ color: "#f59e0b" }}>
              VIBECODE
            </span>
            <span className="font-display text-sm text-gray-400">CASINO</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/auth">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white border border-transparent hover:border-white/10"
            >
              Sign In
            </Button>
          </Link>
          <Link to="/auth">
            <Button
              size="sm"
              className="font-semibold"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "#0a0a0f",
              }}
            >
              Play Now
            </Button>
          </Link>
        </div>
      </header>

      {/* Live stats ticker */}
      <div
        className="fixed top-16 left-0 right-0 z-40 flex items-center gap-8 overflow-hidden px-6 h-8"
        style={{
          background: "rgba(245,158,11,0.06)",
          borderBottom: "1px solid rgba(245,158,11,0.1)",
        }}
      >
        {LIVE_STATS.map((stat, i) => (
          <div key={i} className="flex items-center gap-2 whitespace-nowrap text-xs">
            <div className="w-1.5 h-1.5 rounded-full live-pulse" style={{ background: "#10b981" }} />
            <span className="text-gray-500">{stat.label}:</span>
            <span className="font-semibold" style={{ color: "#f59e0b" }}>
              <StatCounter
                end={stat.value}
                prefix={stat.prefix ?? ""}
                suffix={stat.suffix}
                duration={2500}
              />
            </span>
          </div>
        ))}
      </div>

      {/* Hero section */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 px-6 overflow-hidden">
        {/* Background radial glows */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 60%)",
          }}
        />

        <FloatingChips />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8"
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.3)",
              color: "#f59e0b",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full live-pulse" style={{ background: "#10b981", display: "inline-block" }} />
            Web3 Casino — Provably Fair Gaming
          </div>

          {/* Main heading */}
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-none mb-4">
            <span className="text-white">THE FUTURE</span>
            <br />
            <span className="text-gold-gradient shimmer-text">OF CASINO</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Provably fair games. Instant crypto payouts. Connect your wallet and play
            7 games with house edges as low as 1%.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/auth">
              <Button
                size="lg"
                className="h-12 px-8 text-base font-bold gap-2 neon-gold"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#0a0a0f",
                }}
              >
                Start Playing
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base font-semibold gap-2"
                style={{
                  border: "1px solid rgba(245,158,11,0.4)",
                  color: "#f59e0b",
                  background: "transparent",
                }}
              >
                Connect Wallet
              </Button>
            </Link>
          </div>

          {/* Total wagered counter */}
          <div
            className="inline-flex flex-col items-center px-8 py-4 rounded-2xl glass-bright"
          >
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Wagered All Time</p>
            <p className="font-display text-3xl md:text-4xl font-bold text-gold-gradient">
              $<StatCounter end={48743291} duration={3000} />
            </p>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
          <span className="text-xs text-gray-500 uppercase tracking-widest">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-gray-600" />
        </div>
      </section>

      {/* Games grid section */}
      <section className="px-6 md:px-12 py-24 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-3">
            Choose Your Game
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Seven provably fair games, each with transparent house edges and instant payouts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {GAMES.map((game, i) => (
            <Link
              key={game.id}
              to="/auth"
              className="group relative overflow-hidden rounded-xl cursor-pointer block"
              style={{
                background: "linear-gradient(135deg, #13131f, #0f0f1a)",
                border: "1px solid rgba(245, 158, 11, 0.1)",
                transition: "all 0.3s ease",
                animationDelay: `${i * 0.05}s`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.35)";
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(245,158,11,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.1)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-50 group-hover:opacity-70 transition-opacity duration-300`} />
              <div className="relative z-10 p-5">
                <div className="text-3xl mb-3">{game.icon}</div>
                <h3 className="font-display text-base font-bold text-white mb-1">{game.name}</h3>
                <p className="text-xs text-gray-400 mb-3 line-clamp-2">{game.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{game.players} playing</span>
                  <span style={{ color: "#10b981" }}>Edge: {game.houseEdge}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features section */}
      <section
        className="px-6 md:px-12 py-24"
        style={{ background: "rgba(15,15,26,0.5)" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-3">
              Why Vibecode Casino?
            </h2>
            <p className="text-gray-400">Built for the next generation of online gambling.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color }, i) => (
              <div
                key={i}
                className="p-6 rounded-xl"
                style={{
                  background: "rgba(19,19,31,0.8)",
                  border: "1px solid rgba(245,158,11,0.1)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${color}22`, border: `1px solid ${color}44` }}
                >
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-6 md:px-12 py-20">
        <div
          className="max-w-4xl mx-auto text-center p-12 rounded-2xl relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.05))",
            border: "1px solid rgba(245,158,11,0.25)",
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "radial-gradient(circle at 30% 50%, rgba(245,158,11,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(16,185,129,0.1) 0%, transparent 50%)",
            }}
          />
          <div className="relative z-10">
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
              Ready to <span className="text-gold-gradient">Win Big?</span>
            </h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Join thousands of players already betting on Vibecode Casino. Start with just $0.01.
            </p>
            <Link to="/auth">
              <Button
                size="lg"
                className="h-12 px-10 text-base font-bold gap-2"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#0a0a0f",
                }}
              >
                Create Account
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-6 md:px-12 py-8"
        style={{ borderTop: "1px solid rgba(245,158,11,0.08)" }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
            >
              V
            </div>
            <span className="font-display text-sm font-bold" style={{ color: "#f59e0b" }}>
              VIBECODE CASINO
            </span>
          </div>
          <p className="text-xs text-gray-600 text-center">
            18+ only. Gamble responsibly. All games are provably fair.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <Link to="#" className="hover:text-gray-400 transition-colors">Terms</Link>
            <Link to="#" className="hover:text-gray-400 transition-colors">Privacy</Link>
            <Link to="#" className="hover:text-gray-400 transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
