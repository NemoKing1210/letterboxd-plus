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
  div
    .querySelectorAll('p, li, blockquote, h1, h2, h3, h4, h5, h6')
    .forEach((el) => {
      el.insertAdjacentText('afterend', '\n\n');
    });
  return (div.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function plainToHtml(text) {
  const blocks = String(text || '')
    .split(/\n{2,}/)
    .map((block) => escapeHtml(block.trim()).replace(/\r\n|\r|\n/g, '<br>'))
    .filter(Boolean);
  if (!blocks.length) return '';
  if (blocks.length === 1 && !blocks[0].includes('<br>')) return blocks[0];
  return blocks.map((block) => `<p>${block}</p>`).join('');
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

/**
 * Standalone review page host (`/{user}/film/{slug}/`), not a film-page card.
 * @returns {Element[]}
 */
function findStandaloneReviewHosts() {
  return [...document.querySelectorAll('section.review.js-review')].filter(
    (section) =>
      !section.closest('article.production-viewing') &&
      !section.closest('.review-tile') &&
      findReviewTextEl(section),
  );
}

/**
 * Masonry / grid review tiles (absolute-positioned `.review-tile`).
 * @returns {Element[]}
 */
function findReviewTiles() {
  return [...document.querySelectorAll('.review-tile')].filter((tile) =>
    findReviewTextEl(tile),
  );
}

function findReviewCards() {
  return [
    ...document.querySelectorAll('article.production-viewing'),
    ...findReviewTiles(),
    ...findStandaloneReviewHosts(),
  ];
}

/**
 * @param {Element | null | undefined} el
 * @returns {Element | null}
 */
function closestReviewHost(el) {
  if (!el?.closest) return null;
  const article = el.closest('article.production-viewing');
  if (article) return article;
  const tile = el.closest('.review-tile');
  if (tile) return tile;
  const section = el.closest('section.review.js-review');
  if (
    section &&
    !section.closest('article.production-viewing') &&
    !section.closest('.review-tile')
  ) {
    return section;
  }
  return null;
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

function findCommentItems() {
  return document.querySelectorAll('#comments ul.comment-list li.comment');
}

function findCommentTextEl(item) {
  return (
    item.querySelector('.comment-body') ||
    item.querySelector('.js-collapsible-text.body-text') ||
    item.querySelector('.js-collapsible-text')
  );
}

function removeTranslateUi(scope = document) {
  stopAutoTranslate();
  scope
    .querySelectorAll(
      '.lbp-translate-desc-slot, .lbp-translate-fmp-desc-slot, .lbp-translate-review-slot, .lbp-translate-comment-slot',
    )
    .forEach((el) => el.remove());
  scope.querySelectorAll(`.${BTN_CLASS}`).forEach((el) => el.remove());
  scope.querySelectorAll(`.${RESULT_CLASS}`).forEach((el) => el.remove());
  scope.querySelectorAll('.lbp-fmp__desc--expanded').forEach((el) => {
    el.classList.remove('lbp-fmp__desc--expanded');
  });
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
  // Reuse Letterboxd’s primary action button (same as “Post”).
  let sizeClass = ` ${BTN_CLASS}--review`;
  if (kind === 'desc') sizeClass = ` ${BTN_CLASS}--desc`;
  else if (kind === 'fmp-desc') sizeClass = ` ${BTN_CLASS}--fmp`;
  btn.className = `button -action ${BTN_CLASS}${sizeClass}`;
  btn.setAttribute('data-lbp-translate-kind', kind);
  setButtonLabel(btn, 'idle');
  return btn;
}

function expandFmpDescription(textEl) {
  textEl?.classList?.add('lbp-fmp__desc--expanded');
}

function notifyFmpContentChanged(textEl) {
  textEl
    ?.closest?.('.lbp-fmp')
    ?.dispatchEvent(new CustomEvent('lbp:fmp-content', { bubbles: true }));
}

function clearFmpDescriptionTranslate(scope = document) {
  scope.querySelectorAll('.lbp-translate-fmp-desc-slot').forEach((el) => el.remove());
  scope
    .querySelectorAll(`.${BTN_CLASS}[data-lbp-translate-kind="fmp-desc"]`)
    .forEach((el) => el.remove());
  scope.querySelectorAll('.lbp-fmp__desc').forEach((textEl) => {
    if (textEl.hasAttribute(ORIG_ATTR)) {
      textEl.innerHTML = textEl.getAttribute(ORIG_ATTR);
      textEl.removeAttribute(ORIG_ATTR);
      textEl.removeAttribute(STATE_ATTR);
    }
    textEl.classList.remove('lbp-fmp__desc--expanded');
    textEl.removeAttribute(MARK_ATTR);
    const wrap = textEl.parentElement;
    wrap?.querySelectorAll?.(`.${RESULT_CLASS}`).forEach((el) => el.remove());
  });
}

/**
 * @param {Element} textEl
 */
function ensureFmpDescriptionButton(textEl) {
  if (!textEl || !htmlToPlain(textEl.innerHTML)) return;
  const root = textEl.closest('.lbp-fmp') || textEl.parentElement;
  if (!root) return;

  const existing = root.querySelector(
    `.${BTN_CLASS}[data-lbp-translate-kind="fmp-desc"]`,
  );
  if (existing) return;

  textEl.setAttribute(MARK_ATTR, 'fmp-desc');
  const btn = makeButton('fmp-desc');
  const slot = document.createElement('div');
  slot.className = 'lbp-translate-fmp-desc-slot';
  slot.appendChild(btn);
  textEl.insertAdjacentElement('afterend', slot);
}

function syncFmpDescriptionButtons(scope = document) {
  if (settings().translateDescription === false) {
    clearFmpDescriptionTranslate(scope);
    return;
  }
  const root = scope.querySelectorAll ? scope : document;
  root.querySelectorAll('.lbp-fmp__desc').forEach((textEl) => {
    ensureFmpDescriptionButton(textEl);
  });
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
  const actions =
    card.querySelector('.review-actions') || card.querySelector('.viewing-actions');
  const existing = card.querySelector(`.${BTN_CLASS}[data-lbp-translate-kind="review"]`);
  if (existing) {
    const slot = existing.closest('.lbp-translate-review-slot') || existing;
    if (actions && slot.parentElement === actions && actions.lastElementChild !== slot) {
      actions.append(slot);
    }
    return;
  }

  const textEl = findReviewTextEl(card);
  if (!textEl || !htmlToPlain(textEl.innerHTML)) return;

  card.setAttribute(MARK_ATTR, 'review');
  const btn = makeButton('review');
  if (actions) {
    const slot = document.createElement('div');
    slot.className = 'lbp-translate-review-slot';
    slot.appendChild(btn);
    actions.append(slot);
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
    document.querySelectorAll(`[${MARK_ATTR}="review"]`).forEach((el) => {
      el.removeAttribute(MARK_ATTR);
    });
    return;
  }
  findReviewCards().forEach((card) => ensureReviewButton(card));
}

function ensureCommentButton(item) {
  const existing = item.querySelector(`.${BTN_CLASS}[data-lbp-translate-kind="comment"]`);
  if (existing) return;

  const textEl = findCommentTextEl(item);
  if (!textEl || !htmlToPlain(textEl.innerHTML)) return;

  item.setAttribute(MARK_ATTR, 'comment');
  const btn = makeButton('comment');
  const slot = document.createElement('div');
  slot.className = 'lbp-translate-comment-slot';
  slot.appendChild(btn);
  // After the whole comment row so Letterboxd’s floated person/body cols don’t wrap the button over the text.
  item.appendChild(slot);
}

function syncCommentButtons() {
  if (settings().translateComments === false) {
    document
      .querySelectorAll(`.${BTN_CLASS}[data-lbp-translate-kind="comment"]`)
      .forEach((el) => {
        el.closest('.lbp-translate-comment-slot')?.remove();
        el.remove();
      });
    document.querySelectorAll(`[${MARK_ATTR}="comment"]`).forEach((el) => {
      el.removeAttribute(MARK_ATTR);
    });
    document.querySelectorAll(`li.comment .${RESULT_CLASS}`).forEach((el) => el.remove());
    return;
  }
  findCommentItems().forEach((item) => ensureCommentButton(item));
}

function getTargetForButton(btn) {
  const kind = btn.getAttribute('data-lbp-translate-kind');
  if (kind === 'desc') {
    const textEl = findDescriptionTextEl();
    return textEl ? { textEl, host: textEl.parentElement || textEl } : null;
  }
  if (kind === 'fmp-desc') {
    const root = btn.closest('.lbp-fmp');
    const textEl = root?.querySelector('.lbp-fmp__desc');
    return textEl
      ? { textEl, host: textEl.parentElement || textEl, isFmpDesc: true }
      : null;
  }
  if (kind === 'comment') {
    const item = btn.closest('li.comment');
    if (!item) return null;
    const textEl = findCommentTextEl(item);
    return textEl
      ? { textEl, host: textEl, card: item, isComment: true }
      : null;
  }
  const card = closestReviewHost(btn);
  if (!card) return null;
  const textEl = findReviewTextEl(card);
  return textEl ? { textEl, host: textEl.parentElement || textEl, card } : null;
}

/**
 * Normalize Letterboxd full-text payloads into review-body HTML.
 * @returns {string | null}
 */
function extractReviewHtml(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  if (/<!DOCTYPE|<html[\s>]/i.test(trimmed)) return null;

  if (trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed);
      const fromJson =
        (typeof data.html === 'string' && data.html) ||
        (typeof data.content === 'string' && data.content) ||
        (typeof data.body === 'string' && data.body) ||
        '';
      return extractReviewHtml(fromJson);
    } catch {
      return null;
    }
  }

  return trimmed;
}

/**
 * Fetch full review/comment HTML from Letterboxd when the body is truncated.
 * @returns {Promise<string | null>}
 */
async function loadFullReviewHtml(textEl) {
  const path = textEl?.getAttribute?.('data-full-text-url');
  if (!path) return null;
  try {
    const url = new URL(path, location.origin).href;
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { Accept: 'text/html, application/json' },
    });
    if (!response.ok) return null;
    return extractReviewHtml(await response.text());
  } catch {
    return null;
  }
}

function expandReviewBody(textEl) {
  if (!textEl) return;
  textEl.classList.remove('js-truncated');
  textEl.style.maxHeight = 'none';
  textEl.style.overflow = 'visible';
  const wrap =
    textEl.closest('.js-review') ||
    textEl.closest('.js-collapsible-text') ||
    textEl.parentElement;
  if (wrap) {
    wrap.style.maxHeight = 'none';
    wrap.style.overflow = 'visible';
  }
}

function clearBelowResult(host, textEl) {
  const fmp = textEl?.closest?.('.lbp-fmp') || host?.closest?.('.lbp-fmp');
  if (fmp) {
    fmp.querySelectorAll(`.${RESULT_CLASS}`).forEach((el) => el.remove());
    return;
  }
  const reviewHost = closestReviewHost(textEl) || closestReviewHost(host);
  if (reviewHost) {
    reviewHost.querySelectorAll(`.${RESULT_CLASS}`).forEach((el) => el.remove());
    return;
  }
  const comment = textEl?.closest?.('li.comment') || host?.closest?.('li.comment');
  if (comment) {
    comment.querySelectorAll(`.${RESULT_CLASS}`).forEach((el) => el.remove());
    return;
  }
  host?.querySelectorAll?.(`.${RESULT_CLASS}`).forEach((el) => el.remove());
  const synopsis = textEl?.closest?.('section.production-synopsis');
  synopsis?.querySelectorAll?.(`.${RESULT_CLASS}`).forEach((el) => el.remove());
  const next = textEl?.nextElementSibling;
  if (next?.classList?.contains(RESULT_CLASS)) next.remove();
}

/**
 * Place “below” translation where Letterboxd floats won’t wrap it over the original.
 * @param {Element} textEl
 * @param {HTMLElement} box
 * @param {boolean} isComment
 */
function placeBelowResult(textEl, box, isComment) {
  if (isComment) {
    const comment = textEl.closest('li.comment');
    const slot = comment?.querySelector('.lbp-translate-comment-slot');
    if (slot) {
      slot.insertAdjacentElement('beforebegin', box);
      return;
    }
    const body = textEl.closest('.comment-body') || textEl;
    body.insertAdjacentElement('afterend', box);
    return;
  }

  if (textEl.classList?.contains('lbp-fmp__desc') || textEl.closest('.lbp-fmp')) {
    const slot = textEl.parentElement?.querySelector('.lbp-translate-fmp-desc-slot');
    if (slot) {
      slot.insertAdjacentElement('beforebegin', box);
      return;
    }
    textEl.insertAdjacentElement('afterend', box);
    return;
  }

  // Film-page cards and masonry tiles: place after the review text wrap.
  if (
    textEl.closest('article.production-viewing') ||
    textEl.closest('.review-tile')
  ) {
    const wrap = textEl.closest('.js-review') || textEl;
    wrap.insertAdjacentElement('afterend', box);
    return;
  }

  // Standalone review page: stay inside the review column, under the prose —
  // never after section.js-review (that escapes the col-12 float and overlaps).
  const bodyWrap =
    textEl.closest('.body-text') || textEl.closest('div.review') || textEl;
  bodyWrap.insertAdjacentElement('afterend', box);
}

function mountBelowResult(textEl, host, translatedHtml, isComment = false) {
  clearBelowResult(host, textEl);
  const box = document.createElement('div');
  box.className = `${RESULT_CLASS} ${RESULT_CLASS}--card`;
  box.innerHTML = `
    <div class="lbp-translate-result__head">${escapeHtml(t('translateResultLabel'))}</div>
    <div class="lbp-translate-result__body">${translatedHtml}</div>
  `;

  const synopsis = textEl.closest('section.production-synopsis');
  if (synopsis) {
    const slot = synopsis.querySelector('.lbp-translate-desc-slot');
    if (slot) slot.insertAdjacentElement('beforebegin', box);
    else textEl.insertAdjacentElement('afterend', box);
  } else {
    placeBelowResult(textEl, box, isComment);
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => box.classList.add('is-in'));
  });
  return box;
}

/**
 * @returns {Promise<'ok' | 'same' | 'error' | 'skip'>}
 */
async function applyTranslation({
  textEl,
  host,
  card,
  btn,
  isReview,
  isComment = false,
  isFmpDesc = false,
  expand = true,
}) {
  if (!textEl) return 'skip';
  if (btn?.getAttribute(STATE_ATTR) === 'translated') return 'skip';
  if (textEl.hasAttribute(ORIG_ATTR) && displayMode() === 'replace') return 'skip';

  const resultHost =
    card || textEl.closest('li.comment') || (isFmpDesc ? textEl.closest('.lbp-fmp') : null);
  if ((isReview || isComment || isFmpDesc) && resultHost?.querySelector?.(`.${RESULT_CLASS}`)) {
    return 'skip';
  }

  let sourceHtml = textEl.hasAttribute(ORIG_ATTR)
    ? textEl.getAttribute(ORIG_ATTR)
    : textEl.innerHTML;

  const shouldExpand = expand && (isReview || isComment);
  if (shouldExpand) {
    const fullHtml = await loadFullReviewHtml(textEl);
    if (fullHtml) {
      const fullPlain = htmlToPlain(fullHtml);
      const currentPlain = htmlToPlain(sourceHtml);
      // Prefer the longer payload — full-text must not clobber a complete DOM body.
      if (fullPlain.length > currentPlain.length) {
        sourceHtml = fullHtml;
        textEl.innerHTML = fullHtml;
      }
    }
    expandReviewBody(textEl);
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

  if (isFmpDesc) expandFmpDescription(textEl);

  if (mode === 'below') {
    mountBelowResult(textEl, host, translatedHtml, isComment);
    if (btn) {
      btn.setAttribute(STATE_ATTR, 'translated');
      setButtonLabel(btn, 'hide');
    }
    if (isFmpDesc) notifyFmpContentChanged(textEl);
    return 'ok';
  }

  if (!textEl.hasAttribute(ORIG_ATTR)) {
    textEl.setAttribute(ORIG_ATTR, sourceHtml);
  }
  textEl.innerHTML = translatedHtml;
  if (shouldExpand) expandReviewBody(textEl);
  if (btn) {
    btn.setAttribute(STATE_ATTR, 'translated');
    setButtonLabel(btn, 'original');
  }
  if (isFmpDesc) notifyFmpContentChanged(textEl);
  return 'ok';
}

async function onTranslateClick(e) {
  const btn = e.target?.closest?.(`.${BTN_CLASS}`);
  if (!btn || btn.classList.contains('is-loading')) return;
  e.preventDefault();
  e.stopPropagation();

  const target = getTargetForButton(btn);
  if (!target) return;
  const { textEl, host, card, isComment = false, isFmpDesc = false } = target;
  const mode = displayMode();
  const state = btn.getAttribute(STATE_ATTR) || 'idle';
  const kind = btn.getAttribute('data-lbp-translate-kind');
  const isReview = kind === 'review';

  if (mode === 'replace' && state === 'translated') {
    const orig = textEl.getAttribute(ORIG_ATTR);
    if (orig != null) textEl.innerHTML = orig;
    textEl.removeAttribute(ORIG_ATTR);
    btn.removeAttribute(STATE_ATTR);
    setButtonLabel(btn, 'idle');
    if (isFmpDesc) {
      textEl.classList.remove('lbp-fmp__desc--expanded');
      notifyFmpContentChanged(textEl);
    }
    return;
  }

  if (mode === 'below' && state === 'translated') {
    clearBelowResult(host, textEl);
    btn.removeAttribute(STATE_ATTR);
    setButtonLabel(btn, 'idle');
    if (isFmpDesc) {
      textEl.classList.remove('lbp-fmp__desc--expanded');
      notifyFmpContentChanged(textEl);
    }
    return;
  }

  await applyTranslation({
    textEl,
    host,
    card,
    btn,
    isReview,
    isComment,
    isFmpDesc,
  });
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
    document.querySelectorAll(`[${AUTO_ATTR}="busy"]`).forEach((el) => {
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
  syncFmpDescriptionButtons();
  syncReviewButtons();
  syncCommentButtons();
  syncAutoTranslate();
}

/**
 * Mount Translate on a film mini-profile card after it paints.
 * @param {ParentNode | null | undefined} root
 * @param {Record<string, unknown>} [nextSettings]
 */
export function syncFilmMiniProfileTranslate(root, nextSettings) {
  if (nextSettings) runtimeSettings = nextSettings;
  ensureTranslateClicks();
  if (!root || settings().showTranslate === false) return;
  syncFmpDescriptionButtons(root);
}
