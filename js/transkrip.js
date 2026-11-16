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

  /* "Darjah 6" → "Guru Pendidikan Islam Tahun 6" */
  function jawatanGPI(darjah) {
    var n = String(darjah || '').replace(/\D/g, '');
    return 'Guru Pendidikan Islam' + (n ? ' Tahun ' + n : '');
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
      ada[g.id] = 1; out.push({ id: g.id, nama: g.nama, jawatan: jawatanGPI(m.darjah) });
    });
    Object.keys(bil).sort(function (a, b) { return bil[b] - bil[a]; }).forEach(function (id) {
      var g = App.DB.guru.filter(function (x) { return x.id === id && x.status === 'Aktif' && x.peranan !== 'superadmin'; })[0];
      if (g && !ada[g.id]) { ada[g.id] = 1; out.push({ id: g.id, nama: g.nama, jawatan: 'Guru Pendidikan Islam' }); }
    });
    if (!ada[App.user.id]) out.push({ id: App.user.id, nama: App.user.nama, jawatan: App.NAMA_PERANAN[App.user.peranan] });
    // Lalai: pengguna semasa jika dia guru kelas/tasmik murid ini, jika tidak guru kelas pertama
    var lalai = out.filter(function (x) { return x.id === App.user.id && x.jawatan !== App.NAMA_PERANAN[App.user.peranan]; })[0] || out[0];
    return { senarai: out, lalai: lalai.id };
  }

  /* Peringkat Iqra / Al-Quran: Selesai · Sedang · Belum + tarikh */
  function peringkat(m, rekod) {
    var kini = D.PERINGKAT.indexOf(m.peringkat || 'Iqra 1');
    var baris = D.PERINGKAT.slice(0, 7).map(function (p, i) {
      var rs = rekod.filter(function (r) { return r.peringkat === p; });
      var status = i < kini || m.peringkat === 'Khatam' ? 'Selesai' : i === kini ? 'Sedang dibaca' : 'Belum';
      return { p: p, status: status, mula: rs[0] ? rs[0].tarikh : '', akhir: rs.length ? rs[rs.length - 1].tarikh : '', sesi: rs.length };
    });
    // Murid Al-Quran / Khatam: Iqra 1–6 diringkaskan kepada satu baris "Selesai"
    if (kini >= 6) {
      var iq = rekod.filter(function (r) { return /^Iqra/.test(r.peringkat || ''); });
      baris = [{ p: 'Iqra 1–6', status: 'Selesai', mula: iq[0] ? iq[0].tarikh : '', akhir: iq.length ? iq[iq.length - 1].tarikh : '', sesi: iq.length }].concat(baris.slice(6));
    }
    return baris;
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

  /* HTML satu transkrip = 2 muka surat A4 tetap:
       Halaman 1: kop, butiran murid, Bahagian A (bacaan)
       Halaman 2: Bahagian B (KBS — tahun terkini terperinci), C (ulasan), tandatangan */
  function binaHTML(m, ulasan, tarikhDok, penyedia) {
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
    var akhir = d.rekod.slice(-8).reverse();
    var tahapBaca = m.peringkat === 'Khatam' ? 'Khatam Al-Quran' : m.peringkat === 'Al-Quran' ? 'Al-Quran — Juzuk ' + D.juzuk(m.mukaSurat || 1) + ', muka surat ' + (m.mukaSurat || 1) : (m.peringkat || 'Iqra 1') + ' (' + (m.jenis || 'Iqra Baru') + '), muka surat ' + (m.mukaSurat || '—');
    var kaki = '<footer class="kaki-cetak">Dijana melalui sistem Tasmik Digital pada ' + esc(UI.tarikh(kini.toISOString(), true)) + ' · No. Rujukan ' + esc(rujukan) + '. Sah dengan tandatangan dan cop Guru Besar.</footer>';
    var huruf = App.modulKBS() ? ['B', 'C'] : ['', 'B'];

    var hal1 = '<section class="hal-transkrip">' + Cetak.kop() +
      '<h2 class="tajuk-laporan">Transkrip Pencapaian Bacaan Al-Quran dan Amali Solat</h2>' +
      '<p class="sub-laporan">No. Rujukan: ' + esc(rujukan) + ' &nbsp;·&nbsp; Tarikh: ' + esc(tarikhTeks) + '</p>' +
      '<table class="jadual-butiran"><tbody>' +
      baris('Nama murid', m.nama) +
      baris('Darjah / Kelas', m.darjah + ' ' + m.kelas) +
      (m.no ? baris('No. murid', m.no) : '') +
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
      (akhir.length ? '<h4 class="sub-cetak">Sesi tasmik terakhir</h4><table class="jadual-cetak"><thead><tr><th>Tarikh</th><th>Bacaan</th><th>M/S</th><th>Penilaian</th><th>Guru</th></tr></thead><tbody>' +
        akhir.map(function (r) { return '<tr><td>' + esc(UI.tarikh(r.tarikh)) + '</td><td>' + esc(r.iqraLabel || r.peringkat) + '</td><td>' + esc(r.dari + '–' + r.ke) + '</td><td>' + esc(D.kualiti(r.kualiti).label) + '</td><td>' + esc(r.guru || '') + '</td></tr>'; }).join('') +
        '</tbody></table>' : '') +
      kaki + '</section>';

    var hal2 = '<section class="hal-transkrip">' +
      '<p class="kepala-hal2">' + esc(m.nama) + ' · ' + esc(m.darjah + ' ' + m.kelas) + ' · No. Rujukan ' + esc(rujukan) + ' · Muka surat 2/2</p>' +
      (App.modulKBS() ? bahagianKBS(m, d.kbs) : '') +
      '<div class="blok-akhir"><h3 class="bahagian-cetak">Bahagian ' + huruf[1] + ' — Ulasan Guru</h3>' +
      '<div class="kotak-ulasan">' + (ulasan ? esc(ulasan) : '&nbsp;') + '</div>' +
      '<div class="tandatangan tiga"><div><p>Disediakan oleh:</p><span class="garis"></span><b>' + esc(penyedia.nama) + '</b><small>' + esc(penyedia.jawatan) + '</small><small>' + esc(c.namaSekolah || '') + '</small><small>Tarikh: ' + esc(tarikhTeks) + '</small></div>' +
      '<div><p>Disahkan oleh:</p><span class="garis"></span><b>' + (c.namaGB ? esc(c.namaGB) : '(................................................)') + '</b><small>' + esc(jawatan) + '</small><small>' + esc(c.namaSekolah || '') + '</small><small>Tarikh: ' + esc(tarikhTeks) + '</small></div>' +
      '<div class="cop" aria-hidden="true"></div></div></div>' +
      kaki + '</section>';

    return '<div class="halaman-cetak transkrip">' + hal1 + hal2 + '</div>';
  }

  function cetak(m, ulasan, tarikhDok, penyedia) {
    var el = Cetak.kawasan();
    el.innerHTML = binaHTML(m, ulasan, tarikhDok, penyedia);
    Cetak.cetakSekarang(el);
  }

  function baris(l, v) { return '<tr><th>' + esc(l) + '</th><td>' + esc(v) + '</td></tr>'; }

  /* KBS: tahun terkini terperinci (3 lajur), tahun sebelumnya ringkasan satu baris */
  function bahagianKBS(m, rekod) {
    var tahunList = {};
    rekod.forEach(function (r) { tahunList[r.tahun] = 1; });
    var tahun = Object.keys(tahunList).map(Number).sort(function (a, b) { return b - a; });
    var html = '<h3 class="bahagian-cetak">Bahagian B — Kem Bestari Solat (Amali Wuduk & Solat)</h3>';
    if (!tahun.length) return html + '<p class="nota-cetak">Tiada rekod penilaian Kem Bestari Solat untuk murid ini.</p>';
    function kira(th) {
      var rs = rekod.filter(function (r) { return Number(r.tahun) === th; });
      var tahap = parseInt(rs[0].tahap, 10) || D.kbsTahap(m.darjah);
      var st = {}; rs.forEach(function (r) { st[r.itemId] = r.status; });
      var bahagian = D.kbsBahagian(tahap), jum = 0, ok = 0;
      bahagian.forEach(function (b) { b.items.forEach(function (it) { jum++; if (st[it.id] === 'M') ok++; }); });
      return { tahap: tahap, st: st, bahagian: bahagian, jum: jum, ok: ok };
    }
    var th = tahun[0], x = kira(th);
    html += '<h4 class="sub-cetak">Tahun ' + th + ' · Tahap ' + x.tahap + ' · ' + x.ok + '/' + x.jum + ' item dikuasai (' + Math.round(x.ok / x.jum * 100) + '%)</h4>' +
      '<table class="jadual-cetak kbs-cetak"><thead><tr><th>Bahagian</th><th>Dikuasai (M)</th><th>Belum (BM)</th><th>Belum dinilai</th></tr></thead><tbody>' +
      x.bahagian.map(function (b) {
        var mm = 0, bm = 0; b.items.forEach(function (it) { if (x.st[it.id] === 'M') mm++; else if (x.st[it.id] === 'BM') bm++; });
        return '<tr><td>' + esc(b.label) + '</td><td>' + mm + '</td><td>' + bm + '</td><td>' + (b.items.length - mm - bm) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="kbs-item-grid">' + x.bahagian.map(function (b) {
        return '<div><b>' + esc(b.label) + '</b><ul>' + b.items.map(function (it) {
          var v = x.st[it.id] || '';
          return '<li><span class="kbs-tanda ' + (v === 'M' ? 'm' : v === 'BM' ? 'bm' : '') + '">' + (v || '–') + '</span>' + esc(it.teks) + '</li>';
        }).join('') + '</ul></div>';
      }).join('') + '</div>';
    if (tahun.length > 1) html += '<p class="nota-cetak"><b>Tahun sebelumnya:</b> ' + tahun.slice(1).map(function (t) { var y = kira(t); return t + ' (Tahap ' + y.tahap + '): ' + y.ok + '/' + y.jum + ' dikuasai'; }).join(' · ') + '</p>';
    return html + '<p class="nota-cetak">M = Menguasai · BM = Belum Menguasai · – = Belum dinilai</p>';
  }

  /* ── Cadangan ulasan (memberangsangkan, ikut prestasi) ── */
  var FRASA = [
    'Murid yang rajin dan berdisiplin.',
    'Sentiasa bersedia semasa sesi tasmik.',
    'Bacaan semakin lancar dan yakin.',
    'Perlu memperbaiki tajwid (mad dan dengung).',
    'Perlu latihan makhraj huruf.',
    'Ibu bapa digalakkan memantau bacaan di rumah.',
    'Teruskan usaha, semoga terus cemerlang!'
  ];
  function cadanganUlasan(m) {
    var d = data(m), nama = UI.tajukNama(UI.namaPanggilan(m.nama)) || 'Murid ini';
    var bil = d.rekod.length, cml = d.rekod.filter(function (r) { return D.kualiti(r.kualiti).bintang === 3; }).length;
    var pc = bil ? cml / bil : 0;
    var ayat = [];
    if (m.peringkat === 'Khatam' || d.khatam.length) ayat.push('Alhamdulillah, ' + nama + ' telah khatam Al-Quran' + (d.khatam.length > 1 ? ' sebanyak ' + d.khatam.length + ' kali' : '') + '. Bacaan lancar dan bertajwid. Teruskan istiqamah membaca Al-Quran setiap hari.');
    else if (m.peringkat === 'Al-Quran') {
      var j = D.juzuk(m.mukaSurat || 1);
      ayat.push(j >= 15 ? nama + ' membaca Al-Quran dengan baik dan telah sampai Juzuk ' + j + '. Teruskan usaha sehingga khatam.'
        : nama + ' telah membaca Al-Quran (Juzuk ' + j + '). Teruskan latihan untuk meningkatkan kelancaran dan tajwid.');
    } else if (/Iqra [56]/.test(m.peringkat || '')) ayat.push(nama + ' hampir menamatkan Iqra (' + m.peringkat + '). Teruskan latihan untuk mula membaca Al-Quran.');
    else ayat.push(nama + ' sedang membaca ' + (m.peringkat || 'Iqra') + '. Perlu bimbingan berterusan dan latihan membaca di rumah.');
    if (bil >= 5) ayat.push(pc >= 0.6 ? 'Penilaian tasmik kebanyakannya cemerlang.' : pc >= 0.3 ? 'Prestasi tasmik baik dan semakin meningkat.' : 'Perlu lebih fokus semasa tasmik.');
    if (App.modulKBS() && d.kbs.length) {
      var th = Math.max.apply(null, d.kbs.map(function (x) { return Number(x.tahun) || 0; }));
      var rs = d.kbs.filter(function (x) { return Number(x.tahun) === th; });
      var jum = 0; D.kbsBahagian(parseInt(rs[0].tahap, 10) || D.kbsTahap(m.darjah)).forEach(function (b) { jum += b.items.length; });
      var ok = rs.filter(function (x) { return x.status === 'M'; }).length;
      ayat.push(ok / jum >= 0.8 ? 'Menguasai amali wuduk dan solat dengan baik.' : 'Perlu latihan tambahan amali solat.');
    }
    return ayat.join(' ');
  }

  /* ── Transkrip pukal satu kelas (cth Tahun 6 akhir tahun) ── */
  function pukal(senarai) {
    if (!senarai.length) return UI.toast('Tiada murid dalam kelas ini', 'warn');
    var c = App.DB.config;
    var calon = data(senarai[0]).penyedia;
    var md = UI.modal({
      tajuk: 'Transkrip kelas · ' + senarai[0].darjah + ' ' + senarai[0].kelas, besar: true,
      isi: amaranSediaan(c) +
        '<div class="baris-medan"><label class="medan"><span>Disediakan oleh</span><select id="tpPenyedia">' + calon.senarai.map(function (p) {
          return '<option value="' + esc(p.id) + '"' + (p.id === calon.lalai ? ' selected' : '') + '>' + esc(p.nama + ' — ' + p.jawatan) + '</option>';
        }).join('') + '</select></label>' +
        '<label class="medan"><span>Tarikh transkrip</span><input type="date" id="tpTarikh" value="' + tarikhTempatan(new Date()) + '"></label></div>' +
        '<div class="alat"><p class="lembut kecil">Tulis ulasan setiap murid, tekan <b>Cadangan</b> untuk ulasan automatik ikut prestasi, atau klik frasa untuk menambah.</p><span class="ruang"></span>' +
        '<button class="btn btn-ghost btn-kecil" id="tpSemua">' + ikon('sparkle') + ' Isi cadangan untuk semua</button></div>' +
        '<ol class="tp-senarai">' + senarai.map(function (m, i) {
          var k = D.kemajuan(m);
          return '<li class="tp-murid" data-i="' + i + '"><label class="semak tp-pilih"><input type="checkbox" checked aria-label="Cetak ' + esc(m.nama) + '"><span><b>' + esc(m.nama) + '</b> <small class="lembut">' + esc(k.kedudukan) + '</small></span></label>' +
            '<textarea rows="2" maxlength="500" placeholder="Ulasan guru…"></textarea>' +
            '<div class="cip-baris tp-frasa"><button type="button" class="cip" data-cadang>' + ikon('sparkle') + ' Cadangan</button>' +
            FRASA.map(function (f, j) { return '<button type="button" class="cip" data-frasa="' + j + '">+ ' + esc(f.replace(/[.!]$/, '')) + '</button>'; }).join('') + '</div></li>';
        }).join('') + '</ol>',
      kaki: '<span class="lembut kecil" id="tpKira"></span><span class="ruang"></span><button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-utama" id="tpCetak">' + ikon('printer') + ' Cetak transkrip</button>'
    });
    function kira() { UI.$('#tpKira', md).textContent = UI.$$('.tp-pilih input:checked', md).length + ' / ' + senarai.length + ' murid dipilih · ' + UI.$$('.tp-pilih input:checked', md).length * 2 + ' muka surat'; }
    UI.$$('.tp-pilih input', md).forEach(function (x) { x.addEventListener('change', kira); }); kira();
    UI.$$('.tp-murid', md).forEach(function (li) {
      var m = senarai[+li.dataset.i], ta = UI.$('textarea', li);
      UI.$('[data-cadang]', li).addEventListener('click', function () { ta.value = cadanganUlasan(m); });
      UI.$$('[data-frasa]', li).forEach(function (b) {
        b.addEventListener('click', function () { var f = FRASA[+b.dataset.frasa]; ta.value = (ta.value.trim() ? ta.value.trim() + ' ' : '') + f; });
      });
    });
    UI.$('#tpSemua', md).addEventListener('click', function () {
      UI.$$('.tp-murid', md).forEach(function (li) { var ta = UI.$('textarea', li); if (!ta.value.trim()) ta.value = cadanganUlasan(senarai[+li.dataset.i]); });
      UI.toast('Cadangan diisi — semak dan ubah jika perlu', 'ok');
    });
    var ke = UI.$('[data-ke-tetapan]', md);
    if (ke) ke.addEventListener('click', function () { md.tutup(); App.pergi('tetapan'); });
    UI.$('#tpCetak', md).addEventListener('click', function () {
      var pid = UI.$('#tpPenyedia', md).value, t = UI.$('#tpTarikh', md).value;
      var penyedia = calon.senarai.filter(function (p) { return p.id === pid; })[0];
      var tarikh = t ? new Date(t + 'T12:00:00') : new Date();
      var html = UI.$$('.tp-murid', md).filter(function (li) { return UI.$('.tp-pilih input', li).checked; }).map(function (li) {
        return binaHTML(senarai[+li.dataset.i], UI.$('textarea', li).value.trim(), tarikh, penyedia);
      });
      if (!html.length) return UI.toast('Pilih sekurang-kurangnya seorang murid', 'warn');
      md.tutup();
      var el = Cetak.kawasan();
      el.innerHTML = html.join('');
      UI.toast('Menyediakan ' + html.length + ' transkrip…');
      Cetak.cetakSekarang(el);
    });
  }

  return { buka: buka, cetak: cetak, pukal: pukal, cadanganUlasan: cadanganUlasan, binaHTML: binaHTML };
})();
