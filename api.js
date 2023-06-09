'use strict';

(async () => {
  const API_URL = 'https://localhost:7227/Notes';
  const OPTS = {
    cache: 'no-cache',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  };

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
    const dirty = (await SiteNotes.STORAGE.get(SiteNotes.SETTINGS_KEYS.DIRTY) || {})[SiteNotes.SETTINGS_KEYS.DIRTY] || false;
    if (dirty) {
      await SiteNotes.API.sync();
    }
  };

  SiteNotes.API = {
    refreshAllFromServer: async () => {
      try {
        const since = (await SiteNotes.STORAGE.get(SiteNotes.SETTINGS_KEYS.LAST_NOTE_ID) || {})[SiteNotes.SETTINGS_KEYS.LAST_NOTE_ID] || 0;
        const response = await (await fetch(`${API_URL}/get?since=${since}&session=${SESSION_ID}`, { method: 'GET', ...OPTS, })).json();
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
          `${API_URL}/get?since=${since}&session=${SESSION_ID}&siteUrl=${encodeURIComponent(siteUrl)}&pageUrl=${encodeURIComponent(pageUrl)}`,
          { method: 'GET', ...OPTS, }
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
          `${API_URL}/upsert`,
          {
            method: 'POST',
            ...OPTS,
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
          `${API_URL}/delete`,
          {
            method: 'DELETE',
            ...OPTS,
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
          `${API_URL}/sync`,
          {
            method: 'POST',
            ...OPTS,
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

  };

  SiteNotes.API.refreshAllFromServer();
})();
