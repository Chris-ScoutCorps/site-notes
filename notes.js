'use strict';

let NOTES = document.getElementById('notes');

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

function appendAddNoteButton(url) {
  let button = document.createElement('input');
  button.type = 'button';
  button.value = '+';
  button.addEventListener('click', () => {
    addNote(url);
  });
  NOTES.appendChild(button);
}

function appendNote(uuid, text) {
  let newNote = document.createElement('div');
  newNote.className = 'note';
  newNote.setAttribute('note-id', uuid);
  newNote.innerText = text;
  NOTES.appendChild(newNote);
}

async function addNote(url) {
  let newId = uuidv4();

  appendNote(newId, newId);
  appendAddNoteButton(url);

  let stored = (await STORAGE.get(url) || {})[url] || {};
  STORAGE.set({
    [url]: {
      ...stored,
      [newId]: newId,
    },
  });
}

async function reload() {
  if (!NOTES) {
    return;
  }

  NOTES.innerHTML = '';

  let tab = (await TABS.query({ windowId: WINDOW_ID, active: true }))[0];

  let stored = (await STORAGE.get(tab.url) || {})[tab.url] || {};

  Object.keys(stored).forEach(k => {
    appendAddNoteButton(tab.url);
    appendNote(k, stored[k]);
  });

  appendAddNoteButton(tab.url);
}
reload();

TABS.onActivated.addListener(reload);
TABS.onUpdated.addListener(reload);

