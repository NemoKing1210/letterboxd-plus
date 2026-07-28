import { t } from '../../i18n/index.js';
import { openSettings } from './dialog.js';

const NAV_ID = 'lbp-nav-settings';

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

  const profileItem = accountMenu.querySelector(':scope > li');
  if (profileItem) {
    profileItem.after(item);
    return;
  }

  accountMenu.prepend(item);
}
