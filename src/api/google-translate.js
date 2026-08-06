import { GM_xmlhttpRequest } from '$';
import {
  GOOGLE_TRANSLATE_ORIGIN,
  TRANSLATE_REQUEST_TIMEOUT_MS,
} from '../core/constants.js';
import { readCache, writeCache } from '../core/cache.js';
import { loadSettings } from '../core/settings.js';

const GTX_URL = `${GOOGLE_TRANSLATE_ORIGIN}/translate_a/single`;
const inflight = new Map();

function hashText(s) {
  let h = 5381;
  const str = String(s);
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

function joinSegments(data) {
  if (!Array.isArray(data?.[0])) return '';
  return data[0]
    .map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
    .join('');
}

function detectedLang(data) {
  const raw = data?.[2];
  if (typeof raw === 'string' && raw) return raw.toLowerCase().slice(0, 2);
  const nested = data?.[8]?.[0]?.[0];
  if (typeof nested === 'string' && nested) return nested.toLowerCase().slice(0, 2);
  return '';
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      timeout: TRANSLATE_REQUEST_TIMEOUT_MS,
      headers: { Accept: 'application/json' },
      onload: (response) => {
        if (response.status < 200 || response.status >= 300) {
          reject(new Error(`Google Translate returned HTTP ${response.status}.`));
          return;
        }
        try {
          resolve(JSON.parse(response.responseText));
        } catch {
          reject(new Error('Google Translate returned invalid JSON.'));
        }
      },
      onerror: () => reject(new Error('Google Translate request failed.')),
      ontimeout: () => reject(new Error('Google Translate request timed out.')),
    });
  });
}

/**
 * @param {string} text
 * @param {string} targetLang short or full locale (en, ru, zh-CN, …)
 * @returns {Promise<{ text: string, detectedSourceLang: string } | null>}
 */
export async function translateText(text, targetLang) {
  const plain = String(text || '').trim();
  const tl = String(targetLang || '')
    .trim()
    .toLowerCase()
    .slice(0, 2);
  if (!plain || !tl) return null;

  const settings = loadSettings();
  const persist = settings.cacheTranslations !== false;
  const cacheKey = `gtx:${tl}:${hashText(plain)}`;
  const maxAgeMs = Math.max(0, Number(settings.cacheHours) || 0) * 60 * 60 * 1000;

  if (persist) {
    const cached = readCache(cacheKey, maxAgeMs);
    if (cached && typeof cached.text === 'string') return cached;
  }

  if (inflight.has(cacheKey)) return inflight.get(cacheKey);

  const task = (async () => {
    const url =
      `${GTX_URL}?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}` +
      `&dt=t&q=${encodeURIComponent(plain)}`;
    const data = await requestJson(url);
    const translated = joinSegments(data).trim();
    if (!translated) return null;
    const payload = {
      text: translated,
      detectedSourceLang: detectedLang(data),
    };
    if (persist && maxAgeMs > 0) writeCache(cacheKey, payload);
    return payload;
  })().catch(() => null);

  inflight.set(cacheKey, task);
  try {
    return await task;
  } finally {
    inflight.delete(cacheKey);
  }
}
