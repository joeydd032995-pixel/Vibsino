# Vibecode Casino

A full-stack Web3 cryptocurrency casino platform with provably fair games, real-time multiplayer, and wallet authentication.

## Stack

**Frontend:** React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui + Framer Motion + Zustand  
**Backend:** Hono + Bun + TypeScript + Prisma (SQLite) + jose (JWT)  
**Auth:** Custom JWT + Ethereum EIP-191 wallet signature + Solana wallet signature  
**Real-time:** WebSocket (Phase 4)

## Project Structure

```
webapp/          — React frontend (port 8000)
  src/
    pages/       — Landing, Auth, Lobby, Profile
    components/  — casino/, layout/, ui/
    stores/      — Zustand auth store
    lib/         — API helper, game definitions
backend/         — Hono API server (port 3000)
  src/
    config/      — Zod-validated env
    middleware/  — JWT auth, rate limiting, security headers
    routes/      — /api/auth, /api/user
    utils/       — JWT, wallet auth, provably fair hash
    lib/         — Prisma client, logger
  prisma/        — SQLite schema (User, Bet, GameSession, Transaction, ChatMessage)
```

## Phase Completion

- [x] **Phase 1** — Foundation: scaffolding, DB models, JWT auth, wallet verification, middleware, dark casino UI
- [ ] **Phase 2** — Core Services: user management, balances, history, admin, notifications, provably fair library
- [ ] **Phase 3** — Game Engines: 7 pure game engines with provably fair logic
- [ ] **Phase 4** — Real-time Layer: WebSocket game rooms, live chat, live updates
- [ ] **Phase 5** — Frontend Polish: wallet connect, game UIs, animations, real-time data
- [ ] **Phase 6** — Production: rate limiting, logging, testing, security review

## Games Planned

| Game | Type | House Edge | Status |
|------|------|-----------|--------|
| Crash | Multiplayer | 1% | Phase 3 |
| Roulette | Classic | 2.7% | Phase 3 |
| Coinflip | Simple | 1% | Phase 3 |
| Mines | Strategy | 1% | Phase 3 |
| Jackpot | Pool | 5% | Phase 3 |
| Slots | Classic | 3% | Phase 3 |
| Video Poker | Card Game | 2% | Phase 3 |

## API Endpoints (Phase 1)

```
GET  /health
POST /api/auth/register
POST /api/auth/login
POST /api/auth/wallet-nonce
POST /api/auth/wallet-login
GET  /api/auth/me
GET  /api/user/profile
GET  /api/user/balance
GET  /api/user/bets
GET  /api/user/transactions
```

## Environment Variables (backend/.env)

```
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="..."
JWT_EXPIRES_IN="7d"
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
MIN_BET=0.01
MAX_BET=1000
NODE_ENV="development"
```
