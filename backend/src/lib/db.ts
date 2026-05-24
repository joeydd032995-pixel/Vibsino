import { PrismaClient } from "@prisma/client";

// Always create a fresh client so hot reloads pick up schema changes.
// In production the process doesn't hot-reload so this is fine.
export const db = new PrismaClient();
