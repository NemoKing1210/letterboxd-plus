import {
  FAVICON_URL,
  METACRITIC_ORIGIN,
  ROTTEN_TOMATOES_ORIGIN,
} from '../../core/constants.js';
import { t } from '../../i18n/index.js';
import { escapeAttr, escapeHtml } from '../../utils/html.js';
import { currentSettings } from './state.js';

function favicon(domain) {
  return FAVICON_URL.replace('{domain}', encodeURIComponent(domain));
}

export function filmUrlForSlug(slug) {
  return `/film/${encodeURIComponent(slug)}/`;
}

function skelBone(extraClass = '') {
  return `<span class="lbp-fmp__bone ${extraClass}" aria-hidden="true"></span>`;
}

function mcScoreTier(score) {
  if (!Number.isFinite(score)) return '';
  if (score >= 75) return 'high';
  if (score >= 50) return 'mid';
  return 'low';
}

function renderHero(ctx) {
  const profile = ctx.profile;
  const title = profile?.title || ctx.titleHint || ctx.slug;
  const year = profile?.year || ctx.yearHint || '';
  const posterUrl = profile?.posterUrl || ctx.posterHint || '';
  const rating = profile?.rating;
  const filmUrl = profile?.filmUrl || filmUrlForSlug(ctx.slug);
  const img = posterUrl
    ? `<img src="${escapeAttr(posterUrl)}" alt="" loading="lazy" decoding="async">`
    : `<span class="lbp-fmp__cover-ph"></span>`;
  const ratingHtml =
    rating != null
      ? `<span class="lbp-fmp__rating" title="${escapeAttr(t('miniFilmRating'))}">${escapeHtml(String(rating))}★</span>`
      : ctx.loadingProfile
        ? skelBone('lbp-fmp__bone--rating')
        : '';
  const yearHtml = year
    ? `<span class="lbp-fmp__year">${escapeHtml(String(year))}</span>`
    : '';

  return `
    <div class="lbp-fmp__hero">
      <a class="lbp-fmp__cover-link" href="${escapeAttr(filmUrl)}">
        <div class="lbp-fmp__cover">${img}</div>
      </a>
      <div class="lbp-fmp__hero-meta">
        <a class="lbp-fmp__title" href="${escapeAttr(filmUrl)}">${escapeHtml(title)}</a>
        <div class="lbp-fmp__sub">
          ${yearHtml}
          ${ratingHtml}
        </div>
      </div>
    </div>
  `;
}

function renderMeta(ctx) {
  const profile = ctx.profile;
  if (!profile && ctx.loadingProfile) {
    return `
      <div class="lbp-fmp__section" aria-hidden="true">
        ${skelBone('lbp-fmp__bone--line')}
        <div class="lbp-fmp__chips">
          ${skelBone('lbp-fmp__bone--chip')}
          ${skelBone('lbp-fmp__bone--chip')}
          ${skelBone('lbp-fmp__bone--chip')}
        </div>
      </div>
    `;
  }
  if (!profile) return '';

  const directors = (profile.directors || [])
    .map((director) => {
      if (director.href) {
        return `<a class="lbp-fmp__director" href="${escapeAttr(director.href)}">${escapeHtml(director.name)}</a>`;
      }
      return `<span class="lbp-fmp__director">${escapeHtml(director.name)}</span>`;
    })
    .join('<span class="lbp-fmp__sep"> · </span>');

  const chips = (profile.genres || [])
    .map((genre) => `<span class="lbp-fmp__chip">${escapeHtml(genre)}</span>`)
    .join('');

  if (!directors && !chips) return '';

  return `
    <div class="lbp-fmp__section">
      ${directors ? `<div class="lbp-fmp__directors">${directors}</div>` : ''}
      ${chips ? `<div class="lbp-fmp__chips">${chips}</div>` : ''}
    </div>
  `;
}

function scoreRowHtml({ href, value, label, modifier }) {
  return `
    <a class="lbp-fmp__score lbp-fmp__score--${escapeAttr(modifier)}" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">
      <span class="lbp-fmp__score-value">${escapeHtml(value)}</span>
      <span class="lbp-fmp__score-label">${escapeHtml(label)}</span>
    </a>
  `;
}

function renderScores(ctx) {
  const settings = currentSettings();
  const wantsRt = settings.showRottenTomatoes !== false;
  const wantsMc = settings.showMetacritic !== false;
  if (!wantsRt && !wantsMc) return '';

  if (ctx.loadingScores && !ctx.rt && !ctx.mc) {
    return `
      <div class="lbp-fmp__section lbp-fmp__scores" aria-busy="true">
        <span class="lbp-fmp__score is-skeleton" aria-hidden="true">
          ${skelBone('lbp-fmp__bone--score')}
          ${skelBone('lbp-fmp__bone--label')}
        </span>
        <span class="lbp-fmp__score is-skeleton" aria-hidden="true">
          ${skelBone('lbp-fmp__bone--score')}
          ${skelBone('lbp-fmp__bone--label')}
        </span>
      </div>
    `;
  }

  const bits = [];
  if (wantsRt && ctx.rt?.criticsScore != null) {
    bits.push(
      scoreRowHtml({
        href: ctx.rt.url || ROTTEN_TOMATOES_ORIGIN,
        value: `${ctx.rt.criticsScore}%`,
        label: ctx.rt.isCertifiedFresh ? t('certifiedFresh') : t('tomatometer'),
        modifier: 'rt',
      }),
    );
  }
  if (wantsMc && ctx.mc?.criticsScore != null) {
    const tier = mcScoreTier(ctx.mc.criticsScore);
    bits.push(
      scoreRowHtml({
        href: ctx.mc.url || METACRITIC_ORIGIN,
        value: String(ctx.mc.criticsScore),
        label: t('metascore'),
        modifier: tier ? `mc-${tier}` : 'mc',
      }),
    );
  }

  if (!bits.length) return '';
  return `<div class="lbp-fmp__section lbp-fmp__scores">${bits.join('')}</div>`;
}

function renderDescription(ctx) {
  const desc = ctx.profile?.description;
  if (!desc && ctx.loadingProfile) {
    return `
      <div class="lbp-fmp__section" aria-hidden="true">
        ${skelBone('lbp-fmp__bone--desc')}
        ${skelBone('lbp-fmp__bone--desc-short')}
      </div>
    `;
  }
  if (!desc) return '';
  return `<p class="lbp-fmp__desc">${escapeHtml(desc)}</p>`;
}

function renderLinks(ctx) {
  const links = [];

  if (ctx.rt?.url) {
    links.push({
      href: ctx.rt.url,
      label: t('rottenTomatoes'),
      icon: favicon('rottentomatoes.com'),
    });
  }
  if (ctx.mc?.url) {
    links.push({
      href: ctx.mc.url,
      label: t('metacritic'),
      icon: favicon('metacritic.com'),
    });
  }

  if (!links.length) return '';

  const linkHtml = links
    .map((link) => {
      const img = link.icon
        ? `<img class="lbp-fmp__link-icon" src="${escapeAttr(link.icon)}" alt="" width="14" height="14" loading="lazy" referrerpolicy="no-referrer">`
        : '';
      return `<a class="lbp-fmp__link" href="${escapeAttr(link.href)}" target="_blank" rel="noopener noreferrer">${img}<span>${escapeHtml(link.label)}</span></a>`;
    })
    .join('');

  return `<div class="lbp-fmp__section lbp-fmp__links">${linkHtml}</div>`;
}

function renderFooter(ctx) {
  const filmUrl = ctx.profile?.filmUrl || filmUrlForSlug(ctx.slug);
  return `
    <footer class="lbp-fmp__footer">
      <a class="lbp-fmp__cta" href="${escapeAttr(filmUrl)}">${escapeHtml(t('miniFilmOpen'))}</a>
    </footer>
  `;
}

const BODY_SECTIONS = [
  { id: 'hero', render: (ctx) => renderHero(ctx) },
  { id: 'meta', render: (ctx) => renderMeta(ctx) },
  { id: 'scores', render: (ctx) => renderScores(ctx) },
  { id: 'description', render: (ctx) => renderDescription(ctx) },
  { id: 'links', render: (ctx) => renderLinks(ctx) },
];

export function renderCard(ctx) {
  const parts = [];
  for (const section of BODY_SECTIONS) {
    const html = section.render(ctx);
    if (html) parts.push(html);
  }
  return `
    <div class="lbp-fmp__card">
      <div class="lbp-fmp__body">${parts.join('')}</div>
      ${renderFooter(ctx)}
    </div>
  `;
}

export function renderError(slug, titleHint) {
  const filmUrl = filmUrlForSlug(slug);
  return `
    <div class="lbp-fmp__card">
      <div class="lbp-fmp__body">
        <div class="lbp-fmp__hero">
          <div class="lbp-fmp__cover"><span class="lbp-fmp__cover-ph"></span></div>
          <div class="lbp-fmp__hero-meta">
            <div class="lbp-fmp__title">${escapeHtml(titleHint || slug)}</div>
          </div>
        </div>
        <div class="lbp-fmp__status">${escapeHtml(t('miniFilmError'))}</div>
      </div>
      <footer class="lbp-fmp__footer">
        <a class="lbp-fmp__cta" href="${escapeAttr(filmUrl)}">${escapeHtml(t('miniFilmOpen'))}</a>
      </footer>
    </div>
  `;
}
