/* IMPORT / EXPORT */
(function () {
  var esc = UI.esc, ikon = UI.ikon;
  var pratonton = null;

  /* Status sandaran automatik mingguan (Google Sheet → folder "Sandaran Tasmik Digital") */
  function kadSandaran() {
    var c = App.DB.config || {}, sa = App.ialah('superadmin');
    var akhir = c.sandaranAkhir ? new Date(c.sandaranAkhir) : null;
    var hari = akhir && !isNaN(akhir) ? Math.floor((Date.now() - akhir) / 864e5) : null;
    var ok = hari !== null && hari <= 8;
    var baiki = sa ? 'Tampal Code.gs terkini, kemudian jalankan menu Tasmik Digital → 1. Pasang / Naik Taraf dalam Google Sheet.' : 'Sila maklumkan kepada pentadbir Tasmik Digital.';
    var status = hari === null
      ? '<div class="amaran-kotak warn">' + ikon('alert') + '<div><b>Sandaran automatik belum aktif</b><p>' + baiki + '</p></div></div>'
      : '<div class="amaran-kotak ' + (ok ? 'ok' : 'warn') + '">' + ikon(ok ? 'shield' : 'alert') + '<div><b>Sandaran terakhir: ' + esc(UI.tarikh(c.sandaranAkhir, true)) +
        ' (' + (hari === 0 ? 'hari ini' : hari + ' hari lalu') + ')</b><p>' +
        (ok ? 'Salinan Google Sheet dibuat automatik setiap Ahad. 8 salinan terakhir disimpan dalam folder "Sandaran Tasmik Digital" di Google Drive akaun sekolah.'
            : 'Sandaran mingguan tidak berjalan. ' + baiki) + '</p></div></div>';
    return '<section class="kad"><div class="kad-kepala"><h2>' + ikon('shield') + ' Sandaran data</h2></div><div class="kad-badan">' + status +
      (sa ? '<div class="grid-butang"><button class="btn btn-ghost" id="dSandaran">' + ikon('shield') + ' Buat sandaran sekarang</button></div>' : '') +
      '</div></section>';
  }

  function papar(el) {
    var sa = App.ialah('superadmin');
    el.innerHTML = '<section class="kad"><div class="kad-kepala"><h2>' + ikon('download') + ' Export data</h2></div><div class="kad-badan">' +
      '<p class="lembut">Muat turun data ' + esc(App.lihatSemua() ? 'seluruh sekolah' : 'kelas anda') + ' dalam format Excel (.xlsx).</p>' +
      '<div class="grid-butang">' +
      '<button class="btn btn-ghost" data-ex="lengkap">' + ikon('file') + ' Semua data (berbilang helaian)</button>' +
      '<button class="btn btn-ghost" data-ex="murid">' + ikon('users') + ' Senarai murid & kedudukan</button>' +
      '<button class="btn btn-ghost" data-ex="rekod">' + ikon('book') + ' Rekod tasmik tahun ini</button>' +
      '<button class="btn btn-ghost" data-ex="khatam">' + ikon('trophy') + ' Rekod khatam</button>' +
      (App.modulKBS() ? '<button class="btn btn-ghost" data-ex="kbs">' + ikon('moon') + ' Bestari Solat</button>' : '') +
      '</div>' +
      '</div></section>' + (App.pentadbir() ? kadSandaran() : '') +
      (App.pentadbir() ? '<section class="kad"><div class="kad-kepala"><h2>' + ikon('calendar') + ' Persediaan tahun baharu</h2></div><div class="kad-badan">' +
        '<p class="lembut">Pada bulan November, muat turun templat Tukar Tahun, isi nama murid Tahun 1 dan kelas guru tahun depan, kemudian hantar kepada pentadbir Tasmik Digital.</p>' +
        '<div class="grid-butang"><button class="btn btn-ghost" id="dTemplatTahun">' + ikon('download') + ' Templat Tukar Tahun</button></div></div></section>' : '') +
      '<section class="kad"><div class="kad-kepala"><h2>' + ikon('upload') + ' Import murid dari Excel</h2>' + (sa ? '' : UI.lencana('Super Admin', 'emas')) + '</div><div class="kad-badan">' +
      (sa ? '<p class="lembut">Gunakan templat standard: satu baris setiap murid dengan lajur <b>Nama</b>, <b>Darjah</b> (1–6) dan <b>Kelas</b>. Fail format lama SKDK (helaian "1J", "2J"…) juga diterima.</p>' +
        '<div class="grid-butang"><button class="btn btn-ghost" id="dTemplat">' + ikon('download') + ' Muat turun templat</button>' +
        '<label class="btn btn-utama">' + ikon('upload') + ' Pilih fail Excel<input type="file" id="dFail" accept=".xlsx,.xls,.csv" hidden></label></div>' +
        '<div id="dPratonton"></div>'
        : '<p class="lembut">Import murid secara pukal (cth: kemasukan murid Tahun 1) diuruskan oleh pentadbir Tasmik Digital sebagai sebahagian daripada langganan tahunan. Hantar senarai murid menggunakan templat kepada pentadbir.</p>' +
          '<button class="btn btn-ghost" id="dTemplat">' + ikon('download') + ' Muat turun templat</button>') +
      '</div></section>';

    var bs = UI.$('#dSandaran'); if (bs) bs.addEventListener('click', function () {
      bs.disabled = true; bs.innerHTML = '<span class="pusing"></span> Membuat sandaran…';
      API.panggil('sandaran').then(function (r) {
        if (!r || !r.ok) throw new Error(r && r.msg || 'Sandaran gagal');
        App.DB.config.sandaranAkhir = r.tarikh || new Date().toISOString(); App.DB.config.sandaranNama = r.nama;
        UI.toast('Sandaran dibuat: ' + r.nama, 'ok'); papar(el);
      }).catch(function (e) { UI.toast(e.message, 'err'); bs.disabled = false; bs.innerHTML = ikon('shield') + ' Buat sandaran sekarang'; });
    });
    UI.$$('[data-ex]', el).forEach(function (b) { b.addEventListener('click', function () { eksport(b.dataset.ex); }); });
    UI.$('#dTemplat').addEventListener('click', function () {
      Cetak.excel('Templat_Import_Murid_Tasmik_Digital.xlsx', [{ nama: 'Murid', headers: ['Nama', 'Darjah', 'Kelas', 'Jenis (pilihan)', 'Peringkat (pilihan)', 'Muka Surat (pilihan)'],
        rows: [['AHMAD BIN ALI', 1, 'Bestari', 'Iqra Baru', 'Iqra 1', 0], ['SITI AISYAH BINTI OMAR', 1, 'Bestari', '', '', '']] }]);
    });
    var tt = UI.$('#dTemplatTahun'); if (tt) tt.addEventListener('click', function () { TemplatTahun.muatTurun(); });
    var f = UI.$('#dFail'); if (f) f.addEventListener('change', function () { if (this.files[0]) baca(this.files[0], el); });
    if (pratonton) paparPratonton(el);
  }

  function eksport(jenis) {
    var murid = App.muridSaya();
    var ids = {}; murid.forEach(function (m) { ids[m.id] = 1; });
    var th = new Date().getFullYear();
    var sekolah = (App.DB.config.namaSekolah || API.sekolah.nama).replace(/[^\w]+/g, '_');
    var H = {
      murid: { nama: 'Murid', headers: ['Nama', 'Darjah', 'Kelas', 'Jenis', 'Peringkat', 'Muka Surat', 'Kemajuan %', 'Bil Khatam', 'Tasmik Terakhir', 'Status'],
        rows: murid.map(function (m) { var r = App.rekodAkhir(m.id); return [m.nama, m.darjah, m.kelas, m.jenis, m.peringkat, m.mukaSurat, D.kemajuan(m).pct, m.bilKhatam || 0, r ? UI.tarikh(r.tarikh) : '', m.status]; }) },
      rekod: { nama: 'Rekod ' + th, headers: ['Tarikh', 'Hari', 'Masa', 'Nama Murid', 'Darjah', 'Kelas', 'Jenis', 'Peringkat', 'Bacaan', 'M/S Dari', 'M/S Ke', 'Jumlah', 'Penilaian', 'Guru', 'Catatan'],
        rows: App.DB.rekod.filter(function (r) { return ids[r.muridId] && new Date(r.tarikh).getFullYear() === th; }).sort(function (a, b) { return new Date(a.tarikh) - new Date(b.tarikh); })
          .map(function (r) { return [UI.tarikh(r.tarikh), r.hari, UI.masa(r.tarikh), r.muridNama, r.darjah, r.kelas, r.jenis, r.peringkat, r.iqraLabel, r.dari, r.ke, r.jumlah, D.kualiti(r.kualiti).label, r.guru, r.catatan]; }) },
      khatam: { nama: 'Khatam', headers: ['Nama Murid', 'Darjah', 'Kelas', 'Khatam Ke', 'Tahun', 'Tarikh', 'Guru', 'Catatan'],
        rows: App.DB.khatam.filter(function (k) { return App.lihatSemua() || ids[k.muridId]; }).map(function (k) { return [k.muridNama, k.darjah, k.kelas, k.bilangan, k.tahun, UI.tarikh(k.tarikh), k.guru, k.catatan]; }) },
      kbs: { nama: 'Bestari Solat', headers: ['Tahun', 'Nama Murid', 'Darjah', 'Kelas', 'Tahap', 'Bahagian', 'Item', 'Status', 'Guru', 'Tarikh'],
        rows: App.DB.kbs.filter(function (k) { return ids[k.muridId] && k.status; }).map(function (k) { return [k.tahun, k.muridNama, k.darjah, k.kelas, k.tahap, k.sectionKey, k.itemTeks, k.status, k.guru, UI.tarikh(k.tarikh)]; }) }
    };
    var helaian = jenis === 'lengkap' ? [H.murid, H.rekod, H.khatam].concat(App.modulKBS() ? [H.kbs] : []) : [H[jenis]];
    Cetak.excel('Tasmik_' + sekolah + '_' + (jenis === 'lengkap' ? 'Lengkap' : H[jenis].nama.replace(/\s+/g, '_')) + '_' + new Date().toISOString().slice(0, 10) + '.xlsx', helaian);
  }

  /* ── Import ── */
  function baca(fail, el) {
    UI.muatSkrip(Cetak.XLSX_LIB).then(function () {
      var r = new FileReader();
      r.onload = function (e) {
        try {
          var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          pratonton = hurai(wb);
          paparPratonton(el);
        } catch (err) { UI.toast('Fail tidak dapat dibaca: ' + err.message, 'err'); }
      };
      r.readAsArrayBuffer(fail);
    }).catch(function () { UI.toast('Gagal muat modul Excel', 'err'); });
  }

  function hurai(wb) {
    var out = [];
    wb.SheetNames.forEach(function (sn) {
      var rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '' });
      if (!rows.length) return;
      // Cari baris tajuk
      var hi = -1, col = {};
      for (var i = 0; i < Math.min(rows.length, 10); i++) {
        var r = rows[i].map(function (c) { return String(c).trim().toUpperCase(); });
        var n = r.findIndex(function (c) { return c === 'NAMA' || c === 'NAMA MURID'; });
        if (n >= 0) { hi = i; col.nama = n; col.darjah = r.findIndex(function (c) { return /^(DARJAH|TAHUN)$/.test(c); }); col.kelas = r.indexOf('KELAS');
          col.jenis = r.findIndex(function (c) { return /^JENIS/.test(c); }); col.peringkat = r.findIndex(function (c) { return /^PERINGKAT/.test(c); }); col.ms = r.findIndex(function (c) { return /^MUKA SURAT/.test(c); }); break; }
      }
      if (hi < 0) return;
      // Format lama: nama helaian "1J" = Darjah 1 Jauhari
      var lama = sn.match(/^(\d)\s*([A-Za-z]+)$/);
      for (var j = hi + 1; j < rows.length; j++) {
        var row = rows[j];
        var nama = String(row[col.nama] || '').trim().toUpperCase().replace(/\s+/g, ' ');
        if (nama.length < 3) continue;
        var dj = col.darjah >= 0 ? String(row[col.darjah]).replace(/\D/g, '') : (lama ? lama[1] : '');
        var kl = col.kelas >= 0 ? String(row[col.kelas]).trim() : (lama ? lama[2] : '');
        if (lama && kl.length <= 2) kl = ({ J: 'Jauhari', B: 'Bestari', C: 'Cerdas', A: 'Amanah', M: 'Mulia', I: 'Ikhlas', T: 'Taqwa', K: 'Kurniaan', N: 'Nilam', D: 'Dedikasi', S: 'Setia' })[kl.toUpperCase()] || kl;
        var jenis = col.jenis >= 0 ? String(row[col.jenis]).trim() : '';
        var per = col.peringkat >= 0 ? String(row[col.peringkat]).trim() : '';
        out.push({ nama: nama, darjah: dj ? 'Darjah ' + dj : '', kelas: TasmikCore.normalKelas(kl), jenis: D.JENIS.indexOf(jenis) >= 0 ? jenis : 'Iqra Baru', peringkat: D.PERINGKAT.indexOf(per) >= 0 ? per : 'Iqra 1', mukaSurat: col.ms >= 0 ? parseInt(row[col.ms], 10) || 0 : 0 });
      }
    });
    var sedia = {};
    App.DB.murid.forEach(function (m) { if (m.status === 'Aktif') sedia[m.nama + '|' + m.darjah + '|' + m.kelas] = 1; });
    var dlmFail = {};
    out.forEach(function (m) {
      var k = m.nama + '|' + m.darjah + '|' + m.kelas;
      if (!/^Darjah [1-6]$/.test(m.darjah)) m.ralat = 'Darjah tidak sah';
      else if (!m.kelas) m.ralat = 'Kelas kosong';
      else if (sedia[k]) m.ralat = 'Sudah wujud';
      else if (dlmFail[k]) m.ralat = 'Berganda dalam fail';
      dlmFail[k] = 1;
    });
    return out;
  }

  function paparPratonton(el) {
    var box = UI.$('#dPratonton', el); if (!box) return;
    var ok = pratonton.filter(function (m) { return !m.ralat; }), bad = pratonton.filter(function (m) { return m.ralat; });
    var ikutKelas = {};
    ok.forEach(function (m) { var k = m.darjah + ' ' + m.kelas; ikutKelas[k] = (ikutKelas[k] || 0) + 1; });
    box.innerHTML = '<div class="pratonton"><h3>Semakan fail</h3>' +
      '<div class="kpi kecil">' + Kom.kpi('check', ok.length, 'Sedia diimport', '', '') + Kom.kpi('alert', bad.length, 'Dilangkau', '', bad.length ? 'amaran' : '') + '</div>' +
      (Object.keys(ikutKelas).length ? '<p>' + Object.keys(ikutKelas).sort().map(function (k) { return UI.lencana(k + ': ' + ikutKelas[k], 'hijau'); }).join(' ') + '</p>' : '') +
      (bad.length ? '<details><summary>' + bad.length + ' baris dilangkau</summary><ul class="senarai-nota">' + bad.slice(0, 100).map(function (m) { return '<li>' + esc(m.nama) + ' (' + esc(m.darjah + ' ' + m.kelas) + ') — <b>' + esc(m.ralat) + '</b></li>'; }).join('') + '</ul></details>' : '') +
      '<div class="grid-butang"><button class="btn btn-ghost" id="dBatal">Batal</button>' + (ok.length ? '<button class="btn btn-utama" id="dImport">' + ikon('upload') + ' Import ' + ok.length + ' murid</button>' : '') + '</div></div>';
    UI.$('#dBatal', box).addEventListener('click', function () { pratonton = null; box.innerHTML = ''; });
    var b = UI.$('#dImport', box);
    if (b) b.addEventListener('click', function () {
      b.disabled = true; b.innerHTML = '<span class="pusing"></span> Mengimport…';
      var ops = ok.map(function (m) {
        var row = { nama: m.nama, darjah: m.darjah, kelas: m.kelas, jenis: m.peringkat === 'Al-Quran' ? 'Al-Quran' : m.jenis, peringkat: m.peringkat, mukaSurat: m.mukaSurat, status: 'Aktif', tarikhDaftar: new Date().toISOString() };
        row.iqraLabel = D.labelBacaan(row.jenis, row.peringkat, m.mukaSurat || 1, m.mukaSurat || 1);
        return { op: 'insert', table: 'Murid', id: App.genId('M'), row: row };
      });
      // Hantar berperingkat (maks 200 setiap permintaan)
      var bahagian = []; for (var i = 0; i < ops.length; i += 200) bahagian.push(ops.slice(i, i + 200));
      var siap = 0;
      (function seterus() {
        if (!bahagian.length) { pratonton = null; App.bina(); UI.toast(siap + ' murid diimport', 'ok'); papar(el); return; }
        var b2 = bahagian.shift();
        Sync.tulisTerus(b2).then(function (r) {
          if (!r.ok) { UI.toast('Import terhenti: ' + (r.rangkaian ? 'tiada internet' : r.msg) + ' (' + siap + ' berjaya)', 'err', 8000); pratonton = null; papar(el); return; }
          siap += b2.length; seterus();
        });
      })();
    });
  }

  App.daftar('data', { papar: papar });
})();
