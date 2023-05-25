'use strict'

const SIDEBAR_URL = chrome.runtime.getURL('sidebar/sidebar.html');
const SIDEBAR_OPEN = 'site-notes-sidebar-open';

const isOpen = async () => ((await STORAGE.get(SIDEBAR_OPEN)) || {})[SIDEBAR_OPEN] === true;

//function appendScript(src, el) {
//  let script = document.createElement('script');

//  script.setAttribute('src', src);
//  script.setAttribute('type', 'text/javascript');
//  script.setAttribute('async', 'true');

//  el.appendChild(script);
//}

async function populateSidebar() {
  const open = await isOpen();
  if (open && !document.getElementById(SIDEBAR_URL)) {
    const frame = document.createElement('div');
    frame.id = SIDEBAR_URL;
    frame.style.width = '250px';
    frame.style.top = '0px';
    frame.style.right = '0px';
    frame.style.height = '100vw';
    frame.style.position = 'fixed';
    frame.style.borderLeft = '4px solid gray';
    frame.style.zIndex = 9999999;
    frame.style.backgroundColor = 'white';

    frame.innerHTML = `
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

    document.body.appendChild(frame);
    //appendScript(chrome.runtime.getURL('popup/popup.js'), frame);
    //appendScript(chrome.runtime.getURL('notes.js'), frame);
    //appendScript(chrome.runtime.getURL('search.js'), frame);
  } else if (!open && document.getElementById(SIDEBAR_URL)) {
    document.getElementById(SIDEBAR_URL).remove();
  }
}
populateSidebar();
let interval = setInterval(async () => { chrome.runtime?.id && populateSidebar(); }, 250);
