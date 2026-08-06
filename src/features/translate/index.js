import { translateText } from '../../api/google-translate.js';
import { getActiveLocale, SUPPORTED_LOCALES, t } from '../../i18n/index.js';
import { escapeHtml } from '../../utils/html.js';
import './translate.css';

const BTN_CLASS = 'lbp-translate-btn';
const RESULT_CLASS = 'lbp-translate-result';
const MARK_ATTR = 'data-lbp-translate';
const STATE_ATTR = 'data-lbp-translate-state';
const ORIG_ATTR = 'data-lbp-translate-original';
const AUTO_ATTR = 'data-lbp-translate-auto';
const AUTO_ROOT_MARGIN = '120px 0px';
const AUTO_CONCURRENCY = 2;

let clicksBound = false;
let autoObserver = null;
let autoActive = 0;
const autoQueue = [];

/** @type {Record<string, unknown> | null} */
let runtimeSettings = null;

function settings() {
  return runtimeSettings || {};
}

function resolveTranslateTarget() {
  const pref = settings().translateTargetLocale || 'auto';
  if (pref !== 'auto' && SUPPORTED_LOCALES.includes(pref)) return pref;
  return getActiveLocale();
}

function displayMode() {
  return settings().translateDisplayMode === 'below' ? 'below' : 'replace';
}

function htmlToPlain(html) {
  const div = document.createElement('div');
  div.innerHTML = String(html || '');
  div.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  return (div.textContent || '').replace(/\u00a0/g, ' ').trim();
}

function plainToHtml(text) {
  return escapeHtml(String(text || '')).replace(/\r\n|\r|\n/g, '<br>');
}

function findDescriptionHost() {
  return document.querySelector('section.production-synopsis');
}

function findDescriptionTextEl() {
  const host = findDescriptionHost();
  if (!host) return null;
  return (
    host.querySelector('.truncate[data-truncate] p') ||
    host.querySelector('.truncate p') ||
    host.querySelector('.body-text p') ||
    host.querySelector('p')
  );
}

function findReviewCards() {
  return document.querySelectorAll('article.production-viewing');
}

function findReviewTextEl(card) {
  return (
    card.querySelector('.js-review-body') ||
    card.querySelector('[data-is-translatable="true"]') ||
    card.querySelector('.js-review .body-text')
  );
}

function reviewButton(card) {
  return (
    card?.querySelector?.(`.${BTN_CLASS}[data-lbp-translate-kind="review"]`) || null
  );
}

function removeTranslateUi(scope = document) {
  stopAutoTranslate();
  scope
    .querySelectorAll('.lbp-translate-desc-slot, .lbp-translate-review-slot')
    .forEach((el) => el.remove());
  scope.querySelectorAll(`.${BTN_CLASS}`).forEach((el) => el.remove());
  scope.querySelectorAll(`.${RESULT_CLASS}`).forEach((el) => el.remove());
  scope.querySelectorAll(`[${MARK_ATTR}]`).forEach((el) => {
    el.removeAttribute(MARK_ATTR);
  });
  scope.querySelectorAll(`[${AUTO_ATTR}]`).forEach((el) => {
    el.removeAttribute(AUTO_ATTR);
  });
  scope.querySelectorAll(`[${ORIG_ATTR}]`).forEach((el) => {
    const orig = el.getAttribute(ORIG_ATTR);
    if (orig != null) el.innerHTML = orig;
    el.removeAttribute(ORIG_ATTR);
    el.removeAttribute(STATE_ATTR);
  });
}

function setButtonLabel(btn, kind) {
  if (!btn) return;
  if (kind === 'loading') {
    btn.innerHTML = `<span class="lbp-translate-btn__spin" aria-hidden="true"></span><span class="lbp-translate-btn__label">${escapeHtml(t('translateLoading'))}</span>`;
    btn.setAttribute('aria-busy', 'true');
    btn.classList.add('is-loading');
    return;
  }
  btn.removeAttribute('aria-busy');
  btn.classList.remove('is-loading');

  let label = t('translateButton');
  if (kind === 'original') label = t('translateShowOriginal');
  else if (kind === 'hide') label = t('translateHide');
  else if (kind === 'error') label = t('translateError');

  btn.innerHTML = `<span class="lbp-translate-btn__label">${escapeHtml(label)}</span>`;
}

function makeButton(kind) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `${BTN_CLASS} ${BTN_CLASS}--chip${
    kind === 'desc' ? ` ${BTN_CLASS}--desc` : ` ${BTN_CLASS}--review`
  }`;
  btn.setAttribute('data-lbp-translate-kind', kind);
  setButtonLabel(btn, 'idle');
  return btn;
}

function ensureDescriptionButton() {
  if (settings().translateDescription === false) {
    document.querySelectorAll('.lbp-translate-desc-slot').forEach((el) => el.remove());
    document
      .querySelectorAll(`.${BTN_CLASS}[data-lbp-translate-kind="desc"]`)
      .forEach((el) => el.remove());
    const textEl = findDescriptionTextEl();
    if (textEl?.hasAttribute(ORIG_ATTR)) {
      textEl.innerHTML = textEl.getAttribute(ORIG_ATTR);
      textEl.removeAttribute(ORIG_ATTR);
      textEl.removeAttribute(STATE_ATTR);
    }
    findDescriptionHost()?.removeAttribute(MARK_ATTR);
    const host = findDescriptionHost();
    host?.querySelectorAll(`.${RESULT_CLASS}`).forEach((el) => el.remove());
    return;
  }

  const textEl = findDescriptionTextEl();
  const host = findDescriptionHost();
  if (!textEl || !host) return;
  if (!htmlToPlain(textEl.innerHTML)) return;

  host.setAttribute(MARK_ATTR, 'desc');

  let btn = document.querySelector(`.${BTN_CLASS}[data-lbp-translate-kind="desc"]`);
  if (btn) return;

  btn = makeButton('desc');
  const truncate = host.querySelector('.truncate') || textEl;
  const slot = document.createElement('div');
  slot.className = 'lbp-translate-desc-slot';
  slot.appendChild(btn);
  truncate.insertAdjacentElement('afterend', slot);
}

function ensureReviewButton(card) {
  if (card.querySelector(`.${BTN_CLASS}[data-lbp-translate-kind="review"]`)) return;
  const textEl = findReviewTextEl(card);
  if (!textEl || !htmlToPlain(textEl.innerHTML)) return;

  card.setAttribute(MARK_ATTR, 'review');
  const btn = makeButton('review');
  const actions = card.querySelector('.review-actions') || card.querySelector('.viewing-actions');
  if (actions) {
    const slot = document.createElement('div');
    slot.className = 'lbp-translate-review-slot';
    slot.appendChild(btn);
    actions.prepend(slot);
    return;
  }
  textEl.insertAdjacentElement('afterend', btn);
}

function syncReviewButtons() {
  if (settings().translateReviews === false) {
    document
      .querySelectorAll(`.${BTN_CLASS}[data-lbp-translate-kind="review"]`)
      .forEach((el) => {
        el.closest('.lbp-translate-review-slot')?.remove();
        el.remove();
      });
    document.querySelectorAll(`article.production-viewing[${MARK_ATTR}="review"]`).forEach((el) => {
      el.removeAttribute(MARK_ATTR);
    });
    return;
  }
  findReviewCards().forEach((card) => ensureReviewButton(card));
}

function getTargetForButton(btn) {
  const kind = btn.getAttribute('data-lbp-translate-kind');
  if (kind === 'desc') {
    const textEl = findDescriptionTextEl();
    return textEl ? { textEl, host: textEl.parentElement || textEl } : null;
  }
  const card = btn.closest('article.production-viewing');
  if (!card) return null;
  const textEl = findReviewTextEl(card);
  return textEl ? { textEl, host: textEl.parentElement || textEl, card } : null;
}

/**
 * Fetch full review HTML from Letterboxd when the body is truncated.
 * @returns {Promise<string | null>}
 */
async function loadFullReviewHtml(textEl) {
  const path = textEl?.getAttribute?.('data-full-text-url');
  if (!path) return null;
  try {
    const url = new URL(path, location.origin).href;
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { Accept: 'text/html' },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return html?.trim() ? html : null;
  } catch {
    return null;
  }
}

function expandReviewBody(textEl) {
  if (!textEl) return;
  textEl.classList.remove('js-truncated');
  textEl.style.maxHeight = 'none';
  textEl.style.overflow = 'visible';
  const wrap = textEl.closest('.js-review') || textEl.parentElement;
  if (wrap) {
    wrap.style.maxHeight = 'none';
    wrap.style.overflow = 'visible';
  }
}

function clearBelowResult(host, textEl) {
  const reviewCard = textEl?.closest?.('article.production-viewing');
  if (reviewCard) {
    reviewCard.querySelectorAll(`.${RESULT_CLASS}`).forEach((el) => el.remove());
    return;
  }
  host?.querySelectorAll?.(`.${RESULT_CLASS}`).forEach((el) => el.remove());
  const synopsis = textEl?.closest?.('section.production-synopsis');
  synopsis?.querySelectorAll?.(`.${RESULT_CLASS}`).forEach((el) => el.remove());
  const next = textEl?.nextElementSibling;
  if (next?.classList?.contains(RESULT_CLASS)) next.remove();
}

function mountBelowResult(textEl, host, translatedHtml, isReview) {
  clearBelowResult(host, textEl);
  const box = document.createElement('div');
  box.className = isReview ? `${RESULT_CLASS} ${RESULT_CLASS}--card` : RESULT_CLASS;

  if (isReview) {
    box.innerHTML = `
      <div class="lbp-translate-result__head">${escapeHtml(t('translateResultLabel'))}</div>
      <div class="lbp-translate-result__body">${translatedHtml}</div>
    `;
    const reviewWrap = textEl.closest('.js-review') || textEl;
    reviewWrap.insertAdjacentElement('afterend', box);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => box.classList.add('is-in'));
    });
    return box;
  }

  box.innerHTML = translatedHtml;
  const slot = textEl.closest('section.production-synopsis')?.querySelector(
    '.lbp-translate-desc-slot',
  );
  if (slot) slot.insertAdjacentElement('beforebegin', box);
  else textEl.insertAdjacentElement('afterend', box);
  return box;
}

/**
 * @returns {Promise<'ok' | 'same' | 'error' | 'skip'>}
 */
async function applyTranslation({ textEl, host, card, btn, isReview, expand = true }) {
  if (!textEl) return 'skip';
  if (btn?.getAttribute(STATE_ATTR) === 'translated') return 'skip';
  if (textEl.hasAttribute(ORIG_ATTR) && displayMode() === 'replace') return 'skip';
  if (isReview && card?.querySelector?.(`.${RESULT_CLASS}`)) return 'skip';

  let sourceHtml = textEl.hasAttribute(ORIG_ATTR)
    ? textEl.getAttribute(ORIG_ATTR)
    : textEl.innerHTML;

  if (isReview && expand) {
    const fullHtml = await loadFullReviewHtml(textEl);
    if (fullHtml) {
      sourceHtml = fullHtml;
      textEl.innerHTML = fullHtml;
      expandReviewBody(textEl);
    } else {
      expandReviewBody(textEl);
    }
  }

  const plain = htmlToPlain(sourceHtml);
  if (!plain) return 'skip';

  const tl = resolveTranslateTarget();
  setButtonLabel(btn, 'loading');

  const result = await translateText(plain, tl);
  if (!result?.text) {
    setButtonLabel(btn, 'error');
    if (btn) setTimeout(() => setButtonLabel(btn, 'idle'), 1800);
    return 'error';
  }

  const detected = String(result.detectedSourceLang || '')
    .toLowerCase()
    .slice(0, 2);
  const targetShort = String(tl).toLowerCase().slice(0, 2);
  if (detected && detected === targetShort && result.text.trim() === plain) {
    if (btn) btn.style.display = 'none';
    setButtonLabel(btn, 'idle');
    return 'same';
  }

  const translatedHtml = plainToHtml(result.text);
  const mode = displayMode();

  if (mode === 'below') {
    mountBelowResult(textEl, host, translatedHtml, isReview);
    if (btn) {
      btn.setAttribute(STATE_ATTR, 'translated');
      setButtonLabel(btn, 'hide');
    }
    return 'ok';
  }

  if (!textEl.hasAttribute(ORIG_ATTR)) {
    textEl.setAttribute(ORIG_ATTR, sourceHtml);
  }
  textEl.innerHTML = translatedHtml;
  if (isReview && expand) expandReviewBody(textEl);
  if (btn) {
    btn.setAttribute(STATE_ATTR, 'translated');
    setButtonLabel(btn, 'original');
  }
  return 'ok';
}

async function onTranslateClick(e) {
  const btn = e.target?.closest?.(`.${BTN_CLASS}`);
  if (!btn || btn.classList.contains('is-loading')) return;
  e.preventDefault();
  e.stopPropagation();

  const target = getTargetForButton(btn);
  if (!target) return;
  const { textEl, host, card } = target;
  const mode = displayMode();
  const state = btn.getAttribute(STATE_ATTR) || 'idle';
  const isReview = btn.getAttribute('data-lbp-translate-kind') === 'review';

  if (mode === 'replace' && state === 'translated') {
    const orig = textEl.getAttribute(ORIG_ATTR);
    if (orig != null) textEl.innerHTML = orig;
    textEl.removeAttribute(ORIG_ATTR);
    btn.removeAttribute(STATE_ATTR);
    setButtonLabel(btn, 'idle');
    return;
  }

  if (mode === 'below' && state === 'translated') {
    clearBelowResult(host, textEl);
    btn.removeAttribute(STATE_ATTR);
    setButtonLabel(btn, 'idle');
    return;
  }

  await applyTranslation({ textEl, host, card, btn, isReview });
}

function ensureTranslateClicks() {
  if (clicksBound) return;
  clicksBound = true;
  document.addEventListener('click', onTranslateClick, true);
}

function stopAutoTranslate() {
  if (autoObserver) {
    autoObserver.disconnect();
    autoObserver = null;
  }
  autoQueue.length = 0;
  autoActive = 0;
}

function pumpAutoQueue() {
  while (autoActive < AUTO_CONCURRENCY && autoQueue.length) {
    const card = autoQueue.shift();
    if (!card?.isConnected) continue;
    if (
      card.getAttribute(AUTO_ATTR) === 'done' ||
      card.getAttribute(AUTO_ATTR) === 'busy'
    ) {
      continue;
    }
    autoActive += 1;
    card.setAttribute(AUTO_ATTR, 'busy');
    const textEl = findReviewTextEl(card);
    const btn = reviewButton(card);
    const host = textEl?.parentElement || textEl;
    Promise.resolve()
      .then(() =>
        applyTranslation({
          textEl,
          host,
          card,
          btn,
          isReview: true,
          expand: false,
        }),
      )
      .then((status) => {
        if (status === 'ok' || status === 'same') card.setAttribute(AUTO_ATTR, 'done');
        else card.removeAttribute(AUTO_ATTR);
      })
      .catch(() => {
        card.removeAttribute(AUTO_ATTR);
      })
      .finally(() => {
        autoActive -= 1;
        pumpAutoQueue();
      });
  }
}

function enqueueAutoTranslate(card) {
  if (
    !card ||
    card.getAttribute(AUTO_ATTR) === 'done' ||
    card.getAttribute(AUTO_ATTR) === 'busy'
  ) {
    return;
  }
  if (autoQueue.includes(card)) return;
  autoQueue.push(card);
  pumpAutoQueue();
}

function syncAutoTranslate() {
  const enabled =
    settings().showTranslate !== false &&
    settings().translateReviews !== false &&
    settings().translateReviewsAuto === true;

  if (!enabled) {
    stopAutoTranslate();
    document
      .querySelectorAll(`article.production-viewing[${AUTO_ATTR}="busy"]`)
      .forEach((el) => {
        el.removeAttribute(AUTO_ATTR);
      });
    return;
  }

  if (!autoObserver) {
    autoObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const card = entry.target;
          autoObserver?.unobserve(card);
          enqueueAutoTranslate(card);
        }
      },
      { root: null, rootMargin: AUTO_ROOT_MARGIN, threshold: 0.15 },
    );
  }

  findReviewCards().forEach((card) => {
    if (
      card.getAttribute(AUTO_ATTR) === 'done' ||
      card.getAttribute(AUTO_ATTR) === 'busy'
    ) {
      return;
    }
    const textEl = findReviewTextEl(card);
    if (!textEl || !htmlToPlain(textEl.innerHTML)) return;
    autoObserver.observe(card);
  });
}

/**
 * Mount / refresh Translate buttons for the current page.
 * @param {Record<string, unknown>} [nextSettings]
 */
export function syncTranslateUi(nextSettings) {
  if (nextSettings) runtimeSettings = nextSettings;
  ensureTranslateClicks();

  if (settings().showTranslate === false) {
    removeTranslateUi();
    return;
  }

  ensureDescriptionButton();
  syncReviewButtons();
  syncAutoTranslate();
}
