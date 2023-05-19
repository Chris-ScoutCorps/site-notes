'use strict';

let DOMAIN_NOTES_LBL = document.getElementById('domain-notes-lbl');
let DOMAIN_NOTES = document.getElementById('domain-notes');

let PAGE_NOTES_LBL = document.getElementById('page-notes-lbl');
let PAGE_NOTES = document.getElementById('page-notes');

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

function appendAddNoteButton(el, url) {
  let button = document.createElement('a');
  button.addEventListener('click', () => {
    addNote(el, url);
  });

  let divider = document.createElement('div');
  divider.className = 'note-divider';

  let plus = document.createElement('div');
  plus.className = 'plus';
  plus.innerHTML = '+';

  let line = document.createElement('div');
  line.className = 'line';

  button.appendChild(divider);
  divider.appendChild(plus);
  divider.appendChild(line);
  el.appendChild(button);
}

function appendNote(el, url, uuid, text) {
  let newContainer = document.createElement('div');
  newContainer.className = 'note';
  newContainer.setAttribute('note-id', uuid);

  let newNote = document.createElement('textarea');
  newNote.className = 'note-text';
  newNote.innerText = text;
  newNote.addEventListener('keyup', (e) => {
    updateNote(url, uuid, e.target.value);
  });

  let deleteButton = document.createElement('a');
  deleteButton.addEventListener('click', () => {
    deleteNote(url, uuid);
  });
  let x = document.createElement('div');
  x.className = 'delete';
  x.innerHTML = '&#10060;';
  deleteButton.appendChild(x);

  newContainer.appendChild(deleteButton);
  newContainer.appendChild(newNote);
  appendAddNoteButton(newContainer, url);
  el.appendChild(newContainer);
}

async function addNote(el, url) {
  let newId = uuidv4();

  appendNote(el, url, newId, '');

  let stored = (await STORAGE.get(url) || {})[url] || {};
  STORAGE.set({ [url]: { ...stored, [newId]: '' } });
}

async function deleteNote(url, uuid) {
  let nodes = document.querySelectorAll(`[note-id="${uuid}"]`);
  nodes.forEach(n => n.remove());

  let stored = (await STORAGE.get(url) || {})[url] || {};
  delete stored[uuid];
  STORAGE.set({ [url]: stored });
}

async function updateNote(url, uuid, newNote) {
  let stored = (await STORAGE.get(url) || {})[url] || {};
  stored[uuid] = newNote;
  STORAGE.set({ [url]: stored });
}

async function reload() {
  let tab = (DOMAIN_NOTES || PAGE_NOTES) && (await TABS.query({ windowId: WINDOW_ID, active: true }))[0];
  let url = new URL(tab.url);

  if (DOMAIN_NOTES) {
    DOMAIN_NOTES.innerHTML = '';

    let domain = url.hostname ? url.hostname : (url.protocol + url.pathname);
    DOMAIN_NOTES_LBL.innerText = `${domain} notes`;
    let stored = (await STORAGE.get(domain) || {})[domain] || {};

    appendAddNoteButton(DOMAIN_NOTES, domain);
    Object.keys(stored).forEach(k => {
      appendNote(DOMAIN_NOTES, domain, k, stored[k]);
    });
  }

  if (PAGE_NOTES) {
    PAGE_NOTES.innerHTML = '';

    let pagepath = url.hostname ? (url.hostname + url.pathname) : url.href;
    PAGE_NOTES_LBL.innerText = `${pagepath} notes`;
    let stored = (await STORAGE.get(pagepath) || {})[pagepath] || {};

    appendAddNoteButton(PAGE_NOTES, pagepath);
    Object.keys(stored).forEach(k => {
      appendNote(PAGE_NOTES, pagepath, k, stored[k]);
    });
  }
}

reload().then(() => {
  TABS.onActivated.addListener(reload);
  TABS.onUpdated.addListener((_, update) => {
    if (update.url) {
      reload();
    }
  });
});
