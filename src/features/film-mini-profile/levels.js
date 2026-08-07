/**
 * Community-rating tiers for film mini-card styling (Letterboxd 0–5★ scale).
 */

/** @typedef {{ id: string, tier: string, min: number }} LevelDef */

/** @type {readonly LevelDef[]} */
export const FMP_LEVELS = Object.freeze([
  { id: 'poor', tier: 'poor', min: 0 },
  { id: 'weak', tier: 'weak', min: 1.5 },
  { id: 'fair', tier: 'fair', min: 2.0 },
  { id: 'mixed', tier: 'mixed', min: 2.5 },
  { id: 'solid', tier: 'solid', min: 3.0 },
  { id: 'bronze', tier: 'bronze', min: 3.2 },
  { id: 'silver', tier: 'silver', min: 3.5 },
  { id: 'gold', tier: 'gold', min: 3.7 },
  { id: 'platinum', tier: 'platinum', min: 3.9 },
  { id: 'sapphire', tier: 'sapphire', min: 4.0 },
  { id: 'ruby', tier: 'ruby', min: 4.15 },
  { id: 'emerald', tier: 'emerald', min: 4.3 },
  { id: 'diamond', tier: 'diamond', min: 4.4 },
  { id: 'master', tier: 'master', min: 4.5 },
  { id: 'legend', tier: 'legend', min: 4.6 },
  { id: 'hallOfFame', tier: 'hallOfFame', min: 4.7 },
]);

/**
 * @param {unknown} rating
 * @returns {{ id: string, tier: string, index: number, level: number } | null}
 */
export function resolveFilmLevel(rating) {
  const n = Number(rating);
  if (!Number.isFinite(n) || n <= 0) return null;

  let index = 0;
  for (let i = FMP_LEVELS.length - 1; i >= 0; i -= 1) {
    if (n >= FMP_LEVELS[i].min) {
      index = i;
      break;
    }
  }

  const current = FMP_LEVELS[index];
  return {
    id: current.id,
    tier: current.tier,
    index,
    level: index + 1,
  };
}
