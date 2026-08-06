import {
  CACHE_HOURS_MAX,
  FMP_OPEN_MODES,
  SCRIPT_VERSION,
  TOAST_POSITIONS,
  TRANSLATE_DISPLAY_MODES,
} from '../../core/constants.js';
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
import { applyRuntimeSettings } from '../apply-settings.js';
import {
  configureToastPosition,
  showToast,
} from '../toast/index.js';
import {
  aboutHtml,
  cacheEntitiesHtml,
  cacheMeterHtml,
  clearCache,
  clearCacheByType,
  fieldHtml,
  getCacheStatsByType,
  groupHtml,
  listHtml,
  paintCachePanel,
  setRowDisabled,
  setSwitchOn,
  stackListHtml,
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

const TRANSLATE_MODE_I18N = Object.freeze({
  replace: 'translateModeReplace',
  below: 'translateModeBelow',
});

const FMP_DEPENDENT_KEYS = Object.freeze([
  'preloadFilmMiniProfile',
  'fmpShowCommunityRating',
  'fmpShowUserStatus',
  'fmpShowCast',
  'fmpShowDirectors',
  'fmpShowGenres',
  'fmpShowTagline',
  'fmpShowRuntime',
  'fmpShowDescription',
  'fmpShowStats',
  'fmpShowExternalScores',
  'fmpShowQuickLinks',
]);

function translateTabBadge(draft) {
  const pref = draft.translateTargetLocale || 'auto';
  if (pref === 'auto') return 'AUTO';
  return String(pref).split('-')[0].toUpperCase();
}

function setFieldDisabled(field, disabled) {
  if (!field) return;
  field.classList.toggle('is-disabled', disabled);
  const control = field.querySelector('select, input');
  if (control) control.disabled = disabled;
}

function syncDependentControls(dialog, draft) {
  setRowDisabled(
    dialog.querySelector('[data-setting-row="showAudienceScore"]'),
    !draft.showRottenTomatoes,
  );
  setRowDisabled(
    dialog.querySelector('[data-setting-row="showMetacriticUserScore"]'),
    !draft.showMetacritic,
  );

  const filmCardsOn = draft.showFilmMiniProfile !== false;
  for (const key of FMP_DEPENDENT_KEYS) {
    setRowDisabled(dialog.querySelector(`[data-setting-row="${key}"]`), !filmCardsOn);
  }

  const openModeField = dialog.querySelector('#lbp-fmp-open-mode')?.closest('.lbp-field');
  setFieldDisabled(openModeField, !filmCardsOn);

  const translateOn = draft.showTranslate !== false;
  setFieldDisabled(
    dialog.querySelector('#lbp-translate-locale')?.closest('.lbp-field'),
    !translateOn,
  );
  setFieldDisabled(
    dialog.querySelector('#lbp-translate-mode')?.closest('.lbp-field'),
    !translateOn,
  );
  setRowDisabled(
    dialog.querySelector('[data-setting-row="translateDescription"]'),
    !translateOn,
  );
  setRowDisabled(
    dialog.querySelector('[data-setting-row="translateReviews"]'),
    !translateOn,
  );
  setRowDisabled(
    dialog.querySelector('[data-setting-row="translateReviewsAuto"]'),
    !translateOn || draft.translateReviews === false,
  );
  setRowDisabled(
    dialog.querySelector('[data-setting-row="translateComments"]'),
    !translateOn,
  );

  const badge = dialog.querySelector('[data-translate-tab-badge]');
  if (badge) badge.textContent = translateTabBadge(draft);
}

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
  const translateLocaleOptions = SUPPORTED_LOCALES.map(
    (locale) =>
      `<option value="${locale}"${draft.translateTargetLocale === locale ? ' selected' : ''}>${LOCALE_FLAGS[locale]} ${LOCALE_NATIVE_NAMES[locale]}</option>`,
  ).join('');
  const translateModeOptions = TRANSLATE_DISPLAY_MODES.map(
    (mode) =>
      `<option value="${mode}"${draft.translateDisplayMode === mode ? ' selected' : ''}>${t(TRANSLATE_MODE_I18N[mode])}</option>`,
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
          <button type="button" id="lbp-tab-translate" data-tab="translate" role="tab" aria-selected="false" aria-controls="lbp-panel-translate" tabindex="-1">${t('tabTranslate')} <span class="lbp-settings__tab-badge" data-translate-tab-badge>${translateTabBadge(draft)}</span></button>
          <button type="button" id="lbp-tab-cache" data-tab="cache" role="tab" aria-selected="false" aria-controls="lbp-panel-cache" tabindex="-1">${t('tabCache')} <span class="lbp-settings__tab-badge" data-cache-tab-badge>${cacheTyped.fillPercent}%</span></button>
          <button type="button" id="lbp-tab-about" data-tab="about" role="tab" aria-selected="false" aria-controls="lbp-panel-about" tabindex="-1">${t('tabAbout')}</button>
        </div>
        <div class="lbp-settings__content">
          <section id="lbp-panel-general" data-panel="general" role="tabpanel" aria-labelledby="lbp-tab-general">
            ${groupHtml(
              'generalGroupLanguage',
              'generalGroupLanguageHint',
              listHtml(
                fieldHtml(
                  'lbp-ui-locale',
                  t('uiLanguage'),
                  t('uiLanguageHint'),
                  `<select id="lbp-ui-locale">
                    <option value="auto"${draft.uiLocale === 'auto' ? ' selected' : ''}>🌐 ${t('uiLanguageAuto')}</option>
                    ${localeOptions}
                  </select>`,
                ),
              ),
            )}
            ${groupHtml(
              'generalGroupNotifications',
              'generalGroupNotificationsHint',
              listHtml(
                fieldHtml(
                  'lbp-toast-position',
                  t('toastPosition'),
                  t('toastPositionHint'),
                  `<select id="lbp-toast-position">${toastPositionOptions}</select>`,
                ),
              ),
            )}
          </section>
          <section id="lbp-panel-film" data-panel="film" role="tabpanel" aria-labelledby="lbp-tab-film" hidden>
            ${groupHtml(
              'filmGroupScores',
              'filmGroupScoresHint',
              listHtml(
                switchHtml(
                  'showRottenTomatoes',
                  draft.showRottenTomatoes,
                  t('rottenTomatoes'),
                  t('rottenTomatoesHint'),
                ),
                switchHtml(
                  'showAudienceScore',
                  draft.showAudienceScore,
                  t('popcornmeter'),
                  t('popcornmeterHint'),
                ),
                switchHtml(
                  'showMetacritic',
                  draft.showMetacritic,
                  t('metacritic'),
                  t('metacriticHint'),
                ),
                switchHtml(
                  'showMetacriticUserScore',
                  draft.showMetacriticUserScore,
                  t('metacriticUserScore'),
                  t('metacriticUserScoreHint'),
                ),
              ),
            )}
            ${groupHtml(
              'filmGroupCast',
              'filmGroupCastHint',
              listHtml(
                switchHtml(
                  'enhanceCast',
                  draft.enhanceCast,
                  t('enhancedCast'),
                  t('enhancedCastHint'),
                ),
              ),
            )}
          </section>
          <section id="lbp-panel-card" data-panel="card" role="tabpanel" aria-labelledby="lbp-tab-card" hidden>
            ${groupHtml(
              'cardGroupBehavior',
              'cardGroupBehaviorHint',
              listHtml(
                switchHtml(
                  'showFilmMiniProfile',
                  draft.showFilmMiniProfile,
                  t('showFilmMiniProfile'),
                  t('showFilmMiniProfileHint'),
                ),
                fieldHtml(
                  'lbp-fmp-open-mode',
                  t('fmpOpenMode'),
                  t('fmpOpenModeHint'),
                  `<select id="lbp-fmp-open-mode">${fmpOpenModeOptions}</select>`,
                ),
                switchHtml(
                  'preloadFilmMiniProfile',
                  draft.preloadFilmMiniProfile,
                  t('preloadFilmMiniProfile'),
                  t('preloadFilmMiniProfileHint'),
                ),
              ),
            )}
            ${groupHtml(
              'cardGroupContent',
              'cardGroupContentHint',
              listHtml(
                switchHtml(
                  'fmpShowCommunityRating',
                  draft.fmpShowCommunityRating,
                  t('fmpShowCommunityRating'),
                  t('fmpShowCommunityRatingHint'),
                ),
                switchHtml(
                  'fmpShowUserStatus',
                  draft.fmpShowUserStatus,
                  t('fmpShowUserStatus'),
                  t('fmpShowUserStatusHint'),
                ),
                switchHtml(
                  'fmpShowCast',
                  draft.fmpShowCast,
                  t('fmpShowCast'),
                  t('fmpShowCastHint'),
                ),
                switchHtml(
                  'fmpShowDirectors',
                  draft.fmpShowDirectors,
                  t('fmpShowDirectors'),
                  t('fmpShowDirectorsHint'),
                ),
                switchHtml(
                  'fmpShowGenres',
                  draft.fmpShowGenres,
                  t('fmpShowGenres'),
                  t('fmpShowGenresHint'),
                ),
                switchHtml(
                  'fmpShowTagline',
                  draft.fmpShowTagline,
                  t('fmpShowTagline'),
                  t('fmpShowTaglineHint'),
                ),
                switchHtml(
                  'fmpShowRuntime',
                  draft.fmpShowRuntime,
                  t('fmpShowRuntime'),
                  t('fmpShowRuntimeHint'),
                ),
                switchHtml(
                  'fmpShowDescription',
                  draft.fmpShowDescription,
                  t('fmpShowDescription'),
                  t('fmpShowDescriptionHint'),
                ),
                switchHtml(
                  'fmpShowStats',
                  draft.fmpShowStats,
                  t('fmpShowStats'),
                  t('fmpShowStatsHint'),
                ),
              ),
            )}
            ${groupHtml(
              'cardGroupExtras',
              'cardGroupExtrasHint',
              listHtml(
                switchHtml(
                  'fmpShowExternalScores',
                  draft.fmpShowExternalScores,
                  t('fmpShowExternalScores'),
                  t('fmpShowExternalScoresHint'),
                ),
                switchHtml(
                  'fmpShowQuickLinks',
                  draft.fmpShowQuickLinks,
                  t('fmpShowQuickLinks'),
                  t('fmpShowQuickLinksHint'),
                ),
              ),
            )}
          </section>
          <section id="lbp-panel-translate" data-panel="translate" role="tabpanel" aria-labelledby="lbp-tab-translate" hidden>
            ${groupHtml(
              'translateGroupMain',
              'translateGroupMainHint',
              listHtml(
                switchHtml(
                  'showTranslate',
                  draft.showTranslate,
                  t('showTranslate'),
                  t('showTranslateHint'),
                ),
                fieldHtml(
                  'lbp-translate-locale',
                  t('translateTargetLocale'),
                  t('translateTargetLocaleHint'),
                  `<select id="lbp-translate-locale">
                    <option value="auto"${draft.translateTargetLocale === 'auto' ? ' selected' : ''}>🌐 ${t('translateAsUi')}</option>
                    ${translateLocaleOptions}
                  </select>`,
                ),
                fieldHtml(
                  'lbp-translate-mode',
                  t('translateDisplayMode'),
                  t('translateDisplayModeHint'),
                  `<select id="lbp-translate-mode">${translateModeOptions}</select>`,
                ),
              ),
            )}
            ${groupHtml(
              'translateGroupTargets',
              'translateGroupTargetsHint',
              listHtml(
                switchHtml(
                  'translateDescription',
                  draft.translateDescription,
                  t('translateDescription'),
                  t('translateDescriptionHint'),
                ),
                switchHtml(
                  'translateReviews',
                  draft.translateReviews,
                  t('translateReviews'),
                  t('translateReviewsHint'),
                ),
                switchHtml(
                  'translateReviewsAuto',
                  draft.translateReviewsAuto,
                  t('translateReviewsAuto'),
                  t('translateReviewsAutoHint'),
                ),
                switchHtml(
                  'translateComments',
                  draft.translateComments,
                  t('translateComments'),
                  t('translateCommentsHint'),
                ),
              ),
            )}
          </section>
          <section id="lbp-panel-cache" data-panel="cache" role="tabpanel" aria-labelledby="lbp-tab-cache" hidden>
            ${groupHtml(
              'cacheGroupUsage',
              'cacheDescription',
              stackListHtml(cacheMeterHtml(cacheTyped)),
            )}
            ${groupHtml(
              'cacheGroupDuration',
              null,
              listHtml(
                fieldHtml(
                  'lbp-cache-hours',
                  t('cacheDuration'),
                  t('cacheHint'),
                  `<span class="lbp-field__input">
                    <input id="lbp-cache-hours" type="number" min="0" max="${CACHE_HOURS_MAX}" value="${draft.cacheHours}">
                    <span>${t('hours')}</span>
                  </span>`,
                ),
              ),
            )}
            ${groupHtml(
              'cacheGroupSources',
              'cacheGroupSourcesHint',
              cacheEntitiesHtml(draft, cacheTyped),
            )}
            ${groupHtml(
              'cacheGroupClear',
              null,
              stackListHtml(`
                <div class="lbp-cache-actions">
                  <button type="button" class="lbp-cache-actions__clear" data-clear-cache>${t('clearCache')}</button>
                  <span>${t('cacheClearHint')}</span>
                </div>
                <p class="lbp-cache-status" data-cache-status aria-live="polite"></p>
              `),
            )}
          </section>
          <section id="lbp-panel-about" data-panel="about" role="tabpanel" aria-labelledby="lbp-tab-about" hidden>
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

  syncDependentControls(dialog, draft);

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
    const row = event.target.closest('[data-setting-row]');
    if (
      row &&
      dialog.contains(row) &&
      !row.classList.contains('is-disabled') &&
      !event.target.closest('.lbp-switch, select, input, a, button')
    ) {
      const switchBtn = row.querySelector('[data-setting]');
      if (switchBtn && !switchBtn.disabled) {
        switchBtn.click();
        return;
      }
    }

    const switchBtn = event.target.closest('[data-setting]');
    if (switchBtn && dialog.contains(switchBtn) && !switchBtn.disabled) {
      const key = switchBtn.dataset.setting;
      draft[key] = !draft[key];
      setSwitchOn(switchBtn, draft[key]);
      syncDependentControls(dialog, draft);
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
  dialog.querySelector('#lbp-translate-locale').addEventListener('change', (event) => {
    draft.translateTargetLocale = event.target.value;
    syncDependentControls(dialog, draft);
  });
  dialog.querySelector('#lbp-translate-mode').addEventListener('change', (event) => {
    draft.translateDisplayMode = event.target.value;
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
    const settings = resetSettings();
    forceClose();
    applyRuntimeSettings(settings);
    showToast({
      title: t('settingsResetTitle'),
      message: t('settingsResetMessage'),
    });
  });
  dialog.querySelector('[data-save]').addEventListener('click', () => {
    draft.uiLocale = dialog.querySelector('#lbp-ui-locale').value;
    draft.toastPosition = dialog.querySelector('#lbp-toast-position').value;
    draft.fmpOpenMode = dialog.querySelector('#lbp-fmp-open-mode').value;
    draft.translateTargetLocale = dialog.querySelector('#lbp-translate-locale').value;
    draft.translateDisplayMode = dialog.querySelector('#lbp-translate-mode').value;
    draft.cacheHours = Number(dialog.querySelector('#lbp-cache-hours').value);
    const settings = saveSettings(draft);
    forceClose();
    applyRuntimeSettings(settings);
    showToast({
      title: t('settingsSavedTitle'),
      message: t('settingsSavedMessage'),
    });
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
