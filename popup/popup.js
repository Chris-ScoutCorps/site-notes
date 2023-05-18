'use strict';

document.body.appendChild(document.createTextNode("popup js"));

const SIDEBAR_OPEN = 'site-notes-sidebar-open';
const SIDEBAR_TOGGLE_ID = 'sidebar-toggle-button';

if (IS_CHROME) {
  document.getElementById(SIDEBAR_TOGGLE_ID).style.display = 'block';

  document.getElementById(SIDEBAR_TOGGLE_ID).addEventListener("click", async () => {
    let isOpen = ((await STORAGE.get(SIDEBAR_OPEN)) || {})[SIDEBAR_OPEN] === true;
    await STORAGE.set({
      [SIDEBAR_OPEN]: !isOpen,
    });
  });
}
