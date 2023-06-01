'use strict';

(function initSearch() {
  const MAX_RESULTS = 100;

  async function getSearchResults(search, targets) {
    let more = false;
    let results = [];

    if (!search) {
      return { results, more };
    }

    const stored = await SiteNotes.STORAGE.get();

    for (const site of Object.keys(stored)) {
      const lsite = site.toLowerCase();
      if (lsite.includes(search) || (stored[site].title || '').toLowerCase().includes(search)) {
        for (const i in stored[site].sorts) {
          const uuid = stored[site].sorts[i];
          const note = stored[site].notes[uuid];
          const lnote = (note.text || '').toLowerCase();
          const order = 1 - (i / Object.keys(stored[site].notes).length);
          results.push({
            site,
            title: stored[site].title,
            note,
            score: 3 + (lsite.startsWith(search) || lsite.startsWith('www.' + search) ? 1 : 0) + (lnote.startsWith(search) ? 2 : lnote.includes(search) ? 1 : 0) + order,
          });
        }
      } else if (targets === 'all') {
        for (const i in stored[site].sorts) {
          const uuid = stored[site].sorts[i];
          const note = stored[site].notes[uuid];
          const lnote = (note.text || '').toLowerCase();
          if (lnote.includes(search)) {
            const order = 1 - (i / Object.keys(stored[site].notes).length);
            results.push({
              site,
              title: stored[site].title,
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

    if (results.length > MAX_RESULTS) {
      more = true;
      results = results.slice(0, MAX_RESULTS);
    }

    results.sort((a, b) => b.score - a.score);

    return { results, more };
  }

  const SEARCH_TXT = document.getElementById('search-txt');
  const SEARCH_RESULTS = document.getElementById('search-results');

  const handleSearch = (_) => {
    SiteNotes.debounce("search", async () => {
      const search = document.getElementById('search-txt').value.toLowerCase();
      const targets = document.querySelectorAll('[name="search-targets"]:checked')[0].value;
      const results = await getSearchResults(search, targets);

      if (search && !results.results.length) {
        SEARCH_RESULTS.innerText = `No results for "${search}"`;
      } else if (search && results.results.length && results.more) {
        SEARCH_RESULTS.innerText = `Showing first ${MAX_RESULTS} results`;
      } else {
        SEARCH_RESULTS.innerHTML = '';
      }

      let lastSite = null;
      let list = null;
      for (const result of (results.results || [])) {
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
        item.innerText = result.note.text;
        item.title = `Created ${result.note.created} | Updated: ${result.note.updated || '--'}`;
        list.appendChild(item);
      }
    });
  };

  SEARCH_TXT.value = '';
  SEARCH_TXT.addEventListener('keyup', handleSearch);
  document.getElementsByName('search-targets').forEach(t => t.addEventListener('change', handleSearch));
})();
