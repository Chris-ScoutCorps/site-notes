'use strict';

(function initSearch() {
  async function clean() {
    const stored = await SiteNotes.SiteNotes.STORAGE.get();
    for (const site of Object.keys(stored)) {
      if (site.startsWith('sorts|') && !stored[site].length) {
        SiteNotes.STORAGE.remove(site);
      }
      if (!site.startsWith('sorts|') && !Object.keys(stored[site]).length) {
        SiteNotes.STORAGE.remove(site);
      }
    }
  }

  const MAX_RESULTS = 100;

  async function getSearchResults(search) {
    if (!search) {
      return;
    }
    //alert(e.target.value)
    //await clean();

    let more = false;
    let results = [];
    const stored = await SiteNotes.STORAGE.get();

    for (const site of Object.keys(stored)) {
      if (!site.startsWith('sorts|')) {
        const lsite = site.toLowerCase();
        if (lsite.includes(search) || (stored[site]['title'] || '').toLowerCase().includes(search)) {
          for (const note of Object.values(stored[site])) {
            if (!note.note) { continue; }
            const lnote = note.note.toLowerCase();
            results.push({
              site,
              title: stored[site]['title'],
              note: note,
              score: 3 + (lsite.startsWith(search) || lsite.startsWith('www.' + search) ? 1 : 0) + (lnote.startsWith(search) ? 2 : lnote.includes(search) ? 1 : 0),
            });
          }
        } else {
          for (const i in stored['sorts|' + site]) {
            const uuid = stored['sorts|' + site][i];
            const note = stored[site][uuid];
            if (!note.note) { continue; }
            const lnote = note.note.toLowerCase();
            if (lnote.includes(search)) {
              const order = 1 - (i / Object.keys(stored[site]).length);
              results.push({
                site,
                title: stored[site]['title'],
                note,
                score: (lnote.startsWith(search) ? 2 : lnote.includes(search) ? 1 : 0) + order,
              });
            }
          }
        }

        if (results.length > MAX_RESULTS && search.length <= 3) {
          more = true;
          break;
        }
      }
    }

    if (results.length > MAX_RESULTS) {
      more = true;
      results = results.slice(0, MAX_RESULTS);
    }

    results.sort((a, b) => b.score - a.score);

    return results;
  }

  const SEARCH_TXT = document.getElementById('search-txt');
  const SEARCH_RESULTS = document.getElementById('search-results');

  SEARCH_TXT.value = '';
  SEARCH_TXT.addEventListener('keyup', (e) => {
    SiteNotes.debounce("search", async () => {
      const search = e.target.value.toLowerCase();
      const results = await getSearchResults(search);

      if (search && !results.length) {
        SEARCH_RESULTS.innerText = `No results for "${search}"`;
      } else {
        SEARCH_RESULTS.innerHTML = '';
      }

      let lastSite = null;
      let list = null;
      for (const result of (results || [])) {
        if (lastSite !== result.site) {
          const link = document.createElement('a');
          link.target = '_blank';
          link.href = 'http://' + result.site;
          const header = document.createElement('h4');
          header.innerText = result.site;
          list = document.createElement('ul');
          link.appendChild(header);
          const title = document.createElement('i');
          title.innerText = result.title;
          SEARCH_RESULTS.appendChild(link);
          SEARCH_RESULTS.appendChild(title);
          SEARCH_RESULTS.appendChild(list);
        }
        lastSite = result.site;

        const item = document.createElement('li');
        item.innerText = result.note.note;
        item.title = `Created ${result.note.created} | Updated: ${result.note.updated || '--'}`;
        list.appendChild(item);
      }
    });
  });
})();
