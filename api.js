'use strict';

(async () => {
  const API_URL = 'https://localhost:7227/Notes/';
  const OPTS = {
    cache: 'no-cache',
  };

  const saveChanges = async (response) => {
    const sites = Object.keys(response.sites);
    const stored = await SiteNotes.STORAGE.get(sites);
    for (const site of sites) {
      if (!stored[site]) {
        stored[site] = {
          v: SiteNotes.VERSION,
          sorts: [],
          notes: {},
          title: response.sites[site].title,
          titleUrl: response.sites[site].titleUrl,
        };
      }

      for (const deleted of response.sites[site].deleted) {
        const existing = stored[site].notes[deleted.key];
        if (existing && existing.session === deleted.session && existing.number <= deleted.number) {
          delete stored[site].notes[deleted.key];
        }
      }
      for (const note of response.sites[site].notes) {
        const existing = stored[site].notes[note.key];
        if (!existing) {
          stored[site].notes[note.key] = note;
        }
      }
    }
    await SiteNotes.STORAGE.set(stored);
  };

  const processWriteResponse = async (response, url, key) => {
    if (response.conflict) {
      const stored = (await SiteNotes.STORAGE.get(url) || {})[url];
      if (stored && stored.notes[key]) {
        SiteNotes.STORAGE.set({
          [url]: {
            ...stored,
            notes: {
              ...stored.notes,
              [response.conflict.key]: response.conflict,
            },
          }
        });
      }
    }

    await SiteNotes.STORAGE.set({ [SiteNotes.SETTINGS_KEYS.LAST_NOTE_ID]: response.since });
  };

  SiteNotes.API = {
    refreshAllFromServer: async () => {
      try {
        const since = (await SiteNotes.STORAGE.get(SiteNotes.SETTINGS_KEYS.LAST_NOTE_ID) || {})[SiteNotes.SETTINGS_KEYS.LAST_NOTE_ID] || 0;
        const response = (await fetch(`${API_URL}get?since=${since}&siteUrl=fake6.com`, { method: 'GET', ...OPTS, })).json();
        //await saveChanges(response);
      } catch (e) {
        console.error(e);
      }
    },

    refreshFromServer: async (siteUrl, pageUrl) => {
      try {
        const since = (await SiteNotes.STORAGE.get(SiteNotes.SETTINGS_KEYS.LAST_NOTE_ID) || {})[SiteNotes.SETTINGS_KEYS.LAST_NOTE_ID] || 0;
        const response = (await fetch(
          `${API_URL}/get?since=${since}&siteUrl=${encodeURIComponent(siteUrl)}&pageUrl=${encodeURIComponent(pageUrl)}`,
          { method: 'GET', ...OPTS, }
        )).json();
        //await saveChanges(response);
      } catch (e) {
        console.error(e);
      }
    },

    upsertNote: async (url, title, titleUrl, key, text, session, number) => {
      const response = (await fetch(
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
            number: number + 1,
          }),
        }
      )).json();

      await processWriteResponse(response);
    },

    deleteNote: async (url, key, session, number) => {
      const response = (await fetch(
        `${API_URL}/delete`,
        {
          method: 'POST',
          ...OPTS,
          body: JSON.stringify({
            key,
            text,
            session,
            number,
          }),
        }
      )).json();

      await processWriteResponse(response);
    },
  };

  SiteNotes.API.refreshAllFromServer();
})();
