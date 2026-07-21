import { getRottenTomatoesRating } from '../api/rotten-tomatoes.js';
import { ROTTEN_TOMATOES_ORIGIN } from '../constants.js';
import { formatNumber, t } from '../i18n/index.js';
import { getFilmContext } from './film-context.js';
import {
  createRatingSection as createRatingSectionBase,
  mountRatingSection,
  renderRatingMessage,
  renderRatingRows,
} from './rating-section.js';

const RATING_ID = 'lbp-rotten-tomatoes';

function createRatingSection(showAudienceScore) {
  return createRatingSectionBase({
    id: RATING_ID,
    title: t('rottenTomatoes'),
    faviconUrl: `${ROTTEN_TOMATOES_ORIGIN}/assets/pizza-pie/images/favicon.ico`,
    skeletonModifiers: showAudienceScore
      ? ['critics', 'audience']
      : ['critics'],
  });
}

function ratingRow(labelKey, score, count, modifier) {
  const detail = count
    ? t(modifier === 'critics' ? 'criticReviews' : 'audienceRatings', {
        count: formatNumber(count),
      })
    : t('noCount');
  return {
    displayValue: score == null ? '—' : `${score}%`,
    label: t(labelKey),
    detail: score == null ? t('notRated') : detail,
    modifier,
    score,
    maxScore: 100,
  };
}

function renderRating(section, rating, showAudienceScore) {
  if (!rating) {
    renderRatingMessage(section, t('ratingNotFound'));
    return;
  }

  const rows = [
    ratingRow(
      rating.isCertifiedFresh ? 'certifiedFresh' : 'tomatometer',
      rating.criticsScore,
      rating.criticsCount,
      'critics',
    ),
  ];
  if (showAudienceScore) {
    rows.push(
      ratingRow(
        'popcornmeter',
        rating.audienceScore,
        rating.audienceCount,
        'audience',
      ),
    );
  }
  renderRatingRows(section, rating.url, rows);
}

export async function ensureFilmRating(settings) {
  const existing = document.getElementById(RATING_ID);
  if (!settings.showRottenTomatoes) {
    existing?.remove();
    return;
  }
  if (existing) return;

  const context = getFilmContext();
  const sidebar = document.querySelector('#film-page-wrapper aside.sidebar');
  if (!context || !sidebar) return;

  const section = createRatingSection(settings.showAudienceScore);
  mountRatingSection(section, sidebar);

  try {
    const rating = await getRottenTomatoesRating({
      ...context,
      cacheHours: settings.cacheHours,
    });
    if (section.isConnected) {
      renderRating(section, rating, settings.showAudienceScore);
    }
  } catch (error) {
    console.warn('[Letterboxd Plus] Failed to load Rotten Tomatoes rating.', error);
    if (section.isConnected) {
      renderRatingMessage(section, t('ratingUnavailable'));
    }
  }
}
