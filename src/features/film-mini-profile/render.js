import {
  METACRITIC_ORIGIN,
  ROTTEN_TOMATOES_ORIGIN,
} from '../../core/constants.js';
import { formatNumber, t } from '../../i18n/index.js';
import { escapeAttr, escapeHtml } from '../../utils/html.js';
import { currentSettings } from './state.js';

export function filmUrlForSlug(slug) {
  return `/film/${encodeURIComponent(slug)}/`;
}

function skelBone(extraClass = '') {
  return `<span class="lbp-fmp__bone ${extraClass}" aria-hidden="true"></span>`;
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

function wantsExternalScores(settings = currentSettings()) {
  if (settings.fmpShowExternalScores === false) return false;
  const wantsRt = settings.showRottenTomatoes !== false;
  const wantsMc = settings.showMetacritic !== false;
  return wantsRt || wantsMc;
}

const RT_FAVICON = `${ROTTEN_TOMATOES_ORIGIN}/assets/pizza-pie/images/favicon.ico`;
const MC_FAVICON = `${METACRITIC_ORIGIN}/favicon.ico`;

function formatMcUserScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(1);
}

function extScoreHtml({ href, icon, title, values }) {
  if (!values.length) return '';
  const valuesHtml = values
    .map(
      (value, index) =>
        `<span class="lbp-fmp__ext-score-value${index > 0 ? ' lbp-fmp__ext-score-value--sec' : ''}">${escapeHtml(value)}</span>`,
    )
    .join('');
  return `
    <a class="lbp-fmp__ext-score" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer" title="${escapeAttr(title)}">
      <img class="lbp-fmp__ext-score-icon" src="${escapeAttr(icon)}" alt="" width="14" height="14" loading="lazy" decoding="async" referrerpolicy="no-referrer">
      ${valuesHtml}
    </a>
  `;
}

function extScoreSkeleton(withSecondary) {
  const values = withSecondary
    ? `${skelBone('lbp-fmp__bone--ext-val')}${skelBone('lbp-fmp__bone--ext-val lbp-fmp__bone--ext-val-sec')}`
    : skelBone('lbp-fmp__bone--ext-val');
  return `<span class="lbp-fmp__ext-score is-skeleton" aria-hidden="true">${skelBone('lbp-fmp__bone--ext-icon')}${values}</span>`;
}

function renderHeaderScores(ctx) {
  const settings = currentSettings();
  if (!wantsExternalScores(settings)) return '';

  const wantsRt = settings.showRottenTomatoes !== false;
  const wantsMc = settings.showMetacritic !== false;
  const wantsRtAudience = settings.showAudienceScore !== false;
  const wantsMcUser = settings.showMetacriticUserScore !== false;

  if (ctx.loadingScores && !ctx.rt && !ctx.mc) {
    const bones = [];
    if (wantsRt) {
      bones.push(extScoreSkeleton(wantsRtAudience));
    }
    if (wantsMc) {
      bones.push(extScoreSkeleton(wantsMcUser));
    }
    return `<div class="lbp-fmp__ext-scores" aria-busy="true">${bones.join('')}</div>`;
  }

  const bits = [];
  if (wantsRt && ctx.rt) {
    const values = [];
    const titleParts = [];
    if (ctx.rt.criticsScore != null) {
      values.push(`${ctx.rt.criticsScore}%`);
      titleParts.push(
        `${ctx.rt.isCertifiedFresh ? t('certifiedFresh') : t('tomatometer')} ${ctx.rt.criticsScore}%`,
      );
    }
    if (wantsRtAudience && ctx.rt.audienceScore != null) {
      values.push(`${ctx.rt.audienceScore}%`);
      titleParts.push(`${t('popcornmeter')} ${ctx.rt.audienceScore}%`);
    }
    bits.push(
      extScoreHtml({
        href: ctx.rt.url || ROTTEN_TOMATOES_ORIGIN,
        icon: RT_FAVICON,
        title: titleParts.join(' · ') || t('rottenTomatoes'),
        values,
      }),
    );
  }
  if (wantsMc && ctx.mc) {
    const values = [];
    const titleParts = [];
    if (ctx.mc.criticsScore != null) {
      values.push(String(ctx.mc.criticsScore));
      titleParts.push(`${t('metascore')} ${ctx.mc.criticsScore}`);
    }
    if (wantsMcUser && ctx.mc.userScore != null) {
      const user = formatMcUserScore(ctx.mc.userScore);
      if (user) {
        values.push(user);
        titleParts.push(`${t('metacriticUserScore')} ${user}`);
      }
    }
    bits.push(
      extScoreHtml({
        href: ctx.mc.url || METACRITIC_ORIGIN,
        icon: MC_FAVICON,
        title: titleParts.join(' · ') || t('metacritic'),
        values,
      }),
    );
  }

  const html = bits.filter(Boolean).join('');
  if (!html) return '';
  return `<div class="lbp-fmp__ext-scores">${html}</div>`;
}

function renderHero(ctx) {
  const settings = currentSettings();
  const profile = ctx.profile;
  const loading = Boolean(ctx.loadingProfile && !profile);
  // Prefer the hovered poster card art when present; fall back to profile.
  const posterUrl = ctx.posterHint || profile?.posterUrl || '';
  const filmUrl = profile?.filmUrl || filmUrlForSlug(ctx.slug);
  const img = posterUrl
    ? `<img src="${escapeAttr(posterUrl)}" alt="" loading="lazy" decoding="async">`
    : loading
      ? skelBone('lbp-fmp__bone--cover')
      : `<span class="lbp-fmp__cover-ph"></span>`;

  const title = profile?.title || (!loading ? ctx.titleHint : '') || '';
  const titleHtml = loading
    ? `<div class="lbp-fmp__title lbp-fmp__title--skel" aria-hidden="true">
        ${skelBone('lbp-fmp__bone--title')}
        ${skelBone('lbp-fmp__bone--title-2')}
      </div>`
    : title
      ? `<a class="lbp-fmp__title" href="${escapeAttr(filmUrl)}">${escapeHtml(title)}</a>`
      : `<a class="lbp-fmp__title" href="${escapeAttr(filmUrl)}">${escapeHtml(ctx.slug)}</a>`;

  const year = profile?.year || (!loading ? ctx.yearHint : '') || '';
  const yearHtml = loading
    ? `<span class="lbp-fmp__year" aria-hidden="true">${skelBone('lbp-fmp__bone--year')}</span>`
    : year
      ? `<span class="lbp-fmp__year">${escapeHtml(String(year))}</span>`
      : '';

  const runtimeLabel =
    !loading &&
    settings.fmpShowRuntime !== false &&
    profile?.runtimeMins
      ? formatRuntime(profile.runtimeMins)
      : '';
  const runtimeHtml = loading && settings.fmpShowRuntime !== false
    ? `<span class="lbp-fmp__runtime" aria-hidden="true">${skelBone('lbp-fmp__bone--runtime')}</span>`
    : runtimeLabel
      ? `<span class="lbp-fmp__runtime">${yearHtml ? '<span class="lbp-fmp__sep" aria-hidden="true">·</span>' : ''}${escapeHtml(runtimeLabel)}</span>`
      : '';

  const rating =
    !loading && settings.fmpShowCommunityRating !== false
      ? profile?.rating
      : null;
  const ratingTitle =
    rating != null && profile?.ratingCount != null
      ? `${t('miniFilmRating')} · ${t('miniFilmRatingCount', {
          count: formatNumber(profile.ratingCount),
        })}`
      : t('miniFilmRating');
  const ratingHtml = loading && settings.fmpShowCommunityRating !== false
    ? `<span class="lbp-fmp__rating" aria-hidden="true">${skelBone('lbp-fmp__bone--rating')}</span>`
    : rating != null
      ? `<span class="lbp-fmp__rating" title="${escapeAttr(ratingTitle)}">${escapeHtml(formatStars(rating))}</span>`
      : '';

  const myRating =
    settings.fmpShowUserStatus !== false && ctx.user?.rating != null
      ? Number(ctx.user.rating)
      : null;
  const myRatingHtml =
    myRating != null && myRating > 0
      ? `<span class="lbp-fmp__user-rating" title="${escapeAttr(t('miniFilmMyRating'))}">${escapeHtml(formatStars(myRating))}</span>`
      : '';

  const headerScores = renderHeaderScores(ctx);
  const ratingsHtml =
    ratingHtml || myRatingHtml
      ? `<div class="lbp-fmp__ratings">${ratingHtml}${myRatingHtml}</div>`
      : '';
  const subHtml =
    yearHtml || runtimeHtml || ratingsHtml
      ? `<div class="lbp-fmp__sub">${yearHtml}${runtimeHtml}${ratingsHtml}</div>`
      : '';

  return `
    <div class="lbp-fmp__hero">
      <a class="lbp-fmp__cover-link" href="${escapeAttr(filmUrl)}">
        <div class="lbp-fmp__cover">${img}</div>
      </a>
      <div class="lbp-fmp__hero-meta">
        ${titleHtml}
        ${subHtml}
        ${headerScores}
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
      <div class="lbp-fmp__section lbp-fmp__user lbp-fmp__skel-row" aria-hidden="true">
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
        <div class="lbp-fmp__section-label">${skelBone('lbp-fmp__bone--label')}</div>
        ${skelBone('lbp-fmp__bone--line')}
        ${skelBone('lbp-fmp__bone--line')}
        ${skelBone('lbp-fmp__bone--line lbp-fmp__bone--line-short')}
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
        ${showDirectors ? skelBone('lbp-fmp__bone--line') : ''}
        ${
          showGenres
            ? `<div class="lbp-fmp__chips lbp-fmp__skel-row">
          ${skelBone('lbp-fmp__bone--chip')}
          ${skelBone('lbp-fmp__bone--chip')}
          ${skelBone('lbp-fmp__bone--chip')}
        </div>`
            : ''
        }
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

function formatCompactCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return '';
  if (n >= 1e6) {
    const scaled = n / 1e6;
    const rounded = scaled >= 10 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
    return `${rounded}M`;
  }
  if (n >= 1e3) {
    const scaled = n / 1e3;
    const rounded = scaled >= 10 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
    return `${rounded}K`;
  }
  return formatNumber(n);
}

const STAT_ICONS = {
  watches: `<svg xmlns="http://www.w3.org/2000/svg" role="presentation" class="lbp-fmp__stat-icon" width="16" height="11" viewBox="0 0 16 11" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M8.009 1c4.046 0 7.51 3.873 7.945 4.378l.04.048L16 5.6S12.324 10 7.991 10C3.945 10 .481 6.127.046 5.622L0 5.568V5.4S3.676 1 8.009 1ZM8 2.625a2.875 2.875 0 1 0 0 5.75 2.875 2.875 0 0 0 0-5.75ZM8 4.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z"></path></svg>`,
  lists: `<svg xmlns="http://www.w3.org/2000/svg" role="presentation" class="lbp-fmp__stat-icon" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M10 .75v2.5a.75.75 0 0 1-.75.75h-2.5A.75.75 0 0 1 6 3.25V.75A.75.75 0 0 1 6.75 0h2.5a.75.75 0 0 1 .75.75ZM6.75 6h2.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-.75.75h-2.5A.75.75 0 0 1 6 9.25v-2.5A.75.75 0 0 1 6.75 6ZM4 .75v2.5a.75.75 0 0 1-.75.75H.75A.75.75 0 0 1 0 3.25V.75A.75.75 0 0 1 .75 0h2.5A.75.75 0 0 1 4 .75ZM.75 6h2.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-.75.75H.75A.75.75 0 0 1 0 9.25v-2.5A.75.75 0 0 1 .75 6Z"></path></svg>`,
  likes: `<svg xmlns="http://www.w3.org/2000/svg" role="presentation" class="lbp-fmp__stat-icon" width="12" height="11" viewBox="0 0 12 11" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M6 2.25S4.51.5 2.99.5C1.46.5 0 1.23 0 3.37c0 1.52 1.5 2.86 1.5 2.86l3.812 3.617a1 1 0 0 0 1.376 0L10.5 6.23S12 4.89 12 3.37C12 1.23 10.54.5 9.01.5 7.49.5 6 2.25 6 2.25Z"></path></svg>`,
  topFilms: `<svg xmlns="http://www.w3.org/2000/svg" role="presentation" class="lbp-fmp__stat-icon" width="14" height="11" viewBox="0 0 14 11" aria-hidden="true"><path fill="currentColor" d="M0 2.169c0-.252.126-.48.32-.576.194-.097.417-.043.566.135l2.546 3.056c.05.062.12.095.192.091a.248.248 0 0 0 .188-.108l2.535-3.55A.488.488 0 0 1 6.74 1c.151 0 .295.08.394.218l2.547 3.565c.045.064.109.103.178.108a.236.236 0 0 0 .189-.077l3.091-3.248a.452.452 0 0 1 .556-.098c.185.102.304.323.304.567V10H0V2.169Z"></path></svg>`,
};

function renderStatItem({ kind, label, title, href }) {
  const icon = STAT_ICONS[kind] || '';
  const inner = `${icon}<span class="lbp-fmp__stat-label">${escapeHtml(label)}</span>`;
  if (href) {
    return `<a class="lbp-fmp__stat" href="${escapeAttr(href)}" title="${escapeAttr(title)}">${inner}</a>`;
  }
  return `<span class="lbp-fmp__stat" title="${escapeAttr(title)}">${inner}</span>`;
}

function renderStats(ctx) {
  const settings = currentSettings();
  if (settings.fmpShowStats === false) return '';

  const stats = ctx.profile?.stats;
  if (!stats && ctx.loadingProfile) {
    return `
      <div class="lbp-fmp__section lbp-fmp__stats" aria-hidden="true">
        ${skelBone('lbp-fmp__bone--chip')}
        ${skelBone('lbp-fmp__bone--chip')}
        ${skelBone('lbp-fmp__bone--chip')}
      </div>
    `;
  }
  if (!stats) return '';

  const slug = ctx.profile?.slug || ctx.slug;
  const filmBase = filmUrlForSlug(slug);
  const bits = [];

  if (stats.watches != null) {
    bits.push(
      renderStatItem({
        kind: 'watches',
        label: formatCompactCount(stats.watches),
        title: t('miniFilmWatchesCount', {
          count: formatNumber(stats.watches),
        }),
        href: stats.watchesUrl || `${filmBase}members/`,
      }),
    );
  }
  if (stats.lists != null) {
    bits.push(
      renderStatItem({
        kind: 'lists',
        label: formatCompactCount(stats.lists),
        title: t('miniFilmListsCount', { count: formatNumber(stats.lists) }),
        href: stats.listsUrl || `${filmBase}lists/by/popular/`,
      }),
    );
  }
  if (stats.likes != null) {
    bits.push(
      renderStatItem({
        kind: 'likes',
        label: formatCompactCount(stats.likes),
        title: t('miniFilmLikesCount', { count: formatNumber(stats.likes) }),
        href: stats.likesUrl || `${filmBase}likes/`,
      }),
    );
  }
  if (stats.topRank != null) {
    bits.push(
      renderStatItem({
        kind: 'topFilms',
        label: formatNumber(stats.topRank),
        title: t('miniFilmTopRankTitle', { rank: formatNumber(stats.topRank) }),
        href: stats.topFilmsUrl || '',
      }),
    );
  }

  if (!bits.length) return '';
  return `<div class="lbp-fmp__section lbp-fmp__stats" aria-label="${escapeAttr(t('miniFilmStats'))}">${bits.join('')}</div>`;
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
      <a class="button -action lbp-fmp__cta" href="${escapeAttr(filmUrl)}">${escapeHtml(t('miniFilmOpen'))}</a>
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
  { id: 'description', render: (ctx) => renderDescription(ctx) },
  { id: 'quickLinks', render: (ctx) => renderQuickLinks(ctx) },
];

export function renderCard(ctx) {
  const parts = [];
  for (const section of BODY_SECTIONS) {
    const html = section.render(ctx);
    if (html) parts.push(html);
  }
  const loadingClass =
    ctx.loadingProfile && !ctx.profile ? ' is-skeleton-loading' : '';
  return `
    <div class="lbp-fmp__card${loadingClass}">
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
        <a class="button -action lbp-fmp__cta" href="${escapeAttr(filmUrl)}">${escapeHtml(t('miniFilmOpen'))}</a>
      </footer>
    </div>
  `;
}
