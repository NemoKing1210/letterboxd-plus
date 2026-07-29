import {
  ensureFilmUserState,
  fetchFilmMiniProfile,
  peekCachedFilmMiniProfile,
  peekCachedUserState,
} from '../../api/film-profile.js';
import { getMetacriticRating } from '../../api/metacritic.js';
import { getRottenTomatoesRating } from '../../api/rotten-tomatoes.js';
import { enqueueFetch } from './fetch-queue.js';
import { currentSettings, state } from './state.js';

export function ensureProfileFetch(slug) {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  if (!key) return Promise.resolve(null);
  const settings = currentSettings();
  const cached = peekCachedFilmMiniProfile(key, settings.cacheHours);
  if (cached) return Promise.resolve(cached);
  let pending = state.profileFetches.get(key);
  if (pending) return pending;
  pending = enqueueFetch(() =>
    fetchFilmMiniProfile(key, settings.cacheHours),
  ).finally(() => {
    state.profileFetches.delete(key);
  });
  state.profileFetches.set(key, pending);
  return pending;
}

export function ensureUserStateFetch(slug) {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  if (!key) return Promise.resolve(null);
  if (currentSettings().fmpShowUserStatus === false) {
    return Promise.resolve(null);
  }

  const cached = peekCachedUserState(key);
  if (cached?.rating != null) return Promise.resolve(cached);

  let pending = state.userStateFetches.get(key);
  if (pending) return pending;
  pending = enqueueFetch(() => ensureFilmUserState(key)).finally(() => {
    state.userStateFetches.delete(key);
  });
  state.userStateFetches.set(key, pending);
  return pending;
}

export function ensureScoreEnrich({ slug, title, year, tmdbId }) {
  const settings = currentSettings();
  if (settings.fmpShowExternalScores === false) {
    return Promise.resolve({ rt: null, mc: null });
  }
  const wantsRt = settings.showRottenTomatoes !== false;
  const wantsMc = settings.showMetacritic !== false;
  if (!wantsRt && !wantsMc) {
    return Promise.resolve({ rt: null, mc: null });
  }

  const mapKey = String(slug || '')
    .trim()
    .toLowerCase();
  if (!mapKey) return Promise.resolve({ rt: null, mc: null });

  let pending = state.enrichFetches.get(mapKey);
  if (pending) return pending;

  pending = (async () => {
    const filmTitle = String(title || '').trim();
    if (!filmTitle) return { rt: null, mc: null };
    const key = tmdbId ? `tmdb:${tmdbId}` : `slug:${mapKey}`;
    const payload = {
      cacheHours: settings.cacheHours,
      key,
      title: filmTitle,
      year: Number.isFinite(year) ? year : year ? Number(year) : null,
    };

    const [rt, mc] = await Promise.all([
      wantsRt
        ? getRottenTomatoesRating(payload).catch(() => null)
        : Promise.resolve(null),
      wantsMc
        ? getMetacriticRating(payload).catch(() => null)
        : Promise.resolve(null),
    ]);
    return { rt, mc };
  })().finally(() => {
    state.enrichFetches.delete(mapKey);
  });

  state.enrichFetches.set(mapKey, pending);
  return pending;
}
