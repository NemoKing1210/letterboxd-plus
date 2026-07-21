import { getMetacriticRating } from '../api/metacritic.js';
import { METACRITIC_ORIGIN } from '../constants.js';
import { formatNumber, t } from '../i18n/index.js';
import { getFilmContext } from './film-context.js';
import {
  createRatingSection,
  mountRatingSection,
  renderRatingMessage,
  renderRatingRows,
} from './rating-section.js';

const RATING_ID = 'lbp-metacritic';

function scoreTone(score, maxScore) {
  if (score == null) return '';
  const normalized = (score / maxScore) * 100;
  if (normalized >= 61) return 'positive';
  if (normalized >= 40) return 'mixed';
  return 'negative';
}

function formatScore(score, maxScore) {
  if (score == null) return '—';
  return maxScore === 10 ? Number(score).toFixed(1) : Math.round(score);
}

function ratingRow({
  labelKey,
  score,
  maxScore,
  count,
  countKey,
  modifier,
}) {
  const detail = count
    ? t(countKey, { count: formatNumber(count) })
    : t('noCount');
  return {
    displayValue: formatScore(score, maxScore),
    label: t(labelKey),
    detail: score == null ? t('notRated') : detail,
    modifier,
    tone: scoreTone(score, maxScore),
  };
}

function renderRating(section, rating, showUserScore) {
  if (!rating) {
    renderRatingMessage(section, t('metacriticRatingNotFound'));
    return;
  }

  const rows = [
    ratingRow({
      labelKey: 'metascore',
      score: rating.criticsScore,
      maxScore: 100,
      count: rating.criticsCount,
      countKey: 'criticReviews',
      modifier: 'metascore',
    }),
  ];
  if (showUserScore) {
    rows.push(
      ratingRow({
        labelKey: 'metacriticUserScore',
        score: rating.userScore,
        maxScore: 10,
        count: rating.userCount,
        countKey: 'userRatings',
        modifier: 'user-score',
      }),
    );
  }
  renderRatingRows(section, rating.url, rows);
}

export async function ensureMetacriticRating(settings) {
  const existing = document.getElementById(RATING_ID);
  if (!settings.showMetacritic) {
    existing?.remove();
    return;
  }
  if (existing) return;

  const context = getFilmContext();
  const sidebar = document.querySelector('#film-page-wrapper aside.sidebar');
  if (!context || !sidebar) return;

  const section = createRatingSection({
    id: RATING_ID,
    title: t('metacritic'),
    faviconUrl: `${METACRITIC_ORIGIN}/favicon.ico`,
    skeletonModifiers: settings.showMetacriticUserScore
      ? ['metascore', 'user-score']
      : ['metascore'],
  });
  mountRatingSection(section, sidebar);

  try {
    const rating = await getMetacriticRating({
      ...context,
      cacheHours: settings.cacheHours,
    });
    if (section.isConnected) {
      renderRating(section, rating, settings.showMetacriticUserScore);
    }
  } catch (error) {
    console.warn('[Letterboxd Plus] Failed to load Metacritic rating.', error);
    if (section.isConnected) {
      renderRatingMessage(section, t('metacriticRatingUnavailable'));
    }
  }
}
