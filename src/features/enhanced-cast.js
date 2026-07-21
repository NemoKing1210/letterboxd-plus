import { getLetterboxdPersonPortrait } from '../api/letterboxd-person.js';
import { t } from '../i18n/index.js';

const CARD_CLASS = 'lbp-cast-card';
const ENHANCED_LIST_CLASS = 'lbp-cast-list--enhanced';
const PORTRAIT_ROOT_MARGIN = '240px 0px';
const VISIBLE_CAST_COUNT = 10;

const observedCards = new Set();
const castTriggers = new Map();
let portraitObserver = null;

function loadPortrait(card) {
  if (card.dataset.lbpPortraitState !== 'idle') return;
  card.dataset.lbpPortraitState = 'loading';

  void getLetterboxdPersonPortrait(card.href).then((portraitUrl) => {
    if (!card.isConnected) return;
    const portrait = card.querySelector('.lbp-cast-card__portrait');
    if (!portrait || !portraitUrl) {
      card.dataset.lbpPortraitState = 'empty';
      return;
    }

    const image = document.createElement('img');
    image.alt = '';
    image.decoding = 'async';
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener(
      'load',
      () => {
        if (card.isConnected) card.dataset.lbpPortraitState = 'loaded';
      },
      { once: true },
    );
    image.addEventListener(
      'error',
      () => {
        image.remove();
        if (card.isConnected) card.dataset.lbpPortraitState = 'empty';
      },
      { once: true },
    );
    portrait.appendChild(image);
    image.src = portraitUrl;
  });
}

function getPortraitObserver() {
  if (portraitObserver) return portraitObserver;
  portraitObserver = new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        observedCards.delete(entry.target);
        loadPortrait(entry.target);
      }
    },
    { rootMargin: PORTRAIT_ROOT_MARGIN },
  );
  return portraitObserver;
}

function observeCard(card) {
  if (typeof IntersectionObserver !== 'function') {
    loadPortrait(card);
    return;
  }
  if (observedCards.has(card)) return;
  observedCards.add(card);
  getPortraitObserver().observe(card);
}

function actorPath(anchor) {
  try {
    const url = new URL(anchor.href, window.location.origin);
    return url.origin === window.location.origin &&
      url.pathname.startsWith('/actor/')
      ? url.pathname
      : '';
  } catch {
    return '';
  }
}

function enhanceCard(anchor) {
  if (anchor.classList.contains(CARD_CLASS) || !actorPath(anchor)) return;

  const name = anchor.textContent.trim();
  if (!name) return;

  const portrait = document.createElement('span');
  portrait.className = 'lbp-cast-card__portrait';
  portrait.setAttribute('aria-hidden', 'true');

  const copy = document.createElement('span');
  copy.className = 'lbp-cast-card__copy';
  const actorName = document.createElement('strong');
  actorName.textContent = name;
  copy.appendChild(actorName);

  const role = anchor.dataset.originalTitle?.trim();
  if (role) {
    const roleLabel = document.createElement('small');
    roleLabel.textContent = role;
    copy.appendChild(roleLabel);
  }

  anchor.dataset.lbpCastName = name;
  anchor.dataset.lbpPortraitState = 'idle';
  anchor.classList.add(CARD_CLASS);
  anchor.replaceChildren(portrait, copy);
  observeCard(anchor);
}

function expandCast(list, trigger) {
  list.classList.add('lbp-cast-list--expanded');
  trigger.setAttribute('aria-expanded', 'true');
  trigger.hidden = true;
}

function setupCastTrigger(list, cards) {
  for (const [index, card] of cards.entries()) {
    card.classList.toggle('lbp-cast-card--extra', index >= VISIBLE_CAST_COUNT);
  }
  if (cards.length <= VISIBLE_CAST_COUNT) return;

  let trigger = list.querySelector(
    '.lbp-cast-show-all, #has-cast-overflow',
  );
  const isCreated = !trigger;
  if (!trigger) {
    trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'text-slug lbp-cast-show-all';
    trigger.textContent = t('showAllCast');
    const overflow = list.querySelector('#cast-overflow');
    list.insertBefore(trigger, overflow || null);
  } else {
    trigger.classList.add('lbp-cast-show-all');
  }
  if (castTriggers.has(trigger)) return;

  const original = {
    ariaExpanded: trigger.getAttribute('aria-expanded'),
    hidden: trigger.hidden,
    role: trigger.getAttribute('role'),
    tabIndex: trigger.getAttribute('tabindex'),
  };
  trigger.setAttribute('aria-expanded', 'false');
  if (trigger.tagName === 'A') {
    trigger.setAttribute('role', 'button');
    trigger.tabIndex = 0;
  }

  const onClick = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    expandCast(list, trigger);
  };
  const onKeydown = (event) => {
    if (trigger.tagName !== 'A' || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    expandCast(list, trigger);
  };
  trigger.addEventListener('click', onClick, true);
  trigger.addEventListener('keydown', onKeydown, true);
  castTriggers.set(trigger, {
    isCreated,
    onClick,
    onKeydown,
    original,
  });
}

function restoreAttribute(element, name, value) {
  if (value == null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

function restoreCastTrigger(trigger, state) {
  trigger.removeEventListener('click', state.onClick, true);
  trigger.removeEventListener('keydown', state.onKeydown, true);
  if (state.isCreated) {
    trigger.remove();
    return;
  }

  trigger.classList.remove('lbp-cast-show-all');
  trigger.hidden = state.original.hidden;
  restoreAttribute(trigger, 'aria-expanded', state.original.ariaExpanded);
  restoreAttribute(trigger, 'role', state.original.role);
  restoreAttribute(trigger, 'tabindex', state.original.tabIndex);
}

function restoreCard(card) {
  portraitObserver?.unobserve(card);
  observedCards.delete(card);
  const name = card.dataset.lbpCastName || card.textContent.trim();
  card.classList.remove(CARD_CLASS, 'lbp-cast-card--extra');
  delete card.dataset.lbpCastName;
  delete card.dataset.lbpPortraitState;
  card.replaceChildren(document.createTextNode(name));
}

function cleanupDetachedObservers() {
  for (const card of observedCards) {
    if (!card.isConnected) {
      portraitObserver?.unobserve(card);
      observedCards.delete(card);
    }
  }
  for (const [trigger, state] of castTriggers) {
    if (!trigger.isConnected) {
      trigger.removeEventListener('click', state.onClick, true);
      trigger.removeEventListener('keydown', state.onKeydown, true);
      castTriggers.delete(trigger);
    }
  }
}

function disableEnhancedCast() {
  for (const card of document.querySelectorAll(`.${CARD_CLASS}`)) {
    restoreCard(card);
  }
  for (const list of document.querySelectorAll(`.${ENHANCED_LIST_CLASS}`)) {
    list.classList.remove(
      ENHANCED_LIST_CLASS,
      'lbp-cast-list--expanded',
    );
  }
  for (const [trigger, state] of castTriggers) {
    restoreCastTrigger(trigger, state);
  }
  castTriggers.clear();
}

export function ensureEnhancedCast(settings) {
  cleanupDetachedObservers();
  if (!settings.enhanceCast) {
    disableEnhancedCast();
    return;
  }

  for (const list of document.querySelectorAll('.cast-list.text-sluglist')) {
    list.classList.add(ENHANCED_LIST_CLASS);
    for (const anchor of list.querySelectorAll('a.text-slug[href]')) {
      enhanceCard(anchor);
    }
    setupCastTrigger(list, [...list.querySelectorAll(`.${CARD_CLASS}`)]);
  }
}
