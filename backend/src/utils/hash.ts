import crypto from "crypto";

export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashServerSeed(seed: string): string {
  return crypto.createHash("sha256").update(seed).digest("hex");
}

export function generateClientSeed(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function generateGameHash(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): string {
  return crypto
    .createHmac("sha256", serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest("hex");
}
