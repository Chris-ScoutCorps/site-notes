'use strict';

async function clean() {
  const stored = await STORAGE.get();
  for (const site of Object.keys(stored)) {
    if (site.startsWith('sorts|') && !stored[site].length) {
      STORAGE.remove(site);
    }
    if (!site.startsWith('sorts|') && !Object.keys(stored[site]).length) {
      STORAGE.remove(site);
    }
  }
}

const MAX_RESULTS = 10;

async function getSearchResults(search) {
  if (!search) {
    return;
  }
  //alert(e.target.value)
  //await clean();

  let more = false;
  let results = [];
  const stored = await STORAGE.get();

  for (const site of Object.keys(stored)) {
    if (!site.startsWith('sorts|')) {
      if (site.toLowerCase().includes(search)) {
        for (const note of Object.values(stored[site])) {
          results.push({
            site,
            note,
            score: 3 + (site.toLowerCase().startsWith(search) ? 1 : 0) + (note.startsWith(search) ? 2 : note.includes(search) ? 1 : 0),
          });
        }
      } else {
        for (const i in stored['sorts|' + site]) {
          const uuid = stored['sorts|' + site][i];
          const note = stored[site][uuid];
          if (note.includes(search)) {
            const order = 1 - (i / Object.keys(stored[site]).length);
            results.push({
              site,
              note,
              score: (note.startsWith(search) ? 2 : note.includes(search) ? 1 : 0) + order,
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

document.getElementById('search-txt').value = '';

document.getElementById('search-txt').addEventListener('keyup', (e) => {
  debounce("search", async () => {
    const search = e.target.value.toLowerCase();
    const results = await getSearchResults(search);
    //alert(JSON.stringify(results));
  });
});
