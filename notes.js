'use strict';

const DOMAIN_NOTES_LBL = document.getElementById('domain-notes-lbl');
const DOMAIN_NOTES = document.getElementById('domain-notes');

const PAGE_NOTES_LBL = document.getElementById('page-notes-lbl');
const PAGE_NOTES = document.getElementById('page-notes');

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

function appendAddNoteButton(el, url, before) {
  const button = document.createElement('a');
  button.className = 'add-note-button';
  button.addEventListener('click', () => {
    addNote(before ? el.parentNode : el, url, before);
  });

  const divider = document.createElement('div');
  divider.className = 'note-divider';

  const plus = document.createElement('div');
  plus.className = 'plus';
  plus.innerHTML = '+';

  const line = document.createElement('div');
  line.className = 'line';

  button.appendChild(divider);
  divider.appendChild(plus);
  divider.appendChild(line);
  el.appendChild(button);
}

function appendNote(el, url, uuid, text, before) {
  const newContainer = document.createElement('div');
  newContainer.className = 'note';
  newContainer.setAttribute('note-id', uuid);

  const newNote = document.createElement('textarea');
  newNote.className = 'note-text';
  newNote.innerText = text;
  newNote.addEventListener('keyup', (e) => {
    updateNote(url, uuid, e.target.value);
  });

  const deleteButton = document.createElement('a');
  deleteButton.addEventListener('click', () => {
    deleteNote(url, uuid);
  });
  const x = document.createElement('div');
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
      const adds = el.querySelectorAll('a.add-note-button');
      el.insertBefore(newContainer, adds[adds.length - 1]);
    } else { // still filling
      el.appendChild(newContainer);
    }
  }
}

async function addNote(el, url, before) {
  const newId = uuidv4();

  appendNote(el, url, newId, '', before ? el.querySelectorAll(`[note-id='${before}']`)[0] : null);

  const stored = (await STORAGE.get(url) || {})[url] || {};
  STORAGE.set({ [url]: { ...stored, [newId]: '' } });

  const sortkey = 'sorts|' + url;
  const sorts = (await STORAGE.get(sortkey) || {})[sortkey] || [];
  const found = sorts.indexOf(before);
  if (found !== -1) {
    sorts.splice(found, 0, newId);
  } else {
    sorts.push(newId);
  }
  STORAGE.set({ [sortkey]: sorts });
}

async function deleteNote(url, uuid) {
  const nodes = document.querySelectorAll(`[note-id="${uuid}"]`);
  nodes.forEach(n => n.remove());

  const stored = (await STORAGE.get(url) || {})[url] || {};
  delete stored[uuid];
  if (Object.keys(stored).length) {
    STORAGE.set({ [url]: stored });
  } else {
    STORAGE.remove(url);
  }

  const sortkey = 'sorts|' + url;
  const sorts = ((await STORAGE.get(sortkey) || {})[sortkey] || []).filter(x => x !== uuid);
  if (sorts.length) {
    STORAGE.set({ [sortkey]: sorts });
  } else {
    STORAGE.remove(sortkey);
  }
}

async function updateNote(url, uuid, newNote) {
  debounce(`update-${uuid}`, async () => {
    const stored = (await STORAGE.get(url) || {})[url] || {};
    stored[uuid] = newNote;
    STORAGE.set({ [url]: stored });
  });
}

async function reload() {
  debounce("reload", async () => {
    const tab = (DOMAIN_NOTES || PAGE_NOTES) && (await TABS.query({ windowId: WINDOW_ID, active: true }))[0];
    const url = new URL(tab.url);

    const domain = url.hostname ? url.hostname : (url.protocol + url.pathname);
    const pagepath = url.hostname ? (url.hostname + url.pathname) : url.href;

    if (DOMAIN_NOTES) {
      DOMAIN_NOTES.innerHTML = '';

      DOMAIN_NOTES_LBL.innerText = `${domain} notes`;
      const stored = (await STORAGE.get(domain) || {})[domain] || {};

      const sortkey = 'sorts|' + domain;
      const sorts = (await STORAGE.get(sortkey) || {})[sortkey] || [];

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
        const stored = (await STORAGE.get(pagepath) || {})[pagepath] || {};

        const sortkey = 'sorts|' + pagepath;
        const sorts = (await STORAGE.get(sortkey) || {})[sortkey] || [];

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
  });
}

reload().then(() => {
  TABS.onActivated.addListener(reload);
  TABS.onUpdated.addListener((_, update) => {
    if (update.url) {
      reload();
    }
  });
});
