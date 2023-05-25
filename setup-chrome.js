SiteNotes = {
  SIDEBAR_OPEN: 'site-notes-sidebar-open',
  SIDEBAR_TOGGLE_ID: 'sidebar-toggle-button',
  STORAGE: chrome.storage.local,
  IS_CHROME: true,
};

(async function setupSidebarButton() {
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
})();

(function createFrame() {
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
})();
