//'use strict';

function debounce(key, callback, timeout = 250) {
  clearTimeout(SiteNotes.DEBOUNCES[key]);
  SiteNotes.DEBOUNCES[key] = setTimeout(callback, timeout);
}

function populateBody() {
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
}

if (typeof SiteNotes === 'undefined') {
  SiteNotes = {
    IS_CHROME: false,
    STORAGE: browser.storage.local,
    TABS: browser.tabs,
    WINDOWS: browser.windows,
    WINDOW_ID: undefined,
  };
}

if (!SiteNotes.IS_CHROME) {
  SiteNotes.WINDOWS.getCurrent({ populate: true }).then((windowInfo) => {
    SiteNotes.WINDOW_ID = windowInfo.id;
  });
}

SiteNotes.DEBOUNCES = {};
SiteNotes.debounce = debounce;

populateBody();
