import { t } from '../i18n/index.js';
import {
  createRatingSection,
  mountRatingSection,
  RATINGS_CHANGED_EVENT,
  renderRatingLoading,
} from './rating-section.js';

const RATING_ID = 'lbp-average-rating';
const LETTERBOXD_MAX_SCORE = 5;

let isListeningForRatings = false;

function parseLetterboxdRating(element) {
  const exactMatch = element.dataset.originalTitle?.match(
    /average\D+([0-5](?:[.,]\d+)?)/i,
  );
  const value = exactMatch?.[1] || element.textContent.trim();
  const score = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(score) && score >= 0 && score <= LETTERBOXD_MAX_SCORE
    ? score
    : null;
}

function collectRatings(sidebar) {
  const ratings = [];
  const letterboxdRating = sidebar.querySelector(
    '.ratings-histogram-chart .averagerating',
  );
  const letterboxdScore = letterboxdRating
    ? parseLetterboxdRating(letterboxdRating)
    : null;
  if (letterboxdScore != null) ratings.push(letterboxdScore);

  for (const row of sidebar.querySelectorAll(
    '.lbp-rating--source [data-lbp-rating-value]',
  )) {
    const score = Number(row.dataset.lbpRatingValue);
    if (
      Number.isFinite(score) &&
      score >= 0 &&
      score <= LETTERBOXD_MAX_SCORE
    ) {
      ratings.push(score);
    }
  }
  return ratings;
}

function renderAverage(section, ratings) {
  const body = section.querySelector('.lbp-rating__body');
  if (!body) return;

  const average =
    ratings.reduce((total, rating) => total + rating, 0) / ratings.length;
  const row = document.createElement('span');
  row.className = 'lbp-rating__score lbp-rating__score--average';

  const value = document.createElement('span');
  value.className = 'lbp-rating__value';
  value.textContent = average.toFixed(1);

  const meta = document.createElement('span');
  meta.className = 'lbp-rating__meta';
  const label = document.createElement('strong');
  label.textContent = t('averageRatingScore');
  const detail = document.createElement('small');
  detail.textContent = t('averageRatingCount', { count: ratings.length });
  meta.append(label, detail);
  row.append(value, meta);

  section.setAttribute('aria-busy', 'false');
  body.className = 'lbp-rating__body';
  body.replaceChildren(row);
}

function renderNoRating(section) {
  const body = section.querySelector('.lbp-rating__body');
  if (!body) return;

  const message = document.createElement('span');
  message.textContent = t('notRated');
  section.setAttribute('aria-busy', 'false');
  body.className = 'lbp-rating__body is-empty';
  body.replaceChildren(message);
}

function updateAverageRating() {
  const section = document.getElementById(RATING_ID);
  const sidebar = section?.closest('aside.sidebar');
  if (!section || !sidebar) return;

  if (sidebar.querySelector('.lbp-rating--source[aria-busy="true"]')) {
    renderRatingLoading(section, ['average']);
    return;
  }

  const ratings = collectRatings(sidebar);
  if (ratings.length === 0) {
    renderNoRating(section);
    return;
  }
  renderAverage(section, ratings);
}

function listenForRatingUpdates() {
  if (isListeningForRatings) return;
  document.addEventListener(RATINGS_CHANGED_EVENT, updateAverageRating);
  isListeningForRatings = true;
}

export function ensureAverageRating() {
  const sidebar = document.querySelector('#film-page-wrapper aside.sidebar');
  const histogram = sidebar?.querySelector('.ratings-histogram-chart');
  const existing = document.getElementById(RATING_ID);
  if (!sidebar || !histogram) {
    existing?.remove();
    return;
  }

  if (!existing) {
    const section = createRatingSection({
      id: RATING_ID,
      title: t('averageRating'),
      skeletonModifiers: ['average'],
      variant: 'average',
    });
    mountRatingSection(section, sidebar);
  }

  listenForRatingUpdates();
  updateAverageRating();
}
