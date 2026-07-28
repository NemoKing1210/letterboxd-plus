import {
  clearCache,
  formatCacheBytes,
  getCacheStats,
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

export function switchHtml(key, isOn, label, hint) {
  return `
    <div class="lbp-setting-row">
      <span class="lbp-setting-row__copy">
        <strong>${label}</strong>
        <small>${hint}</small>
      </span>
      <button
        type="button"
        class="lbp-switch${isOn ? ' is-on' : ''}"
        role="switch"
        aria-checked="${isOn}"
        data-setting="${key}"
        aria-label="${label}"
      ><span aria-hidden="true"></span></button>
    </div>
  `;
}

export function cacheMeterHtml(stats) {
  const activePercent = Math.min(
    100,
    (stats.activeBytes / stats.limitBytes) * 100,
  );
  const expiredPercent = Math.min(
    100,
    (stats.expiredBytes / stats.limitBytes) * 100,
  );
  return `
    <div class="lbp-cache-meter" data-cache-meter>
      <div class="lbp-cache-meter__head">
        <span class="lbp-cache-meter__percent">${t('cacheFilled', {
          percent: stats.fillPercent,
        })}</span>
        <span class="lbp-cache-meter__used">${t('cacheUsed', {
          used: formatCacheBytes(stats.usedBytes),
          limit: formatCacheBytes(stats.limitBytes),
        })}</span>
      </div>
      <div class="lbp-cache-meter__bar" role="img" aria-label="${t('cacheFilled', {
        percent: stats.fillPercent,
      })}">
        <span class="lbp-cache-meter__segment is-active" style="width:${activePercent}%"></span>
        <span class="lbp-cache-meter__segment is-expired" style="width:${expiredPercent}%"></span>
      </div>
      <div class="lbp-cache-meter__legend">
        <span><i class="is-active"></i>${t('cacheActive', {
          count: stats.activeCount,
        })} · ${formatCacheBytes(stats.activeBytes)}</span>
        <span><i class="is-expired"></i>${t('cacheExpired', {
          count: stats.expiredCount,
        })} · ${formatCacheBytes(stats.expiredBytes)}</span>
      </div>
      <p>${t('cacheSoftLimitHint')}</p>
    </div>
  `;
}

export function paintCachePanel(root, cacheHours) {
  const stats = getCacheStats(cacheHours);
  const current = root.querySelector('[data-cache-meter]');
  if (current) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = cacheMeterHtml(stats).trim();
    current.replaceWith(wrapper.firstElementChild);
  }
  const badge = root.querySelector('[data-cache-tab-badge]');
  if (badge) badge.textContent = `${stats.fillPercent}%`;
}

export function aboutHtml() {
  return `
    <div class="lbp-about">
      <div class="lbp-about__card">
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
      </div>
      <div class="lbp-about__card">
        <p class="lbp-about__label">${t('aboutAuthor')}</p>
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
      </div>
    </div>
  `;
}

// Re-export for dialog handlers that clear cache
export { clearCache, getCacheStats };
