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

function appendNote(url, uuid, text) {
  let newContainer = document.createElement('div');
  newContainer.className = 'note';
  newContainer.setAttribute('note-id', uuid);

  let newNote = document.createElement('textarea');
  newNote.className = 'note-text';
  newNote.innerText = text;
  newNote.addEventListener('keyup', (e) => {
    updateNote(url, uuid, e.target.value);
  });

  let deleteButton = document.createElement('input');
  deleteButton.type = 'button';
  deleteButton.value = '-';
  deleteButton.addEventListener('click', () => {
    deleteNote(url, uuid);
  });

  newContainer.appendChild(newNote);
  newContainer.appendChild(deleteButton);
  NOTES.appendChild(newContainer);
}

async function addNote(url) {
  let newId = uuidv4();

  appendNote(url, newId, newId);
  appendAddNoteButton(url);

  let stored = (await STORAGE.get(url) || {})[url] || {};
  STORAGE.set({
    [url]: {
      ...stored,
      [newId]: newId,
    },
  });
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
  if (!NOTES) {
    return;
  }

  NOTES.innerHTML = '';

  let tab = (await TABS.query({ windowId: WINDOW_ID, active: true }))[0];

  let stored = (await STORAGE.get(tab.url) || {})[tab.url] || {};

  Object.keys(stored).forEach(k => {
    appendAddNoteButton(tab.url);
    appendNote(tab.url, k, stored[k]);
  });

  appendAddNoteButton(tab.url);
}

reload().then(() => {
  TABS.onActivated.addListener(reload);
  TABS.onUpdated.addListener((_, update) => {
    if (update.url) {
      reload();
    }
  });
});
