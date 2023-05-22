'use strict';

async function clean() {
  let stored = await STORAGE.get();
  for (let site of Object.keys(stored)) {
    if (site.startsWith('sorts|') && !stored[site].length) {
      STORAGE.remove(site);
    }
    if (!site.startsWith('sorts|') && !Object.keys(stored[site]).length) {
      STORAGE.remove(site);
    }
  }
}

document.getElementById('search-txt').value = '';

document.getElementById('search-txt').addEventListener('keyup', (e) => {
  debounce("search", async () => {
    let search = e.target.value.toLowerCase();
    if (!search) {
      return;
    }
    //alert(e.target.value)
    //await clean();

    let results = [];
    let stored = await STORAGE.get();
    for (let site of Object.keys(stored)) {
      if (!site.startsWith('sorts|')) {
        if (site.toLowerCase().includes(search)) {
          for (let note of Object.values(stored[site])) {
            results.push({
              site,
              note,
              score: 3 + (site.toLowerCase().startsWith(search) ? 1 : 0) + (note.startsWith(search) ? 2 : note.includes(search) ? 1 : 0),
            });
          }
        } else {
          for (let note of Object.values(stored[site])) {
            if (note.includes(search)) {
              results.push({
                site,
                note,
                score: note.startsWith(search) ? 2 : note.includes(search) ? 1 : 0,
              });
            }
          }
        }
      }
    }
    
    //alert(JSON.stringify(results));
  });
});
