/* ================================================================
   TRANSKRIP MURID — dokumen rasmi untuk murid berpindah
   Status bacaan Iqra/Al-Quran + Kem Bestari Solat + pengesahan GB
   ================================================================ */
var Transkrip = (function () {
  var esc = UI.esc, ikon = UI.ikon;

  function data(m) {
    var rekod = App.DB.rekod.filter(function (r) { return r.muridId === m.id; }).sort(function (a, b) { return new Date(a.tarikh) - new Date(b.tarikh); });
    var khatam = App.DB.khatam.filter(function (k) { return k.muridId === m.id; }).sort(function (a, b) { return (a.bilangan || 0) - (b.bilangan || 0); });
    var kbs = App.DB.kbs.filter(function (k) { return k.muridId === m.id && k.status; });
    var guru = App.DB.guru.filter(function (g) {
      return g.peranan === 'guru' && (g.senaraiKelas || []).some(function (k) { return k.darjah === m.darjah && k.kelas === m.kelas; });
    }).map(function (g) { return g.nama; });
    return { rekod: rekod, khatam: khatam, kbs: kbs, guru: guru };
  }

  /* Peringkat Iqra / Al-Quran: Selesai · Sedang · Belum + tarikh */
  function peringkat(m, rekod) {
    var kini = D.PERINGKAT.indexOf(m.peringkat || 'Iqra 1');
    return D.PERINGKAT.slice(0, 7).map(function (p, i) {
      var rs = rekod.filter(function (r) { return r.peringkat === p; });
      var status = i < kini || m.peringkat === 'Khatam' ? 'Selesai' : i === kini ? 'Sedang dibaca' : 'Belum';
      return { p: p, status: status, mula: rs[0] ? rs[0].tarikh : '', akhir: rs.length ? rs[rs.length - 1].tarikh : '', sesi: rs.length };
    });
  }

  function buka(m) {
    if (!m) return;
    var d = data(m), c = App.DB.config;
    var k = D.kemajuan(m);
    var md = UI.modal({
      tajuk: 'Transkrip murid', besar: true,
      isi: '<div class="profil-kepala"><span class="avatar besar">' + esc(UI.inisial(m.nama)) + '</span><div><h3>' + esc(m.nama) + '</h3><p class="lembut">' + esc(m.darjah + ' ' + m.kelas) + ' · ' + esc(m.status === 'Pindah' ? 'Berpindah' : m.status) + '</p></div></div>' +
        '<ul class="senarai-nota">' +
        '<li><b>Bacaan:</b> ' + esc(k.kedudukan) + ' (' + k.pct + '%) · ' + d.rekod.length + ' sesi tasmik' + (d.khatam.length ? ' · khatam ' + d.khatam.length + 'x' : '') + '</li>' +
        (App.modulKBS() ? '<li><b>Bestari Solat:</b> ' + (d.kbs.length ? d.kbs.filter(function (x) { return x.status === 'M'; }).length + ' item dikuasai direkodkan' : 'tiada rekod') + '</li>' : '') + '</ul>' +
        (!c.namaGB ? '<div class="amaran-kotak">' + ikon('alert') + '<div><b>Nama Guru Besar belum ditetapkan</b><p>' + (App.pentadbir() ? 'Isi di Tetapan → Tetapan sekolah supaya tercetak pada transkrip.' : 'Minta penyelaras mengisinya di Tetapan. Ruang nama akan dibiarkan kosong.') + '</p></div></div>' : '') +
        '<form class="borang"><label class="medan"><span>Ulasan guru (pilihan — dicetak pada transkrip)</span><textarea id="trUlasan" rows="3" maxlength="500" placeholder="cth: Murid lancar membaca, perlu bimbingan tajwid mad."></textarea></label>' +
        (m.status === 'Pindah' ? '' : '<p class="lembut kecil">' + ikon('info') + ' Murid ini belum ditanda "Pindah". Transkrip tetap boleh dicetak sebagai rekod semasa.</p>') + '</form>',
      kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-utama" id="trCetak">' + ikon('printer') + ' Cetak / Simpan PDF</button>'
    });
    UI.$('#trCetak', md).addEventListener('click', function () {
      var ulasan = UI.$('#trUlasan', md).value.trim();
      md.tutup();
      cetak(m, ulasan);
    });
  }

  function cetak(m, ulasan) {
    var d = data(m), c = App.DB.config, kini = new Date();
    var k = D.kemajuan(m);
    var tahun = kini.getFullYear();
    var rujukan = 'TD/' + (API.sekolah.kod || '') + '/' + tahun + '/' + String(m.id).slice(-6).toUpperCase();
    var jum = d.rekod.reduce(function (s, r) { return s + (parseInt(r.jumlah, 10) || 0); }, 0);
    var kualiti = {}; D.KUALITI.forEach(function (q) { kualiti[q.label] = 0; });
    d.rekod.forEach(function (r) { var q = D.kualiti(r.kualiti).label; kualiti[q] = (kualiti[q] || 0) + 1; });
    var akhir = d.rekod.slice(-10).reverse();
    var tahapBaca = m.peringkat === 'Khatam' ? 'Khatam Al-Quran' : m.peringkat === 'Al-Quran' ? 'Al-Quran — Juzuk ' + D.juzuk(m.mukaSurat || 1) + ', muka surat ' + (m.mukaSurat || 1) : (m.peringkat || 'Iqra 1') + ' (' + (m.jenis || 'Iqra Baru') + '), muka surat ' + (m.mukaSurat || '—');

    var html = '<div class="halaman-cetak transkrip">' + Cetak.kop() +
      '<h2 class="tajuk-laporan">Transkrip Pencapaian Bacaan Al-Quran dan Amali Solat</h2>' +
      '<p class="sub-laporan">No. Rujukan: ' + esc(rujukan) + '</p>' +

      '<table class="jadual-butiran"><tbody>' +
      baris('Nama murid', m.nama) +
      baris('Darjah / Kelas', m.darjah + ' ' + m.kelas) +
      (m.no ? baris('No. murid', m.no) : '') +
      baris('Tarikh daftar sistem', m.tarikhDaftar ? UI.tarikh(m.tarikhDaftar, true) : '—') +
      baris('Status', m.status === 'Pindah' ? 'Berpindah' + (m.tarikhPindah ? ' pada ' + UI.tarikh(m.tarikhPindah, true) : '') + (m.sekolahBaharu ? ' ke ' + m.sekolahBaharu : '') : m.status === 'Tamat' ? 'Tamat persekolahan (alumni)' : 'Masih belajar di sekolah ini') +
      baris('Guru tasmik', d.guru.join(', ') || '—') +
      '</tbody></table>' +

      '<h3 class="bahagian-cetak">Bahagian A — Status Bacaan Semasa</h3>' +
      '<table class="jadual-butiran"><tbody>' +
      baris('Tahap bacaan semasa', tahapBaca) +
      baris('Kemajuan keseluruhan', k.pct + '% (' + k.langkah + ')') +
      baris('Khatam Al-Quran', d.khatam.length ? d.khatam.map(function (x) { return 'Ke-' + x.bilangan + ' (' + UI.tarikh(x.tarikh) + ')'; }).join(', ') : 'Belum') +
      baris('Rekod tasmik', d.rekod.length + ' sesi · ' + jum + ' muka surat' + (d.rekod.length ? ' · ' + UI.tarikh(d.rekod[0].tarikh) + ' hingga ' + UI.tarikh(d.rekod[d.rekod.length - 1].tarikh) : '')) +
      baris('Penilaian keseluruhan', d.rekod.length ? D.KUALITI.map(function (q) { return q.label + ' ' + Math.round((kualiti[q.label] || 0) / d.rekod.length * 100) + '%'; }).join(' · ') : '—') +
      '</tbody></table>' +

      '<table class="jadual-cetak"><thead><tr><th>Peringkat</th><th>Status</th><th>Mula</th><th>Tamat / Terakhir</th><th>Sesi</th></tr></thead><tbody>' +
      peringkat(m, d.rekod).map(function (x) {
        return '<tr><td>' + esc(x.p) + '</td><td><b>' + esc(x.status) + '</b></td><td>' + esc(x.mula ? UI.tarikh(x.mula) : '—') + '</td><td>' + esc(x.akhir ? UI.tarikh(x.akhir) : '—') + '</td><td>' + (x.sesi || '—') + '</td></tr>';
      }).join('') + '</tbody></table>' +

      (akhir.length ? '<h4 class="sub-cetak">10 sesi tasmik terakhir</h4><table class="jadual-cetak"><thead><tr><th>Tarikh</th><th>Bacaan</th><th>M/S</th><th>Penilaian</th><th>Guru</th></tr></thead><tbody>' +
        akhir.map(function (r) { return '<tr><td>' + esc(UI.tarikh(r.tarikh)) + '</td><td>' + esc(r.iqraLabel || r.peringkat) + '</td><td>' + esc(r.dari + '–' + r.ke) + '</td><td>' + esc(D.kualiti(r.kualiti).label) + '</td><td>' + esc(r.guru || '') + '</td></tr>'; }).join('') +
        '</tbody></table>' : '') +

      (App.modulKBS() ? bahagianKBS(m, d.kbs) : '') +

      '<div class="blok-akhir"><h3 class="bahagian-cetak">' + (App.modulKBS() ? 'Bahagian C' : 'Bahagian B') + ' — Ulasan Guru</h3>' +
      '<div class="kotak-ulasan">' + (ulasan ? esc(ulasan) : '&nbsp;') + '</div>' +

      '<div class="tandatangan tiga"><div><p>Disediakan oleh:</p><span class="garis"></span><b>' + esc(App.user.nama) + '</b><small>' + esc(App.NAMA_PERANAN[App.user.peranan]) + '</small><small>Tarikh: ' + esc(UI.tarikh(kini.toISOString(), true)) + '</small></div>' +
      '<div><p>Disahkan oleh:</p><span class="garis"></span><b>' + (c.namaGB ? esc(c.namaGB) : '(................................................)') + '</b><small>Guru Besar</small><small>' + esc(c.namaSekolah || '') + '</small></div>' +
      '<div class="cop"><span>Cop rasmi sekolah</span></div></div></div>' +
      '<footer class="kaki-cetak">Transkrip ini dijana melalui sistem Tasmik Digital pada ' + esc(UI.tarikh(kini.toISOString(), true) + ', ' + UI.masa(kini.toISOString())) + ' · No. Rujukan ' + esc(rujukan) + '. Sah dengan tandatangan dan cop Guru Besar.</footer>' +
      '</div>';

    var el = Cetak.kawasan();
    el.innerHTML = html;
    Cetak.cetakSekarang(el);
  }

  function baris(l, v) { return '<tr><th>' + esc(l) + '</th><td>' + esc(v) + '</td></tr>'; }

  function bahagianKBS(m, rekod) {
    var tahunList = {};
    rekod.forEach(function (r) { tahunList[r.tahun] = 1; });
    var tahun = Object.keys(tahunList).map(Number).sort(function (a, b) { return b - a; });
    var html = '<h3 class="bahagian-cetak">Bahagian B — Kem Bestari Solat (Amali Wuduk & Solat)</h3>';
    if (!tahun.length) return html + '<p class="nota-cetak">Tiada rekod penilaian Kem Bestari Solat untuk murid ini.</p>';
    tahun.forEach(function (th) {
      var rs = rekod.filter(function (r) { return Number(r.tahun) === th; });
      var tahap = parseInt(rs[0].tahap, 10) || D.kbsTahap(m.darjah);
      var st = {}; rs.forEach(function (r) { st[r.itemId] = r.status; });
      var bahagian = D.kbsBahagian(tahap);
      var jum = 0, ok = 0;
      bahagian.forEach(function (b) { b.items.forEach(function (it) { jum++; if (st[it.id] === 'M') ok++; }); });
      html += '<h4 class="sub-cetak">Tahun ' + th + ' · Tahap ' + tahap + ' · ' + ok + '/' + jum + ' item dikuasai (' + Math.round(ok / jum * 100) + '%)</h4>' +
        '<table class="jadual-cetak kbs-cetak"><thead><tr><th>Bahagian</th><th>Dikuasai (M)</th><th>Belum (BM)</th><th>Belum dinilai</th></tr></thead><tbody>' +
        bahagian.map(function (b) {
          var mm = 0, bm = 0; b.items.forEach(function (it) { if (st[it.id] === 'M') mm++; else if (st[it.id] === 'BM') bm++; });
          return '<tr><td>' + esc(b.label) + '</td><td>' + mm + '</td><td>' + bm + '</td><td>' + (b.items.length - mm - bm) + '</td></tr>';
        }).join('') + '</tbody></table>' +
        '<div class="kbs-item-grid">' + bahagian.map(function (b) {
          return '<div><b>' + esc(b.label) + '</b><ul>' + b.items.map(function (it) {
            var v = st[it.id] || '';
            return '<li><span class="kbs-tanda ' + (v === 'M' ? 'm' : v === 'BM' ? 'bm' : '') + '">' + (v || '–') + '</span>' + esc(it.teks) + '</li>';
          }).join('') + '</ul></div>';
        }).join('') + '</div>';
    });
    return html + '<p class="nota-cetak">M = Menguasai · BM = Belum Menguasai · – = Belum dinilai</p>';
  }

  return { buka: buka, cetak: cetak };
})();
