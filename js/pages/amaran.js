/* AMARAN — murid tanpa rekod tasmik */
(function () {
  var esc = UI.esc, ikon = UI.ikon;
  var pilihan = 0;

  function papar(el) {
    var def = parseInt(App.DB.config.alertDays || '7', 10) || 7;
    var hari = pilihan || def;
    var list = App.muridSaya().map(function (m) { var r = App.rekodAkhir(m.id); return { m: m, r: r, n: r ? UI.hariLalu(r.tarikh) : 999 }; })
      .filter(function (x) { return hari === -1 ? x.n >= 999 : x.n > hari; })
      .sort(function (a, b) { return b.n - a.n || a.m.nama.localeCompare(b.m.nama); });

    el.innerHTML = '<section class="kad"><div class="kad-kepala"><h2>Murid perlu perhatian</h2>' + UI.lencana(list.length + ' murid', list.length ? 'warn' : 'ok') + '</div>' +
      '<div class="cip-baris" role="group" aria-label="Tempoh">' + [[def, def + ' hari'], [14, '14 hari'], [30, '30 hari'], [-1, 'Belum pernah']].filter(function (x, i, a) { return a.findIndex(function (y) { return y[0] === x[0]; }) === i; }).map(function (x) {
        return '<button class="cip' + (hari === x[0] ? ' aktif' : '') + '" data-h="' + x[0] + '">' + esc(x[1]) + '</button>';
      }).join('') + '</div>' +
      '<div class="kad-badan">' + (list.length ? '<ul class="senarai">' + list.map(function (x) {
        return '<li class="baris">' + Kom.avatar(x.m) + '<div class="baris-isi"><b>' + esc(UI.namaPendek(x.m.nama)) + '</b><span>' + esc(App.labelKelasPenuh(x.m.darjah + '|' + x.m.kelas) + ' · ' + D.kemajuan(x.m).kedudukan) + '</span></div>' +
          UI.lencana(x.n >= 999 ? 'Belum ada rekod' : x.n + ' hari', x.n > 14 ? 'bad' : 'warn') +
          (App.bolehTulis() ? '<a class="btn btn-ghost btn-kecil" href="#/rekod/' + esc(x.m.id) + '">' + ikon('book') + ' Rekod</a>' : '') + '</li>';
      }).join('') + '</ul>' : UI.kosong('check', 'Tiada murid memerlukan perhatian', 'Semua murid telah ditasmik dalam tempoh ini.')) + '</div></section>';
    UI.$$('[data-h]', el).forEach(function (b) { b.addEventListener('click', function () { pilihan = parseInt(b.dataset.h, 10); papar(el); }); });
  }

  App.daftar('amaran', { papar: papar });
})();
