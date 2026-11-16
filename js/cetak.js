/* ================================================================
   CETAK — laporan rasmi (PDF melalui cetakan pelayar) & slip QR
   ================================================================ */
var Cetak = (function () {
  var esc = UI.esc;
  var QR_LIB = 'vendor/qrcode.js';
  var XLSX_LIB = 'vendor/xlsx.full.min.js';

  function kawasan() {
    var el = document.getElementById('cetak');
    if (!el) { el = document.createElement('div'); el.id = 'cetak'; document.body.appendChild(el); }
    return el;
  }
  function kop() {
    var c = App.DB.config;
    // Hanya logo sebenar dicetak — tiada huruf ganti jika logo belum dimuat naik
    // Nama & alamat dalam HURUF BESAR; setiap baris alamat (dari Tetapan) dicetak pada baris sendiri
    var alamat = String(c.alamat || '').split(/\r?\n/).map(function (b) { return b.trim(); }).filter(Boolean);
    return '<header class="kop">' + (c.logo ? '<img class="logo" src="' + esc(c.logo) + '" alt="">' : '') +
      '<div><h1>' + esc(String(c.namaSekolah || API.sekolah.nama).toUpperCase()) + '</h1>' +
      alamat.map(function (b) { return '<p>' + esc(b.toUpperCase()) + '</p>'; }).join('') + '</div></header>';
  }
  /* Margin halaman ditetapkan 0 supaya pelayar TIDAK mencetak header/footer
     (alamat laman, tarikh, nombor halaman). Ruang tepi dibuat semula di sini:
     thead/tfoot kosong diulang pada setiap halaman = margin atas & bawah. */
  function bingkai(isi) {
    return '<table class="bingkai-cetak"><thead><tr><td></td></tr></thead><tfoot><tr><td></td></tr></tfoot><tbody><tr><td>' + isi + '</td></tr></tbody></table>';
  }

  function cetakSekarang(el) {
    document.body.classList.add('mod-cetak');
    var selesai = function () { document.body.classList.remove('mod-cetak'); el.innerHTML = ''; window.removeEventListener('afterprint', selesai); };
    window.addEventListener('afterprint', selesai);
    setTimeout(function () { window.print(); setTimeout(function () { if (document.body.classList.contains('mod-cetak') && !matchMedia('print').matches) selesai(); }, 1500); }, 250);
  }

  /* Laporan berjadual dengan ruang tandatangan */
  function laporan(o) {
    var el = kawasan();
    var c = App.DB.config;
    el.innerHTML = bingkai('<div class="halaman-cetak">' + kop() +
      '<h2 class="tajuk-laporan">' + esc(o.tajuk) + '</h2>' + (o.sub ? '<p class="sub-laporan">' + esc(o.sub) + '</p>' : '') +
      '<table class="jadual-cetak"><thead><tr>' + o.headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      (o.rows.length ? o.rows.map(function (r) { return '<tr>' + r.map(function (v) { return '<td>' + esc(v) + '</td>'; }).join('') + '</tr>'; }).join('') : '<tr><td colspan="' + o.headers.length + '">Tiada data</td></tr>') +
      '</tbody></table>' +
      '<div class="tandatangan"><div><p>Disediakan oleh:</p><span class="garis"></span><b>' + esc(App.user.nama) + '</b><small>' + esc(App.NAMA_PERANAN[App.user.peranan]) + '</small></div>' +
      '<div><p>Disahkan oleh:</p><span class="garis"></span><b>' + esc(c.namaGB || '') + '</b><small>' + esc(c.jawatanGB || 'Guru Besar') + '</small><small>' + esc(c.namaSekolah || '') + '</small><small>Tarikh: ' + esc(UI.tarikh(new Date().toISOString(), true)) + '</small></div></div>' +
      '<footer class="kaki-cetak">Dijana melalui Tasmik Digital pada ' + esc(UI.tarikh(new Date().toISOString(), true) + ', ' + UI.masa(new Date().toISOString())) + '</footer></div>');
    cetakSekarang(el);
  }

  function pautanIbuBapa(kod) {
    var base = location.origin + location.pathname.replace(/index\.html$/, '');
    return base + '?s=' + encodeURIComponent(API.sekolah.kod) + '&ib=' + encodeURIComponent(kod);
  }

  /* Slip QR ibu bapa — 10 slip satu muka A4 */
  function slip(murid) {
    var list = murid.filter(function (m) { return m.kodIbuBapa; });
    if (!list.length) return UI.toast('Tiada kod ibu bapa untuk murid ini. Minta penyelaras jana kod.', 'warn');
    UI.toast('Menyediakan ' + list.length + ' slip…');
    return UI.muatSkrip(QR_LIB).then(function () {
      var el = kawasan();
      var c = App.DB.config;
      var nama = c.namaSekolah || API.sekolah.nama;
      el.innerHTML = bingkai('<div class="slip-grid">' + list.map(function (m, i) {
        return '<article class="slip"><div class="slip-kepala">' + (c.logo ? '<img class="logo" src="' + esc(c.logo) + '" alt="">' : '') + '<div><b>' + esc(nama) + '</b><span>Kemajuan Bacaan Al-Quran</span></div></div>' +
          '<div class="slip-isi"><div class="slip-qr" id="qr' + i + '"></div><div><p class="slip-nama">' + esc(m.nama) + '</p><p>' + esc(App.labelKelasPenuh(m.darjah + '|' + m.kelas)) + '</p>' +
          '<p class="slip-arah">Imbas kod QR untuk lihat kemajuan bacaan anak anda.</p><p class="slip-kod">Kod: <b>' + esc(m.kodIbuBapa) + '</b></p></div></div></article>';
      }).join('') + '</div>');
      list.forEach(function (m, i) {
        /* global qrcode */
        var qr = qrcode(0, 'M');
        qr.addData(pautanIbuBapa(m.kodIbuBapa));
        qr.make();
        document.getElementById('qr' + i).innerHTML = qr.createSvgTag(4, 0);
      });
      cetakSekarang(el);
    }).catch(function () { UI.toast('Gagal menjana QR — muat semula aplikasi.', 'err'); });
  }

  function excel(namaFail, helaian) {
    return UI.muatSkrip(XLSX_LIB).then(function () {
      /* global XLSX */
      var wb = XLSX.utils.book_new();
      helaian.forEach(function (h) {
        var ws = XLSX.utils.aoa_to_sheet([h.headers].concat(h.rows));
        ws['!cols'] = h.headers.map(function (x, i) {
          var w = Math.max(String(x).length, ...h.rows.slice(0, 200).map(function (r) { return String(r[i] === undefined ? '' : r[i]).length; }));
          return { wch: Math.min(48, Math.max(8, w + 2)) };
        });
        XLSX.utils.book_append_sheet(wb, ws, h.nama.slice(0, 31));
      });
      XLSX.writeFile(wb, namaFail);
    }).catch(function () { UI.toast('Gagal memuatkan modul Excel — muat semula aplikasi.', 'err'); });
  }

  return { kop: kop, kawasan: kawasan, bingkai: bingkai, cetakSekarang: cetakSekarang, laporan: laporan, slip: slip, excel: excel, pautanIbuBapa: pautanIbuBapa, XLSX_LIB: XLSX_LIB, QR_LIB: QR_LIB };
})();
