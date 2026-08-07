/**
 * Film-count ranks for user mini-cards.
 * Names are resolved via i18n keys (`umpLevel{PascalId}`).
 */

/** @typedef {{ id: string, tier: string, min: number }} LevelDef */

/** @type {readonly LevelDef[]} */
export const UMP_LEVELS = Object.freeze([
  { id: 'newcomer', tier: 'newcomer', min: 0 },
  { id: 'explorer', tier: 'explorer', min: 10 },
  { id: 'regular', tier: 'regular', min: 25 },
  { id: 'enthusiast', tier: 'enthusiast', min: 50 },
  { id: 'bronze', tier: 'bronze', min: 100 },
  { id: 'silver', tier: 'silver', min: 250 },
  { id: 'gold', tier: 'gold', min: 500 },
  { id: 'platinum', tier: 'platinum', min: 1000 },
  { id: 'sapphire', tier: 'sapphire', min: 2000 },
  { id: 'ruby', tier: 'ruby', min: 3500 },
  { id: 'emerald', tier: 'emerald', min: 5000 },
  { id: 'diamond', tier: 'diamond', min: 7500 },
  { id: 'master', tier: 'master', min: 10000 },
  { id: 'legend', tier: 'legend', min: 20000 },
  { id: 'hallOfFame', tier: 'hallOfFame', min: 50000 },
]);

/**
 * @param {unknown} films
 * @returns {{
 *   id: string,
 *   tier: string,
 *   index: number,
 *   level: number,
 *   min: number,
 *   nextMin: number | null,
 *   nextId: string | null,
 *   progress: number,
 *   films: number,
 *   filmsToNext: number | null,
 * } | null}
 */
export function resolveLevel(films) {
  const n = Number(films);
  if (!Number.isFinite(n) || n < 0) return null;

  const count = Math.floor(n);
  let index = 0;
  for (let i = UMP_LEVELS.length - 1; i >= 0; i -= 1) {
    if (count >= UMP_LEVELS[i].min) {
      index = i;
      break;
    }
  }

  const current = UMP_LEVELS[index];
  const next = UMP_LEVELS[index + 1] || null;
  const nextMin = next ? next.min : null;
  let progress = 1;
  let filmsToNext = null;

  if (nextMin != null) {
    const span = nextMin - current.min;
    const gained = Math.min(Math.max(count - current.min, 0), span);
    progress = span > 0 ? gained / span : 1;
    filmsToNext = Math.max(nextMin - count, 0);
  }

  return {
    id: current.id,
    tier: current.tier,
    index,
    level: index + 1,
    min: current.min,
    nextMin,
    nextId: next ? next.id : null,
    progress,
    films: count,
    filmsToNext,
  };
}

/** @param {string} id */
export function levelNameKey(id) {
  return `umpLevel${id.charAt(0).toUpperCase()}${id.slice(1)}`;
}
