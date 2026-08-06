import { formatNumber, t } from '../../i18n/index.js';
import { escapeAttr, escapeHtml } from '../../utils/html.js';
import { currentSettings } from './state.js';

export function profileUrlForUsername(username) {
  return `/${encodeURIComponent(username)}/`;
}

function skelBone(extraClass = '') {
  return `<span class="lbp-ump__bone ${extraClass}" aria-hidden="true"></span>`;
}

function formatCompactCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return '';
  if (n >= 1e6) {
    const scaled = n / 1e6;
    const rounded =
      scaled >= 10 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
    return `${rounded}M`;
  }
  if (n >= 1e3) {
    const scaled = n / 1e3;
    const rounded =
      scaled >= 10 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
    return `${rounded}K`;
  }
  return formatNumber(n);
}

function renderHero(ctx) {
  const profile = ctx.profile;
  const loading = Boolean(ctx.loadingProfile && !profile);
  const profileUrl =
    profile?.profileUrl || profileUrlForUsername(ctx.username);
  const avatarUrl = ctx.avatarHint || profile?.avatarUrl || '';
  const img = avatarUrl
    ? `<img src="${escapeAttr(avatarUrl)}" alt="" loading="lazy" decoding="async">`
    : loading
      ? skelBone('lbp-ump__bone--avatar')
      : `<span class="lbp-ump__avatar-ph"></span>`;

  const displayName =
    profile?.displayName || (!loading ? ctx.displayNameHint : '') || '';
  const titleHtml = loading
    ? `<div class="lbp-ump__name lbp-ump__name--skel" aria-hidden="true">
        ${skelBone('lbp-ump__bone--title')}
        ${skelBone('lbp-ump__bone--title-2')}
      </div>`
    : displayName
      ? `<a class="lbp-ump__name" href="${escapeAttr(profileUrl)}">${escapeHtml(displayName)}</a>`
      : `<a class="lbp-ump__name" href="${escapeAttr(profileUrl)}">${escapeHtml(ctx.username)}</a>`;

  const handle = profile?.username || ctx.username;
  const handleHtml = loading
    ? `<span class="lbp-ump__handle" aria-hidden="true">${skelBone('lbp-ump__bone--handle')}</span>`
    : handle
      ? `<a class="lbp-ump__handle" href="${escapeAttr(profileUrl)}">@${escapeHtml(handle)}</a>`
      : '';

  const badgeHtml =
    !loading && profile?.isPatron
      ? `<span class="lbp-ump__badge lbp-ump__badge--patron">${escapeHtml(t('miniUserPatron'))}</span>`
      : '';

  return `
    <div class="lbp-ump__hero">
      <a class="lbp-ump__avatar-link" href="${escapeAttr(profileUrl)}">
        <div class="lbp-ump__avatar">${img}</div>
      </a>
      <div class="lbp-ump__hero-meta">
        <div class="lbp-ump__name-row">${titleHtml}${badgeHtml}</div>
        ${handleHtml}
      </div>
    </div>
  `;
}

function renderLocation(ctx) {
  const settings = currentSettings();
  if (settings.umpShowLocation === false) return '';

  const location = ctx.profile?.location;
  if (!location && ctx.loadingProfile) {
    return `<div class="lbp-ump__section" aria-hidden="true">${skelBone('lbp-ump__bone--line-short')}</div>`;
  }
  if (!location) return '';
  return `<p class="lbp-ump__location">${escapeHtml(location)}</p>`;
}

function renderBio(ctx) {
  const settings = currentSettings();
  if (settings.umpShowBio === false) return '';

  const bio = ctx.profile?.bio;
  if (!bio && ctx.loadingProfile) {
    return `
      <div class="lbp-ump__section" aria-hidden="true">
        ${skelBone('lbp-ump__bone--desc')}
        ${skelBone('lbp-ump__bone--desc-short')}
      </div>
    `;
  }
  if (!bio) return '';
  return `<p class="lbp-ump__bio">${escapeHtml(bio)}</p>`;
}

function renderStatItem({ label, value, href, title }) {
  const valueHtml = `<span class="lbp-ump__stat-value">${escapeHtml(value)}</span>`;
  const labelHtml = `<span class="lbp-ump__stat-label">${escapeHtml(label)}</span>`;
  const inner = `${valueHtml}${labelHtml}`;
  if (href) {
    return `<a class="lbp-ump__stat" href="${escapeAttr(href)}" title="${escapeAttr(title)}">${inner}</a>`;
  }
  return `<span class="lbp-ump__stat" title="${escapeAttr(title)}">${inner}</span>`;
}

function renderStats(ctx) {
  const settings = currentSettings();
  if (settings.umpShowStats === false) return '';

  const stats = ctx.profile?.stats;
  if (!stats && ctx.loadingProfile) {
    return `
      <div class="lbp-ump__section lbp-ump__stats" aria-hidden="true">
        ${skelBone('lbp-ump__bone--stat')}
        ${skelBone('lbp-ump__bone--stat')}
        ${skelBone('lbp-ump__bone--stat')}
        ${skelBone('lbp-ump__bone--stat')}
      </div>
    `;
  }
  if (!stats) return '';

  const bits = [];
  const rows = [
    {
      key: 'films',
      label: t('miniUserStatFilms'),
      countKey: 'miniUserFilmsCount',
      urlKey: 'filmsUrl',
    },
    {
      key: 'thisYear',
      label: t('miniUserStatThisYear'),
      countKey: 'miniUserThisYearCount',
      urlKey: 'thisYearUrl',
    },
    {
      key: 'lists',
      label: t('miniUserStatLists'),
      countKey: 'miniUserListsCount',
      urlKey: 'listsUrl',
    },
    {
      key: 'following',
      label: t('miniUserStatFollowing'),
      countKey: 'miniUserFollowingCount',
      urlKey: 'followingUrl',
    },
    {
      key: 'followers',
      label: t('miniUserStatFollowers'),
      countKey: 'miniUserFollowersCount',
      urlKey: 'followersUrl',
    },
  ];

  for (const row of rows) {
    const count = stats[row.key];
    if (count == null) continue;
    bits.push(
      renderStatItem({
        label: row.label,
        value: formatCompactCount(count),
        href: stats[row.urlKey] || '',
        title: t(row.countKey, { count: formatNumber(count) }),
      }),
    );
  }

  if (!bits.length) return '';
  return `<div class="lbp-ump__section lbp-ump__stats" aria-label="${escapeAttr(t('miniUserStats'))}">${bits.join('')}</div>`;
}

function renderFooter(ctx) {
  const profileUrl =
    ctx.profile?.profileUrl || profileUrlForUsername(ctx.username);
  return `
    <footer class="lbp-ump__footer">
      <a class="button -action lbp-ump__cta" href="${escapeAttr(profileUrl)}">${escapeHtml(t('miniUserOpen'))}</a>
    </footer>
  `;
}

const BODY_SECTIONS = [
  { id: 'hero', render: (ctx) => renderHero(ctx) },
  { id: 'location', render: (ctx) => renderLocation(ctx) },
  { id: 'bio', render: (ctx) => renderBio(ctx) },
  { id: 'stats', render: (ctx) => renderStats(ctx) },
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
    <div class="lbp-ump__card${loadingClass}">
      <div class="lbp-ump__body">${parts.join('')}</div>
      ${renderFooter(ctx)}
    </div>
  `;
}

export function renderError(username, displayNameHint) {
  const profileUrl = profileUrlForUsername(username);
  return `
    <div class="lbp-ump__card">
      <div class="lbp-ump__body">
        <div class="lbp-ump__hero">
          <div class="lbp-ump__avatar"><span class="lbp-ump__avatar-ph"></span></div>
          <div class="lbp-ump__hero-meta">
            <div class="lbp-ump__name">${escapeHtml(displayNameHint || username)}</div>
          </div>
        </div>
        <div class="lbp-ump__status">${escapeHtml(t('miniUserError'))}</div>
      </div>
      <footer class="lbp-ump__footer">
        <a class="button -action lbp-ump__cta" href="${escapeAttr(profileUrl)}">${escapeHtml(t('miniUserOpen'))}</a>
      </footer>
    </div>
  `;
}
