import {
  FAVICON_URL,
  METACRITIC_ORIGIN,
  ROTTEN_TOMATOES_ORIGIN,
} from '../../core/constants.js';
import { formatNumber, t } from '../../i18n/index.js';
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

function formatRuntime(mins) {
  const total = Number(mins);
  if (!Number.isFinite(total) || total <= 0) return '';
  const hours = Math.floor(total / 60);
  const rem = total % 60;
  if (hours <= 0) return t('miniFilmRuntimeMins', { mins: rem });
  if (rem <= 0) return t('miniFilmRuntimeHours', { hours });
  return t('miniFilmRuntimeFull', { hours, mins: rem });
}

function formatStars(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  const rounded = Math.round(n * 10) / 10;
  const label =
    Number.isInteger(rounded) || Math.abs(rounded * 2 - Math.round(rounded * 2)) < 1e-9
      ? String(rounded)
      : rounded.toFixed(1);
  return `${label}★`;
}

function renderHero(ctx) {
  const settings = currentSettings();
  const profile = ctx.profile;
  const title = profile?.title || ctx.titleHint || ctx.slug;
  const year = profile?.year || ctx.yearHint || '';
  const posterUrl = profile?.posterUrl || ctx.posterHint || '';
  const filmUrl = profile?.filmUrl || filmUrlForSlug(ctx.slug);
  const img = posterUrl
    ? `<img src="${escapeAttr(posterUrl)}" alt="" loading="lazy" decoding="async">`
    : `<span class="lbp-fmp__cover-ph"></span>`;

  const yearHtml = year
    ? `<span class="lbp-fmp__year">${escapeHtml(String(year))}</span>`
    : '';
  const runtimeLabel =
    settings.fmpShowRuntime !== false && profile?.runtimeMins
      ? formatRuntime(profile.runtimeMins)
      : '';
  const runtimeHtml = runtimeLabel
    ? `<span class="lbp-fmp__runtime">${yearHtml ? '<span class="lbp-fmp__sep" aria-hidden="true">·</span>' : ''}${escapeHtml(runtimeLabel)}</span>`
    : '';
  const rating =
    settings.fmpShowCommunityRating !== false ? profile?.rating : null;
  const ratingTitle =
    rating != null && profile?.ratingCount != null
      ? `${t('miniFilmRating')} · ${t('miniFilmRatingCount', {
          count: formatNumber(profile.ratingCount),
        })}`
      : t('miniFilmRating');
  const ratingHtml =
    rating != null
      ? `<span class="lbp-fmp__rating" title="${escapeAttr(ratingTitle)}">${escapeHtml(formatStars(rating))}</span>`
      : ctx.loadingProfile && settings.fmpShowCommunityRating !== false
        ? skelBone('lbp-fmp__bone--rating')
        : '';

  const myRating =
    settings.fmpShowUserStatus !== false && ctx.user?.rating != null
      ? Number(ctx.user.rating)
      : null;
  const myRatingHtml =
    myRating != null && myRating > 0
      ? `<span class="lbp-fmp__user-rating" title="${escapeAttr(t('miniFilmMyRating'))}">${escapeHtml(formatStars(myRating))}</span>`
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
          ${runtimeHtml}
          ${ratingHtml}
          ${myRatingHtml}
        </div>
      </div>
    </div>
  `;
}

function renderUserStatus(ctx) {
  const settings = currentSettings();
  if (settings.fmpShowUserStatus === false) return '';

  const user = ctx.user;
  if (!user && ctx.loadingUser) {
    return `
      <div class="lbp-fmp__section lbp-fmp__user" aria-hidden="true">
        ${skelBone('lbp-fmp__bone--chip')}
        ${skelBone('lbp-fmp__bone--chip')}
        ${skelBone('lbp-fmp__bone--chip')}
      </div>
    `;
  }
  if (!user) return '';

  const bits = [];
  if (user.watched) {
    bits.push(
      `<span class="lbp-fmp__badge lbp-fmp__badge--watched">${escapeHtml(t('miniFilmWatched'))}</span>`,
    );
  }
  if (user.liked) {
    bits.push(
      `<span class="lbp-fmp__badge lbp-fmp__badge--liked">${escapeHtml(t('miniFilmLiked'))}</span>`,
    );
  }
  if (user.inWatchlist === true) {
    bits.push(
      `<span class="lbp-fmp__badge lbp-fmp__badge--watchlist">${escapeHtml(t('miniFilmInWatchlist'))}</span>`,
    );
  }

  if (!bits.length) return '';
  return `<div class="lbp-fmp__section lbp-fmp__user">${bits.join('')}</div>`;
}

function renderCast(ctx) {
  const settings = currentSettings();
  if (settings.fmpShowCast === false) return '';

  const profile = ctx.profile;
  if (!profile && ctx.loadingProfile) {
    return `
      <div class="lbp-fmp__section lbp-fmp__cast" aria-hidden="true">
        ${skelBone('lbp-fmp__bone--line')}
        ${skelBone('lbp-fmp__bone--line')}
      </div>
    `;
  }

  const cast = profile?.cast || [];
  if (!cast.length) return '';

  const items = cast
    .map((person) => {
      const name = person.href
        ? `<a class="lbp-fmp__cast-name" href="${escapeAttr(person.href)}">${escapeHtml(person.name)}</a>`
        : `<span class="lbp-fmp__cast-name">${escapeHtml(person.name)}</span>`;
      const role = person.role
        ? `<span class="lbp-fmp__cast-role">${escapeHtml(person.role)}</span>`
        : '';
      return `<li class="lbp-fmp__cast-item">${name}${role}</li>`;
    })
    .join('');

  return `
    <div class="lbp-fmp__section lbp-fmp__cast">
      <div class="lbp-fmp__section-label">${escapeHtml(t('miniFilmCast'))}</div>
      <ul class="lbp-fmp__cast-list">${items}</ul>
    </div>
  `;
}

function renderMeta(ctx) {
  const settings = currentSettings();
  const showDirectors = settings.fmpShowDirectors !== false;
  const showGenres = settings.fmpShowGenres !== false;
  if (!showDirectors && !showGenres) return '';

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

  const directors = showDirectors
    ? (profile.directors || [])
        .map((director) => {
          if (director.href) {
            return `<a class="lbp-fmp__director" href="${escapeAttr(director.href)}">${escapeHtml(director.name)}</a>`;
          }
          return `<span class="lbp-fmp__director">${escapeHtml(director.name)}</span>`;
        })
        .join('<span class="lbp-fmp__sep"> · </span>')
    : '';

  const chips = showGenres
    ? (profile.genres || [])
        .map((genre) => `<span class="lbp-fmp__chip">${escapeHtml(genre)}</span>`)
        .join('')
    : '';

  if (!directors && !chips) return '';

  return `
    <div class="lbp-fmp__section">
      ${directors ? `<div class="lbp-fmp__directors">${directors}</div>` : ''}
      ${chips ? `<div class="lbp-fmp__chips">${chips}</div>` : ''}
    </div>
  `;
}

function renderTagline(ctx) {
  const settings = currentSettings();
  if (settings.fmpShowTagline === false) return '';

  const tagline = ctx.profile?.tagline;
  if (!tagline && ctx.loadingProfile) {
    return `
      <div class="lbp-fmp__section" aria-hidden="true">
        ${skelBone('lbp-fmp__bone--desc-short')}
      </div>
    `;
  }
  if (!tagline) return '';
  return `<p class="lbp-fmp__tagline">${escapeHtml(tagline)}</p>`;
}

function renderStats(ctx) {
  const settings = currentSettings();
  if (settings.fmpShowStats !== true) return '';

  const stats = ctx.profile?.stats;
  if (!stats && ctx.loadingProfile) {
    return `
      <div class="lbp-fmp__section lbp-fmp__stats" aria-hidden="true">
        ${skelBone('lbp-fmp__bone--chip')}
        ${skelBone('lbp-fmp__bone--chip')}
      </div>
    `;
  }
  if (!stats) return '';

  const bits = [];
  if (stats.watches != null) {
    bits.push(
      `<span class="lbp-fmp__stat" title="${escapeAttr(t('miniFilmWatches'))}">${escapeHtml(
        t('miniFilmWatchesCount', { count: formatNumber(stats.watches) }),
      )}</span>`,
    );
  }
  if (stats.likes != null) {
    bits.push(
      `<span class="lbp-fmp__stat" title="${escapeAttr(t('miniFilmLikes'))}">${escapeHtml(
        t('miniFilmLikesCount', { count: formatNumber(stats.likes) }),
      )}</span>`,
    );
  }
  if (!bits.length) return '';
  return `<div class="lbp-fmp__section lbp-fmp__stats">${bits.join('')}</div>`;
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
  if (settings.fmpShowExternalScores === false) return '';
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
  const settings = currentSettings();
  if (settings.fmpShowDescription === false) return '';

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
  const settings = currentSettings();
  if (settings.fmpShowExternalLinks === false) return '';

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

function renderQuickLinks(ctx) {
  const settings = currentSettings();
  if (settings.fmpShowQuickLinks === false) return '';

  const activityUrl = ctx.user?.activityUrl;
  if (!activityUrl) return '';

  return `
    <div class="lbp-fmp__section lbp-fmp__links lbp-fmp__quick-links">
      <a class="lbp-fmp__link lbp-fmp__link--quick" href="${escapeAttr(activityUrl)}">${escapeHtml(t('miniFilmQuickActivity'))}</a>
    </div>
  `;
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
  { id: 'userStatus', render: (ctx) => renderUserStatus(ctx) },
  { id: 'cast', render: (ctx) => renderCast(ctx) },
  { id: 'meta', render: (ctx) => renderMeta(ctx) },
  { id: 'tagline', render: (ctx) => renderTagline(ctx) },
  { id: 'stats', render: (ctx) => renderStats(ctx) },
  { id: 'scores', render: (ctx) => renderScores(ctx) },
  { id: 'description', render: (ctx) => renderDescription(ctx) },
  { id: 'links', render: (ctx) => renderLinks(ctx) },
  { id: 'quickLinks', render: (ctx) => renderQuickLinks(ctx) },
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
