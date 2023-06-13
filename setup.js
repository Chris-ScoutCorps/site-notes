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
SiteNotes.VERSION = 1;
SiteNotes.SETTINGS_KEYS = {
  SIDEBAR_OPEN: 'site-notes-sidebar-open',
  LAST_NOTE_ID: 'last-server-note-id',
  DIRTY: 'last-upload-failed',
  ACTIVE_NOTEBOOK: 'notebook',
  AVAILABLE_NOTEBOOKS: 'available-notebooks',
};

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
SiteNotes.DECOLLIDES = {};
SiteNotes.decollide = (key, callback, timeout = 250) => {
  const now = new Date().getTime();
  if (SiteNotes.DECOLLIDES[key] && (SiteNotes.DECOLLIDES[key] + timeout) > now) {
    // do nothing
  } else {
    SiteNotes.DECOLLIDES[key] = now;
    callback();
  }
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
      <div id="search-opts" style="display: flex; align-items: left;">
        <label style="margin-left: 0px;">
          <input type="radio" name="search-targets" value="all" style="margin-left: 0px;" checked />
          <span>Everything</span>
        </label>
        <label style="margin-left: 10px;">
          <input type="radio" name="search-targets" value="headers" />
          <span>URLs & Titles Only</span>
        </label>
      </div>
      <div id="search-results" style="width: 100%; margin-bottom: 10px; margin-top: 10px;"></div>
    </div>

    <h4 id="domain-notes-lbl" style="width: 100%; margin-top: 0;"></h4>
    <div id="domain-notes" style="width: 100%;"></div>

    <h4 id="page-notes-lbl" style="width: 100%;"></h4>
    <div id="page-notes" style="width: 100%;"></div>

    <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid lightgray; margin-top: 12px;" id="active-notebook-area">
      <div style="flex: 1;">
        <select id="notebooks-select">
        </select>
        
        <a href='#' id="rename-notebook-button" style="text-decoration: none; font-size: 2em;" alt="Rename Notebook" title="Rename Notebook">&#x270e;</a>
        <a href='#' id="open-notebook-button" style="text-decoration: none; font-size: 2em;" alt="Open Notebook" title="Open Notebook">&#x1F513;</a>
        <a href='#' id="copy-notebook-button" style="text-decoration: none; font-size: 2em;" alt="Copy Key for this Notebook" title="Copy Key for this Notebook">&#128273;</a>
        <a href='#' id="create-notebook-button" style="text-decoration: none; font-size: 2em;" alt="Create Notebook" title="Create Notebook">+</a>
      </div>
      <a href='#' id="refresh-button" style="text-decoration: none; font-size: 2em;" alt="Sync" title="Sync">&#8635;</a>
    </div>

    <div style="display: none; border-top: 1px solid lightgray; margin-top: 12px;" id="edit-notebook-area">
      <input id="notebook-name-or-key" type="text" />
      <a href='#' id="edit-notebook-confirm" style="text-decoration: none; font-size: 2em; color: green;" alt="Rename Notebook" title="Rename Notebook">&#10004;</a>
      <a href='#' id="edit-notebook-cancel" style="text-decoration: none; font-size: 2em; color: red;" alt="Cancel" title="Cancel">x</a>
    </div>
  `;
  }

  if (SiteNotes.IS_CHROME) {
    const isOpen = async () => ((await SiteNotes.STORAGE.get(SiteNotes.SETTINGS_KEYS.SIDEBAR_OPEN)) || {})[SiteNotes.SETTINGS_KEYS.SIDEBAR_OPEN] === true;

    if (isSidebar || isPopup) {
      const button = document.getElementById(SiteNotes.SIDEBAR_TOGGLE_ID);
      button.style.display = 'block';
      button.value = `sidebar ${(await isOpen()) ? ' >' : ' <'}`

      button.addEventListener("click", async () => {
        await SiteNotes.STORAGE.set({
          [SiteNotes.SETTINGS_KEYS.SIDEBAR_OPEN]: !(await isOpen()),
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

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}
const SESSION_ID = uuidv4();

const getActiveNotebook = async () => (await SiteNotes.STORAGE.get(SiteNotes.SETTINGS_KEYS.ACTIVE_NOTEBOOK) || {})[SiteNotes.SETTINGS_KEYS.ACTIVE_NOTEBOOK] || null;
const getAvailableNotebooks = async () => (await SiteNotes.STORAGE.get(SiteNotes.SETTINGS_KEYS.AVAILABLE_NOTEBOOKS) || {})[SiteNotes.SETTINGS_KEYS.AVAILABLE_NOTEBOOKS] || [];

const populateNotebooksDropDown = async () => {
  document.getElementById('notebooks-select').innerHTML = '';
  const notebooks = await getAvailableNotebooks();
  const active = await getActiveNotebook();
  notebooks.forEach(notebook => {
    const opt = document.createElement('option');
    opt.text = notebook.name;
    opt.value = notebook.key;
    opt.selected = notebook.key === active.key;
    document.getElementById('notebooks-select').appendChild(opt);
  });
};

(function initNotebooksButtons() {
  const switchNotebook = async () => {
    const stored = await SiteNotes.STORAGE.get();
    const toRem = Object.keys(stored).filter(k => !Object.values(SiteNotes.SETTINGS_KEYS).includes(k));
    await SiteNotes.STORAGE.remove(toRem);
    await SiteNotes.STORAGE.set({ [SiteNotes.SETTINGS_KEYS.LAST_NOTE_ID]: 0 });
    await SiteNotes.API.refreshAllFromServer();
    await SiteNotes.reload(true);
  };

  document.getElementById('notebooks-select').addEventListener('change', async () => {
    const key = document.getElementById('notebooks-select').options[document.getElementById('notebooks-select').selectedIndex].value;
    const available = await getAvailableNotebooks();
    await SiteNotes.STORAGE.set({ [SiteNotes.SETTINGS_KEYS.ACTIVE_NOTEBOOK]: available.filter(a => a.key === key)[0] });
    await switchNotebook();
  });

  document.getElementById('rename-notebook-button').addEventListener('click', async () => {
    document.getElementById('active-notebook-area').style.display = 'none';
    document.getElementById('edit-notebook-area').style.display = 'block';
    document.getElementById('edit-notebook-area').setAttribute('data-mode', 'rename');
    document.getElementById('notebook-name-or-key').setAttribute('placeholder', 'Notebook Name');
    document.getElementById('notebook-name-or-key').value = (await getActiveNotebook()).name;
  });

  document.getElementById('create-notebook-button').addEventListener('click', async () => {
    document.getElementById('active-notebook-area').style.display = 'none';
    document.getElementById('edit-notebook-area').style.display = 'block';
    document.getElementById('edit-notebook-area').setAttribute('data-mode', 'create');
    document.getElementById('notebook-name-or-key').setAttribute('placeholder', 'Notebook Name');
    document.getElementById('notebook-name-or-key').value = '';
  });

  document.getElementById('copy-notebook-button').addEventListener('click', async () => {
    const selected = document.getElementById('notebooks-select').options[document.getElementById('notebooks-select').selectedIndex];
    alert(`The key "${selected.value}" for notebook "${selected.text}" has been copied to the clipboard`);
    navigator.clipboard.writeText(selected.value);
  });

  document.getElementById('open-notebook-button').addEventListener('click', async () => {
    document.getElementById('active-notebook-area').style.display = 'none';
    document.getElementById('edit-notebook-area').style.display = 'block';
    document.getElementById('edit-notebook-area').setAttribute('data-mode', 'open');
    document.getElementById('notebook-name-or-key').setAttribute('placeholder', 'Enter or Paste Key Here');
    document.getElementById('notebook-name-or-key').value = '';
  });

  document.getElementById('edit-notebook-confirm').addEventListener('click', async () => {
    document.getElementById('active-notebook-area').style.display = 'flex';
    document.getElementById('edit-notebook-area').style.display = 'none';

    const mode = document.getElementById('edit-notebook-area').getAttribute('data-mode');
    let active = await getActiveNotebook();
    const available = await getAvailableNotebooks();

    if (mode === 'rename') {
      active.name = document.getElementById('notebook-name-or-key').value;
      available.find(a => a.key === active.key).name = active.name;
    } else if (mode === 'create') {
      active = {
        name: document.getElementById('notebook-name-or-key').value,
        key: crypto.randomUUID(),
        registered: false,
      };
      available.push(active);
    }

    if (mode === 'rename' || mode === 'create') {
      await SiteNotes.STORAGE.set({ [SiteNotes.SETTINGS_KEYS.ACTIVE_NOTEBOOK]: active });
      await SiteNotes.STORAGE.set({ [SiteNotes.SETTINGS_KEYS.AVAILABLE_NOTEBOOKS]: available });
    }

    if (mode === 'rename') {
      await SiteNotes.API.renameNotebook(active);
    } else if (mode === 'create') {
      await SiteNotes.API.ensureNotebook(active);
      await switchNotebook();
    } else if (mode === 'open') {
      await SiteNotes.API.openNotebook(document.getElementById('notebook-name-or-key').value);
      await switchNotebook();
    }

    await populateNotebooksDropDown();
  });

  document.getElementById('edit-notebook-cancel').addEventListener('click', () => {
    document.getElementById('active-notebook-area').style.display = 'flex';
    document.getElementById('edit-notebook-area').style.display = 'none';
  });
})();

(async function migrations() {
  await (async function v1() {
    const stored = await SiteNotes.STORAGE.get();
    const toStore = {};
    const toRem = [];
    for (const key of Object.keys(stored).filter(
      k => !k.startsWith('sorts|') && !Object.values(SiteNotes.SETTINGS_KEYS).includes(k) && !stored[k].v
    )) {
      const value = stored[key];
      toStore[key] = {
        v: SiteNotes.VERSION,
        title: value['title'],
        titleUrl: value['title-url'],
        notes: Object.keys(value)
          .filter(k => k !== 'title' && k !== 'title-url')
          .reduce((acc, k) => ({
            ...acc,
            [k]: {
              text: value[k].note,
              created: value[k].created,
              updated: value[k].updated,
              session: SESSION_ID,
              number: 1,
            },
          }), {}),
        sorts: stored['sorts|' + key] || [],
      };
      toRem.push(key, 'sorts|' + key);
    }
    toRem.push(...Object.keys(stored).filter(k => k.startsWith('sorts|')));

    await SiteNotes.STORAGE.set(toStore);
    await SiteNotes.STORAGE.remove(toRem.filter(k => !toStore[k]));

    //alert(JSON.stringify(await SiteNotes.STORAGE.get(), undefined, 2));
  })();
})();
