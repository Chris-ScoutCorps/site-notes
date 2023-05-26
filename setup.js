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
  IS_CHROME: true,
  SIDEBAR_OPEN: 'site-notes-sidebar-open',
  SIDEBAR_TOGGLE_ID: 'sidebar-toggle-button',
  STORAGE: chrome.storage.local,
  TABS: chrome.tabs,
  WINDOWS: chrome.windows,
  WINDOW_ID: undefined,
} : {
  IS_CHROME: false,
  STORAGE: browser.storage.local,
  TABS: browser.tabs,
  WINDOWS: browser.windows,
  WINDOW_ID: undefined,
}


if (SiteNotes.WINDOWS) {
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
  const isPopup = !!document.querySelectorAll('#site-notes-body.popup').length;
  const isSidebar = !!document.querySelectorAll('#site-notes-body.sidebar').length;
  const createFrame = SiteNotes.IS_CHROME && !isPopup && !isSidebar;

  if (createFrame) {
    const frame = document.createElement('iframe');
    frame.id = 'site-notes-iframe';
    frame.style.width = '300px';
    frame.style.height = '100vh';
    frame.style.top = '0px';
    frame.style.right = '0px';
    frame.style.position = 'fixed';
    frame.style.display = 'none';
    frame.style.zIndex = 9999999;
    frame.src = chrome.runtime.getURL('sidebar/sidebar.html');
    document.body.appendChild(frame);
  }

  if (SiteNotes.IS_CHROME && isSidebar) {
    const stylesheet = document.createElement('style');
    stylesheet.innerText = `
        body {
          margin: 0px;
        }
        #site-notes-body.sidebar {
          height: calc(100vh - 10px);
        }
        #site-notes-body .plus {
          padding-left: 4px;
          padding-top: 5px;
        }
        #site-notes-body .delete-a {
          display: block;
        }
        #site-notes-body .delete {
          padding-left: 4px;
          padding-top: 4px;
        }
        #site-notes-body #search-results ul {
          margin-left: 25px;
        }`;
    document.head.appendChild(stylesheet);
  }

  if (SiteNotes.IS_CHROME && isPopup) {
    const stylesheet = document.createElement('style');
    stylesheet.innerText = `
      #site-notes-body .delete-a {
        display: block;
      }`;
    document.head.appendChild(stylesheet);
  }

  if (document.getElementById('site-notes-body')) {
    document.getElementById('site-notes-body').innerHTML = `
    <div id="search-area" style="width: 100%; margin-top: 0;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="flex: 1;">
          <input type="text" id="search-txt" style="width: 100%;" placeholder="search ..." />
        </div>
        <input type="button" value="sidebar" id="sidebar-toggle-button" style="display: none; margin-left: 10px;" />
      </div>
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

    if (isSidebar || isPopup) {
      const button = document.getElementById(SiteNotes.SIDEBAR_TOGGLE_ID);
      button.style.display = 'block';
      button.value = `sidebar ${(await isOpen()) ? ' >' : ' <'}`

      button.addEventListener("click", async () => {
        await SiteNotes.STORAGE.set({
          [SiteNotes.SIDEBAR_OPEN]: !(await isOpen()),
        });
        button.value = `sidebar ${(await isOpen()) ? ' >' : ' <'}`
      });
    }

    if (createFrame) {
      async function showSidebar() {
        const open = await isOpen();
        document.getElementById('site-notes-iframe').style.display = open ? 'block' : 'none';
      }

      showSidebar();
      setInterval(async () => {
        chrome.runtime?.id && showSidebar();
      }, 250);
    }
  }
})();
