/* PENGGUNA — guru, penyelaras, guru besar */
(function () {
  var esc = UI.esc, ikon = UI.ikon;
  var TON = { guru: 'hijau', penyelaras: 'info', gb: 'ungu', superadmin: 'emas' };

  function papar(el) {
    var list = App.DB.guru.filter(function (g) { return g.status !== 'Padam'; })
      .sort(function (a, b) { return (a.status === 'Tamat') - (b.status === 'Tamat') || App.NAMA_PERANAN[a.peranan].localeCompare(App.NAMA_PERANAN[b.peranan]) || a.nama.localeCompare(b.nama); });
    var boleh = App.pentadbir();
    el.innerHTML = '<section class="kad"><div class="alat"><div><h2>Pengguna sistem</h2><p class="lembut kecil">' + list.filter(function (g) { return g.status !== 'Tamat'; }).length + ' akaun aktif</p></div><span class="ruang"></span>' +
      (boleh ? '<button class="btn btn-utama" id="gTambah">' + ikon('plus') + ' Tambah pengguna</button>' : '') + '</div>' +
      '<div class="jadual-wrap"><table class="jadual responsif"><thead><tr><th>Nama</th><th>Nama pengguna</th><th>Peranan</th><th>Kelas</th><th></th></tr></thead><tbody>' +
      list.map(function (g) {
        var bolehEdit = boleh && !(g.peranan === 'superadmin' && !App.ialah('superadmin'));
        return '<tr class="' + (g.status === 'Tamat' ? 'pudar' : '') + '"><td data-l="Nama"><span class="avatar kecil">' + esc(UI.inisial(g.nama)) + '</span> ' + esc(g.nama) + (g.id === App.user.id ? ' ' + UI.lencana('Anda', 'muted') : '') + (g.status === 'Tamat' ? ' ' + UI.lencana('Tidak aktif', 'muted') : '') + '</td>' +
          '<td data-l="Pengguna"><code>' + esc(g.email) + '</code></td>' +
          '<td data-l="Peranan">' + UI.lencana(App.NAMA_PERANAN[g.peranan] || g.peranan, TON[g.peranan]) + '</td>' +
          '<td data-l="Kelas">' + esc((g.senaraiKelas || []).map(function (k) { return App.labelKelas(k.darjah + '|' + k.kelas); }).join(', ') || '—') + '</td>' +
          '<td class="aksi">' + (bolehEdit ? '<button class="btn-ikon" data-ed="' + esc(g.id) + '" aria-label="Edit ' + esc(g.nama) + '">' + ikon('edit') + '</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div></section>' +
      '<section class="kad nota"><h3>' + ikon('info') + ' Peranan</h3><ul class="senarai-nota">' +
      '<li><b>Guru</b> — rekod tasmik, khatam & KBS; lihat laporan kelas sendiri; cetak slip QR kelas sendiri.</li>' +
      '<li><b>Penyelaras</b> — semua fungsi guru untuk semua kelas, urus murid & pengguna, tetapan sekolah.</li>' +
      '<li><b>Guru Besar</b> — lihat dashboard, laporan & export sahaja.</li>' +
      '<li><b>Super Admin</b> — pentadbir Tasmik Digital: Tukar Tahun & import murid pukal.</li></ul></section>';
    var t = UI.$('#gTambah'); if (t) t.addEventListener('click', function () { borang(null, el); });
    UI.$$('[data-ed]', el).forEach(function (b) { b.addEventListener('click', function () { borang(App.DB.guru.filter(function (g) { return g.id === b.dataset.ed; })[0], el); }); });
  }

  function borang(g, el) {
    var baru = !g; g = g || { peranan: 'guru', senaraiKelas: [], status: 'Aktif' };
    var kelas = App.semuaKelas();
    var pilih = (g.senaraiKelas || []).map(function (k) { return k.darjah + '|' + k.kelas; });
    var peranan = ['guru', 'penyelaras', 'gb'].concat(App.ialah('superadmin') ? ['superadmin'] : []);
    var md = UI.modal({
      tajuk: baru ? 'Tambah pengguna' : 'Edit pengguna',
      isi: '<form id="fG" class="borang">' +
        '<label class="medan"><span>Nama penuh</span><input id="gNama" required maxlength="100" value="' + esc(g.nama || '') + '" autofocus></label>' +
        '<label class="medan"><span>Nama pengguna (untuk log masuk)</span><input id="gU" required maxlength="60" autocapitalize="none" spellcheck="false" value="' + esc(g.email || '') + '"' + (baru ? '' : ' disabled') + ' placeholder="cth: cikgu.aminah"></label>' +
        '<label class="medan"><span>Peranan</span><select id="gP">' + peranan.map(function (p) { return '<option value="' + p + '"' + (g.peranan === p ? ' selected' : '') + '>' + App.NAMA_PERANAN[p] + '</option>'; }).join('') + '</select></label>' +
        '<fieldset class="semak-murid" id="gKelasWrap"><legend>Kelas diajar</legend>' + (kelas.length ? kelas.map(function (k) {
          return '<label class="semak"><input type="checkbox" value="' + esc(k) + '"' + (pilih.indexOf(k) >= 0 ? ' checked' : '') + '><span>' + esc(App.labelKelasPenuh(k)) + '</span></label>';
        }).join('') : '<p class="lembut kecil">Belum ada kelas. Tambah murid dahulu atau taip di bawah.</p>') +
        '<label class="medan"><span>Kelas lain (cth: Darjah 1 Bestari)</span><input id="gKelasLain" placeholder="Pisahkan dengan koma"></label></fieldset>' +
        (baru ? '<p class="lembut kecil">' + ikon('key') + ' Kata laluan sementara akan dijana dan dipaparkan sekali selepas disimpan.</p>' :
          '<label class="semak"><input type="checkbox" id="gAktif"' + (g.status !== 'Tamat' ? ' checked' : '') + '><span>Akaun aktif</span></label>') +
        '<p class="ralat-borang" id="gRalat" hidden></p></form>',
      kaki: (baru ? '' : '<button class="btn btn-teks" id="gReset">' + ikon('key') + ' Reset kata laluan</button><span class="ruang"></span>') +
        '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-utama" id="gSimpan">Simpan</button>'
    });
    function togolKelas() { UI.$('#gKelasWrap', md).hidden = UI.$('#gP', md).value !== 'guru' && UI.$('#gP', md).value !== 'penyelaras'; }
    UI.$('#gP', md).addEventListener('change', togolKelas); togolKelas();

    UI.$('#gSimpan', md).addEventListener('click', function () {
      var r = UI.$('#gRalat', md);
      var kls = UI.$$('#gKelasWrap input[type=checkbox]:checked', md).map(function (c) { return c.value; });
      UI.$('#gKelasLain', md).value.split(',').forEach(function (s) {
        var m = s.trim().match(/^(?:darjah|tahun)?\s*(\d)\s+(.+)$/i);
        if (m) kls.push('Darjah ' + m[1] + '|' + UI.tajukNama(m[2].trim()));
      });
      kls = kls.filter(function (k, i) { return kls.indexOf(k) === i; });
      var p = UI.$('#gP', md).value;
      var row = { nama: UI.$('#gNama', md).value.trim(), peranan: p, kelasList: kls.join(';'), darjah: kls[0] ? kls[0].split('|')[0] : '', kelas: kls[0] ? kls[0].split('|')[1] : '' };
      if (!row.nama) { r.hidden = false; r.textContent = 'Isi nama.'; return; }
      var btn = this; btn.disabled = true;
      if (baru) {
        row.email = UI.$('#gU', md).value.trim().toLowerCase();
        if (!/^[a-z0-9._@-]{3,60}$/.test(row.email)) { btn.disabled = false; r.hidden = false; r.textContent = 'Nama pengguna: huruf kecil, nombor, titik atau sengkang sahaja (min 3).'; return; }
        Sync.tulisTerus([{ op: 'insert', table: 'Guru', id: App.genId('G'), row: row }]).then(function (x) {
          btn.disabled = false;
          if (!x.ok) { r.hidden = false; r.textContent = x.rangkaian ? 'Perlukan internet.' : x.msg; return; }
          var id = x.hasil[0].id;
          var dbg = App.DB.guru.filter(function (q) { return q.id === id; })[0];
          if (dbg) { dbg.senaraiKelas = kls.map(function (k) { var a = k.split('|'); return { darjah: a[0], kelas: a[1] }; }); dbg.status = 'Aktif'; App.simpanDB(); }
          md.tutup(); papar(el); tunjukKata(row.nama, row.email, x.kataSementara[id]);
        });
      } else {
        row.status = UI.$('#gAktif', md).checked ? 'Aktif' : 'Tamat';
        if (g.id === App.user.id && row.status === 'Tamat') { btn.disabled = false; r.hidden = false; r.textContent = 'Anda tidak boleh menyahaktifkan akaun sendiri.'; return; }
        Sync.tulis([{ op: 'update', table: 'Guru', id: g.id, patch: row }], 'pengguna');
        g.senaraiKelas = kls.map(function (k) { var a = k.split('|'); return { darjah: a[0], kelas: a[1] }; }); App.simpanDB();
        md.tutup(); papar(el); UI.toast('Disimpan', 'ok');
      }
    });
    var rs = UI.$('#gReset', md);
    if (rs) rs.addEventListener('click', function () {
      UI.sahkan('Reset kata laluan?', 'Kata laluan semasa <b>' + esc(g.nama) + '</b> akan diganti dengan kata laluan sementara.', 'Reset').then(function (ya) {
        if (!ya) return;
        API.panggil('resetPass', { guruId: g.id }).then(function (x) {
          if (!x.ok) return UI.toast(x.rangkaian ? 'Perlukan internet.' : x.msg, 'err');
          md.tutup(); tunjukKata(g.nama, g.email, x.kataSementara);
        });
      });
    });
  }

  function tunjukKata(nama, u, kata) {
    var sekolah = API.sekolah, url = location.origin + location.pathname + '?s=' + encodeURIComponent(sekolah.kod);
    var teks = 'Assalamualaikum ' + nama + '. Akaun Tasmik Digital anda:\nPautan: ' + url + '\nNama pengguna: ' + u + '\nKata laluan sementara: ' + kata + '\nSila tukar kata laluan selepas log masuk.';
    var md = UI.modal({
      tajuk: 'Kata laluan sementara',
      isi: '<p>Berikan maklumat ini kepada <b>' + esc(nama) + '</b>. Ia hanya dipaparkan <b>sekali</b>.</p>' +
        '<div class="kod-kotak besar"><div><small>Nama pengguna</small><b>' + esc(u) + '</b></div><div><small>Kata laluan sementara</small><b>' + esc(kata) + '</b></div></div>',
      kaki: '<button class="btn btn-ghost" id="kSalin">' + ikon('file') + ' Salin mesej</button><a class="btn btn-ghost" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(teks) + '">' + ikon('whatsapp') + ' WhatsApp</a><button class="btn btn-utama" data-tutup>Selesai</button>'
    });
    UI.$('#kSalin', md).addEventListener('click', function () {
      (navigator.clipboard ? navigator.clipboard.writeText(teks) : Promise.reject()).then(function () { UI.toast('Mesej disalin', 'ok'); }, function () { prompt('Salin:', teks); });
    });
  }

  App.daftar('guru', { papar: papar });
})();
