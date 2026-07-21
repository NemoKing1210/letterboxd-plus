import { getRottenTomatoesRating } from '../api/rotten-tomatoes.js';
import { formatNumber, t } from '../i18n/index.js';

const RATING_ID = 'lbp-rotten-tomatoes';

function getFilmContext() {
  if (!document.body.matches('[data-type="film"][data-tmdb-id]')) return null;

  const name =
    document.querySelector('meta[name="production:name"]')?.content?.trim() || '';
  const nameAndYear =
    document.querySelector('meta[name="production:name-and-year"]')?.content || '';
  const yearMatch = nameAndYear.match(/\((\d{4})\)\s*$/);
  const tmdbId = document.body.dataset.tmdbId;

  if (!name || !tmdbId) return null;
  return {
    key: `tmdb:${tmdbId}`,
    title: name,
    year: yearMatch ? Number(yearMatch[1]) : null,
  };
}

function createRatingSection() {
  const section = document.createElement('section');
  section.id = RATING_ID;
  section.className = 'lbp-rating section';
  section.setAttribute('aria-live', 'polite');
  section.innerHTML = `
    <header class="lbp-rating__header">
      <span class="lbp-rating__brand" aria-hidden="true">RT</span>
      <span>
        <strong>${t('rottenTomatoes')}</strong>
        <small>${t('externalRatings')}</small>
      </span>
    </header>
    <div class="lbp-rating__body is-loading">
      <span class="lbp-rating__skeleton"></span>
      <span class="lbp-rating__skeleton"></span>
    </div>
  `;
  return section;
}

function scoreHtml(labelKey, score, count, modifier) {
  const label = t(labelKey);
  const countLabel = count
    ? t(modifier === 'critics' ? 'criticReviews' : 'audienceRatings', {
        count: formatNumber(count),
      })
    : t('noCount');
  return `
    <span class="lbp-rating__score lbp-rating__score--${modifier}">
      <span class="lbp-rating__value">${score == null ? '—' : `${score}%`}</span>
      <span class="lbp-rating__meta">
        <strong>${label}</strong>
        <small>${score == null ? t('notRated') : countLabel}</small>
      </span>
    </span>
  `;
}

function renderRating(section, rating, showAudienceScore) {
  const body = section.querySelector('.lbp-rating__body');
  if (!body) return;

  if (!rating) {
    body.className = 'lbp-rating__body is-empty';
    body.innerHTML = `<span>${t('ratingNotFound')}</span>`;
    return;
  }

  body.className = 'lbp-rating__body';
  body.innerHTML = `
    <a href="${rating.url}" target="_blank" rel="noopener noreferrer" class="lbp-rating__link">
      ${scoreHtml(
        rating.isCertifiedFresh ? 'certifiedFresh' : 'tomatometer',
        rating.criticsScore,
        rating.criticsCount,
        'critics',
      )}
      ${
        showAudienceScore
          ? scoreHtml(
              'popcornmeter',
              rating.audienceScore,
              rating.audienceCount,
              'audience',
            )
          : ''
      }
    </a>
  `;
}

function renderError(section) {
  const body = section.querySelector('.lbp-rating__body');
  if (!body) return;
  body.className = 'lbp-rating__body is-empty';
  body.innerHTML = `<span>${t('ratingUnavailable')}</span>`;
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

  const section = createRatingSection();
  const histogram = sidebar.querySelector('.ratings-histogram-chart');
  if (histogram) histogram.insertAdjacentElement('beforebegin', section);
  else sidebar.appendChild(section);

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
    if (section.isConnected) renderError(section);
  }
}
