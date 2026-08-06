import './crew.css';
import { getLetterboxdPersonPortrait } from '../../api/letterboxd-person.js';

const CARD_CLASS = 'lbp-crew-card';
const ENHANCED_LIST_CLASS = 'lbp-crew-list--enhanced';
const PORTRAIT_ROOT_MARGIN = '240px 0px';

const observedCards = new Set();
let portraitObserver = null;

function loadPortrait(card) {
  if (card.dataset.lbpPortraitState !== 'idle') return;
  card.dataset.lbpPortraitState = 'loading';

  void getLetterboxdPersonPortrait(card.href).then((portraitUrl) => {
    if (!card.isConnected) return;
    const portrait = card.querySelector('.lbp-crew-card__portrait');
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

function crewPersonPath(anchor) {
  try {
    const url = new URL(anchor.href, window.location.origin);
    const parts = url.pathname.split('/').filter(Boolean);
    return url.origin === window.location.origin &&
      parts.length === 2 &&
      parts[0].toLowerCase() !== 'actor'
      ? url.pathname
      : '';
  } catch {
    return '';
  }
}

function enhanceCard(anchor) {
  if (anchor.classList.contains(CARD_CLASS) || !crewPersonPath(anchor)) return;

  const name = anchor.textContent.trim();
  if (!name) return;

  const portrait = document.createElement('span');
  portrait.className = 'lbp-crew-card__portrait';
  portrait.setAttribute('aria-hidden', 'true');

  const copy = document.createElement('span');
  copy.className = 'lbp-crew-card__copy';
  const personName = document.createElement('strong');
  personName.textContent = name;
  copy.appendChild(personName);

  anchor.dataset.lbpCrewName = name;
  anchor.dataset.lbpPortraitState = 'idle';
  anchor.classList.add(CARD_CLASS);
  anchor.replaceChildren(portrait, copy);
  observeCard(anchor);
}

function restoreCard(card) {
  portraitObserver?.unobserve(card);
  observedCards.delete(card);
  const name = card.dataset.lbpCrewName || card.textContent.trim();
  card.classList.remove(CARD_CLASS);
  delete card.dataset.lbpCrewName;
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
}

function disableEnhancedCrew() {
  for (const card of document.querySelectorAll(`.${CARD_CLASS}`)) {
    restoreCard(card);
  }
  for (const list of document.querySelectorAll(`.${ENHANCED_LIST_CLASS}`)) {
    list.classList.remove(ENHANCED_LIST_CLASS);
  }
}

export function ensureEnhancedCrew(settings) {
  cleanupDetachedObservers();
  if (!settings.enhanceCrew) {
    disableEnhancedCrew();
    return;
  }

  for (const list of document.querySelectorAll(
    '#tab-panel-crew .text-sluglist',
  )) {
    list.classList.add(ENHANCED_LIST_CLASS);
    for (const anchor of list.querySelectorAll('a.text-slug[href]')) {
      enhanceCard(anchor);
    }
  }
}
