'use strict';

//document.body.appendChild(document.createTextNode("popup js"));

const SIDEBAR_OPEN = 'site-notes-sidebar-open';
const SIDEBAR_TOGGLE_ID = 'sidebar-toggle-button';

if (IS_CHROME) {
  async function setupSidebarButton() {
    const isOpen = async () => ((await STORAGE.get(SIDEBAR_OPEN)) || {})[SIDEBAR_OPEN] === true;

    const SIDEBAR_BUTTON = document.getElementById(SIDEBAR_TOGGLE_ID);
    SIDEBAR_BUTTON.style.display = 'block';
    SIDEBAR_BUTTON.value = `sidebar ${(await isOpen()) ? ' <' : ' >'}`

    SIDEBAR_BUTTON.addEventListener("click", async () => {
      await STORAGE.set({
        [SIDEBAR_OPEN]: !(await isOpen()),
      });
      SIDEBAR_BUTTON.value = `sidebar ${(await isOpen()) ? ' <' : ' >'}`
    });
  }
  setupSidebarButton();
}
