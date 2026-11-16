/* TUKAR TAHUN — wizard 4 langkah (Super Admin sahaja)
   1 Persediaan → 2 Naik kelas → 3 Tahun 1 & guru → 4 Sahkan */
(function () {
  var esc = UI.esc, ikon = UI.ikon;
  var st = null;
  var LANGKAH = ['Persediaan', 'Naik kelas', 'Tahun 1 & guru', 'Sahkan'];

  function mula() {
    var g = {};
    App.DB.guru.filter(guruAktif).forEach(function (x) {
      g[x.id] = (x.senaraiKelas || []).map(function (k) { return k.darjah + '|' + k.kelas; });
    });
    st = { langkah: 1, peta: {}, murid: [], guru: g, hasil: null };
  }
  function guruAktif(g) { return g.status === 'Aktif' && (g.peranan === 'guru' || g.peranan === 'penyelaras'); }
  function tahunSemasa() { return parseInt(App.DB.config.tahunSemasa, 10) || new Date().getFullYear(); }
  function kelasAktif() {
    var k = {};
    App.DB.murid.forEach(function (m) { if (m.status === 'Aktif') { var key = m.darjah + '|' + m.kelas; k[key] = (k[key] || 0) + 1; } });
    return k;
  }

  function papar(el) {
    if (!st) mula();
    var html = '<section class="kad wizard"><div class="kad-kepala"><h2>' + ikon('calendar') + ' Tukar tahun ' + tahunSemasa() + ' → ' + (tahunSemasa() + 1) + '</h2></div>' +
      '<ol class="langkah-bar">' + LANGKAH.map(function (l, i) {
        var n = i + 1;
        return '<li class="' + (n < st.langkah ? 'siap' : n === st.langkah ? 'kini' : '') + '"><span>' + (n < st.langkah ? ikon('check') : n) + '</span><b>' + esc(l) + '</b></li>';
      }).join('') + '</ol><div id="wzIsi"></div></section>';
    el.innerHTML = html;
    var isi = UI.$('#wzIsi');
    if (st.hasil) return paparHasil(isi, el);
    [langkah1, langkah2, langkah3, langkah4][st.langkah - 1](isi, el);
  }

  function kaki(boleh, labelSeterus) {
    return '<div class="wizard-kaki">' + (st.langkah > 1 ? '<button class="btn btn-ghost" id="wzBalik">' + ikon('chevL') + ' Kembali</button>' : '<span></span>') +
      (labelSeterus ? '<button class="btn btn-utama" id="wzSeterus"' + (boleh ? '' : ' disabled') + '>' + esc(labelSeterus) + ' ' + ikon('chevR') + '</button>' : '') + '</div>';
  }
  function ikatKaki(el, seterus) {
    var b = UI.$('#wzBalik'); if (b) b.addEventListener('click', function () { st.langkah--; papar(el); });
    var n = UI.$('#wzSeterus'); if (n) n.addEventListener('click', function () { if (!seterus || seterus() !== false) { st.langkah++; papar(el); } });
  }

  /* ── 1. Persediaan ── */
  function langkah1(isi, el) {
    var v = App.versiBackend || '';
    var vOk = !v || bandingVersi(v, '3.1.0') >= 0;
    var k = kelasAktif();
    var jum = Object.keys(k).reduce(function (s, x) { return s + k[x]; }, 0);
    isi.innerHTML = '<div class="wz-grid">' +
      '<div class="semak-sedia"><h3>Senarai semak</h3><ul>' +
      item(true, 'Tahun semasa: <b>' + tahunSemasa() + '</b> · ' + jum + ' murid aktif dalam ' + Object.keys(k).length + ' kelas') +
      item(vOk, vOk ? 'Backend sekolah versi ' + esc(v || '?') + ' menyokong Tukar Tahun' : 'Backend versi ' + esc(v) + ' terlalu lama — tampal Code.gs v3.1 dan deploy semula dahulu') +
      item(App.DB.config.tahunSemasa, 'Sandaran Google Sheet akan dibuat <b>secara automatik</b> sebelum sebarang perubahan') +
      item(true, 'Senarai murid Tahun 1 daripada penyelaras (pilihan — boleh ditambah kemudian di Import / Export)') +
      '</ul></div>' +
      '<div class="nota-kotak"><h3>' + ikon('file') + ' Templat untuk penyelaras</h3><p class="lembut">Hantar templat ini kepada penyelaras pada bulan November. Ia sudah diisi dengan kelas dan guru semasa — penyelaras hanya perlu isi nama murid Tahun 1 dan kelas guru tahun depan.</p>' +
      '<button class="btn btn-ghost" id="wzTemplat">' + ikon('download') + ' Muat turun templat Tukar Tahun</button></div></div>' +
      '<div class="grid-butang"><button class="btn btn-teks" id="wzSandaran">' + ikon('shield') + ' Buat sandaran sekarang sahaja</button></div>' +
      kaki(vOk, 'Mula');
    UI.$('#wzTemplat').addEventListener('click', templat);
    UI.$('#wzSandaran').addEventListener('click', function () {
      var b = this; b.disabled = true;
      API.panggil('sandaran').then(function (r) {
        b.disabled = false;
        if (!r.ok) return UI.toast(r.rangkaian ? 'Perlukan internet' : 'Sandaran gagal: ' + r.msg, 'err');
        UI.toast('Sandaran dibuat: ' + r.nama, 'ok', 6000);
      });
    });
    ikatKaki(el);
  }
  function item(ok, teks) { return '<li class="' + (ok ? 'ok' : 'gagal') + '">' + ikon(ok ? 'check' : 'alert') + '<span>' + teks + '</span></li>'; }

  /* ── 2. Naik kelas ── */
  function langkah2(isi, el) {
    var k = kelasAktif();
    var kunci = Object.keys(k).sort();
    var nama = App.namaKelasSekolah();
    isi.innerHTML = '<p class="lembut">Murid Darjah 1–5 naik satu darjah. Nama kelas kekal kecuali anda menukarnya di bawah (cth: kelas disusun semula). Darjah 6 menjadi <b>Alumni</b> — rekod mereka kekal tersimpan.</p>' +
      '<datalist id="wzNamaKelas">' + nama.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
      '<div class="jadual-wrap"><table class="jadual"><thead><tr><th>Kelas ' + tahunSemasa() + '</th><th class="nombor">Murid</th><th></th><th>Kelas ' + (tahunSemasa() + 1) + '</th></tr></thead><tbody>' +
      kunci.map(function (key) {
        var p = key.split('|'), d = parseInt(p[0].replace(/\D/g, ''), 10);
        if (d >= 6) return '<tr><td><b>' + esc(App.labelKelasPenuh(key)) + '</b></td><td class="nombor">' + k[key] + '</td><td>' + ikon('chevR') + '</td><td>' + UI.lencana('Alumni', 'emas') + '</td></tr>';
        return '<tr><td><b>' + esc(App.labelKelasPenuh(key)) + '</b></td><td class="nombor">' + k[key] + '</td><td>' + ikon('chevR') + '</td>' +
          '<td><div class="kelas-baharu"><span>Darjah ' + (d + 1) + '</span><input class="input-kecil lebar" list="wzNamaKelas" data-peta="' + esc(key) + '" value="' + esc(st.peta[key] || p[1]) + '" aria-label="Kelas baharu untuk ' + esc(App.labelKelasPenuh(key)) + '"></div></td></tr>';
      }).join('') + '</tbody></table></div>' + kaki(true, 'Seterusnya');
    ikatKaki(el, function () {
      var ok = true;
      UI.$$('[data-peta]', isi).forEach(function (i) {
        var v = UI.tajukNama(i.value.trim()), key = i.dataset.peta;
        if (!v) { ok = false; i.focus(); return; }
        if (v !== key.split('|')[1]) st.peta[key] = v; else delete st.peta[key];
      });
      if (!ok) { UI.toast('Nama kelas tidak boleh kosong', 'err'); return false; }
    });
  }

  /* ── 3. Tahun 1 & guru ── */
  function langkah3(isi, el) {
    var nama = App.namaKelasSekolah();
    var sedia = {};
    App.DB.murid.forEach(function (m) { if (m.status === 'Aktif') sedia[m.nama] = m.darjah + ' ' + m.kelas; });
    var guru = App.DB.guru.filter(guruAktif).sort(function (a, b) { return a.nama.localeCompare(b.nama); });
    var ikutKelas = {};
    st.murid.forEach(function (m) { ikutKelas[m.kelas] = (ikutKelas[m.kelas] || 0) + 1; });

    isi.innerHTML = '<div class="grid-butang"><label class="btn btn-utama">' + ikon('upload') + ' Muat naik templat yang telah diisi<input type="file" id="wzFail" accept=".xlsx,.xls" hidden></label>' +
      '<span class="lembut kecil">Atau isi secara manual di bawah.</span></div>' +
      '<h3 class="wz-sub">Murid Tahun 1 <span class="lembut">(' + st.murid.length + ')</span></h3>' +
      (Object.keys(ikutKelas).length ? '<p>' + Object.keys(ikutKelas).sort().map(function (k) { return UI.lencana('1 ' + k + ': ' + ikutKelas[k], 'hijau'); }).join(' ') + '</p>' : '') +
      '<div class="wz-tampal"><label class="medan"><span>Tampal nama (satu nama setiap baris)</span><textarea id="wzTampal" rows="4" placeholder="AHMAD BIN ALI&#10;SITI AISYAH BINTI OMAR"></textarea></label>' +
      '<div class="wz-tampal-kanan"><label class="medan"><span>Kelas</span><input id="wzTampalKelas" list="wzNamaKelas2" value="' + esc(nama[0] || '') + '"></label><datalist id="wzNamaKelas2">' + nama.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
      '<button class="btn btn-ghost" id="wzTambah">' + ikon('plus') + ' Tambah ke senarai</button></div></div>' +
      (st.murid.length ? '<div class="jadual-wrap wz-senarai"><table class="jadual kecil"><thead><tr><th>#</th><th>Nama</th><th>Kelas</th><th></th></tr></thead><tbody>' +
        st.murid.map(function (m, i) {
          return '<tr><td>' + (i + 1) + '</td><td>' + esc(m.nama) + (sedia[m.nama] ? ' ' + UI.lencana('Nama sama dengan murid ' + sedia[m.nama], 'warn') : '') + '</td><td>1 ' + esc(m.kelas) + '</td>' +
            '<td class="aksi"><button class="btn-ikon" data-buang="' + i + '" aria-label="Buang">' + ikon('x') + '</button></td></tr>';
        }).join('') + '</tbody></table></div>' + '<button class="btn btn-teks btn-kecil" id="wzKosong">Kosongkan senarai</button>' : '<p class="lembut kecil">Belum ada murid Tahun 1. Boleh juga diimport kemudian di halaman Import / Export.</p>') +
      '<h3 class="wz-sub">Kelas guru tahun ' + (tahunSemasa() + 1) + '</h3><p class="lembut kecil">Format: <code>1 Bestari, 4 Cerdas</code>. Kekal seperti sekarang jika guru mengajar darjah yang sama.</p>' +
      '<div class="jadual-wrap"><table class="jadual"><thead><tr><th>Guru</th><th>Sekarang</th><th>Tahun depan</th></tr></thead><tbody>' +
      guru.map(function (g) {
        var kini = (g.senaraiKelas || []).map(function (k) { return App.labelKelas(k.darjah + '|' + k.kelas); }).join(', ');
        var depan = (st.guru[g.id] || []).map(App.labelKelas).join(', ');
        return '<tr><td><b>' + esc(g.nama) + '</b><br><small class="lembut">' + esc(App.NAMA_PERANAN[g.peranan]) + '</small></td><td>' + esc(kini || '—') + '</td>' +
          '<td><input class="input-kecil lebar" data-guru="' + esc(g.id) + '" value="' + esc(depan) + '" aria-label="Kelas tahun depan ' + esc(g.nama) + '"></td></tr>';
      }).join('') + '</tbody></table></div>' + kaki(true, 'Semak & sahkan');

    UI.$('#wzFail').addEventListener('change', function () { if (this.files[0]) bacaTemplat(this.files[0], el); });
    UI.$('#wzTambah').addEventListener('click', function () {
      simpanGuru(isi);
      var kelas = UI.tajukNama(UI.$('#wzTampalKelas').value.trim());
      if (!kelas) return UI.toast('Pilih kelas', 'err');
      var n = 0;
      UI.$('#wzTampal').value.split(/\r?\n/).forEach(function (x) { if (tambahMurid(x, kelas)) n++; });
      UI.toast(n + ' murid ditambah', n ? 'ok' : 'warn'); papar(el);
    });
    UI.$$('[data-buang]', isi).forEach(function (b) { b.addEventListener('click', function () { simpanGuru(isi); st.murid.splice(parseInt(b.dataset.buang, 10), 1); papar(el); }); });
    var kz = UI.$('#wzKosong'); if (kz) kz.addEventListener('click', function () { simpanGuru(isi); st.murid = []; papar(el); });
    ikatKaki(el, function () { return simpanGuru(isi, true); });
  }

  function tambahMurid(nama, kelas) {
    nama = String(nama || '').replace(/^\s*\d+[.)]?\s+/, '').trim().toUpperCase().replace(/\s+/g, ' ');
    if (nama.length < 3) return false;
    if (st.murid.some(function (m) { return m.nama === nama && m.kelas === kelas; })) return false;
    st.murid.push({ nama: nama, kelas: kelas });
    return true;
  }
  function huraiKelasGuru(teks) {
    var out = [], sah = true;
    String(teks || '').split(/[,;]/).forEach(function (s) {
      s = s.trim(); if (!s) return;
      var m = s.match(/^(?:darjah|tahun|d)?\s*([1-6])\s+(.+)$/i);
      if (!m) { sah = false; return; }
      var k = 'Darjah ' + m[1] + '|' + UI.tajukNama(m[2].trim());
      if (out.indexOf(k) < 0) out.push(k);
    });
    return sah ? out : null;
  }
  function simpanGuru(isi, tegas) {
    var ok = true;
    UI.$$('[data-guru]', isi).forEach(function (i) {
      var l = huraiKelasGuru(i.value);
      if (l === null) { ok = false; if (tegas) { i.focus(); i.classList.add('ralat'); } return; }
      st.guru[i.dataset.guru] = l;
    });
    if (!ok && tegas) { UI.toast('Format kelas guru tidak sah. Contoh: 1 Bestari, 4 Cerdas', 'err'); return false; }
    return ok;
  }

  /* ── 4. Sahkan ── */
  function ringkasan() {
    var k = kelasAktif(), naik = 0, tamat = 0;
    Object.keys(k).forEach(function (key) { if (/Darjah 6/.test(key)) tamat += k[key]; else naik += k[key]; });
    var guruUbah = App.DB.guru.filter(guruAktif).filter(function (g) {
      var kini = (g.senaraiKelas || []).map(function (x) { return x.darjah + '|' + x.kelas; }).join(';');
      return kini !== (st.guru[g.id] || []).join(';');
    });
    return { naik: naik, tamat: tamat, baru: st.murid.length, guruUbah: guruUbah, kelasUbah: Object.keys(st.peta).length };
  }
  function langkah4(isi, el) {
    var r = ringkasan(), baharu = tahunSemasa() + 1;
    isi.innerHTML = '<div class="kpi">' +
      Kom.kpi('chevR', r.naik, 'Murid naik darjah', r.kelasUbah ? r.kelasUbah + ' kelas ditukar nama' : 'Nama kelas kekal') +
      Kom.kpi('trophy', r.tamat, 'Menjadi alumni', 'Darjah 6', 'emas') +
      Kom.kpi('plus', r.baru, 'Murid Tahun 1', 'Kod ibu bapa dijana') +
      Kom.kpi('users', r.guruUbah.length, 'Guru tukar kelas', '') + '</div>' +
      (r.kelasUbah ? '<p>' + Object.keys(st.peta).map(function (k) { var d = parseInt(k, 10); var p = k.split('|'); return UI.lencana(App.labelKelas(k) + ' → ' + (parseInt(p[0].replace(/\D/g, ''), 10) + 1) + ' ' + st.peta[k], 'info'); }).join(' ') + '</p>' : '') +
      (r.guruUbah.length ? '<details><summary>Perubahan kelas guru (' + r.guruUbah.length + ')</summary><ul class="senarai-nota">' + r.guruUbah.map(function (g) {
        return '<li><b>' + esc(g.nama) + '</b>: ' + esc((st.guru[g.id] || []).map(App.labelKelas).join(', ') || 'tiada kelas') + '</li>';
      }).join('') + '</ul></details>' : '') +
      '<div class="amaran-kotak">' + ikon('shield') + '<div><b>Sandaran automatik</b><p>Salinan penuh Google Sheet dibuat dahulu. Jika sandaran gagal, tiada apa-apa diubah. Kumpulan bacaan ikut murid naik kelas; kumpulan Darjah 6 dipadam.</p></div></div>' +
      '<form id="wzSah" class="borang sempit"><label class="medan"><span>Taip <b>' + baharu + '</b> untuk mengesahkan</span><input id="wzTahun" inputmode="numeric" autocomplete="off" required></label>' +
      '<button class="btn btn-bahaya btn-besar" type="submit">' + ikon('calendar') + ' Laksana Tukar Tahun ' + baharu + '</button></form>' + kaki(false, '');
    ikatKaki(el);
    UI.$('#wzSah').addEventListener('submit', function (e) {
      e.preventDefault();
      if (UI.$('#wzTahun').value.trim() !== String(baharu)) return UI.toast('Taip ' + baharu + ' dengan tepat', 'err');
      var btn = this.querySelector('button'); btn.disabled = true; btn.innerHTML = '<span class="pusing"></span> Membuat sandaran & memproses… (jangan tutup)';
      var guru = r.guruUbah.map(function (g) { return { id: g.id, kelasList: (st.guru[g.id] || []).join(';') }; });
      API.panggil('tukarTahun', { tahunBaharu: baharu, sandaran: true, petaKelas: st.peta, muridBaru: st.murid, guru: guru }).then(function (x) {
        if (!x.ok) { btn.disabled = false; btn.innerHTML = ikon('calendar') + ' Laksana Tukar Tahun ' + baharu; return UI.toast(x.rangkaian ? 'Tiada internet — tiada perubahan dibuat' : x.msg, 'err', 9000); }
        st.hasil = x;
        App.muatSemula(true).then(function () { papar(el); });
      });
    });
  }

  function paparHasil(isi, el) {
    var x = st.hasil;
    isi.innerHTML = '<div class="kosong selesai">' + ikon('check') + '<h3>Tukar Tahun ' + esc(App.DB.config.tahunSemasa || '') + ' selesai</h3>' +
      '<p>' + x.naik + ' murid naik darjah · ' + x.tamat + ' alumni · ' + x.baru + ' murid Tahun 1 · ' + x.guru + ' guru dikemas kini</p></div>' +
      (x.sandaran ? '<div class="amaran-kotak ok">' + ikon('shield') + '<div><b>Sandaran: ' + esc(x.sandaran.nama) + '</b><p>' + (x.sandaran.url ? '<a href="' + esc(x.sandaran.url) + '" target="_blank" rel="noopener">Buka salinan sandaran</a> (dalam Google Drive akaun sekolah)' : 'Disimpan dalam Google Drive akaun sekolah.') + '</p></div></div>' : '') +
      '<h3 class="wz-sub">Langkah seterusnya</h3><ol class="langkah"><li>Cetak slip QR untuk kelas Tahun 1 di halaman <a href="#/murid">Murid</a>.</li><li>Maklumkan guru supaya menyemak senarai kelas masing-masing.</li><li>Kemas kini kedudukan bacaan murid Tahun 1 yang sudah boleh membaca (Murid → Betulkan kedudukan).</li></ol>' +
      '<div class="grid-butang"><button class="btn btn-utama" id="wzSelesai">Selesai</button></div>';
    UI.$('#wzSelesai').addEventListener('click', function () { st = null; App.pergi('murid'); });
  }

  /* ── Templat Excel ── */
  function templat() {
    var baharu = tahunSemasa() + 1;
    var k = kelasAktif();
    Cetak.excel('Templat_Tukar_Tahun_' + baharu + '_' + (App.DB.config.namaSekolah || '').replace(/[^\w]+/g, '_') + '.xlsx', [
      { nama: 'Arahan', headers: ['TEMPLAT TUKAR TAHUN ' + baharu + ' — ' + (App.DB.config.namaSekolah || '')], rows: [
        ['1. Helaian "Murid Tahun 1": isi nama penuh murid dan kelas (cth: Bestari). Satu baris satu murid.'],
        ['2. Helaian "Kelas Guru": isi lajur "Kelas Tahun Depan", format: 1 Bestari, 4 Cerdas. Biarkan jika tiada perubahan.'],
        ['3. Helaian "Nama Kelas": ubah lajur "Kelas Tahun Depan" HANYA jika murid kelas itu berpindah ke kelas bernama lain.'],
        ['4. Jangan ubah nama helaian atau tajuk lajur. Hantar fail ini kepada pentadbir Tasmik Digital.']] },
      { nama: 'Murid Tahun 1', headers: ['Bil', 'Nama Murid', 'Kelas'], rows: [] },
      { nama: 'Kelas Guru', headers: ['Nama Pengguna', 'Nama Guru', 'Peranan', 'Kelas Sekarang', 'Kelas Tahun Depan'],
        rows: App.DB.guru.filter(guruAktif).map(function (g) {
          var kini = (g.senaraiKelas || []).map(function (x) { return App.labelKelas(x.darjah + '|' + x.kelas); }).join(', ');
          return [g.email, g.nama, App.NAMA_PERANAN[g.peranan], kini, kini];
        }) },
      { nama: 'Nama Kelas', headers: ['Kelas Sekarang', 'Murid', 'Darjah Tahun Depan', 'Kelas Tahun Depan'],
        rows: Object.keys(k).sort().filter(function (x) { return !/Darjah 6/.test(x); }).map(function (x) {
          var p = x.split('|'); return [App.labelKelasPenuh(x), k[x], 'Darjah ' + (parseInt(p[0].replace(/\D/g, ''), 10) + 1), p[1]];
        }) }
    ]);
  }

  function bacaTemplat(fail, el) {
    UI.muatSkrip(Cetak.XLSX_LIB).then(function () {
      var rd = new FileReader();
      rd.onload = function (e) {
        try {
          var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          var hasil = { murid: 0, guru: 0, kelas: 0, ralat: [] };
          var h = function (n) { var ws = wb.Sheets[n]; return ws ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) : null; };
          var mr = h('Murid Tahun 1');
          if (mr) mr.slice(1).forEach(function (r, i) {
            var nama = String(r[1] || '').trim(), kelas = UI.tajukNama(String(r[2] || '').trim());
            if (!nama) return;
            if (!kelas) { hasil.ralat.push('Murid baris ' + (i + 2) + ': kelas kosong'); return; }
            if (tambahMurid(nama, kelas)) hasil.murid++;
          });
          var gr = h('Kelas Guru');
          if (gr) gr.slice(1).forEach(function (r) {
            var u = String(r[0] || '').trim().toLowerCase();
            var g = App.DB.guru.filter(function (x) { return String(x.email).toLowerCase() === u && guruAktif(x); })[0];
            if (!g) { if (u) hasil.ralat.push('Guru "' + u + '" tidak dijumpai'); return; }
            var l = huraiKelasGuru(r[4]);
            if (l === null) { hasil.ralat.push('Kelas tidak sah untuk ' + g.nama + ': ' + r[4]); return; }
            st.guru[g.id] = l; hasil.guru++;
          });
          var kr = h('Nama Kelas');
          if (kr) kr.slice(1).forEach(function (r) {
            var m = String(r[0] || '').match(/^Darjah ([1-5]) (.+)$/);
            var baru = UI.tajukNama(String(r[3] || '').trim());
            if (!m || !baru) return;
            var key = 'Darjah ' + m[1] + '|' + m[2];
            if (baru !== m[2]) { st.peta[key] = baru; hasil.kelas++; }
          });
          if (!mr && !gr && !kr) return UI.toast('Bukan templat Tukar Tahun. Muat turun templat di langkah 1.', 'err', 7000);
          UI.toast(hasil.murid + ' murid Tahun 1 · ' + hasil.guru + ' guru · ' + hasil.kelas + ' kelas ditukar nama', 'ok', 6000);
          if (hasil.ralat.length) UI.toast(hasil.ralat.length + ' isu: ' + hasil.ralat.slice(0, 2).join('; '), 'warn', 9000);
          papar(el);
        } catch (err) { UI.toast('Fail tidak dapat dibaca: ' + err.message, 'err'); }
      };
      rd.readAsArrayBuffer(fail);
    }).catch(function () { UI.toast('Gagal muat modul Excel', 'err'); });
  }

  function bandingVersi(a, b) {
    var x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (var i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
    return 0;
  }

  window.TemplatTahun = { muatTurun: function () { if (!st) mula(); templat(); } };
  App.daftar('tahun', { papar: papar });
})();
