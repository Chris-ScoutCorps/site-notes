'use strict'

const SIDEBAR_URL = chrome.runtime.getURL('sidebar/sidebar.html');
const SIDEBAR_OPEN = 'site-notes-sidebar-open';

const frame = document.createElement('div');
frame.id = SIDEBAR_URL;
frame.style.width = '250px';
frame.style.top = '0px';
frame.style.right = '0px';
frame.style.height = '100vw';
frame.style.position = 'fixed';
frame.style.display = 'none';
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

const isOpen = async () => ((await STORAGE.get(SIDEBAR_OPEN)) || {})[SIDEBAR_OPEN] === true;

async function showSidebar() {
  const open = await isOpen();
  document.getElementById(SIDEBAR_URL).style.display = open ? 'block' : 'none';
}

showSidebar();
let interval = setInterval(async () => {
  chrome.runtime?.id && showSidebar();
}, 250);
