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
  faviconUrl,
  skeletonModifiers,
}) {
  const section = document.createElement('section');
  section.id = id;
  section.className = 'lbp-rating section';
  section.setAttribute('aria-live', 'polite');
  section.setAttribute('aria-busy', 'true');
  section.innerHTML = `
    <header class="lbp-rating__header">
      <img
        class="lbp-rating__favicon"
        src="${faviconUrl}"
        alt=""
        width="16"
        height="16"
        decoding="async"
        referrerpolicy="no-referrer"
      >
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
  if (histogram) histogram.insertAdjacentElement('beforebegin', section);
  else sidebar.appendChild(section);
}

function scoreRowHtml({ displayValue, label, detail, modifier, tone = '' }) {
  const toneClass = tone ? ` lbp-rating__score--${tone}` : '';
  return `
    <span class="lbp-rating__score lbp-rating__score--${modifier}${toneClass}">
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
}

export function renderRatingMessage(section, message) {
  const body = section.querySelector('.lbp-rating__body');
  if (!body) return;

  section.setAttribute('aria-busy', 'false');
  body.className = 'lbp-rating__body is-empty';
  const text = document.createElement('span');
  text.textContent = message;
  body.replaceChildren(text);
}
