function num(name: string, fallback: number) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export const CACHE_TTL = {
  userSeconds: num('CACHE_TTL_USER_SECONDS', process.env.NODE_ENV === 'production' ? 600 : 60),
} as const;
