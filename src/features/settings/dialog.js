import { CACHE_HOURS_MAX, FMP_OPEN_MODES, SCRIPT_VERSION, TOAST_POSITIONS } from '../../core/constants.js';
import {
  loadSettings,
  resetSettings,
  saveSettings,
} from '../../core/settings.js';
import {
  LOCALE_FLAGS,
  LOCALE_NATIVE_NAMES,
  SUPPORTED_LOCALES,
  t,
} from '../../i18n/index.js';
import {
  configureToastPosition,
  queueToast,
  showToast,
} from '../toast/index.js';
import {
  aboutHtml,
  cacheEntitiesHtml,
  cacheMeterHtml,
  clearCache,
  clearCacheByType,
  getCacheStatsByType,
  paintCachePanel,
  switchHtml,
} from './html.js';
import { activateTab, prefersReducedMotion } from './tabs.js';

const TOAST_POSITION_I18N = Object.freeze({
  'top-right': 'toastPositionTopRight',
  'top-left': 'toastPositionTopLeft',
  'top-center': 'toastPositionTopCenter',
  'bottom-right': 'toastPositionBottomRight',
  'bottom-left': 'toastPositionBottomLeft',
  'bottom-center': 'toastPositionBottomCenter',
});

const FMP_OPEN_MODE_I18N = Object.freeze({
  hover: 'fmpOpenModeHover',
  contextmenu: 'fmpOpenModeContextMenu',
});

export function openSettings() {
  if (document.querySelector('.lbp-settings-backdrop')) return;

  const draft = loadSettings();
  const localeOptions = SUPPORTED_LOCALES.map(
    (locale) =>
      `<option value="${locale}"${draft.uiLocale === locale ? ' selected' : ''}>${LOCALE_FLAGS[locale]} ${LOCALE_NATIVE_NAMES[locale]}</option>`,
  ).join('');
  const toastPositionOptions = TOAST_POSITIONS.map(
    (position) =>
      `<option value="${position}"${draft.toastPosition === position ? ' selected' : ''}>${t(TOAST_POSITION_I18N[position])}</option>`,
  ).join('');
  const fmpOpenModeOptions = FMP_OPEN_MODES.map(
    (mode) =>
      `<option value="${mode}"${draft.fmpOpenMode === mode ? ' selected' : ''}>${t(FMP_OPEN_MODE_I18N[mode])}</option>`,
  ).join('');
  const cacheTyped = getCacheStatsByType(draft.cacheHours);
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
          <button type="button" id="lbp-tab-card" data-tab="card" role="tab" aria-selected="false" aria-controls="lbp-panel-card" tabindex="-1">${t('tabCard')}</button>
          <button type="button" id="lbp-tab-cache" data-tab="cache" role="tab" aria-selected="false" aria-controls="lbp-panel-cache" tabindex="-1">${t('tabCache')} <span class="lbp-settings__tab-badge" data-cache-tab-badge>${cacheTyped.fillPercent}%</span></button>
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
            <label class="lbp-field" for="lbp-toast-position">
              <span>${t('toastPosition')}</span>
              <small>${t('toastPositionHint')}</small>
              <select id="lbp-toast-position">
                ${toastPositionOptions}
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
          <section id="lbp-panel-card" data-panel="card" role="tabpanel" aria-labelledby="lbp-tab-card" hidden>
            <p class="lbp-settings__kicker">${t('tabCard')}</p>
            <h3>${t('cardTitle')}</h3>
            <div class="lbp-settings__card">
              ${switchHtml(
                'showFilmMiniProfile',
                draft.showFilmMiniProfile,
                t('showFilmMiniProfile'),
                t('showFilmMiniProfileHint'),
              )}
              <label class="lbp-field" for="lbp-fmp-open-mode">
                <span>${t('fmpOpenMode')}</span>
                <small>${t('fmpOpenModeHint')}</small>
                <select id="lbp-fmp-open-mode">
                  ${fmpOpenModeOptions}
                </select>
              </label>
              ${switchHtml(
                'preloadFilmMiniProfile',
                draft.preloadFilmMiniProfile,
                t('preloadFilmMiniProfile'),
                t('preloadFilmMiniProfileHint'),
              )}
              ${switchHtml(
                'fmpShowCommunityRating',
                draft.fmpShowCommunityRating,
                t('fmpShowCommunityRating'),
                t('fmpShowCommunityRatingHint'),
              )}
              ${switchHtml(
                'fmpShowUserStatus',
                draft.fmpShowUserStatus,
                t('fmpShowUserStatus'),
                t('fmpShowUserStatusHint'),
              )}
              ${switchHtml(
                'fmpShowCast',
                draft.fmpShowCast,
                t('fmpShowCast'),
                t('fmpShowCastHint'),
              )}
              ${switchHtml(
                'fmpShowDirectors',
                draft.fmpShowDirectors,
                t('fmpShowDirectors'),
                t('fmpShowDirectorsHint'),
              )}
              ${switchHtml(
                'fmpShowGenres',
                draft.fmpShowGenres,
                t('fmpShowGenres'),
                t('fmpShowGenresHint'),
              )}
              ${switchHtml(
                'fmpShowTagline',
                draft.fmpShowTagline,
                t('fmpShowTagline'),
                t('fmpShowTaglineHint'),
              )}
              ${switchHtml(
                'fmpShowRuntime',
                draft.fmpShowRuntime,
                t('fmpShowRuntime'),
                t('fmpShowRuntimeHint'),
              )}
              ${switchHtml(
                'fmpShowDescription',
                draft.fmpShowDescription,
                t('fmpShowDescription'),
                t('fmpShowDescriptionHint'),
              )}
              ${switchHtml(
                'fmpShowStats',
                draft.fmpShowStats,
                t('fmpShowStats'),
                t('fmpShowStatsHint'),
              )}
              ${switchHtml(
                'fmpShowExternalScores',
                draft.fmpShowExternalScores,
                t('fmpShowExternalScores'),
                t('fmpShowExternalScoresHint'),
              )}
              ${switchHtml(
                'fmpShowExternalLinks',
                draft.fmpShowExternalLinks,
                t('fmpShowExternalLinks'),
                t('fmpShowExternalLinksHint'),
              )}
              ${switchHtml(
                'fmpShowQuickLinks',
                draft.fmpShowQuickLinks,
                t('fmpShowQuickLinks'),
                t('fmpShowQuickLinksHint'),
              )}
            </div>
          </section>
          <section id="lbp-panel-cache" data-panel="cache" role="tabpanel" aria-labelledby="lbp-tab-cache" hidden>
            <p class="lbp-settings__kicker">${t('tabCache')}</p>
            <h3>${t('cacheTitle')}</h3>
            <p class="lbp-settings__intro">${t('cacheDescription')}</p>
            ${cacheMeterHtml(cacheTyped)}
            <label class="lbp-field" for="lbp-cache-hours">
              <span>${t('cacheDuration')}</span>
              <small>${t('cacheHint')}</small>
              <span class="lbp-field__input">
                <input id="lbp-cache-hours" type="number" min="0" max="${CACHE_HOURS_MAX}" value="${draft.cacheHours}">
                <span>${t('hours')}</span>
              </span>
            </label>
            ${cacheEntitiesHtml(draft, cacheTyped)}
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
        <button type="button" data-reset>${t('resetDefaults')}</button>
        <div class="lbp-settings__footer-actions">
          <button type="button" data-close>${t('cancel')}</button>
          <button type="button" class="is-primary" data-save>${t('saveReload')}</button>
        </div>
      </footer>
      <div class="lbp-confirm" data-confirm hidden>
        <div
          class="lbp-confirm__card"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="lbp-confirm-title"
          aria-describedby="lbp-confirm-desc"
        >
          <h3 id="lbp-confirm-title">${t('resetConfirmTitle')}</h3>
          <p id="lbp-confirm-desc">${t('resetConfirmMessage')}</p>
          <div class="lbp-confirm__actions">
            <button type="button" data-confirm-cancel>${t('cancel')}</button>
            <button type="button" class="is-danger" data-confirm-ok>${t('resetConfirmAction')}</button>
          </div>
        </div>
      </div>
    </div>
  `;

  let closing = false;
  let confirmOpen = false;
  const confirm = backdrop.querySelector('[data-confirm]');
  const finishClose = () => {
    document.removeEventListener('keydown', onDocumentKeydown, true);
    configureToastPosition(loadSettings().toastPosition);
    backdrop.remove();
    document.documentElement.classList.remove('lbp-modal-open');
    activeElement?.focus?.();
  };
  const closeConfirm = () => {
    if (!confirmOpen) return;
    confirmOpen = false;
    confirm.hidden = true;
    dialog.querySelector('[data-reset]')?.focus();
  };
  const openConfirm = () => {
    confirmOpen = true;
    confirm.hidden = false;
    confirm.querySelector('[data-confirm-cancel]')?.focus();
  };
  const close = () => {
    if (closing) return;
    if (confirmOpen) {
      closeConfirm();
      return;
    }
    closing = true;
    document.removeEventListener('keydown', onDocumentKeydown, true);
    if (prefersReducedMotion() || !backdrop.classList.contains('is-open')) {
      finishClose();
      return;
    }
    backdrop.classList.remove('is-open');
    backdrop.classList.add('is-leaving');
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      finishClose();
    };
    backdrop.addEventListener('transitionend', (event) => {
      if (event.target === backdrop && event.propertyName === 'opacity') settle();
    });
    window.setTimeout(settle, 220);
  };
  const forceClose = () => {
    confirmOpen = false;
    confirm.hidden = true;
    if (closing) return;
    closing = true;
    document.removeEventListener('keydown', onDocumentKeydown, true);
    if (prefersReducedMotion() || !backdrop.classList.contains('is-open')) {
      finishClose();
      return;
    }
    backdrop.classList.remove('is-open');
    backdrop.classList.add('is-leaving');
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      finishClose();
    };
    backdrop.addEventListener('transitionend', (event) => {
      if (event.target === backdrop && event.propertyName === 'opacity') settle();
    });
    window.setTimeout(settle, 220);
  };
  const dialog = backdrop.querySelector('.lbp-settings');
  const onDocumentKeydown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (confirmOpen) closeConfirm();
      else forceClose();
    }
  };

  backdrop.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]')) {
      forceClose();
      return;
    }
    if (event.target === backdrop) close();
  });
  confirm.addEventListener('click', (event) => {
    if (event.target === confirm) closeConfirm();
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
  dialog.addEventListener('click', (event) => {
    const switchBtn = event.target.closest('[data-setting]');
    if (switchBtn && dialog.contains(switchBtn)) {
      const key = switchBtn.dataset.setting;
      draft[key] = !draft[key];
      switchBtn.classList.toggle('is-on', draft[key]);
      switchBtn.setAttribute('aria-checked', String(draft[key]));
      return;
    }

    const clearTypeBtn = event.target.closest('[data-clear-cache-type]');
    if (clearTypeBtn && dialog.contains(clearTypeBtn)) {
      const type = clearTypeBtn.dataset.clearCacheType;
      const removed = clearCacheByType(type);
      paintCachePanel(
        dialog,
        Number(dialog.querySelector('#lbp-cache-hours').value),
        draft,
      );
      const status = removed
        ? t('cacheCleared', { count: removed })
        : t('cacheAlreadyEmpty');
      dialog.querySelector('[data-cache-status]').textContent = status;
      showToast({
        title: t('cacheClearedTitle'),
        message: status,
      });
      return;
    }

    const toggleBtn = event.target.closest('[data-cache-entity-toggle]');
    if (toggleBtn && dialog.contains(toggleBtn)) {
      const entity = toggleBtn.closest('[data-cache-entity]');
      if (!entity) return;
      const expanded = entity.classList.toggle('is-collapsed') === false;
      toggleBtn.setAttribute('aria-expanded', String(expanded));
      const count = entity.querySelectorAll('.lbp-cache-entry').length;
      const label = toggleBtn.querySelector('.lbp-cache-entity__toggle-label');
      if (label) {
        label.textContent = expanded
          ? t('cacheEntriesHide')
          : t('cacheEntriesShow', { count });
      }
    }
  });
  dialog.querySelector('#lbp-toast-position').addEventListener('change', (event) => {
    draft.toastPosition = event.target.value;
    configureToastPosition(draft.toastPosition);
  });
  dialog.querySelector('#lbp-cache-hours').addEventListener('input', (event) => {
    paintCachePanel(dialog, Number(event.target.value), draft);
  });
  dialog.querySelector('[data-clear-cache]').addEventListener('click', () => {
    const removed = clearCache();
    paintCachePanel(
      dialog,
      Number(dialog.querySelector('#lbp-cache-hours').value),
      draft,
    );
    const status = removed
      ? t('cacheCleared', { count: removed })
      : t('cacheAlreadyEmpty');
    dialog.querySelector('[data-cache-status]').textContent = status;
    showToast({
      title: t('cacheClearedTitle'),
      message: status,
    });
  });
  dialog.querySelector('[data-reset]').addEventListener('click', () => {
    openConfirm();
  });
  confirm.querySelector('[data-confirm-cancel]').addEventListener('click', () => {
    closeConfirm();
  });
  confirm.querySelector('[data-confirm-ok]').addEventListener('click', () => {
    resetSettings();
    queueToast({
      title: t('settingsResetTitle'),
      message: t('settingsResetMessage'),
    });
    location.reload();
  });
  dialog.querySelector('[data-save]').addEventListener('click', () => {
    draft.uiLocale = dialog.querySelector('#lbp-ui-locale').value;
    draft.toastPosition = dialog.querySelector('#lbp-toast-position').value;
    draft.fmpOpenMode = dialog.querySelector('#lbp-fmp-open-mode').value;
    draft.cacheHours = Number(dialog.querySelector('#lbp-cache-hours').value);
    saveSettings(draft);
    queueToast({
      title: t('settingsSavedTitle'),
      message: t('settingsSavedMessage'),
    });
    location.reload();
  });

  document.documentElement.classList.add('lbp-modal-open');
  document.body.appendChild(backdrop);
  document.addEventListener('keydown', onDocumentKeydown, true);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      backdrop.classList.add('is-open');
      const activePanel = dialog.querySelector('[role="tabpanel"]:not([hidden])');
      if (activePanel && !prefersReducedMotion()) {
        activePanel.classList.add('is-entering');
      }
      dialog.querySelector('[data-tab]')?.focus();
    });
  });
}
