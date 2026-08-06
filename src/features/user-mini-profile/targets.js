import { USER_MINI_SKIP_ANCESTOR } from '../../core/constants.js';
import {
  isValidUsernameSegment,
  normalizeUsername,
  usernameFromDataAttrs,
  usernameFromProfileHref,
} from '../../utils/letterboxd-username.js';
import { HOVER_ATTR, MARK_ATTR, PRELOAD_ATTR, UMP_SKIP } from './constants.js';
import { state } from './state.js';

const PROFILE_LINK_SELECTOR = 'a.avatar[href], ul.avatar-list a[href].avatar';
const NAME_NODE_SELECTOR =
  '.displayname, .owner, strong.displayname, a.name';

function pickFromSrcset(srcset) {
  const raw = String(srcset || '').trim();
  if (!raw) return '';
  let best = '';
  let bestW = -1;
  for (const part of raw.split(',')) {
    const bits = part.trim().split(/\s+/);
    const url = bits[0] || '';
    if (!url) continue;
    const descriptor = bits[1] || '';
    const widthMatch = descriptor.match(/^(\d+)w$/i);
    const width = widthMatch ? Number(widthMatch[1]) : 0;
    if (width >= bestW) {
      bestW = width;
      best = url;
    } else if (!best) {
      best = url;
    }
  }
  return best;
}

function textOf(el) {
  if (!el || el.tagName === 'IMG') return '';
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * Prefer a dedicated profile-home anchor; otherwise the hovered name node.
 * @param {EventTarget | null} target
 * @returns {{ anchor: Element, username: string } | null}
 */
export function findProfileHit(target) {
  if (!target || target.nodeType !== 1) return null;
  /** @type {Element} */
  const el = /** @type {Element} */ (target);
  if (el.closest?.(UMP_SKIP)) return null;
  if (el.closest?.(USER_MINI_SKIP_ANCESTOR)) return null;

  const avatar = el.closest?.(PROFILE_LINK_SELECTOR);
  if (avatar) {
    const username =
      usernameFromProfileHref(avatar.getAttribute('href') || '') ||
      usernameFromDataAttrs(avatar);
    if (username && isValidUsernameSegment(username)) {
      return { anchor: avatar, username: normalizeUsername(username) };
    }
  }

  // Bare profile-home links (e.g. following lists without .avatar).
  const anyLink = el.closest?.('a[href]');
  if (anyLink) {
    const fromHref = usernameFromProfileHref(anyLink.getAttribute('href') || '');
    if (fromHref) {
      return { anchor: anyLink, username: fromHref };
    }
  }

  // Display name / owner inside review attribution may sit under a review URL.
  const nameNode = el.closest?.(NAME_NODE_SELECTOR);
  if (nameNode) {
    const username = usernameFromDataAttrs(nameNode);
    if (username && isValidUsernameSegment(username)) {
      const anchor =
        nameNode.closest?.('a[href]') ||
        nameNode.closest?.('article, .listitem, .person-summary') ||
        nameNode;
      return { anchor, username: normalizeUsername(username) };
    }
  }

  return null;
}

/**
 * @param {Element} anchor
 * @param {string} username
 */
export function parseDisplayNameHint(anchor, username) {
  const nameEl =
    anchor.querySelector?.('.displayname, .owner, strong') ||
    (anchor.matches?.(NAME_NODE_SELECTOR) ? anchor : null);
  const fromName = textOf(nameEl);
  if (fromName) return fromName;

  const alt =
    anchor.querySelector?.('img[alt]')?.getAttribute('alt') ||
    anchor.closest?.('article, .listitem')?.querySelector(
      `a.avatar[href*="/${username}/"] img[alt]`,
    )?.getAttribute('alt') ||
    '';
  if (alt) return String(alt).trim();

  const title = anchor.getAttribute?.('title') || '';
  if (title) {
    return title
      .replace(/^Read\s+/i, '')
      .replace(/['’]s review$/i, '')
      .trim();
  }
  return username;
}

/**
 * @param {Element} anchor
 * @param {string} username
 */
export function parseAvatarHint(anchor, username) {
  const localImg = anchor.querySelector?.('img');
  const siblingImg =
    !localImg &&
    anchor
      .closest?.('article, .listitem, .person-summary, .profile-summary')
      ?.querySelector(`a.avatar[href*="/${username}/"] img`);
  const img = localImg || siblingImg || null;
  if (!img) return '';
  const candidates = [
    img.currentSrc,
    img.getAttribute('src'),
    img.getAttribute('data-src'),
    pickFromSrcset(img.getAttribute('srcset')),
    pickFromSrcset(img.getAttribute('data-srcset')),
  ];
  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (value && !value.startsWith('data:')) return value;
  }
  return '';
}

export function clearTargetMark(anchor) {
  if (!anchor?.removeAttribute) return;
  anchor.removeAttribute(MARK_ATTR);
  anchor.removeAttribute(HOVER_ATTR);
  anchor.removeAttribute(PRELOAD_ATTR);
}

/**
 * @param {Element} anchor
 * @param {string} [usernameHint]
 */
export function markTarget(anchor, usernameHint = '') {
  if (!anchor || anchor.nodeType !== 1) return null;
  if (anchor.closest?.(UMP_SKIP)) return null;
  if (anchor.closest?.(USER_MINI_SKIP_ANCESTOR)) return null;

  const username =
    normalizeUsername(usernameHint) ||
    usernameFromProfileHref(anchor.getAttribute?.('href') || '') ||
    usernameFromDataAttrs(anchor);
  if (!username || !isValidUsernameSegment(username)) {
    clearTargetMark(anchor);
    return null;
  }

  anchor.setAttribute(MARK_ATTR, '1');
  return {
    target: anchor,
    username,
    displayNameHint: parseDisplayNameHint(anchor, username),
    avatarHint: parseAvatarHint(anchor, username),
  };
}

/**
 * @param {EventTarget | null} eventTarget
 */
export function resolveTarget(eventTarget) {
  const hit = findProfileHit(eventTarget);
  if (!hit) return null;
  return markTarget(hit.anchor, hit.username);
}

export function clearAllTargetMarks() {
  state.profileFetches.clear();
  document
    .querySelectorAll(`[${MARK_ATTR}], [${HOVER_ATTR}], [${PRELOAD_ATTR}]`)
    .forEach((el) => clearTargetMark(el));
}

/**
 * Mark visible profile anchors under a root for preload.
 * @param {ParentNode} [root]
 */
export function decorateTargets(root = document) {
  const scope = root.querySelectorAll ? root : document;
  scope.querySelectorAll(PROFILE_LINK_SELECTOR).forEach((node) => {
    markTarget(/** @type {HTMLAnchorElement} */ (node));
  });
  // Also mark bare profile-home links that are not avatars.
  scope.querySelectorAll('a[href]').forEach((node) => {
    if (node.matches(PROFILE_LINK_SELECTOR)) return;
    const username = usernameFromProfileHref(node.getAttribute('href') || '');
    if (username) markTarget(/** @type {HTMLAnchorElement} */ (node), username);
  });
}
