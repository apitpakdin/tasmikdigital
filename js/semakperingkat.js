/* ================================================================
   SEMAK PERINGKAT — guru kelas / penyelaras sahkan murid yang data
   peringkatnya bercanggah (cth jenis "Al-Quran" tetapi peringkat Iqra,
   kesan pepijat borang dalam sistem lama). Tiada perubahan automatik.
   ================================================================ */
var SemakPeringkat = (function () {
  var esc = UI.esc, ikon = UI.ikon;

  function senarai() {
    var dlm = App.pentadbir() ? App.DB.murid.filter(function (m) { return m.status === 'Aktif'; }) : App.muridSaya(true).filter(function (m) {
      return App.kelasSaya().indexOf(m.darjah + '|' + m.kelas) >= 0;
    });
    if (App.skop) dlm = dlm.filter(function (m) { return m.darjah + '|' + m.kelas === App.skop; });
    return dlm.filter(function (m) { return m.semakPeringkat; })
      .sort(function (a, b) { return (a.darjah + a.kelas).localeCompare(b.darjah + b.kelas) || a.nama.localeCompare(b.nama); });
  }
  function bilangan() { return senarai().length; }

  function papar(el, segar) {
    var list = senarai();
    el.innerHTML = '<section class="kad"><div class="kad-kepala"><h2>' + ikon('alert') + ' Semak peringkat bacaan</h2>' + UI.lencana(list.length + ' murid', list.length ? 'warn' : 'ok') + '</div>' +
      '<p class="lembut">Murid di bawah mempunyai data peringkat yang <b>bercanggah</b> daripada sistem lama, contohnya jenis bacaan tercatat "Al-Quran" tetapi peringkat Iqra. ' +
      'Sistem lama ada pepijat yang menyimpan jenis bacaan murid sebelumnya, jadi data ini tidak boleh dipercayai. Pilih bacaan <b>sebenar</b> setiap murid, kemudian tekan <b>Sahkan</b>.</p></section>' +
      (list.length ? list.map(function (m) {
        var s = m.semakPeringkat;
        var akhirQ = (s.bukti || []).filter(function (r) { return /^Al-Quran/i.test(r.label || ''); })[0];
        return '<section class="kad semak-p" data-m="' + esc(m.id) + '"><div class="kad-kepala murid-kepala"><span class="avatar">' + esc(UI.inisial(m.nama)) + '</span>' +
          '<div><h3>' + esc(m.nama) + '</h3><p class="lembut">' + esc(App.labelKelasPenuh(m.darjah + '|' + m.kelas)) + ' · Data sekarang: ' + esc((m.jenis || '—') + ' / ' + (m.peringkat || 'kosong') + ' / m/s ' + (m.mukaSurat || 0)) + '</p></div></div>' +
          '<p class="kecil">' + ikon('info') + ' ' + esc(s.sebab) + '</p>' +
          ((s.bukti || []).length ? '<div class="jadual-wrap"><table class="jadual kecil"><thead><tr><th>Sesi terakhir</th><th>Bacaan tercatat</th><th>M/S</th><th>Guru</th></tr></thead><tbody>' +
            s.bukti.map(function (r) { return '<tr><td>' + esc(UI.tarikh(r.tarikh)) + '</td><td>' + esc(r.label) + '</td><td>' + esc(r.dari + '–' + r.ke) + '</td><td>' + esc(r.guru) + '</td></tr>'; }).join('') +
            '</tbody></table></div>' : '<p class="lembut kecil">Tiada sesi tasmik direkodkan.</p>') +
          '<div class="semak-p-pilih"><div class="segmen" role="radiogroup" aria-label="Bacaan sebenar">' + D.JENIS.map(function (j) {
            return '<button type="button" role="radio" data-j="' + j + '" aria-checked="false">' + esc(j) + '</button>';
          }).join('') + '</div>' +
          '<label class="medan" data-per hidden><span>Peringkat</span><select>' + D.IQRA_SAHAJA.map(function (p) { return '<option' + (m.peringkat === p ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select></label>' +
          '<label class="medan" data-ms hidden><span>Muka surat terakhir dibaca</span><input type="number" inputmode="numeric" min="0" max="604" value="' + esc(m.mukaSurat || 0) + '" data-asal="' + esc(m.mukaSurat || 0) + '" data-quran="' + esc(akhirQ ? akhirQ.ke : (m.mukaSurat || 0)) + '"></label>' +
          '<button class="btn btn-utama" data-sahkan disabled>' + ikon('check') + ' Sahkan</button></div></section>';
      }).join('') : '<section class="kad">' + UI.kosong('check', 'Tiada murid perlu disemak', 'Semua data peringkat bacaan dalam kelas ini konsisten.') + '</section>');

    UI.$$('.semak-p', el).forEach(function (kad) {
      var pilih = null;
      UI.$$('[data-j]', kad).forEach(function (b) {
        b.addEventListener('click', function () {
          pilih = b.dataset.j;
          UI.$$('[data-j]', kad).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
          UI.$('[data-per]', kad).hidden = pilih === 'Al-Quran';
          UI.$('[data-ms]', kad).hidden = false;
          var ms = UI.$('[data-ms] input', kad);
          ms.value = pilih === 'Al-Quran' ? ms.dataset.quran : ms.dataset.asal;
          UI.$('[data-sahkan]', kad).disabled = false;
        });
      });
      UI.$('[data-sahkan]', kad).addEventListener('click', function () {
        var m = App.DB.murid.filter(function (x) { return x.id === kad.dataset.m; })[0];
        var ms = parseInt(UI.$('[data-ms] input', kad).value, 10) || 0;
        var per = pilih === 'Al-Quran' ? 'Al-Quran' : UI.$('[data-per] select', kad).value;
        var patch = { jenis: pilih, peringkat: per, mukaSurat: ms, iqraLabel: D.labelBacaan(pilih, per, ms || 1, ms || 1) };
        Sync.tulis([{ op: 'update', table: 'Murid', id: m.id, patch: patch }], 'sahkan peringkat');
        delete m.semakPeringkat; App.simpanDB(); App.bina();
        UI.toast(UI.namaPendek(m.nama) + ': ' + (pilih === 'Al-Quran' ? 'Al-Quran m/s ' + ms : per + ' m/s ' + ms), 'ok');
        segar();
      });
    });
  }

  return { papar: papar, bilangan: bilangan };
})();
