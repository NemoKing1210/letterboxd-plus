export const RATINGS_CHANGED_EVENT = 'lbp:ratings-changed';

function skeletonHtml(modifier) {
  return `
    <span class="lbp-rating__score lbp-rating__score--${modifier} lbp-rating__skeleton" aria-hidden="true">
      <span class="lbp-rating__skeleton-value"></span>
      <span class="lbp-rating__skeleton-copy">
        <span></span>
        <span></span>
      </span>
    </span>
  `;
}

export function createRatingSection({
  id,
  title,
  faviconUrl = '',
  skeletonModifiers,
  variant = 'source',
}) {
  const section = document.createElement('section');
  section.id = id;
  section.className = `lbp-rating lbp-rating--${variant} section`;
  section.setAttribute('aria-live', 'polite');
  section.setAttribute('aria-busy', 'true');
  const faviconHtml = faviconUrl
    ? `
      <img
        class="lbp-rating__favicon"
        src="${faviconUrl}"
        alt=""
        width="16"
        height="16"
        decoding="async"
        referrerpolicy="no-referrer"
      >`
    : '';
  section.innerHTML = `
    <header class="lbp-rating__header">
      ${faviconHtml}
      <h2 class="section-heading">${title}</h2>
    </header>
    <div class="lbp-rating__body is-loading">
      ${skeletonModifiers.map(skeletonHtml).join('')}
    </div>
  `;
  section
    .querySelector('.lbp-rating__favicon')
    ?.addEventListener('error', (event) => event.currentTarget.remove(), {
      once: true,
    });
  return section;
}

export function mountRatingSection(section, sidebar) {
  const histogram = sidebar.querySelector('.ratings-histogram-chart');
  if (!histogram) {
    sidebar.appendChild(section);
    notifyRatingsChanged(section);
    return;
  }

  let insertionPoint = histogram;
  while (
    insertionPoint.nextElementSibling?.classList.contains('lbp-rating--source')
  ) {
    insertionPoint = insertionPoint.nextElementSibling;
  }
  insertionPoint.insertAdjacentElement('afterend', section);
  notifyRatingsChanged(section);
}

function normalizedRatingValue(score, maxScore) {
  if (score == null) return null;
  const numericScore = Number(score);
  const numericMax = Number(maxScore);
  if (
    !Number.isFinite(numericScore) ||
    !Number.isFinite(numericMax) ||
    numericMax <= 0 ||
    numericScore < 0 ||
    numericScore > numericMax
  ) {
    return null;
  }
  return (numericScore / numericMax) * 5;
}

function scoreRowHtml({
  displayValue,
  label,
  detail,
  modifier,
  score,
  maxScore,
  tone = '',
}) {
  const toneClass = tone ? ` lbp-rating__score--${tone}` : '';
  const normalizedValue = normalizedRatingValue(score, maxScore);
  const ratingAttribute =
    normalizedValue == null
      ? ''
      : ` data-lbp-rating-value="${normalizedValue}"`;
  return `
    <span class="lbp-rating__score lbp-rating__score--${modifier}${toneClass}"${ratingAttribute}>
      <span class="lbp-rating__value">${displayValue}</span>
      <span class="lbp-rating__meta">
        <strong>${label}</strong>
        <small>${detail}</small>
      </span>
    </span>
  `;
}

export function renderRatingRows(section, url, rows) {
  const body = section.querySelector('.lbp-rating__body');
  if (!body) return;

  section.setAttribute('aria-busy', 'false');
  body.className = 'lbp-rating__body';
  const link = document.createElement('a');
  link.className = 'lbp-rating__link';
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.innerHTML = rows.map(scoreRowHtml).join('');
  body.replaceChildren(link);
  notifyRatingsChanged(section);
}

export function renderRatingLoading(section, modifiers) {
  const body = section.querySelector('.lbp-rating__body');
  if (!body || body.classList.contains('is-loading')) return;

  section.setAttribute('aria-busy', 'true');
  body.className = 'lbp-rating__body is-loading';
  body.innerHTML = modifiers.map(skeletonHtml).join('');
}

export function renderRatingMessage(section, message) {
  const body = section.querySelector('.lbp-rating__body');
  if (!body) return;

  section.setAttribute('aria-busy', 'false');
  body.className = 'lbp-rating__body is-empty';
  const text = document.createElement('span');
  text.textContent = message;
  body.replaceChildren(text);
  notifyRatingsChanged(section);
}

function notifyRatingsChanged(section) {
  section.dispatchEvent(
    new CustomEvent(RATINGS_CHANGED_EVENT, { bubbles: true }),
  );
}
