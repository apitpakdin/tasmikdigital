/* BOOT */
(function () {
  Shell.setTema(Shell.tema());
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { Shell.setTema(Shell.tema()); });

  var q = new URLSearchParams(location.search);
  var kod = (q.get('s') || '').toUpperCase();
  var ib = q.get('ib');

  if (ib) {
    API.pilihSekolah(kod).then(function (s) {
      if (!s) { UI.$('#akar').innerHTML = '<main class="luar"><section class="luar-kad">' + UI.kosong('alert', 'Pautan tidak sah', 'Sekolah tidak dijumpai. Sila imbas semula kod QR.') + '</section></main>'; return; }
      IbuBapa.papar(ib);
    });
  } else {
    var simpan = API.sekolahDisimpan();
    var k = kod || simpan;
    if (k) Shell.mulaSekolah(k); else Shell.skrinSekolah();
  }

  // Segerak berkala bila aplikasi dibuka
  setInterval(function () { if (App.user && navigator.onLine) Sync.flush(); }, 60000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && App.user && navigator.onLine) App.muatSemula(true);
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function () { });
  }
})();
