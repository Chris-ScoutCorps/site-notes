'use strict';

const IS_CHROME = (() => {
  const isChromium = window.chrome;
  const winNav = window.navigator;
  const vendorName = winNav.vendor;
  const isOpera = typeof window.opr !== "undefined";
  const isIEedge = winNav.userAgent.indexOf("Edg") > -1;
  const isIOSChrome = winNav.userAgent.match("CriOS");

  return isIOSChrome || (
    isChromium !== null &&
    typeof isChromium !== "undefined" &&
    vendorName === "Google Inc." &&
    isOpera === false &&
    isIEedge === false);
})();

const SiteNotes = IS_CHROME ? {
  SIDEBAR_OPEN: 'site-notes-sidebar-open',
  SIDEBAR_TOGGLE_ID: 'sidebar-toggle-button',
  STORAGE: chrome.storage.local,
  IS_CHROME: true,
} : {
  IS_CHROME: false,
  STORAGE: browser.storage.local,
  TABS: browser.tabs,
  WINDOWS: browser.windows,
  WINDOW_ID: undefined,
}

if (!SiteNotes.IS_CHROME) {
  SiteNotes.WINDOWS.getCurrent({ populate: true }).then((windowInfo) => {
    SiteNotes.WINDOW_ID = windowInfo.id;
  });
}

SiteNotes.DEBOUNCES = {};
SiteNotes.debounce = (key, callback, timeout = 250) => {
  clearTimeout(SiteNotes.DEBOUNCES[key]);
  SiteNotes.DEBOUNCES[key] = setTimeout(callback, timeout);
};

(async function populateBody() {
  if (SiteNotes.IS_CHROME) {
    const frame = document.createElement('div');
    frame.id = 'site-notes-body';
    frame.className = 'sidebar';
    frame.style.width = '250px';
    frame.style.top = '0px';
    frame.style.right = '0px';
    frame.style.position = 'fixed';
    frame.style.display = 'none';
    frame.style.zIndex = 9999999;
    document.body.appendChild(frame);
  }

  if (document.getElementById('site-notes-body')) {
    document.getElementById('site-notes-body').innerHTML = `
    <input type="button" value="sidebar" id="sidebar-toggle-button" style="display: none;" />

    <div id="search-area" style="width: 100%; margin-top: 0;">
      <input type="text" id="search-txt" style="width: 100%;" placeholder="search ..." />
      <div id="search-results" style="width: 100%;"></div>
    </div>

    <h4 id="domain-notes-lbl" style="width: 100%; margin-top: 0;"></h4>
    <div id="domain-notes" style="width: 100%;"></div>

    <h4 id="page-notes-lbl" style="width: 100%;"></h4>
    <div id="page-notes" style="width: 100%;"></div>
  `;
  }

  if (SiteNotes.IS_CHROME) {
    const isOpen = async () => ((await SiteNotes.STORAGE.get(SiteNotes.SIDEBAR_OPEN)) || {})[SiteNotes.SIDEBAR_OPEN] === true;

    const button = document.getElementById(SiteNotes.SIDEBAR_TOGGLE_ID);
    button.style.display = 'block';
    button.value = `sidebar ${(await isOpen()) ? ' >' : ' <'}`

    button.addEventListener("click", async () => {
      await SiteNotes.STORAGE.set({
        [SiteNotes.SIDEBAR_OPEN]: !(await isOpen()),
      });
      button.value = `sidebar ${(await isOpen()) ? ' >' : ' <'}`
    });

    async function showSidebar() {
      const open = await isOpen();
      document.getElementById('site-notes-body').style.display = open ? 'block' : 'none';
    }

    showSidebar();
    setInterval(async () => {
      chrome.runtime?.id && showSidebar();
    }, 250);
  }
})();
