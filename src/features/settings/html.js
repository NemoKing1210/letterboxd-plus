import {
  CACHE_TYPES,
  clearCache,
  clearCacheByType,
  formatCacheAge,
  formatCacheBytes,
  getCacheStats,
  getCacheStatsByType,
} from '../../core/cache.js';
import {
  AUTHOR_AVATAR_URL,
  AUTHOR_EMAIL,
  AUTHOR_HANDLE,
  AUTHOR_NAME,
  AUTHOR_URL,
  REPO_URL,
  SCRIPT_VERSION,
} from '../../core/constants.js';
import { t } from '../../i18n/index.js';
import { escapeAttr, escapeHtml } from '../../utils/html.js';

const CACHE_ENTITY_META = Object.freeze({
  film: {
    settingKey: 'cacheFilmMiniProfile',
    titleKey: 'cacheEntityFilmTitle',
    descKey: 'cacheEntityFilmDesc',
    enableKey: 'cacheFilmMiniProfile',
    enableHintKey: 'cacheFilmMiniProfileHint',
    clearKey: 'cacheClearFilm',
  },
  user: {
    settingKey: 'cacheUserMiniProfile',
    titleKey: 'cacheEntityUserTitle',
    descKey: 'cacheEntityUserDesc',
    enableKey: 'cacheUserMiniProfile',
    enableHintKey: 'cacheUserMiniProfileHint',
    clearKey: 'cacheClearUser',
  },
  rt: {
    settingKey: 'cacheRottenTomatoes',
    titleKey: 'cacheEntityRtTitle',
    descKey: 'cacheEntityRtDesc',
    enableKey: 'cacheRottenTomatoes',
    enableHintKey: 'cacheRottenTomatoesHint',
    clearKey: 'cacheClearRt',
  },
  metacritic: {
    settingKey: 'cacheMetacritic',
    titleKey: 'cacheEntityMcTitle',
    descKey: 'cacheEntityMcDesc',
    enableKey: 'cacheMetacritic',
    enableHintKey: 'cacheMetacriticHint',
    clearKey: 'cacheClearMc',
  },
  gtx: {
    settingKey: 'cacheTranslations',
    titleKey: 'cacheEntityGtxTitle',
    descKey: 'cacheEntityGtxDesc',
    enableKey: 'cacheTranslations',
    enableHintKey: 'cacheTranslationsHint',
    clearKey: 'cacheClearGtx',
  },
});

/**
 * Settings group: titled block with optional intro and one or more lists.
 */
export function groupHtml(titleKey, hintKey, ...content) {
  const hint = hintKey
    ? `<p class="lbp-settings__intro">${escapeHtml(t(hintKey))}</p>`
    : '';
  return `
    <section class="lbp-settings-group">
      <header class="lbp-settings-group__head">
        <h3>${escapeHtml(t(titleKey))}</h3>
        ${hint}
      </header>
      ${content.filter(Boolean).join('')}
    </section>
  `;
}

export function listHtml(...rows) {
  return `<div class="lbp-settings-list">${rows.filter(Boolean).join('')}</div>`;
}

export function stackListHtml(...content) {
  return `<div class="lbp-settings-list lbp-settings-list--stack">${content.filter(Boolean).join('')}</div>`;
}

export function fieldHtml(id, label, hint, controlHtml) {
  return `
    <label class="lbp-field" for="${escapeAttr(id)}">
      <span>${escapeHtml(label)}</span>
      <small>${escapeHtml(hint)}</small>
      ${controlHtml}
    </label>
  `;
}

export function switchHtml(key, isOn, label, hint, { disabled = false } = {}) {
  const safeLabel = escapeHtml(label);
  const safeHint = escapeHtml(hint);
  return `
    <div class="lbp-setting-row${disabled ? ' is-disabled' : ''}" data-setting-row="${escapeAttr(key)}">
      <span class="lbp-setting-row__copy">
        <strong>${safeLabel}</strong>
        <small>${safeHint}</small>
      </span>
      <button
        type="button"
        class="lbp-switch${isOn ? ' is-on' : ''}"
        role="switch"
        aria-checked="${isOn}"
        data-setting="${escapeAttr(key)}"
        aria-label="${escapeAttr(label)}"
        ${disabled ? 'disabled aria-disabled="true"' : ''}
      ><span aria-hidden="true"></span></button>
    </div>
  `;
}

export function setSwitchOn(btn, on) {
  btn.classList.toggle('is-on', on);
  btn.setAttribute('aria-checked', String(on));
}

export function setRowDisabled(row, disabled) {
  if (!row) return;
  row.classList.toggle('is-disabled', disabled);
  const btn = row.querySelector('[data-setting]');
  if (btn) {
    btn.disabled = disabled;
    btn.setAttribute('aria-disabled', String(disabled));
  }
  const field = row.matches?.('.lbp-field') ? row : row.querySelector?.('.lbp-field');
  const control = (field || row).querySelector?.('select, input');
  if (control) control.disabled = disabled;
}

function typeSegmentPercent(bytes, limitBytes) {
  return Math.min(100, (Math.max(0, bytes) / limitBytes) * 100);
}

export function cacheMeterHtml(typed) {
  const filmPct = typeSegmentPercent(
    typed.byType.film.bytes,
    typed.limitBytes,
  );
  const rtPct = typeSegmentPercent(typed.byType.rt.bytes, typed.limitBytes);
  const mcPct = typeSegmentPercent(
    typed.byType.metacritic.bytes,
    typed.limitBytes,
  );
  const gtxPct = typeSegmentPercent(
    typed.byType.gtx?.bytes || 0,
    typed.limitBytes,
  );

  return `
    <div class="lbp-cache-meter" data-cache-meter>
      <div class="lbp-cache-meter__head">
        <span class="lbp-cache-meter__percent">${t('cacheFilled', {
          percent: typed.fillPercent,
        })}</span>
        <span class="lbp-cache-meter__used">${t('cacheUsed', {
          used: formatCacheBytes(typed.usedBytes),
          limit: formatCacheBytes(typed.limitBytes),
        })}</span>
      </div>
      <div class="lbp-cache-meter__bar" role="img" aria-label="${t('cacheFilled', {
        percent: typed.fillPercent,
      })}">
        <span class="lbp-cache-meter__segment is-film" style="width:${filmPct}%"></span>
        <span class="lbp-cache-meter__segment is-rt" style="width:${rtPct}%"></span>
        <span class="lbp-cache-meter__segment is-mc" style="width:${mcPct}%"></span>
        <span class="lbp-cache-meter__segment is-gtx" style="width:${gtxPct}%"></span>
      </div>
      <div class="lbp-cache-meter__legend lbp-cache-meter__legend--types">
        <span><i class="is-film"></i>${t('cacheEntityFilmTitle')} · ${typed.byType.film.count} · ${formatCacheBytes(typed.byType.film.bytes)}</span>
        <span><i class="is-rt"></i>${t('cacheEntityRtTitle')} · ${typed.byType.rt.count} · ${formatCacheBytes(typed.byType.rt.bytes)}</span>
        <span><i class="is-mc"></i>${t('cacheEntityMcTitle')} · ${typed.byType.metacritic.count} · ${formatCacheBytes(typed.byType.metacritic.bytes)}</span>
        <span><i class="is-gtx"></i>${t('cacheEntityGtxTitle')} · ${typed.byType.gtx?.count || 0} · ${formatCacheBytes(typed.byType.gtx?.bytes || 0)}</span>
      </div>
      <p>${t('cacheSoftLimitHint')}</p>
    </div>
  `;
}

function cacheEntryListHtml(entries) {
  if (!entries.length) {
    return `<p class="lbp-cache-entity__empty">${escapeHtml(t('cacheEntriesEmpty'))}</p>`;
  }

  const items = entries
    .map((entry) => {
      const status = entry.expired
        ? t('cacheExpiredLabel')
        : t('cacheActiveLabel');
      const statusClass = entry.expired ? 'is-expired' : 'is-active';
      return `
        <li class="lbp-cache-entry ${statusClass}">
          <span class="lbp-cache-entry__label" title="${escapeAttr(entry.label)}">${escapeHtml(entry.label)}</span>
          <span class="lbp-cache-entry__meta">
            <span class="lbp-cache-entry__status">${escapeHtml(status)}</span>
            <span>${escapeHtml(formatCacheAge(entry.savedAt))}</span>
            <span>${escapeHtml(formatCacheBytes(entry.bytes))}</span>
          </span>
        </li>
      `;
    })
    .join('');

  return `<ul class="lbp-cache-entity__list">${items}</ul>`;
}

function cacheEntityHtml(type, draft, typed, expanded = false) {
  const meta = CACHE_ENTITY_META[type];
  const stats = typed.byType[type];
  const entries = typed.entries.filter((entry) => entry.type === type);
  const enabled = draft[meta.settingKey] !== false;
  const count = entries.length;
  const collapsedClass = expanded ? '' : ' is-collapsed';
  const toggleLabel = expanded
    ? t('cacheEntriesHide')
    : t('cacheEntriesShow', { count });

  return `
    <article class="lbp-cache-entity lbp-cache-entity--${type}${collapsedClass}" data-cache-entity="${type}">
      <header class="lbp-cache-entity__header">
        <div class="lbp-cache-entity__copy">
          <strong>${escapeHtml(t(meta.titleKey))}</strong>
          <p>${escapeHtml(t(meta.descKey))}</p>
          <small>${escapeHtml(
            t('cacheEntityStats', {
              active: stats.activeCount,
              expired: stats.expiredCount,
              size: formatCacheBytes(stats.bytes),
            }),
          )}</small>
        </div>
        <div class="lbp-cache-entity__controls">
          <button
            type="button"
            class="lbp-switch${enabled ? ' is-on' : ''}"
            role="switch"
            aria-checked="${enabled}"
            data-setting="${meta.settingKey}"
            aria-label="${escapeAttr(t(meta.enableKey))}"
            title="${escapeAttr(t(meta.enableHintKey))}"
          ><span aria-hidden="true"></span></button>
          <button
            type="button"
            class="lbp-cache-entity__clear"
            data-clear-cache-type="${type}"
          >${escapeHtml(t(meta.clearKey))}</button>
        </div>
      </header>
      <button
        type="button"
        class="lbp-cache-entity__toggle"
        data-cache-entity-toggle
        aria-expanded="${expanded ? 'true' : 'false'}"
      >
        <span class="lbp-cache-entity__toggle-label">${escapeHtml(toggleLabel)}</span>
        <span class="lbp-cache-entity__chevron" aria-hidden="true"></span>
      </button>
      <div class="lbp-cache-entity__body">
        ${cacheEntryListHtml(entries)}
      </div>
    </article>
  `;
}

export function cacheEntitiesHtml(draft, typed, expandedTypes = []) {
  const expanded = new Set(expandedTypes);
  return `
    <div class="lbp-cache-entities" data-cache-entities>
      ${CACHE_TYPES.map((type) =>
        cacheEntityHtml(type, draft, typed, expanded.has(type)),
      ).join('')}
    </div>
  `;
}

export function paintCachePanel(root, cacheHours, draft) {
  const typed = getCacheStatsByType(cacheHours);
  const settingsDraft = draft || {};
  const expandedTypes = [
    ...root.querySelectorAll('.lbp-cache-entity:not(.is-collapsed)'),
  ]
    .map((el) => el.dataset.cacheEntity)
    .filter(Boolean);

  const meter = root.querySelector('[data-cache-meter]');
  if (meter) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = cacheMeterHtml(typed).trim();
    meter.replaceWith(wrapper.firstElementChild);
  }

  const entities = root.querySelector('[data-cache-entities]');
  if (entities) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = cacheEntitiesHtml(
      settingsDraft,
      typed,
      expandedTypes,
    ).trim();
    entities.replaceWith(wrapper.firstElementChild);
  }

  const badge = root.querySelector('[data-cache-tab-badge]');
  if (badge) badge.textContent = `${typed.fillPercent}%`;
  return typed;
}

export function aboutHtml() {
  return `
    ${groupHtml(
      'aboutGroupScript',
      null,
      stackListHtml(`
        <div class="lbp-about__brand">
          <span class="lbp-about__mark" aria-hidden="true"><i></i><i></i><i></i></span>
          <strong>Letterboxd Plus</strong>
        </div>
        <p class="lbp-about__description">${t('aboutDescription')}</p>
        <div class="lbp-about__chips">
          <span>v${SCRIPT_VERSION}</span>
          <span>${t('aboutLicense')}</span>
        </div>
        <a class="lbp-about__repo" href="${REPO_URL}" target="_blank" rel="noopener noreferrer">
          <span class="lbp-about__repo-icon" aria-hidden="true">GH</span>
          <span>
            <strong>${t('aboutRepository')}</strong>
            <small>${t('aboutRepositoryHint')}</small>
          </span>
          <b aria-hidden="true">↗</b>
        </a>
      `),
    )}
    ${groupHtml(
      'aboutAuthor',
      null,
      stackListHtml(`
        <div class="lbp-about__author">
          <a href="${AUTHOR_URL}" target="_blank" rel="noopener noreferrer" aria-label="${AUTHOR_NAME}">
            <img src="${AUTHOR_AVATAR_URL}" alt="" width="56" height="56" loading="lazy" decoding="async">
          </a>
          <span>
            <a class="lbp-about__author-name" href="${AUTHOR_URL}" target="_blank" rel="noopener noreferrer">${AUTHOR_NAME}</a>
            <small>@${AUTHOR_HANDLE}</small>
            <a class="lbp-about__email" href="mailto:${AUTHOR_EMAIL}">${AUTHOR_EMAIL}</a>
          </span>
        </div>
      `),
    )}
  `;
}

export {
  clearCache,
  clearCacheByType,
  getCacheStats,
  getCacheStatsByType,
};
