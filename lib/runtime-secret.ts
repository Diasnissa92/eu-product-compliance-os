const bearerSecretPattern = /^Bearer ([0-9a-f]{64})$/;

export function readBearerRuntimeSecret(authorization: string | null) {
  return authorization?.match(bearerSecretPattern)?.[1] ?? null;
}
