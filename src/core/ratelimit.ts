// Ограничение числа попыток в скользящем окне. Чистая логика: время передаётся явно.
export type Limiter = {
  hit(key: string, nowMs: number): boolean; // true, если попытка разрешена
  reset(key: string): void;
};

export function createLimiter(max: number, windowMs: number): Limiter {
  const hits = new Map<string, number[]>();
  return {
    hit(key, nowMs) {
      const recent = (hits.get(key) ?? []).filter((t) => nowMs - t < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(nowMs);
      hits.set(key, recent);
      return true;
    },
    reset(key) {
      hits.delete(key);
    },
  };
}
