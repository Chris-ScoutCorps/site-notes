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

function appendAddNoteButton(el, url, before) {
  let button = document.createElement('a');
  button.className = 'add-note-button';
  button.addEventListener('click', () => {
    addNote(before ? el.parentNode : el, url, before);
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

function appendNote(el, url, uuid, text, before) {
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

  appendAddNoteButton(newContainer, url, uuid);
  newContainer.appendChild(deleteButton);
  newContainer.appendChild(newNote);

  if (before) {
    el.insertBefore(newContainer, before);
  } else {
    if (before === null) { // form is filled
      let adds = el.querySelectorAll('a.add-note-button');
      el.insertBefore(newContainer, adds[adds.length - 1]);
    } else { // still filling
      el.appendChild(newContainer);
    }
  }
}

async function addNote(el, url, before) {
  let newId = uuidv4();

  appendNote(el, url, newId, '', before ? el.querySelectorAll(`[note-id='${before}']`)[0] : null);

  let stored = (await STORAGE.get(url) || {})[url] || {};
  STORAGE.set({ [url]: { ...stored, [newId]: '' } });

  let sortkey = 'sorts|' + url;
  let sorts = (await STORAGE.get(sortkey) || {})[sortkey] || [];
  let found = sorts.indexOf(before);
  if (found !== -1) {
    sorts.splice(found, 0, newId);
  } else {
    sorts.push(newId);
  }
  STORAGE.set({ [sortkey]: sorts });
}

async function deleteNote(url, uuid) {
  let nodes = document.querySelectorAll(`[note-id="${uuid}"]`);
  nodes.forEach(n => n.remove());

  let stored = (await STORAGE.get(url) || {})[url] || {};
  delete stored[uuid];
  STORAGE.set({ [url]: stored });

  let sortkey = 'sorts|' + url;
  let sorts = (await STORAGE.get(sortkey) || {})[sortkey] || [];
  STORAGE.set({ [sortkey]: sorts.filter(x => x !== uuid) });
}

async function updateNote(url, uuid, newNote) {
  let stored = (await STORAGE.get(url) || {})[url] || {};
  stored[uuid] = newNote;
  STORAGE.set({ [url]: stored });
}

async function reload() {
  let tab = (DOMAIN_NOTES || PAGE_NOTES) && (await TABS.query({ windowId: WINDOW_ID, active: true }))[0];
  let url = new URL(tab.url);

  let domain = url.hostname ? url.hostname : (url.protocol + url.pathname);
  let pagepath = url.hostname ? (url.hostname + url.pathname) : url.href;

  if (DOMAIN_NOTES) {
    DOMAIN_NOTES.innerHTML = '';

    DOMAIN_NOTES_LBL.innerText = `${domain} notes`;
    let stored = (await STORAGE.get(domain) || {})[domain] || {};

    let sortkey = 'sorts|' + domain;
    let sorts = (await STORAGE.get(sortkey) || {})[sortkey] || [];

    Object.keys(stored).filter(k => !sorts.includes(k)).forEach(k => {
      sorts.push(k);
    });
    STORAGE.set({ [sortkey]: sorts });

    sorts.forEach(k => {
      appendNote(DOMAIN_NOTES, domain, k, stored[k]);
    });
    appendAddNoteButton(DOMAIN_NOTES, domain, null);
  }

  if (PAGE_NOTES) {
    PAGE_NOTES.innerHTML = '';

    if (pagepath === domain || pagepath === (domain + '/')) {
      PAGE_NOTES_LBL.innerText = '';
    } else {
      PAGE_NOTES_LBL.innerText = `${pagepath} notes`;
      let stored = (await STORAGE.get(pagepath) || {})[pagepath] || {};

      let sortkey = 'sorts|' + pagepath;
      let sorts = (await STORAGE.get(sortkey) || {})[sortkey] || [];

      Object.keys(stored).filter(k => !sorts.includes(k)).forEach(k => {
        sorts.push(k);
      });
      STORAGE.set({ [sortkey]: sorts });

      sorts.forEach(k => {
        appendNote(PAGE_NOTES, pagepath, k, stored[k]);
      });
      appendAddNoteButton(PAGE_NOTES, pagepath, null);
    }
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
