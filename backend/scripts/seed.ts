import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  // Create admin user
  const adminHash = await bcrypt.hash("admin123!", 12);
  const admin = await db.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@vibecode.casino",
      passwordHash: adminHash,
      role: "admin",
      balance: 100000,
    },
  });
  console.log(`Admin user: ${admin.username} (${admin.id})`);

  // Create test players
  const playerHash = await bcrypt.hash("player123!", 12);
  for (let i = 1; i <= 5; i++) {
    const player = await db.user.upsert({
      where: { username: `player${i}` },
      update: {},
      create: {
        username: `player${i}`,
        email: `player${i}@example.com`,
        passwordHash: playerHash,
        balance: Math.round(Math.random() * 1000 * 100) / 100,
      },
    });

    // Add some mock game sessions and bets
    const gameTypes: string[] = ["crash", "coinflip", "roulette"];
    const gameType = gameTypes[i % 3] ?? "coinflip";

    const session = await db.gameSession.create({
      data: {
        gameType,
        status: "completed",
        serverSeed: "mockseed" + i,
        serverSeedHash: "mockhash" + i,
        clientSeed: "clientseed" + i,
        nonce: 1,
        result: JSON.stringify({ outcome: "completed" }),
      },
    });

    const outcome = Math.random() > 0.5 ? "win" : "loss";
    const amount = Math.round(Math.random() * 100 * 100) / 100;
    const payout = outcome === "win" ? Math.round(amount * (1 + Math.random() * 4) * 100) / 100 : 0;

    await db.bet.create({
      data: {
        userId: player.id,
        gameSessionId: session.id,
        amount,
        outcome,
        payout,
        multiplier: outcome === "win" ? Math.round((payout / amount) * 100) / 100 : 0,
      },
    });

    // Add a deposit transaction
    await db.transaction.create({
      data: {
        userId: player.id,
        type: "deposit",
        amount: 500,
        currency: "USDC",
        status: "completed",
      },
    });

    // Add a notification
    await db.notification.create({
      data: {
        userId: player.id,
        type: "system",
        title: "Welcome to Vibecode Casino!",
        message: "Start playing and win big. Your first deposit bonus is ready.",
        read: false,
      },
    });

    console.log(`Player ${i}: ${player.username} (${player.id}) — bet: ${outcome}, amount: ${amount}`);
  }

  console.log("\nSeed complete.");
}

main().catch(console.error).finally(() => db.$disconnect());
