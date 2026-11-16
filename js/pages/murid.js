/* MURID — senarai, profil, tambah/edit, kumpulan bacaan, slip QR */
(function () {
  var esc = UI.esc, ikon = UI.ikon;
  var st = { tab: 'senarai', cari: '', kelas: '', status: 'Aktif' };

  function bolehCetak(kelasKey) {
    if (App.pentadbir()) return true;
    return App.ialah('guru') && App.kelasSaya().indexOf(kelasKey) >= 0;
  }

  function papar(el) {
    if (window.__tabMurid) { st.tab = window.__tabMurid; window.__tabMurid = ''; }
    el.innerHTML = '<div class="tab" role="tablist">' +
      '<button role="tab" data-tab="senarai" aria-selected="' + (st.tab === 'senarai') + '">' + ikon('users') + ' Senarai murid</button>' +
      '<button role="tab" data-tab="kumpulan" aria-selected="' + (st.tab === 'kumpulan') + '">' + ikon('layers') + ' Kumpulan bacaan</button>' +
      (App.pentadbir() ? '<button role="tab" data-tab="berganda" aria-selected="' + (st.tab === 'berganda') + '">' + ikon('users') + ' Semak berganda</button>' : '') +
      (App.bolehTulis() ? '<button role="tab" data-tab="peringkat" aria-selected="' + (st.tab === 'peringkat') + '">' + ikon('alert') + ' Semak peringkat' +
        (SemakPeringkat.bilangan() ? ' <b class="kiraan">' + SemakPeringkat.bilangan() + '</b>' : '') + '</button>' : '') +
      '</div><div id="muridIsi"></div>';
    UI.$$('[data-tab]', el).forEach(function (b) { b.addEventListener('click', function () { st.tab = b.dataset.tab; papar(el); }); });
    if (st.tab === 'berganda' && !App.pentadbir()) st.tab = 'senarai';
    if (st.tab === 'kumpulan') paparKumpulan(UI.$('#muridIsi'));
    else if (st.tab === 'berganda') Berganda.papar(UI.$('#muridIsi'), function () { papar(el); }, profil);
    else if (st.tab === 'peringkat' && App.bolehTulis()) SemakPeringkat.papar(UI.$('#muridIsi'), function () { papar(el); });
    else paparSenarai(UI.$('#muridIsi'));
  }

  function senarai() {
    var semua = App.DB.murid.filter(function (m) { return m.status !== 'Padam'; });
    var dlmSkop = App.muridSaya();
    var base = st.status === 'Aktif' ? dlmSkop : semua.filter(function (m) { return st.status === 'Semua' ? true : m.status === st.status; });
    if (!App.lihatSemua() && st.status !== 'Aktif') {
      var k = App.kelasSaya(); base = base.filter(function (m) { return k.indexOf(m.darjah + '|' + m.kelas) >= 0; });
    }
    return base.filter(function (m) { return !st.kelas || m.darjah + '|' + m.kelas === st.kelas; })
      .filter(function (m) { return !st.cari || m.nama.toLowerCase().indexOf(st.cari.toLowerCase()) >= 0 || String(m.kodIbuBapa || '').toLowerCase() === st.cari.toLowerCase(); })
      .sort(function (a, b) { return (a.darjah + a.kelas).localeCompare(b.darjah + b.kelas) || a.nama.localeCompare(b.nama); });
  }

  function paparSenarai(el) {
    var kelas = App.skop ? [App.skop] : App.kelasSaya();
    if (st.kelas && kelas.indexOf(st.kelas) < 0) st.kelas = '';
    var list = senarai();
    var kelasCetak = st.kelas || (kelas.length === 1 ? kelas[0] : '');
    el.innerHTML = '<section class="kad"><div class="alat">' +
      '<div class="cari">' + ikon('search') + '<input id="mCari" type="search" placeholder="Cari nama atau kod…" value="' + esc(st.cari) + '" aria-label="Cari murid"></div>' +
      (kelas.length > 1 ? '<select id="mKelas" aria-label="Kelas"><option value="">Semua kelas</option>' + kelas.map(function (k) { return '<option value="' + esc(k) + '"' + (st.kelas === k ? ' selected' : '') + '>' + esc(App.labelKelasPenuh(k)) + '</option>'; }).join('') + '</select>' : '') +
      ('<select id="mStatus" aria-label="Status"><option' + (st.status === 'Aktif' ? ' selected' : '') + '>Aktif</option><option value="Tamat"' + (st.status === 'Tamat' ? ' selected' : '') + '>Alumni</option><option' + (st.status === 'Pindah' ? ' selected' : '') + '>Pindah</option><option' + (st.status === 'Dikecualikan' ? ' selected' : '') + '>Dikecualikan</option><option' + (st.status === 'Semua' ? ' selected' : '') + '>Semua</option></select>') +
      '<span class="ruang"></span>' +
      (kelasCetak && bolehCetak(kelasCetak) ? '<button class="btn btn-ghost" id="mSlip">' + ikon('qr') + ' Cetak slip QR</button>' : (bolehCetak('') || App.ialah('guru') ? '<span class="lembut kecil">Pilih satu kelas untuk cetak slip QR</span>' : '')) +
      (App.pentadbir() || (App.ialah('guru') && App.kelasSaya().length) ? '<button class="btn btn-utama" id="mTambah">' + ikon('plus') + ' Tambah murid</button>' : '') +
      '</div><p class="lembut kecil kiraan-senarai">' + list.length + ' murid</p>' +
      (list.length ? '<div class="jadual-wrap"><table class="jadual responsif"><thead><tr><th>Nama</th><th>Kelas</th><th>Kedudukan</th><th>Tasmik terakhir</th><th></th></tr></thead><tbody>' +
        list.map(function (m) {
          var r = App.rekodAkhir(m.id), k = D.kemajuan(m);
          return '<tr><td data-l="Nama"><button class="pautan-nama" data-lihat="' + esc(m.id) + '"><span class="avatar kecil ' + UI.tonPeringkat(m.peringkat) + '">' + esc(UI.inisial(m.nama)) + '</span>' + esc(m.nama) + '</button>' +
            (m.status !== 'Aktif' ? ' ' + UI.lencana(m.status === 'Tamat' ? 'Alumni' : m.status, 'muted') : '') + '</td>' +
            '<td data-l="Kelas">' + esc(App.labelKelasPenuh(m.darjah + '|' + m.kelas)) + '</td>' +
            '<td data-l="Kedudukan"><div class="sel-bar">' + UI.bar(k.pct, k.fasa === 'Al-Quran' ? 'ungu' : k.fasa === 'Khatam' ? 'emas' : '') + '<span>' + esc(k.kedudukan) + '</span></div></td>' +
            '<td data-l="Terakhir">' + esc(UI.relatif(r && r.tarikh)) + '</td>' +
            '<td class="aksi"><button class="btn-ikon" data-lihat="' + esc(m.id) + '" aria-label="Lihat ' + esc(m.nama) + '">' + ikon('chevR') + '</button></td></tr>';
        }).join('') + '</tbody></table></div>' : UI.kosong('users', 'Tiada murid', st.cari ? 'Cuba carian lain.' : 'Belum ada murid didaftarkan.')) +
      '</section>';

    UI.$('#mCari').addEventListener('input', function () { st.cari = this.value; var p = this.selectionStart; paparSenarai(el); var c = UI.$('#mCari'); c.focus(); c.setSelectionRange(p, p); });
    var sk = UI.$('#mKelas'); if (sk) sk.addEventListener('change', function () { st.kelas = this.value; paparSenarai(el); });
    var ss = UI.$('#mStatus'); if (ss) ss.addEventListener('change', function () { st.status = this.value; paparSenarai(el); });
    var t = UI.$('#mTambah'); if (t) t.addEventListener('click', function () { borang(null, el); });
    var sl = UI.$('#mSlip'); if (sl) sl.addEventListener('click', function () {
      Cetak.slip(App.DB.murid.filter(function (m) { return m.status === 'Aktif' && m.darjah + '|' + m.kelas === kelasCetak; }).sort(function (a, b) { return a.nama.localeCompare(b.nama); }));
    });
    UI.$$('[data-lihat]', el).forEach(function (b) { b.addEventListener('click', function () { profil(b.dataset.lihat, el); }); });
  }

  /* ── Profil murid ── */
  function profil(id, elInduk) {
    var m = App.DB.murid.filter(function (x) { return x.id === id; })[0]; if (!m) return;
    var k = D.kemajuan(m);
    var rekod = App.DB.rekod.filter(function (r) { return r.muridId === id; }).sort(function (a, b) { return new Date(b.tarikh) - new Date(a.tarikh); });
    var khatam = App.DB.khatam.filter(function (x) { return x.muridId === id; });
    var kk = m.darjah + '|' + m.kelas;
    var aksi = '';
    if (App.bolehTulis()) aksi += '<button class="btn btn-ghost" data-a="kedudukan">' + ikon('edit') + ' Betulkan kedudukan</button>';
    if (App.pentadbir()) aksi += '<button class="btn btn-ghost" data-a="edit">' + ikon('user') + ' Edit maklumat</button>';
    aksi = '<button class="btn btn-ghost" data-a="transkrip">' + ikon('file') + ' Transkrip</button>' + aksi;
    var bolehKecuali = (App.pentadbir() || (App.ialah('guru') && App.kelasSaya().indexOf(kk) >= 0)) && (m.status === 'Aktif' || m.status === 'Dikecualikan');
    if (bolehKecuali) aksi = (m.status === 'Aktif' ? '<button class="btn btn-ghost" data-a="kecuali">' + ikon('x') + ' Kecualikan</button>' : '<button class="btn btn-ghost" data-a="aktif">' + ikon('check') + ' Aktifkan semula</button>') + aksi;
    if (App.bolehTulis() && m.status === 'Aktif') aksi += '<a class="btn btn-utama" href="#/rekod/' + esc(id) + '" data-a="rekod">' + ikon('book') + ' Rekod tasmik</a>';

    var m2 = UI.modal({
      tajuk: UI.namaPendek(m.nama), besar: true,
      isi: '<div class="profil-kepala"><span class="avatar besar ' + UI.tonPeringkat(m.peringkat) + '">' + esc(UI.inisial(m.nama)) + '</span><div><h3>' + esc(m.nama) + '</h3><p class="lembut">' + esc(App.labelKelasPenuh(kk)) + ' · ' + esc(m.jenis || '') + (m.status !== 'Aktif' ? ' · ' + esc(m.status) : '') + '</p></div></div>' +
        (m.status === 'Dikecualikan' ? '<div class="amaran-kotak">' + ikon('info') + '<div><b>Dikecualikan daripada tasmik</b><p>Murid ini tidak dipaparkan dalam senarai tasmik, laporan dan amaran (cth murid bukan Islam). Rekod lama kekal.</p></div></div>' : '') +
        (m.status === 'Pindah' ? '<div class="amaran-kotak">' + ikon('transfer') + '<div><b>Berpindah' + (m.sekolahBaharu ? ' ke ' + esc(m.sekolahBaharu) : '') + '</b><p>' + (m.tarikhPindah ? 'Tarikh: ' + esc(UI.tarikh(m.tarikhPindah, true)) + '. ' : '') + 'Cetak transkrip untuk diserahkan kepada sekolah baharu.</p></div></div>' : '') +
        '<div class="kemajuan-mini">' + UI.bar(k.pct, k.fasa === 'Al-Quran' ? 'ungu' : '') + '<span>' + esc(k.kedudukan) + ' · ' + k.pct + '% keseluruhan' + ((m.bilKhatam || 0) > 0 ? ' · Khatam ' + m.bilKhatam + 'x' : '') + '</span></div>' +
        (m.kodIbuBapa && (App.pentadbir() || bolehCetak(kk)) ? '<div class="kod-kotak"><div><small>Kod ibu bapa</small><b>' + esc(m.kodIbuBapa) + '</b></div>' +
          '<button class="btn btn-ghost btn-kecil" data-a="slip">' + ikon('qr') + ' Cetak slip</button>' +
          '<button class="btn btn-ghost btn-kecil" data-a="salin">' + ikon('file') + ' Salin pautan</button>' +
          (App.pentadbir() ? '<button class="btn btn-ghost btn-kecil" data-a="jana">' + ikon('refresh') + ' Jana kod baharu</button>' : '') + '</div>' : '') +
        (m.ditambahOleh ? '<p class="lembut kecil">Didaftarkan ' + esc(UI.tarikh(m.tarikhDaftar)) + ' oleh ' + esc(m.ditambahOleh) + '</p>' : '') +
        '<h4>Sejarah tasmik <span class="lembut">(' + rekod.length + ' sesi)</span></h4>' +
        (rekod.length ? '<div class="jadual-wrap"><table class="jadual"><thead><tr><th>Tarikh</th><th>Bacaan</th><th>M/S</th><th>Penilaian</th><th>Guru</th></tr></thead><tbody>' +
          rekod.slice(0, 60).map(function (r) {
            return '<tr><td>' + esc(UI.tarikh(r.tarikh)) + '</td><td>' + esc(r.iqraLabel || r.peringkat) + '</td><td>' + esc(r.dari + '–' + r.ke) + '</td><td>' + UI.lencanaKualiti(r.kualiti) + (r.catatan ? '<br><small class="lembut">' + esc(r.catatan) + '</small>' : '') + '</td><td>' + esc(r.guru || '') + '</td></tr>';
          }).join('') + '</tbody></table></div>' : UI.kosong('book', 'Belum ada rekod')) +
        (khatam.length ? '<h4>Khatam</h4><ul class="senarai">' + khatam.map(function (x) { return '<li class="baris">' + UI.lencana('Ke-' + x.bilangan, 'emas') + '<span>' + esc(UI.tarikh(x.tarikh)) + '</span></li>'; }).join('') + '</ul>' : ''),
      kaki: (App.pentadbir() && m.status !== 'Padam' ? '<button class="btn btn-teks bahaya" data-a="padam">' + ikon('trash') + ' Padam</button><span class="ruang"></span>' : '') + aksi
    });
    m2.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.dataset.a;
      if (a === 'rekod') { m2.tutup(); return; }
      if (a === 'transkrip') { m2.tutup(); Transkrip.buka(m); return; }
      if (a === 'kecuali' || a === 'aktif') {
        var keStatus = a === 'kecuali' ? 'Dikecualikan' : 'Aktif';
        UI.sahkan(a === 'kecuali' ? 'Kecualikan daripada tasmik?' : 'Aktifkan semula?',
          a === 'kecuali' ? '<b>' + esc(m.nama) + '</b> tidak akan dipaparkan lagi dalam senarai tasmik, laporan dan amaran (cth murid bukan Islam). Boleh diaktifkan semula bila-bila masa melalui penapis "Dikecualikan".'
            : '<b>' + esc(m.nama) + '</b> akan dipaparkan semula dalam senarai tasmik.', a === 'kecuali' ? 'Kecualikan' : 'Aktifkan').then(function (ya) {
          if (!ya) return;
          Sync.tulis([{ op: 'update', table: 'Murid', id: m.id, patch: { status: keStatus } }], 'status murid');
          m2.tutup(); App.bina(); papar(UI.$('#kandungan')); Shell.kiraanAmaran();
          UI.toast(a === 'kecuali' ? UI.namaPendek(m.nama) + ' dikecualikan' : UI.namaPendek(m.nama) + ' diaktifkan semula', 'ok');
        });
        return;
      }
      if (a === 'edit') { m2.tutup(); borang(m, elInduk); }
      if (a === 'kedudukan') { m2.tutup(); borangKedudukan(m, elInduk); }
      if (a === 'slip') { m2.tutup(); Cetak.slip([m]); }
      if (a === 'salin') {
        var url = Cetak.pautanIbuBapa(m.kodIbuBapa);
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { UI.toast('Pautan disalin — boleh dihantar melalui WhatsApp', 'ok'); }, function () { prompt('Salin pautan ini:', url); });
      }
      if (a === 'jana') {
        UI.sahkan('Jana kod baharu?', 'Kod lama <b>' + esc(m.kodIbuBapa) + '</b> tidak akan berfungsi lagi. Slip QR baharu perlu diberi kepada ibu bapa.', 'Jana kod baharu', true).then(function (ya) {
          if (!ya) return;
          API.panggil('janaKod', { muridIds: [m.id] }).then(function (r) {
            if (!r.ok) return UI.toast(r.msg, 'err');
            m.kodIbuBapa = r.kod[m.id]; App.simpanDB(); m2.tutup(); profil(m.id, elInduk); UI.toast('Kod baharu: ' + m.kodIbuBapa, 'ok');
          });
        });
      }
      if (a === 'padam') {
        UI.sahkan('Padam murid?', '<b>' + esc(m.nama) + '</b> akan dikeluarkan dari senarai. Rekod tasmik lama kekal tersimpan dalam Google Sheet. Untuk murid berpindah, lebih baik tukar status kepada "Pindah".', 'Padam murid', true).then(function (ya) {
          if (!ya) return;
          Sync.tulis([{ op: 'delete', table: 'Murid', id: m.id }], 'padam murid'); m2.tutup(); App.bina(); papar(elInduk.closest('#kandungan') || UI.$('#kandungan'));
          UI.toast('Murid dipadam', 'ok');
        });
      }
    });
  }

  /* Guru boleh betulkan kedudukan bacaan (bukan maklumat peribadi) */
  function borangKedudukan(m, elInduk) {
    var md = UI.modal({
      tajuk: 'Betulkan kedudukan bacaan',
      isi: '<form id="fKd" class="borang"><p class="lembut">' + esc(m.nama) + '</p>' +
        '<label class="medan"><span>Jenis</span><select id="kdJ">' + D.JENIS.map(function (j) { return '<option' + ((m.jenis || 'Iqra Baru') === j ? ' selected' : '') + '>' + j + '</option>'; }).join('') + '</select></label>' +
        '<label class="medan"><span>Peringkat</span><select id="kdP">' + D.PERINGKAT.map(function (p) { return '<option' + (m.peringkat === p ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select></label>' +
        '<label class="medan"><span>Muka surat terakhir dibaca</span><input id="kdM" type="number" inputmode="numeric" min="0" max="604" value="' + esc(m.mukaSurat || 0) + '"></label></form>',
      kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-utama" id="kdSimpan">Simpan</button>'
    });
    UI.$('#kdSimpan', md).addEventListener('click', function () {
      var j = UI.$('#kdJ', md).value, p = UI.$('#kdP', md).value, ms = parseInt(UI.$('#kdM', md).value, 10) || 0;
      if (p === 'Al-Quran' || p === 'Khatam') j = 'Al-Quran';
      Sync.tulis([{ op: 'update', table: 'Murid', id: m.id, patch: { jenis: j, peringkat: p, mukaSurat: ms, iqraLabel: p === 'Khatam' ? 'Khatam' : D.labelBacaan(j, p, ms || 1, ms || 1) } }], 'kedudukan');
      md.tutup(); App.bina(); paparSenarai(elInduk); UI.toast('Kedudukan dikemas kini', 'ok');
    });
  }

  /* ── Tambah / edit murid (pentadbir) ── */
  function borang(m, elInduk) {
    var baru = !m; m = m || { jenis: 'Iqra Baru', peringkat: 'Iqra 1', mukaSurat: 0, status: 'Aktif' };
    var kelasNama = App.namaKelasSekolah();
    var guruSahaja = !App.pentadbir();
    var kelasGuru = App.kelasSaya();
    var md = UI.modal({
      tajuk: baru ? 'Tambah murid' : 'Edit murid',
      isi: '<form id="fM" class="borang">' +
        '<label class="medan"><span>Nama penuh</span><input id="fmNama" required maxlength="120" value="' + esc(m.nama || '') + '" autofocus></label>' +
        (guruSahaja ? '<label class="medan"><span>Kelas</span><select id="fmDK">' + kelasGuru.map(function (k) { return '<option value="' + esc(k) + '"' + ((App.skop || st.kelas) === k ? ' selected' : '') + '>' + esc(App.labelKelasPenuh(k)) + '</option>'; }).join('') + '</select></label>' +
          '<p class="lembut kecil">' + ikon('info') + ' Untuk murid pindah masuk: isi kedudukan bacaan semasa supaya tasmik diteruskan dari situ. Penyelaras akan nampak nama anda sebagai pendaftar.</p>' :
        '<div class="baris-medan"><label class="medan"><span>Darjah</span><select id="fmD">' + D.DARJAH.map(function (d) { return '<option' + (m.darjah === d ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select></label>' +
        '<label class="medan"><span>Kelas</span><input id="fmK" required list="senaraiKelasNama" maxlength="40" value="' + esc(m.kelas || (kelasNama[0] || '')) + '"><datalist id="senaraiKelasNama">' + kelasNama.map(function (k) { return '<option value="' + esc(k) + '">'; }).join('') + '</datalist></label></div>') +
        '<div class="baris-medan"><label class="medan"><span>Jenis</span><select id="fmJ">' + D.JENIS.map(function (j) { return '<option' + (m.jenis === j ? ' selected' : '') + '>' + j + '</option>'; }).join('') + '</select></label>' +
        '<label class="medan"><span>Peringkat</span><select id="fmP">' + D.PERINGKAT.map(function (p) { return '<option' + (m.peringkat === p ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select></label>' +
        '<label class="medan"><span>M/S terakhir</span><input id="fmM" type="number" min="0" max="604" value="' + esc(m.mukaSurat || 0) + '"></label></div>' +
        (baru ? '' : '<label class="medan"><span>Status</span><select id="fmS">' + ['Aktif', 'Pindah', 'Tamat', 'Dikecualikan'].map(function (s) { return '<option value="' + s + '"' + (m.status === s ? ' selected' : '') + '>' + (s === 'Tamat' ? 'Alumni (tamat Darjah 6)' : s === 'Pindah' ? 'Pindah keluar' : s) + '</option>'; }).join('') + '</select></label>' +
          '<div class="baris-medan" id="fmPindah"><label class="medan"><span>Tarikh pindah</span><input type="date" id="fmTP" value="' + esc(String(m.tarikhPindah || new Date().toISOString()).slice(0, 10)) + '"></label>' +
          '<label class="medan"><span>Sekolah baharu (jika diketahui)</span><input id="fmSB" maxlength="120" value="' + esc(m.sekolahBaharu || '') + '"></label></div>') +
        '<p class="ralat-borang" id="fmRalat" hidden></p></form>',
      kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-utama" id="fmSimpan">' + (baru ? 'Tambah murid' : 'Simpan') + '</button>'
    });
    var fs = UI.$('#fmS', md);
    function togolPindah() { var w = UI.$('#fmPindah', md); if (w) w.hidden = !fs || fs.value !== 'Pindah'; }
    if (fs) fs.addEventListener('change', togolPindah); togolPindah();
    UI.$('#fmSimpan', md).addEventListener('click', function () {
      var nama = UI.$('#fmNama', md).value.trim().toUpperCase().replace(/\s+/g, ' ');
      var dk = guruSahaja ? UI.$('#fmDK', md).value.split('|') : [UI.$('#fmD', md).value, TasmikCore.normalKelas(UI.$('#fmK', md).value)];
      var row = { nama: nama, darjah: dk[0], kelas: dk[1], jenis: UI.$('#fmJ', md).value, peringkat: UI.$('#fmP', md).value, mukaSurat: parseInt(UI.$('#fmM', md).value, 10) || 0 };
      if (row.peringkat === 'Al-Quran' || row.peringkat === 'Khatam') row.jenis = 'Al-Quran';
      row.iqraLabel = D.labelBacaan(row.jenis, row.peringkat, row.mukaSurat || 1, row.mukaSurat || 1);
      var r = UI.$('#fmRalat', md);
      if (nama.length < 3 || !row.kelas) { r.hidden = false; r.textContent = 'Isi nama dan kelas.'; return; }
      var dup = App.DB.murid.some(function (x) { return x.id !== m.id && x.status === 'Aktif' && x.nama === nama && x.darjah === row.darjah && x.kelas === row.kelas; });
      if (dup) { r.hidden = false; r.textContent = 'Murid dengan nama ini sudah wujud dalam kelas tersebut.'; return; }
      var btn = this; btn.disabled = true;
      if (baru) {
        Sync.tulisTerus([{ op: 'insert', table: 'Murid', id: App.genId('M'), row: Object.assign(row, { status: 'Aktif', tarikhDaftar: new Date().toISOString() }) }]).then(function (x) {
          btn.disabled = false;
          if (!x.ok) { r.hidden = false; r.textContent = x.rangkaian ? 'Tambah murid perlukan internet.' : x.msg; return; }
          var mb = App.DB.murid.filter(function (q) { return q.id === x.hasil[0].id; })[0];
          if (mb) { mb.ditambahOleh = App.user.nama + ' (' + App.user.peranan + ')'; App.simpanDB(); }
          md.tutup(); App.bina(); paparSenarai(elInduk); UI.toast(nama + ' ditambah · kod ibu bapa ' + (x.hasil[0].kodIbuBapa || ''), 'ok', 5000);
        });
      } else {
        row.status = UI.$('#fmS', md).value;
        var jadiPindah = row.status === 'Pindah' && m.status !== 'Pindah';
        if (row.status === 'Pindah') { row.tarikhPindah = UI.$('#fmTP', md).value; row.sekolahBaharu = UI.$('#fmSB', md).value.trim(); }
        Sync.tulis([{ op: 'update', table: 'Murid', id: m.id, patch: row }], 'edit murid');
        md.tutup(); App.bina(); paparSenarai(elInduk); UI.toast('Disimpan', 'ok');
        if (jadiPindah) {
          UI.sahkan('Cetak transkrip?', '<b>' + esc(nama) + '</b> ditanda berpindah. Cetak transkrip bacaan dan Bestari Solat untuk diserahkan kepada sekolah baharu?', 'Sediakan transkrip').then(function (ya) {
            if (ya) Transkrip.buka(App.DB.murid.filter(function (q) { return q.id === m.id; })[0]);
          });
        }
      }
    });
  }

  /* ── Kumpulan bacaan ── */
  var WARNA = ['#0b5d4b', '#2563eb', '#c2410c', '#7c3aed', '#be185d', '#a16207', '#0f766e', '#475569'];
  function paparKumpulan(el) {
    var kelas = App.skop ? [App.skop] : App.kelasSaya();
    if (!st.kelas || kelas.indexOf(st.kelas) < 0) st.kelas = kelas[0] || '';
    var list = App.DB.kumpulan.filter(function (k) { return k.darjah + '|' + k.kelas === st.kelas; });
    var murid = App.DB.murid.filter(function (m) { return m.status === 'Aktif' && m.darjah + '|' + m.kelas === st.kelas; });
    el.innerHTML = '<section class="kad"><div class="alat">' +
      (kelas.length > 1 ? '<select id="kpKelas" aria-label="Kelas">' + kelas.map(function (k) { return '<option value="' + esc(k) + '"' + (st.kelas === k ? ' selected' : '') + '>' + esc(App.labelKelasPenuh(k)) + '</option>'; }).join('') + '</select>' : '<b>' + esc(App.labelKelasPenuh(st.kelas)) + '</b>') +
      '<span class="ruang"></span>' + (App.bolehTulis() && st.kelas ? '<button class="btn btn-utama" id="kpTambah">' + ikon('plus') + ' Kumpulan baharu</button>' : '') + '</div>' +
      '<p class="lembut kecil">Pecahkan murid kepada kumpulan (cth: Kumpulan A, B, C). Kumpulan muncul sebagai penapis pantas di halaman Rekod Tasmik.</p>' +
      (list.length ? '<div class="grid-kumpulan">' + list.map(function (k) {
        var ids = String(k.muridIds || '').split(',').filter(Boolean);
        var nm = murid.filter(function (m) { return ids.indexOf(m.id) >= 0; });
        return '<article class="kumpulan" style="--warna:' + esc(k.warna || WARNA[0]) + '"><div class="kumpulan-kepala"><b>' + esc(k.nama) + '</b>' + UI.lencana(nm.length + ' murid', 'muted') +
          (App.bolehTulis() ? '<button class="btn-ikon" data-ed="' + esc(k.id) + '" aria-label="Edit kumpulan">' + ikon('edit') + '</button>' : '') + '</div>' +
          '<ul>' + nm.map(function (m) { return '<li>' + esc(UI.namaPendek(m.nama)) + ' <small class="lembut">' + esc(D.kemajuan(m).kedudukan) + '</small></li>'; }).join('') + '</ul></article>';
      }).join('') + '</div>' : UI.kosong('layers', 'Belum ada kumpulan', 'Cipta kumpulan untuk memudahkan tasmik secara berkumpulan.')) + '</section>';
    var kk = UI.$('#kpKelas'); if (kk) kk.addEventListener('change', function () { st.kelas = this.value; paparKumpulan(el); });
    var t = UI.$('#kpTambah'); if (t) t.addEventListener('click', function () { borangKumpulan(null, murid, el); });
    UI.$$('[data-ed]', el).forEach(function (b) { b.addEventListener('click', function () { borangKumpulan(App.DB.kumpulan.filter(function (k) { return k.id === b.dataset.ed; })[0], murid, el); }); });
  }

  function borangKumpulan(k, murid, el) {
    var baru = !k; k = k || { nama: 'Kumpulan ' + String.fromCharCode(65 + App.DB.kumpulan.filter(function (x) { return x.darjah + '|' + x.kelas === st.kelas; }).length), warna: WARNA[0], muridIds: '' };
    var ids = String(k.muridIds || '').split(',');
    var lain = {};
    App.DB.kumpulan.forEach(function (x) { if (x.id !== k.id && x.darjah + '|' + x.kelas === st.kelas) String(x.muridIds || '').split(',').forEach(function (i) { lain[i] = x.nama; }); });
    var md = UI.modal({
      tajuk: baru ? 'Kumpulan baharu' : 'Edit kumpulan',
      isi: '<form class="borang"><label class="medan"><span>Nama kumpulan</span><input id="kpNama" maxlength="40" value="' + esc(k.nama) + '"></label>' +
        '<fieldset class="warna-pilih"><legend>Warna</legend>' + WARNA.map(function (w) { return '<label><input type="radio" name="kpW" value="' + w + '"' + (k.warna === w ? ' checked' : '') + '><span style="background:' + w + '"></span></label>'; }).join('') + '</fieldset>' +
        '<fieldset class="semak-murid"><legend>Ahli (' + murid.length + ' murid)</legend>' + murid.map(function (m) {
          return '<label class="semak"><input type="checkbox" value="' + esc(m.id) + '"' + (ids.indexOf(m.id) >= 0 ? ' checked' : '') + '><span>' + esc(UI.namaPendek(m.nama)) + (lain[m.id] ? ' <small class="lembut">(' + esc(lain[m.id]) + ')</small>' : '') + '</span></label>';
        }).join('') + '</fieldset></form>',
      kaki: (baru ? '' : '<button class="btn btn-teks bahaya" id="kpPadam">' + ikon('trash') + ' Padam</button><span class="ruang"></span>') + '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn btn-utama" id="kpSimpan">Simpan</button>'
    });
    UI.$('#kpSimpan', md).addEventListener('click', function () {
      var p = st.kelas.split('|');
      var row = { nama: UI.$('#kpNama', md).value.trim() || 'Kumpulan', warna: (UI.$('input[name=kpW]:checked', md) || {}).value || WARNA[0], darjah: p[0], kelas: p[1],
        muridIds: UI.$$('.semak-murid input:checked', md).map(function (c) { return c.value; }).join(','), guruId: k.guruId || App.user.id };
      Sync.tulis([baru ? { op: 'insert', table: 'Kumpulan', id: App.genId('KP'), row: row } : { op: 'update', table: 'Kumpulan', id: k.id, patch: row }], 'kumpulan');
      md.tutup(); paparKumpulan(el); UI.toast('Kumpulan disimpan', 'ok');
    });
    var pd = UI.$('#kpPadam', md);
    if (pd) pd.addEventListener('click', function () { Sync.tulis([{ op: 'delete', table: 'Kumpulan', id: k.id }], 'kumpulan'); md.tutup(); paparKumpulan(el); UI.toast('Kumpulan dipadam', 'ok'); });
  }

  App.daftar('murid', { papar: papar });
})();
