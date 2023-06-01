'use strict';

SiteNotes.initNotes = function () {
  const DOMAIN_NOTES_LBL = document.getElementById('domain-notes-lbl');
  const DOMAIN_NOTES = document.getElementById('domain-notes');

  const PAGE_NOTES_LBL = document.getElementById('page-notes-lbl');
  const PAGE_NOTES = document.getElementById('page-notes');

  async function getOrDefault(url) {
    return (await SiteNotes.STORAGE.get(url) || {})[url] || { v: 1, sorts: [], notes: {} };
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

  function appendNote(el, url, uuid, note, before) {
    const newContainer = document.createElement('div');
    newContainer.className = 'note';
    newContainer.setAttribute('note-id', uuid);

    const newNote = document.createElement('textarea');
    newNote.className = 'note-text';
    newNote.value = note.text;
    newNote.cols = 60;
    const lines = note.text.split('\n');
    newNote.rows = lines.reduce((acc, cur) => acc + Math.trunc(cur.length / 60) + 1, 1);
    newNote.title = `Created ${note.created} | Updated: ${note.updated || '--'}`;
    newNote.addEventListener('keyup', (e) => {
      updateNote(url, uuid, e.target.value);
    });

    const deleteButton = document.createElement('a');
    deleteButton.className = 'delete-a';
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

  async function updateTitle(stored) {
    const tab = SiteNotes.TABS
      ? (await SiteNotes.TABS.query({ windowId: SiteNotes.WINDOW_ID, active: true }))[0]
      : { url: document.URL, title: document.title };
    if (!stored.title || tab.url.length < stored.titleUrl.length) {
      return {
        ...stored,
        title: tab.title,
        titleUrl: tab.url,
      };
    }
    return stored;
  }

  async function addNote(el, url, before) {
    const newId = uuidv4();

    const note = {
      text: '',
      created: (new Date().toLocaleString()),
      updated: null,
      session: SESSION_ID,
      number: 1,
    };
    appendNote(el, url, newId, note, before ? el.querySelectorAll(`[note-id='${before}']`)[0] : null);

    const stored = await getOrDefault(url);

    const found = stored.sorts.indexOf(before);
    if (found !== -1) {
      stored.sorts.splice(found, 0, newId);
    } else {
      stored.sorts.push(newId);
    }

    SiteNotes.STORAGE.set({
      [url]: {
        ...(await updateTitle(stored)),
        notes: {
          ...stored.notes,
          [newId]: note,
        },
      }
    });
  }

  async function deleteNote(url, uuid) {
    const nodes = document.querySelectorAll(`[note-id="${uuid}"]`);
    nodes.forEach(n => n.remove());

    const stored = await getOrDefault(url);

    delete stored.notes[uuid];
    if (!Object.keys(stored.notes).length) {
      SiteNotes.STORAGE.remove(url);
    } else {
      stored.sorts = stored.sorts.filter(x => x !== uuid);
      SiteNotes.STORAGE.set({ [url]: stored });
    }
  }

  async function updateNote(url, uuid, newNote) {
    SiteNotes.debounce(`update-${uuid}`, async () => {
      const stored = await getOrDefault(url);

      SiteNotes.STORAGE.set({
        [url]: {
          ...(await updateTitle(stored)),
          notes: {
            ...stored.notes,
            [uuid]: {
              ...stored.notes[uuid],
              text: newNote,
              updated: (new Date().toLocaleString()),
              session: SESSION_ID,
              number: stored.notes[uuid].number + 1,
            },
          },
        }
      });
    });
  }

  async function reload() {
    SiteNotes.debounce("reload", async () => {
      if (!(DOMAIN_NOTES || PAGE_NOTES)) {
        return;
      }

      const tab = SiteNotes.TABS
        ? (await SiteNotes.TABS.query({ windowId: SiteNotes.WINDOW_ID, active: true }))[0]
        : { url: document.URL, title: document.title };
      const url = new URL(tab.url);

      const domain = url.hostname ? url.hostname : (url.protocol + url.pathname);
      const pagepath = url.hostname ? (url.hostname + url.pathname) : url.href;

      if (DOMAIN_NOTES) {
        DOMAIN_NOTES.innerHTML = '';

        DOMAIN_NOTES_LBL.innerText = domain;
        const stored = await getOrDefault(domain);

        stored.sorts.forEach(k => {
          appendNote(DOMAIN_NOTES, domain, k, stored.notes[k]);
        });
        appendAddNoteButton(DOMAIN_NOTES, domain, null);

        if (stored['title']) {
          let title = document.createElement('i');
          title.innerText = stored['title'];
          DOMAIN_NOTES_LBL.appendChild(document.createElement('br'));
          DOMAIN_NOTES_LBL.appendChild(title);
        }
      }

      if (PAGE_NOTES) {
        PAGE_NOTES.innerHTML = '';

        if (pagepath === domain || pagepath === (domain + '/')) {
          PAGE_NOTES_LBL.innerText = '';
        } else {
          PAGE_NOTES_LBL.innerText = pagepath.replace(domain, '');
          const stored = await getOrDefault(pagepath);

          stored.sorts.forEach(k => {
            appendNote(PAGE_NOTES, pagepath, k, stored.notes[k]);
          });
          appendAddNoteButton(PAGE_NOTES, pagepath, null);

          if (stored['title']) {
            let title = document.createElement('i');
            title.innerText = stored['title'];
            PAGE_NOTES_LBL.appendChild(document.createElement('br'));
            PAGE_NOTES_LBL.appendChild(title);
          }
        }
      }
    });
  }

  reload().then(() => {
    if (SiteNotes.TABS) {
      SiteNotes.TABS.onActivated.addListener(reload);
      SiteNotes.TABS.onUpdated.addListener((_, update) => {
        if (update.url) {
          reload();
        }
      });
    }
  });
};

SiteNotes.initNotes();
