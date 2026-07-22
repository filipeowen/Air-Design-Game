const MODULUS = 2_147_483_647;
const MULTIPLIER = 48_271;

export interface RandomSource {
  state: number;
  next: () => number;
  nextBetween: (min: number, max: number) => number;
  nextInt: (min: number, max: number) => number;
  chance: (probability: number) => boolean;
  pick: <T>(items: readonly T[]) => T;
}

export function normalizeSeed(seed: number): number {
  const normalized = Math.floor(Math.abs(seed)) % MODULUS;
  return normalized === 0 ? 1 : normalized;
}

export function createRandomSource(seedOrState: number): RandomSource {
  let state = normalizeSeed(seedOrState);

  const next = (): number => {
    state = (state * MULTIPLIER) % MODULUS;
    return state / MODULUS;
  };

  return {
    get state() {
      return state;
    },
    next,
    nextBetween(min, max) {
      return min + (max - min) * next();
    },
    nextInt(min, max) {
      return Math.floor(min + (max - min + 1) * next());
    },
    chance(probability) {
      return next() < probability;
    },
    pick(items) {
      if (items.length === 0) {
        throw new Error("Cannot pick from an empty collection.");
      }
      return items[Math.floor(next() * items.length)] ?? items[0];
    }
  };
}
