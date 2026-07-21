import {
  clearCache,
  formatCacheBytes,
  getCacheStats,
} from '../cache.js';
import {
  AUTHOR_AVATAR_URL,
  AUTHOR_EMAIL,
  AUTHOR_HANDLE,
  AUTHOR_NAME,
  AUTHOR_URL,
  CACHE_HOURS_MAX,
  REPO_URL,
  SCRIPT_VERSION,
} from '../constants.js';
import {
  LOCALE_FLAGS,
  LOCALE_NATIVE_NAMES,
  SUPPORTED_LOCALES,
  t,
} from '../i18n/index.js';
import { loadSettings, saveSettings } from '../settings.js';

const NAV_ID = 'lbp-nav-settings';
const TABS = ['general', 'film', 'cache', 'about'];

function switchHtml(key, isOn, label, hint) {
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

function cacheMeterHtml(stats) {
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

function paintCachePanel(root, cacheHours) {
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

function aboutHtml() {
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

function activateTab(dialog, tabId, shouldFocus = false) {
  if (!TABS.includes(tabId)) return;
  dialog.querySelectorAll('[data-tab]').forEach((tab) => {
    const isActive = tab.dataset.tab === tabId;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
    if (isActive && shouldFocus) tab.focus();
  });
  dialog.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
    panel.hidden = panel.dataset.panel !== tabId;
  });
}

export function openSettings() {
  if (document.querySelector('.lbp-settings-backdrop')) return;

  const draft = loadSettings();
  const localeOptions = SUPPORTED_LOCALES.map(
    (locale) =>
      `<option value="${locale}"${draft.uiLocale === locale ? ' selected' : ''}>${LOCALE_FLAGS[locale]} ${LOCALE_NATIVE_NAMES[locale]}</option>`,
  ).join('');
  const cacheStats = getCacheStats(draft.cacheHours);
  const activeElement = document.activeElement;
  const backdrop = document.createElement('div');
  backdrop.className = 'lbp-settings-backdrop';
  backdrop.innerHTML = `
    <div class="lbp-settings" role="dialog" aria-modal="true" aria-labelledby="lbp-settings-title">
      <header class="lbp-settings__header">
        <span class="lbp-settings__eyebrow">Letterboxd Plus · v${SCRIPT_VERSION}</span>
        <h2 id="lbp-settings-title">${t('settingsTitle')}</h2>
        <button type="button" class="lbp-settings__close" data-close aria-label="${t('closeSettings')}">×</button>
      </header>
      <div class="lbp-settings__layout">
        <div class="lbp-settings__tabs" role="tablist" aria-label="${t('settingsSections')}">
          <button type="button" id="lbp-tab-general" class="is-active" data-tab="general" role="tab" aria-selected="true" aria-controls="lbp-panel-general">${t('tabGeneral')}</button>
          <button type="button" id="lbp-tab-film" data-tab="film" role="tab" aria-selected="false" aria-controls="lbp-panel-film" tabindex="-1">${t('tabFilm')}</button>
          <button type="button" id="lbp-tab-cache" data-tab="cache" role="tab" aria-selected="false" aria-controls="lbp-panel-cache" tabindex="-1">${t('tabCache')} <span class="lbp-settings__tab-badge" data-cache-tab-badge>${cacheStats.fillPercent}%</span></button>
          <button type="button" id="lbp-tab-about" data-tab="about" role="tab" aria-selected="false" aria-controls="lbp-panel-about" tabindex="-1">${t('tabAbout')}</button>
        </div>
        <div class="lbp-settings__content">
          <section id="lbp-panel-general" data-panel="general" role="tabpanel" aria-labelledby="lbp-tab-general">
            <p class="lbp-settings__kicker">${t('tabGeneral')}</p>
            <h3>${t('generalTitle')}</h3>
            <label class="lbp-field" for="lbp-ui-locale">
              <span>${t('uiLanguage')}</span>
              <small>${t('uiLanguageHint')}</small>
              <select id="lbp-ui-locale">
                <option value="auto"${draft.uiLocale === 'auto' ? ' selected' : ''}>🌐 ${t('uiLanguageAuto')}</option>
                ${localeOptions}
              </select>
            </label>
          </section>
          <section id="lbp-panel-film" data-panel="film" role="tabpanel" aria-labelledby="lbp-tab-film" hidden>
            <p class="lbp-settings__kicker">${t('tabFilm')}</p>
            <h3>${t('filmTitle')}</h3>
            <div class="lbp-settings__card">
              ${switchHtml(
                'showRottenTomatoes',
                draft.showRottenTomatoes,
                t('rottenTomatoes'),
                t('rottenTomatoesHint'),
              )}
              ${switchHtml(
                'showAudienceScore',
                draft.showAudienceScore,
                t('popcornmeter'),
                t('popcornmeterHint'),
              )}
              ${switchHtml(
                'showMetacritic',
                draft.showMetacritic,
                t('metacritic'),
                t('metacriticHint'),
              )}
              ${switchHtml(
                'showMetacriticUserScore',
                draft.showMetacriticUserScore,
                t('metacriticUserScore'),
                t('metacriticUserScoreHint'),
              )}
              ${switchHtml(
                'enhanceCast',
                draft.enhanceCast,
                t('enhancedCast'),
                t('enhancedCastHint'),
              )}
            </div>
          </section>
          <section id="lbp-panel-cache" data-panel="cache" role="tabpanel" aria-labelledby="lbp-tab-cache" hidden>
            <p class="lbp-settings__kicker">${t('tabCache')}</p>
            <h3>${t('cacheTitle')}</h3>
            <p class="lbp-settings__intro">${t('cacheDescription')}</p>
            ${cacheMeterHtml(cacheStats)}
            <label class="lbp-field" for="lbp-cache-hours">
              <span>${t('cacheDuration')}</span>
              <small>${t('cacheHint')}</small>
              <span class="lbp-field__input">
                <input id="lbp-cache-hours" type="number" min="0" max="${CACHE_HOURS_MAX}" value="${draft.cacheHours}">
                <span>${t('hours')}</span>
              </span>
            </label>
            <div class="lbp-cache-actions">
              <button type="button" class="lbp-cache-actions__clear" data-clear-cache>${t('clearCache')}</button>
              <span>${t('cacheClearHint')}</span>
            </div>
            <p class="lbp-cache-status" data-cache-status aria-live="polite"></p>
          </section>
          <section id="lbp-panel-about" data-panel="about" role="tabpanel" aria-labelledby="lbp-tab-about" hidden>
            <p class="lbp-settings__kicker">${t('tabAbout')}</p>
            <h3>${t('aboutTitle')}</h3>
            ${aboutHtml()}
          </section>
        </div>
      </div>
      <footer class="lbp-settings__footer">
        <button type="button" data-close>${t('cancel')}</button>
        <button type="button" class="is-primary" data-save>${t('saveReload')}</button>
      </footer>
    </div>
  `;

  const close = () => {
    document.removeEventListener('keydown', onDocumentKeydown, true);
    backdrop.remove();
    document.documentElement.classList.remove('lbp-modal-open');
    activeElement?.focus?.();
  };
  const dialog = backdrop.querySelector('.lbp-settings');
  const onDocumentKeydown = (event) => {
    if (event.key === 'Escape') close();
  };

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop || event.target.closest('[data-close]')) close();
  });
  dialog.querySelector('.lbp-settings__tabs').addEventListener('click', (event) => {
    const tab = event.target.closest('[data-tab]');
    if (tab) activateTab(dialog, tab.dataset.tab);
  });
  dialog.querySelector('.lbp-settings__tabs').addEventListener('keydown', (event) => {
    const tabs = [...dialog.querySelectorAll('[data-tab]')];
    const index = tabs.indexOf(event.target.closest('[data-tab]'));
    if (index < 0) return;
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    const next = tabs[(index + direction + tabs.length) % tabs.length];
    activateTab(dialog, next.dataset.tab, true);
  });
  dialog.querySelectorAll('[data-setting]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.setting;
      draft[key] = !draft[key];
      button.classList.toggle('is-on', draft[key]);
      button.setAttribute('aria-checked', String(draft[key]));
    });
  });
  dialog.querySelector('#lbp-cache-hours').addEventListener('input', (event) => {
    paintCachePanel(dialog, Number(event.target.value));
  });
  dialog.querySelector('[data-clear-cache]').addEventListener('click', () => {
    const removed = clearCache();
    paintCachePanel(dialog, Number(dialog.querySelector('#lbp-cache-hours').value));
    dialog.querySelector('[data-cache-status]').textContent = removed
      ? t('cacheCleared', { count: removed })
      : t('cacheAlreadyEmpty');
  });
  dialog.querySelector('[data-save]').addEventListener('click', () => {
    draft.uiLocale = dialog.querySelector('#lbp-ui-locale').value;
    draft.cacheHours = Number(dialog.querySelector('#lbp-cache-hours').value);
    saveSettings(draft);
    location.reload();
  });

  document.documentElement.classList.add('lbp-modal-open');
  document.body.appendChild(backdrop);
  document.addEventListener('keydown', onDocumentKeydown, true);
  requestAnimationFrame(() => {
    backdrop.classList.add('is-open');
    dialog.querySelector('[data-tab]')?.focus();
  });
}

export function ensureSettingsButton() {
  if (document.getElementById(NAV_ID)) return;
  const accountMenu = document.querySelector('.main-nav .nav-account > .subnav');
  if (!accountMenu) return;

  const item = document.createElement('li');
  item.id = NAV_ID;
  item.className = 'lbp-nav-settings';
  item.innerHTML =
    `<a href="#" title="${t('openSettingsTitle')}">Letterboxd Plus</a>`;
  item.querySelector('a').addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openSettings();
  });

  const nativeSettings = [...accountMenu.querySelectorAll(':scope > li > a')].find(
    (link) => link.getAttribute('href') === '/settings/',
  );
  nativeSettings?.parentElement?.insertAdjacentElement('afterend', item);
  if (!item.isConnected) accountMenu.appendChild(item);
}
