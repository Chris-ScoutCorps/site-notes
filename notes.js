'use strict';

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

async function reload() {
  let tab = (await TABS.query({ windowId: WINDOW_ID, active: true }))[0];
  document.body.appendChild(document.createTextNode(tab.url));
}
reload();

TABS.onActivated.addListener(reload);
TABS.onUpdated.addListener(reload);
