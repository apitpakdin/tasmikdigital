/* TETAPAN — profil, tema, sekolah, sistem */
(function () {
  var esc = UI.esc, ikon = UI.ikon;

  function papar(el) {
    var c = App.DB.config, u = App.user, tema = Shell.tema();
    var html = '<div class="grid-2">' +
      '<section class="kad"><div class="kad-kepala"><h2>' + ikon('user') + ' Profil saya</h2></div><div class="kad-badan">' +
      '<div class="profil-kepala"><span class="avatar besar">' + esc(UI.inisial(u.nama)) + '</span><div><h3>' + esc(u.nama) + '</h3><p class="lembut">' + esc(App.NAMA_PERANAN[u.peranan]) + ' · <code>' + esc(u.email) + '</code></p></div></div>' +
      '<form id="fKata" class="borang"><h4>Tukar kata laluan</h4>' +
      '<label class="medan"><span>Kata laluan semasa</span><input type="password" id="kLama" required autocomplete="current-password"></label>' +
      '<label class="medan"><span>Kata laluan baharu (min 6 aksara)</span><input type="password" id="kBaru" required minlength="6" autocomplete="new-password"></label>' +
      '<button class="btn btn-ghost" type="submit">' + ikon('key') + ' Tukar kata laluan</button></form></div></section>' +
      '<section class="kad"><div class="kad-kepala"><h2>' + ikon('sun') + ' Paparan</h2></div><div class="kad-badan">' +
      '<div class="segmen" role="radiogroup" aria-label="Tema">' + [['auto', 'Ikut peranti'], ['light', 'Cerah'], ['dark', 'Gelap']].map(function (t) {
        return '<button type="button" role="radio" data-tema="' + t[0] + '" aria-checked="' + (tema === t[0]) + '">' + t[1] + '</button>';
      }).join('') + '</div>' +
      '<h4>Pasang sebagai aplikasi</h4><p class="lembut kecil">Di telefon: buka menu pelayar → <b>Add to Home screen / Tambah ke Skrin Utama</b>. Aplikasi boleh digunakan tanpa internet dan menyegerak bila talian kembali.</p>' +
      '</div></section></div>';

    if (App.pentadbir()) {
      html += '<section class="kad"><div class="kad-kepala"><h2>' + ikon('school') + ' Tetapan sekolah</h2></div><div class="kad-badan">' +
        '<form id="fSekolah" class="borang">' +
        '<div class="logo-tetapan">' + Shell.logoHTML(c.logo, c.namaSekolah, 'besar') + '<div><label class="btn btn-ghost btn-kecil">' + ikon('upload') + ' Muat naik logo<input type="file" id="tLogo" accept="image/*" hidden></label>' +
        (c.logo ? ' <button type="button" class="btn btn-teks btn-kecil" id="tLogoBuang">Buang</button>' : '') + '<p class="lembut kecil">PNG/JPG, akan dikecilkan secara automatik.</p></div></div>' +
        '<label class="medan"><span>Nama sekolah</span><input id="tNama" maxlength="100" value="' + esc(c.namaSekolah || '') + '"></label>' +
        '<label class="medan"><span>Alamat (untuk kop laporan)</span><input id="tAlamat" maxlength="200" value="' + esc(c.alamat || '') + '"></label>' +
        '<div class="baris-medan"><label class="medan"><span>Nama Guru Besar (tandatangan laporan)</span><input id="tGB" maxlength="100" value="' + esc(c.namaGB || '') + '"></label>' +
        '<label class="medan"><span>Amaran jika tiada rekod selepas</span><select id="tHari">' + [3, 5, 7, 10, 14].map(function (n) { return '<option value="' + n + '"' + (String(c.alertDays || '7') === String(n) ? ' selected' : '') + '>' + n + ' hari</option>'; }).join('') + '</select></label></div>' +
        '<label class="medan"><span>Nama-nama kelas (pisahkan dengan koma)</span><input id="tKelas" maxlength="300" value="' + esc(c.senaraiKelas || App.namaKelasSekolah().join(', ')) + '" placeholder="cth: Bestari, Cerdas, Jauhari"></label>' +
        '<label class="togol"><input type="checkbox" id="tKBS"' + (c.modulKBS !== 'FALSE' ? ' checked' : '') + '><span></span>Modul Kem Bestari Solat</label>' +
        '<details class="lanjutan"><summary>Lanjutan: julat muka surat Iqra</summary>' + editorIqra() + '</details>' +
        '<button class="btn btn-utama" type="submit">' + ikon('check') + ' Simpan tetapan sekolah</button></form></div></section>';
    }

    var g = Sync.giliran().length;
    html += '<section class="kad"><div class="kad-kepala"><h2>' + ikon('info') + ' Sistem</h2></div><div class="kad-badan"><dl class="maklumat">' +
      '<dt>Sekolah</dt><dd>' + esc(c.namaSekolah || API.sekolah.nama) + ' <code>' + esc(API.sekolah.kod) + '</code></dd>' +
      '<dt>Versi aplikasi</dt><dd>' + APP_VERSI + '</dd>' +
      '<dt>Versi backend</dt><dd>' + esc(App.versiBackend || '—') + '</dd>' +
      '<dt>Rekod menunggu sync</dt><dd>' + g + '</dd>' +
      '<dt>Data tempatan</dt><dd>' + App.DB.murid.length + ' murid · ' + App.DB.rekod.length + ' rekod</dd></dl>' +
      '<div class="grid-butang"><button class="btn btn-ghost" id="sSync">' + ikon('refresh') + ' Segerak sekarang</button>' +
      '<button class="btn btn-ghost" id="sKemas">' + ikon('download') + ' Semak kemas kini aplikasi</button>' +
      '<button class="btn btn-ghost" id="sKeluar">' + ikon('logout') + ' Log keluar</button></div>' +
      '<p class="lembut kecil">Tasmik Digital · Data murid disimpan dalam Google Sheet milik sekolah. Kod ibu bapa hanya memaparkan prestasi semasa seorang murid.</p></div></section>';

    el.innerHTML = html;

    UI.$('#fKata').addEventListener('submit', function (e) {
      e.preventDefault();
      API.panggil('changePass', { oldPass: UI.$('#kLama').value, newPass: UI.$('#kBaru').value }).then(function (r) {
        if (!r.ok) return UI.toast(r.rangkaian ? 'Perlukan internet' : r.msg, 'err');
        UI.toast('Kata laluan ditukar', 'ok'); UI.$('#fKata').reset();
      });
    });
    UI.$$('[data-tema]').forEach(function (b) { b.addEventListener('click', function () { Shell.setTema(b.dataset.tema); papar(el); }); });
    UI.$('#sSync').addEventListener('click', function () { App.muatSemula().then(function (r) { UI.toast(r && r.ok ? 'Data disegerak' : 'Tidak dapat menyegerak', r && r.ok ? 'ok' : 'err'); }); });
    UI.$('#sKemas').addEventListener('click', function () {
      if (!('serviceWorker' in navigator)) return location.reload();
      navigator.serviceWorker.getRegistration().then(function (reg) {
        if (!reg) return location.reload();
        reg.update().then(function () { UI.toast('Memuat semula versi terkini…'); setTimeout(function () { location.reload(); }, 800); });
      });
    });
    UI.$('#sKeluar').addEventListener('click', Shell.logKeluar);

    var fs = UI.$('#fSekolah');
    if (!fs) return;
    var logoBaru = null;
    UI.$('#tLogo').addEventListener('change', function () {
      var f = this.files[0]; if (!f) return;
      kecilkan(f, 160).then(function (url) { logoBaru = url; UI.$('.logo-tetapan .logo').outerHTML = '<img class="logo besar" src="' + url + '" alt="">'; UI.toast('Logo sedia — tekan Simpan', 'ok'); });
    });
    var lb = UI.$('#tLogoBuang'); if (lb) lb.addEventListener('click', function () { logoBaru = ''; UI.toast('Logo akan dibuang selepas Simpan'); });
    fs.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = { namaSekolah: UI.$('#tNama').value.trim(), alamat: UI.$('#tAlamat').value.trim(), namaGB: UI.$('#tGB').value.trim(),
        alertDays: UI.$('#tHari').value, modulKBS: UI.$('#tKBS').checked ? 'TRUE' : 'FALSE', senaraiKelas: UI.$('#tKelas').value.split(',').map(function (s) { return UI.tajukNama(s.trim()); }).filter(Boolean).join(', ') };
      if (logoBaru !== null) v.logo = logoBaru;
      var iq = bacaIqra(); if (iq === false) return;
      v.iqraBaru = iq.baru; v.iqraLama = iq.lama;
      API.panggil('setConfig', { values: v }).then(function (r) {
        if (!r.ok) return UI.toast(r.rangkaian ? 'Perlukan internet' : r.msg, 'err');
        App.DB.config = r.config; D.setConfig(r.config); App.simpanDB();
        Shell.kemasKepala(); var k = App.semasa; Shell.tandaMenu(k);
        UI.toast('Tetapan sekolah disimpan', 'ok'); papar(el);
      });
    });
  }

  function editorIqra() {
    var bar = D.jadualIqra('Iqra Baru'), lama = D.jadualIqra('Iqra Lama');
    return '<p class="lembut kecil">Ubah hanya jika buku Iqra sekolah berbeza. Kosongkan untuk guna nilai asal.</p><div class="jadual-wrap"><table class="jadual kecil"><thead><tr><th>Peringkat</th><th>Iqra Baru dari</th><th>hingga</th><th>Iqra Lama dari</th><th>hingga</th></tr></thead><tbody>' +
      D.IQRA_SAHAJA.map(function (p, i) {
        return '<tr><td>' + p + '</td>' + [bar[p].dari, bar[p].ke, lama[p].dari, lama[p].ke].map(function (v, j) { return '<td><input class="input-kecil" type="number" min="1" max="200" data-iq="' + i + '-' + j + '" value="' + v + '" aria-label="' + p + '"></td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function bacaIqra() {
    var baru = {}, lama = {}, sah = true, ubah = false;
    D.IQRA_SAHAJA.forEach(function (p, i) {
      var v = [0, 1, 2, 3].map(function (j) { return parseInt(UI.$('[data-iq="' + i + '-' + j + '"]').value, 10); });
      if (v.some(isNaN) || v[1] < v[0] || v[3] < v[2]) sah = false;
      baru[p] = { dari: v[0], ke: v[1], j: D.IQRA_BARU[p].j }; lama[p] = { dari: v[2], ke: v[3] };
      if (v[0] !== D.IQRA_BARU[p].dari || v[1] !== D.IQRA_BARU[p].ke || v[2] !== D.IQRA_LAMA[p].dari || v[3] !== D.IQRA_LAMA[p].ke) ubah = true;
    });
    if (!sah) { UI.toast('Julat Iqra tidak sah', 'err'); return false; }
    return ubah ? { baru: JSON.stringify(baru), lama: JSON.stringify(lama) } : { baru: '', lama: '' };
  }

  function kecilkan(fail, maks) {
    return new Promise(function (ok, gagal) {
      var img = new Image();
      img.onload = function () {
        var s = Math.min(1, maks / Math.max(img.width, img.height));
        var cv = document.createElement('canvas'); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        var url = cv.toDataURL('image/png');
        if (url.length > 40000) url = cv.toDataURL('image/jpeg', 0.85);
        ok(url);
      };
      img.onerror = gagal;
      img.src = URL.createObjectURL(fail);
    });
  }

  App.daftar('tetapan', { papar: papar });
})();
