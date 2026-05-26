import { generateGameHash } from "../utils/hash";

export interface JackpotParticipant {
  userId: string;
  tickets: number;
}

export interface JackpotInput {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  participants: JackpotParticipant[];
}

export interface JackpotResult {
  winnerId: string;
  winnerIndex: number;
  winningTicket: number;
  totalTickets: number;
  hash: string;
}

export function resolveJackpot(input: JackpotInput): JackpotResult {
  const { serverSeed, clientSeed, nonce, participants } = input;
  if (participants.length === 0) throw new Error("No participants in jackpot");

  const hash = generateGameHash(serverSeed, clientSeed, nonce);
  const totalTickets = participants.reduce((sum, p) => sum + p.tickets, 0);
  if (totalTickets === 0) throw new Error("Total tickets is zero");

  const float = parseInt(hash.slice(0, 8), 16) / 0xffffffff;
  const winningTicket = Math.min(
    Math.floor(float * totalTickets),
    totalTickets - 1
  );

  let cumulative = 0;
  let winnerIndex = 0;
  let winnerId = participants[0]?.userId ?? "";

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    if (!p) continue;
    cumulative += p.tickets;
    if (winningTicket < cumulative) {
      winnerIndex = i;
      winnerId = p.userId;
      break;
    }
  }

  return { winnerId, winnerIndex, winningTicket, totalTickets, hash };
}
