/* KHATAM AL-QURAN */
(function () {
  var esc = UI.esc, ikon = UI.ikon;

  function papar(el) {
    var DB = App.DB;
    var murid = App.muridSaya();
    var ids = {}; murid.forEach(function (m) { ids[m.id] = 1; });
    var calon = murid.filter(function (m) { return m.peringkat === 'Al-Quran' || m.peringkat === 'Khatam'; })
      .sort(function (a, b) { return (parseInt(b.mukaSurat, 10) || 0) - (parseInt(a.mukaSurat, 10) || 0); });
    var tahun = new Date().getFullYear();
    var senarai = DB.khatam.filter(function (k) { return App.lihatSemua() && !App.skop ? true : ids[k.muridId]; });

    var html = '<section class="kad hero-emas"><div class="hero-isi">' + ikon('trophy', 'besar') +
      '<div><h1>Rekod Khatam Al-Quran</h1><p>' + senarai.filter(function (k) { return Number(k.tahun) === tahun; }).length + ' khatam tahun ' + tahun + ' · ' + senarai.length + ' keseluruhan</p></div></div></section>';

    if (App.bolehTulis()) {
      html += '<section class="kad"><div class="kad-kepala"><h2>Sahkan khatam</h2></div><div class="kad-badan">' +
        (calon.length ? '<form id="fKhatam" class="borang">' +
          '<label class="medan"><span>Murid (bacaan Al-Quran)</span><select id="ktM" required><option value="">— Pilih murid —</option>' +
          calon.map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(UI.namaPendek(m.nama) + ' · ' + App.labelKelas(m.darjah + '|' + m.kelas) + ' · ' + (m.peringkat === 'Khatam' ? 'Telah khatam ' + (m.bilKhatam || 1) + 'x' : 'Juzuk ' + D.juzuk(m.mukaSurat) + ', m/s ' + (m.mukaSurat || 0))) + '</option>'; }).join('') +
          '</select></label>' +
          '<div class="baris-medan"><label class="medan"><span>Tarikh khatam</span><input type="date" id="ktT" required value="' + new Date().toISOString().slice(0, 10) + '"></label>' +
          '<label class="medan"><span>Catatan</span><input id="ktC" maxlength="200" placeholder="cth: Majlis khatam perhimpunan"></label></div>' +
          '<p class="info-medan" id="ktInfo"></p>' +
          '<button class="btn btn-emas btn-besar" type="submit">' + ikon('trophy') + ' Sahkan khatam</button></form>'
          : UI.kosong('book', 'Tiada murid di peringkat Al-Quran', 'Murid akan muncul di sini selepas naik ke peringkat Al-Quran.')) +
        '</div></section>';
    }

    // ── Senarai khatam mengikut KELAS SEMASA murid ──
    var kumpulan = kumpulMengikutKelas(senarai);
    var tahunAda = {}; senarai.forEach(function (k) { if (k.tahun) tahunAda[k.tahun] = 1; });
    html += '<section class="kad"><div class="alat"><div><h2>Murid khatam mengikut kelas</h2><p class="lembut kecil">' +
      kumpulan.jumlahMurid + ' murid · ' + kumpulan.jumlahKhatam + ' kali khatam' + (stTahun ? ' pada ' + stTahun : '') + '</p></div><span class="ruang"></span>' +
      '<select id="ktTahun" aria-label="Tahun"><option value="">Semua tahun</option>' + Object.keys(tahunAda).sort().reverse().map(function (y) { return '<option' + (String(stTahun) === y ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select>' +
      '<button class="btn btn-ghost" id="ktCetak">' + ikon('printer') + ' Cetak</button><button class="btn btn-ghost" id="ktExcel">' + ikon('download') + ' Excel</button></div>' +
      (kumpulan.kelas.length ? '<div class="cip-baris">' + kumpulan.kelas.map(function (g) {
        return '<button class="cip" data-ke="kt-' + esc(g.id) + '">' + esc(g.label) + ' <b>' + g.murid.length + '</b></button>';
      }).join('') + '</div>' : '') + '</section>';

    html += kumpulan.kelas.length ? kumpulan.kelas.map(function (g) {
      return '<section class="kad khatam-kelas" id="kt-' + esc(g.id) + '"><div class="kad-kepala"><h2>' + ikon('users') + ' ' + esc(g.label) + '</h2>' +
        UI.lencana(g.murid.length + ' murid · ' + g.kali + ' kali khatam', 'emas') + '</div>' +
        '<div class="jadual-wrap"><table class="jadual responsif"><thead><tr><th>Bil</th><th>Nama murid</th><th>Bilangan khatam</th><th>Rekod khatam</th></tr></thead><tbody>' +
        g.murid.map(function (x, i) {
          return '<tr><td data-l="Bil">' + (i + 1) + '</td><td data-l="Nama"><b>' + esc(x.nama) + '</b>' + (x.kelasKhatam && x.kelasKhatam !== g.label ? '<br><small class="lembut">Khatam semasa di ' + esc(x.kelasKhatam) + '</small>' : '') + '</td>' +
            '<td data-l="Bilangan"><span class="pingat kecil">' + x.s.length + 'x</span></td>' +
            '<td data-l="Rekod"><div class="khatam-rekod">' + x.s.map(function (k) {
              return '<span>' + UI.lencana('Ke-' + k.bilangan, 'emas') + ' ' + esc(UI.tarikh(k.tarikh)) + (k.catatan ? ' <i class="lembut">' + esc(k.catatan) + '</i>' : '') + '</span>';
            }).join('') + '</div></td></tr>';
        }).join('') + '</tbody></table></div></section>';
    }).join('') : '<section class="kad">' + UI.kosong('trophy', 'Belum ada rekod khatam', stTahun ? 'Tiada khatam direkodkan pada ' + stTahun + '.' : 'Murid yang khatam akan disenaraikan di sini mengikut kelas.') + '</section>';
    el.innerHTML = html;

    UI.$$('[data-ke]', el).forEach(function (b) { b.addEventListener('click', function () { var t = document.getElementById(b.dataset.ke); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); });
    UI.$('#ktTahun').addEventListener('change', function () { stTahun = this.value; papar(el); });
    function jadual() {
      var rows = [], n = 0;
      kumpulan.kelas.forEach(function (g) { g.murid.forEach(function (x) { rows.push([++n, x.nama, g.label, x.s.length, x.s.map(function (k) { return 'Ke-' + k.bilangan + ' (' + UI.tarikh(k.tarikh) + ')'; }).join(', ')]); }); });
      return { tajuk: 'Senarai Murid Khatam Al-Quran', sub: (App.skop ? App.labelKelasPenuh(App.skop) : App.lihatSemua() ? 'Semua kelas' : 'Kelas saya') + (stTahun ? ' · Tahun ' + stTahun : ' · Semua tahun'),
        headers: ['Bil', 'Nama Murid', 'Kelas', 'Jumlah Khatam', 'Rekod Khatam'], rows: rows };
    }
    UI.$('#ktCetak').addEventListener('click', function () { Cetak.laporan(jadual()); });
    UI.$('#ktExcel').addEventListener('click', function () { var j = jadual(); Cetak.excel('Senarai_Khatam' + (stTahun ? '_' + stTahun : '') + '.xlsx', [{ nama: 'Khatam', headers: j.headers, rows: j.rows }]); });

    var f = UI.$('#fKhatam');
    if (!f) return;
    UI.$('#ktM').addEventListener('change', function () {
      var m = DB.murid.filter(function (x) { return x.id === this.value; }, this)[0];
      UI.$('#ktInfo').textContent = m ? 'Ini akan direkod sebagai khatam ke-' + ((parseInt(m.bilKhatam, 10) || 0) + 1) + ' untuk ' + UI.namaPendek(m.nama) + '.' : '';
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var m = DB.murid.filter(function (x) { return x.id === UI.$('#ktM').value; })[0];
      if (!m) return;
      var n = (parseInt(m.bilKhatam, 10) || 0) + 1;
      UI.sahkan('Sahkan khatam?', 'Sahkan <b>' + esc(m.nama) + '</b> telah khatam Al-Quran kali ke-' + n + '?', 'Ya, sahkan').then(function (ya) {
        if (!ya) return;
        var t = UI.$('#ktT').value;
        Sync.tulis([
          { op: 'insert', table: 'Khatam', id: App.genId('K'), row: { muridId: m.id, muridNama: m.nama, darjah: m.darjah, kelas: m.kelas, bilangan: n, tahun: parseInt(t.slice(0, 4), 10), tarikh: t, guru: App.user.nama, guruId: App.user.id, catatan: UI.$('#ktC').value.trim() } },
          { op: 'update', table: 'Murid', id: m.id, patch: { peringkat: 'Khatam', bilKhatam: n, mukaSurat: D.QURAN_MS } }
        ], 'khatam ' + m.nama);
        UI.toast('MasyaAllah! ' + UI.namaPendek(m.nama) + ' khatam kali ke-' + n, 'ok', 5000);
        App.bina(); papar(el);
      });
    });
  }

  var stTahun = '';

  /* Kumpul rekod khatam ikut kelas SEMASA murid (selepas naik darjah, murid
     berada di kelas baharunya). Murid alumni/pindah dikumpul berasingan. */
  function kumpulMengikutKelas(senarai) {
    var DB = App.DB, ikutMurid = {};
    senarai.filter(function (k) { return !stTahun || String(k.tahun) === String(stTahun); })
      .sort(function (a, b) { return (a.bilangan || 0) - (b.bilangan || 0); })
      .forEach(function (k) {
        var key = k.muridId || k.muridNama;
        (ikutMurid[key] = ikutMurid[key] || { muridId: k.muridId, nama: k.muridNama, kelasKhatam: ((k.darjah || '') + ' ' + (k.kelas || '')).trim(), s: [] }).s.push(k);
      });
    var kelas = {};
    Object.keys(ikutMurid).forEach(function (key) {
      var x = ikutMurid[key];
      var m = DB.murid.filter(function (y) { return y.id === x.muridId; })[0];
      var id, label, urut;
      if (m && m.status === 'Aktif') { id = m.darjah + '|' + m.kelas; label = m.darjah + ' ' + m.kelas; urut = '1' + id; x.nama = m.nama; }
      else if (m && m.status === 'Tamat') { id = 'alumni'; label = 'Alumni'; urut = '8'; }
      else if (m && m.status === 'Pindah') { id = 'pindah'; label = 'Telah berpindah'; urut = '9'; }
      else { id = 'lain|' + x.kelasKhatam; label = x.kelasKhatam || 'Tidak diketahui'; urut = '7' + label; }
      var g = kelas[id] = kelas[id] || { id: id.replace(/[^\w-]/g, '_'), label: label, urut: urut, murid: [], kali: 0 };
      g.murid.push(x); g.kali += x.s.length;
    });
    var list = Object.keys(kelas).map(function (k) { return kelas[k]; }).sort(function (a, b) { return a.urut.localeCompare(b.urut); });
    list.forEach(function (g) { g.murid.sort(function (a, b) { return b.s.length - a.s.length || a.nama.localeCompare(b.nama); }); });
    return { kelas: list, jumlahMurid: Object.keys(ikutMurid).length, jumlahKhatam: list.reduce(function (s, g) { return s + g.kali; }, 0) };
  }

  App.daftar('khatam', { papar: papar });
})();
