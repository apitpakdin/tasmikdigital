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
    return { rekod: rekod, khatam: khatam, kbs: kbs, guru: guru, penyedia: calonPenyedia(m, rekod) };
  }

  /* Calon "Disediakan oleh": guru kelas murid dahulu, kemudian guru yang pernah
     mentasmik murid ini, akhir sekali pengguna yang sedang log masuk. */
  function calonPenyedia(m, rekod) {
    var out = [], ada = {};
    var bil = {}; rekod.forEach(function (r) { bil[r.guruId] = (bil[r.guruId] || 0) + 1; });
    App.DB.guru.filter(function (g) {
      return g.status === 'Aktif' && (g.peranan === 'guru' || g.peranan === 'penyelaras') &&
        (g.senaraiKelas || []).some(function (k) { return k.darjah === m.darjah && k.kelas === m.kelas; });
    }).sort(function (a, b) { return (bil[b.id] || 0) - (bil[a.id] || 0); }).forEach(function (g) {
      ada[g.id] = 1; out.push({ id: g.id, nama: g.nama, jawatan: 'Guru Kelas ' + m.darjah + ' ' + m.kelas });
    });
    Object.keys(bil).sort(function (a, b) { return bil[b] - bil[a]; }).forEach(function (id) {
      var g = App.DB.guru.filter(function (x) { return x.id === id && x.status === 'Aktif' && x.peranan !== 'superadmin'; })[0];
      if (g && !ada[g.id]) { ada[g.id] = 1; out.push({ id: g.id, nama: g.nama, jawatan: 'Guru Tasmik' }); }
    });
    if (!ada[App.user.id]) out.push({ id: App.user.id, nama: App.user.nama, jawatan: App.NAMA_PERANAN[App.user.peranan] });
    // Lalai: pengguna semasa jika dia guru kelas/tasmik murid ini, jika tidak guru kelas pertama
    var lalai = out.filter(function (x) { return x.id === App.user.id && x.jawatan !== App.NAMA_PERANAN[App.user.peranan]; })[0] || out[0];
    return { senarai: out, lalai: lalai.id };
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
        amaranSediaan(c) +
        '<form class="borang"><div class="baris-medan"><label class="medan"><span>Disediakan oleh</span><select id="trPenyedia">' + d.penyedia.senarai.map(function (p) {
          return '<option value="' + esc(p.id) + '"' + (p.id === d.penyedia.lalai ? ' selected' : '') + '>' + esc(p.nama + ' — ' + p.jawatan) + '</option>';
        }).join('') + '</select></label>' +
        '<label class="medan"><span>Tarikh transkrip</span><input type="date" id="trTarikh" value="' + tarikhTempatan(new Date()) + '" required></label></div>' +
        '<label class="medan"><span>Ulasan guru (pilihan — dicetak pada transkrip)</span><textarea id="trUlasan" rows="3" maxlength="500" placeholder="cth: Murid lancar membaca, perlu bimbingan tajwid mad."></textarea></label>' +
        (m.status === 'Pindah' ? '' : '<p class="lembut kecil">' + ikon('info') + ' Murid ini belum ditanda "Pindah". Transkrip tetap boleh dicetak sebagai rekod semasa.</p>') + '</form>',
      kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-utama" id="trCetak">' + ikon('printer') + ' Cetak / Simpan PDF</button>'
    });
    var ke = UI.$('[data-ke-tetapan]', md);
    if (ke) ke.addEventListener('click', function () { md.tutup(); App.pergi('tetapan'); setTimeout(function () { var l = UI.$('#logoSekolah'); if (l) l.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300); });
    UI.$('#trCetak', md).addEventListener('click', function () {
      var ulasan = UI.$('#trUlasan', md).value.trim();
      var t = UI.$('#trTarikh', md).value;
      var pid = UI.$('#trPenyedia', md).value;
      var penyedia = d.penyedia.senarai.filter(function (p) { return p.id === pid; })[0];
      md.tutup();
      cetak(m, ulasan, t ? new Date(t + 'T12:00:00') : new Date(), penyedia);
    });
  }

  function tarikhTempatan(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* Amaran jika logo / nama GB / jawatan belum diisi */
  function amaranSediaan(c) {
    var tiada = [];
    if (!c.logo) tiada.push('logo sekolah');
    if (!c.namaGB) tiada.push('nama Guru Besar');
    if (!c.alamat) tiada.push('alamat sekolah');
    if (!tiada.length) return '';
    return '<div class="amaran-kotak">' + ikon('alert') + '<div><b>Belum ditetapkan: ' + esc(tiada.join(', ')) + '</b><p>' +
      (App.pentadbir() ? 'Transkrip rasmi patut mempunyai maklumat ini. <button type="button" class="pautan" data-ke-tetapan>' + ikon('settings') + ' Isi di Tetapan sekolah</button>'
        : 'Minta penyelaras mengisinya di Tetapan → Tetapan sekolah. Ruang berkaitan akan dibiarkan kosong.') + '</p></div></div>';
  }

  function cetak(m, ulasan, tarikhDok, penyedia) {
    var d = data(m), c = App.DB.config, kini = new Date();
    penyedia = penyedia || d.penyedia.senarai.filter(function (p) { return p.id === d.penyedia.lalai; })[0];
    tarikhDok = tarikhDok || kini;
    var tarikhTeks = UI.tarikh(tarikhDok.toISOString(), true);
    var jawatan = c.jawatanGB || 'Guru Besar';
    var k = D.kemajuan(m);
    var tahun = tarikhDok.getFullYear();
    var rujukan = 'TD/' + (API.sekolah.kod || '') + '/' + tahun + '/' + String(m.id).slice(-6).toUpperCase();
    var jum = d.rekod.reduce(function (s, r) { return s + (parseInt(r.jumlah, 10) || 0); }, 0);
    var kualiti = {}; D.KUALITI.forEach(function (q) { kualiti[q.label] = 0; });
    d.rekod.forEach(function (r) { var q = D.kualiti(r.kualiti).label; kualiti[q] = (kualiti[q] || 0) + 1; });
    var akhir = d.rekod.slice(-10).reverse();
    var tahapBaca = m.peringkat === 'Khatam' ? 'Khatam Al-Quran' : m.peringkat === 'Al-Quran' ? 'Al-Quran — Juzuk ' + D.juzuk(m.mukaSurat || 1) + ', muka surat ' + (m.mukaSurat || 1) : (m.peringkat || 'Iqra 1') + ' (' + (m.jenis || 'Iqra Baru') + '), muka surat ' + (m.mukaSurat || '—');

    var html = '<div class="halaman-cetak transkrip">' + Cetak.kop() +
      '<h2 class="tajuk-laporan">Transkrip Pencapaian Bacaan Al-Quran dan Amali Solat</h2>' +
      '<p class="sub-laporan">No. Rujukan: ' + esc(rujukan) + ' &nbsp;·&nbsp; Tarikh: ' + esc(tarikhTeks) + '</p>' +

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

      '<div class="tandatangan tiga"><div><p>Disediakan oleh:</p><span class="garis"></span><b>' + esc(penyedia.nama) + '</b><small>' + esc(penyedia.jawatan) + '</small><small>' + esc(c.namaSekolah || '') + '</small><small>Tarikh: ' + esc(tarikhTeks) + '</small></div>' +
      '<div><p>Disahkan oleh:</p><span class="garis"></span><b>' + (c.namaGB ? esc(c.namaGB) : '(................................................)') + '</b><small>' + esc(jawatan) + '</small><small>' + esc(c.namaSekolah || '') + '</small><small>Tarikh: ' + esc(tarikhTeks) + '</small></div>' +
      '<div class="cop" aria-hidden="true"></div></div></div>' +
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
