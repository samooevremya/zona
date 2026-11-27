(() => {
  const views = ['window', 'platform', 'bridge'];
  const key = 'merzlota.nextStationView';
  let index = 0;
  try {
    const next = localStorage.getItem(key);
    index = Math.max(0, views.indexOf(next));
    localStorage.setItem(key, views[(index + 1) % views.length]);
  } catch {
    // A storage-restricted browser can still load the game.
  }
  document.documentElement.dataset.stationView = views[index];
})();
