'use strict';

(async () => {
  const NOTES_API_URL = 'https://site-notes.azurewebsites.net/Notes';
  const NOTEBOOKS_API_URL = 'https://site-notes.azurewebsites.net/Notebooks';
  const OPTS = async (notebook) => ({
    cache: 'no-cache',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (notebook || (await getActiveNotebook()) || {}).key,
      'Origin': 'site-notes-extension',
    },
    withCredentials: true,
    credentials: 'include',
  });

  const saveChanges = async (response) => {
    const sites = Object.keys(response.notesBySite);
    const stored = await SiteNotes.STORAGE.get(sites);
    for (const site of sites) {
      if (!stored[site]) {
        stored[site] = {
          v: SiteNotes.VERSION,
          notes: {},
          title: response.notesBySite[site].title,
          titleUrl: response.notesBySite[site].titleUrl,
        };
      }

      for (const deleted of response.notesBySite[site].deleted) {
        const existing = stored[site].notes[deleted.key];
        if (existing && existing.session === deleted.session && existing.number <= deleted.number) {
          delete stored[site].notes[deleted.key];
        }
      }
      for (const note of response.notesBySite[site].notes) {
        const existing = stored[site].notes[note.key];
        if (!existing) {
          stored[site].notes[note.key] = note;
        }
      }
    }

    await SiteNotes.STORAGE.set(stored);

    if (response.since) {
      await SiteNotes.STORAGE.set({ [SiteNotes.SETTINGS_KEYS.LAST_NOTE_ID]: response.since });
    }
  };

  const checkDirty = async () => {
    const active = await getActiveNotebook();
    if (!active.registered) {
      await SiteNotes.API.ensureNotebook(active);
    }

    const dirty = (await SiteNotes.STORAGE.get(SiteNotes.SETTINGS_KEYS.DIRTY) || {})[SiteNotes.SETTINGS_KEYS.DIRTY] || false;
    if (dirty) {
      await SiteNotes.API.sync();
    }
  };

  SiteNotes.API = {
    refreshAllFromServer: async () => {
      try {
        const since = (await SiteNotes.STORAGE.get(SiteNotes.SETTINGS_KEYS.LAST_NOTE_ID) || {})[SiteNotes.SETTINGS_KEYS.LAST_NOTE_ID] || 0;
        const response = await (await fetch(`${NOTES_API_URL}/get?since=${since}&session=${SESSION_ID}`, { method: 'GET', ...(await OPTS()), })).json();
        await saveChanges(response);
        checkDirty();
      } catch (e) {
        console.error(e, e.stack);
      }
    },

    refreshFromServer: async (siteUrl, pageUrl) => {
      try {
        const since = (await SiteNotes.STORAGE.get(SiteNotes.SETTINGS_KEYS.LAST_NOTE_ID) || {})[SiteNotes.SETTINGS_KEYS.LAST_NOTE_ID] || 0;
        const response = await (await fetch(
          `${NOTES_API_URL}/get?since=${since}&session=${SESSION_ID}&siteUrl=${encodeURIComponent(siteUrl)}&pageUrl=${encodeURIComponent(pageUrl)}`,
          { method: 'GET', ...(await OPTS()), }
        )).json();
        await saveChanges(response);
        checkDirty();
      } catch (e) {
        console.error(e, e.stack);
      }
    },

    upsertNote: async (url, title, titleUrl, key, text, session, number, sortOrder) => {
      try {
        const response = await (await fetch(
          `${NOTES_API_URL}/upsert`,
          {
            method: 'POST',
            ...(await OPTS()),
            body: JSON.stringify({
              url,
              title,
              titleUrl,
              key,
              text,
              session,
              newSession: SESSION_ID,
              number,
              sortOrder,
            }),
          }
        )).json();

        await saveChanges(response, url, key);
        checkDirty();
      } catch (e) {
        await SiteNotes.STORAGE.set({ [SiteNotes.SETTINGS_KEYS.DIRTY]: true });
        console.error(e, e.stack);
      }
    },

    deleteNote: async (url, key, text, session, number) => {
      try {
        const response = await (await fetch(
          `${NOTES_API_URL}/delete`,
          {
            method: 'DELETE',
            ...(await OPTS()),
            body: JSON.stringify({
              key,
              text,
              session,
              newSession: SESSION_ID,
              number,
            }),
          }
        )).json();

        await saveChanges(response, url, key);
        checkDirty();
      } catch (e) {
        await SiteNotes.STORAGE.set({ [SiteNotes.SETTINGS_KEYS.DIRTY]: true });
        console.error(e, e.stack);
      }
    },

    sync: async () => {
      try {
        const response = await (await fetch(
          `${NOTES_API_URL}/sync`,
          {
            method: 'POST',
            ...(await OPTS()),
            body: JSON.stringify({
              session: SESSION_ID,
              notesBySite:
                Object.entries(await SiteNotes.STORAGE.get())
                  .reduce((acc, entry) =>
                    Object.values(SiteNotes.SETTINGS_KEYS).includes(entry[0])
                      ? acc
                      : {
                        ...acc,
                        [entry[0]]: {
                          ...entry[1],
                          notes: Object.keys(entry[1].notes || {}).map(key => ({
                            key,
                            ...entry[1].notes[key],
                            created: null,
                            updated: null,
                          })),
                        },
                      }
                    , {}),
            }),
          }
        )).json();

        await saveChanges(response);
        await SiteNotes.STORAGE.set({ [SiteNotes.SETTINGS_KEYS.DIRTY]: false });
      } catch (e) {
        await SiteNotes.STORAGE.set({ [SiteNotes.SETTINGS_KEYS.DIRTY]: true });
        console.error(e, e.stack);
      }
    },

    ensureNotebook: async (notebook) => {
      try {
        const status = (await fetch(
          `${NOTEBOOKS_API_URL}/create`,
          {
            method: 'PUT',
            ...(await OPTS(notebook)),
            body: JSON.stringify(notebook.name),
          }
        )).status;

        if (status === 200) {
          const available = await getAvailableNotebooks();
          available.find(n => n.key === notebook.key).registered = true;
          await SiteNotes.STORAGE.set({ [SiteNotes.SETTINGS_KEYS.AVAILABLE_NOTEBOOKS]: available });

          const active = await getActiveNotebook();
          if (active && active.key === notebook.key) {
            active.registered = true;
            await SiteNotes.STORAGE.set({ [SiteNotes.SETTINGS_KEYS.ACTIVE_NOTEBOOK]: active });
          }
        }
      } catch (e) {
        console.error(e, e.stack);
      }
    },

    renameNotebook: async (notebook) => {
      try {
        await fetch(
          `${NOTEBOOKS_API_URL}/rename`,
          {
            method: 'PATCH',
            ...(await OPTS(notebook)),
            body: JSON.stringify(notebook.name),
          }
        );
      } catch (e) {
        console.error(e, e.stack);
      }
    },

    openNotebook: async (key) => {
      try {
        const response = await fetch(
          `${NOTEBOOKS_API_URL}/open`,
          {
            method: 'GET',
            ...(await OPTS({ key })),
          }
        );
        
        if (response.status === 200) {
          const available = await getAvailableNotebooks();
          const active = {
            key,
            name: await response.json(),
            registered: true,
          };
          await SiteNotes.STORAGE.set({ [SiteNotes.SETTINGS_KEYS.AVAILABLE_NOTEBOOKS]: available.filter(a => a.key !== key).concat([active]) });
          await SiteNotes.STORAGE.set({ [SiteNotes.SETTINGS_KEYS.ACTIVE_NOTEBOOK]: active });
        } else {
          alert('Could not open notebook - are you sure this is a valid key?');
        }
      } catch (e) {
        console.error(e, e.stack);
      }
    },
  };

  //await SiteNotes.STORAGE.set({ [SiteNotes.SETTINGS_KEYS.AVAILABLE_NOTEBOOKS]: [] });
  //await SiteNotes.STORAGE.set({ [SiteNotes.SETTINGS_KEYS.ACTIVE_NOTEBOOK]: null });

  await (async function initNotebooks() {
    const available = await getAvailableNotebooks();

    if (available.length === 0) {
      available.push({
        name: 'New Notebook',
        key: crypto.randomUUID(),
        registered: false,
      });
      await SiteNotes.STORAGE.set({ [SiteNotes.SETTINGS_KEYS.AVAILABLE_NOTEBOOKS]: available });
    }

    let active = await getActiveNotebook();
    if (!active) {
      active = available[0];
      await SiteNotes.STORAGE.set({ [SiteNotes.SETTINGS_KEYS.ACTIVE_NOTEBOOK]: active });
    }

    if (!active.registered) {
      await SiteNotes.API.ensureNotebook(active);
    }
  })();

  SiteNotes.API.refreshAllFromServer();

})();
