/* SASARAN KHATAM TAHUN 6 — anggaran muka surat seminggu untuk khatam sebelum tarikh sasaran */
var SasaranKhatam = (function () {
  var esc = UI.esc, ikon = UI.ikon;

  function tarikhSasaran(config, kini) {
    // Google Sheet mungkin menukar "2026-10-31" kepada tarikh (dibaca semula sebagai ISO penuh)
    var v = config && config.sasaranKhatam ? String(config.sasaranKhatam) : '';
    var t = v ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T00:00:00' : v) : null;
    if (t && !isNaN(t)) return t;
    // Lalai: 31 Oktober; selepas itu 31 Disember (hujung sesi persekolahan)
    kini = kini || new Date();
    var okt = new Date(kini.getFullYear(), 9, 31);
    return kini <= new Date(okt.getTime() + 864e5) ? okt : new Date(kini.getFullYear(), 11, 31);
  }

  /* Baki muka surat sehingga khatam (Iqra yang belum habis + 604 m/s Al-Quran) */
  function baki(m) {
    var ms = parseInt(m.mukaSurat, 10) || 0, p = m.peringkat || 'Iqra 1';
    if (p === 'Al-Quran' || m.jenis === 'Al-Quran') return Math.max(0, D.QURAN_MS - ms);
    var t = D.jadualIqra(m.jenis), idx = D.IQRA_SAHAJA.indexOf(p), n = 0;
    D.IQRA_SAHAJA.forEach(function (pp, i) {
      var r = t[pp]; if (!r || i < idx) return;
      n += i === idx ? Math.max(0, r.ke - Math.max(ms, r.dari - 1)) : r.ke - r.dari + 1;
    });
    return n + D.QURAN_MS;
  }

  /* Fungsi tulen: senarai murid Darjah 6 yang belum khatam + status */
  function kira(murid, rekod, sasaran, kini) {
    kini = kini || new Date();
    var mingguBaki = Math.max(1, Math.ceil((sasaran - kini) / (7 * 864e5)));
    var dulu = new Date(kini - 28 * 864e5);
    var bacaan = {};
    rekod.forEach(function (r) { var d = new Date(r.tarikh); if (d >= dulu && d <= kini) bacaan[r.muridId] = (bacaan[r.muridId] || 0) + (parseInt(r.jumlah, 10) || 0); });
    return murid.filter(function (m) {
      return m.status === 'Aktif' && m.darjah === 'Darjah 6' && m.peringkat !== 'Khatam' && !(parseInt(m.bilKhatam, 10) > 0);
    }).map(function (m) {
      var b = baki(m), perlu = Math.ceil(b / mingguBaki), kadar = Math.round((bacaan[m.id] || 0) / 4);
      var tahap = kadar >= perlu ? 0 : perlu <= kadar * 1.5 ? 1 : 2;
      return { m: m, baki: b, perlu: perlu, kadar: kadar, tahap: tahap, mingguBaki: mingguBaki };
    }).sort(function (a, b) { return b.tahap - a.tahap || b.baki - a.baki; });
  }

  var LABEL = [['Atas landasan', 'ok'], ['Perlu dipercepat', 'warn'], ['Berisiko', 'bad']];

  function kad(murid) {
    var c = App.DB.config || {}, kini = new Date(), sasaran = tarikhSasaran(c, kini);
    var x = kira(murid, App.DB.rekod, sasaran, kini);
    if (!x.length) return '';
    var lepas = sasaran < kini;
    var n = [0, 0, 0]; x.forEach(function (y) { n[y.tahap]++; });
    return '<section class="kad sasaran-khatam"><div class="alat"><div><h2>' + ikon('trophy') + ' Sasaran Khatam Tahun 6</h2>' +
      '<p class="lembut kecil">' + x.length + ' murid belum khatam · sasaran ' + esc(UI.tarikh(sasaran.toISOString(), true)) +
      (lepas ? ' (telah lepas)' : ' · ' + x[0].mingguBaki + ' minggu lagi') + '</p></div><span class="ruang"></span>' +
      (App.pentadbir() ? '<label class="medan sebaris"><span>Tarikh sasaran</span><input type="date" id="skTarikh" value="' + esc(ymd(sasaran)) + '"></label>' : '') +
      '<button class="btn btn-ghost" id="skCetak">' + ikon('printer') + ' Cetak</button></div>' +
      '<div class="cip-baris">' + LABEL.map(function (l, i) { return UI.lencana(l[0] + ': ' + n[i], l[1]); }).join(' ') + '</div>' +
      '<div class="jadual-wrap"><table class="jadual responsif"><thead><tr><th>Nama murid</th><th>Kelas</th><th>Kedudukan</th><th class="nombor">Baki m/s</th><th class="nombor">Perlu / minggu</th><th class="nombor">Bacaan semasa / minggu</th><th>Status</th></tr></thead><tbody>' +
      x.map(function (y) {
        return '<tr><td data-l="Nama"><b>' + esc(y.m.nama) + '</b></td><td data-l="Kelas">' + esc(App.labelKelas(y.m.darjah + '|' + y.m.kelas)) + '</td>' +
          '<td data-l="Kedudukan">' + esc(D.kemajuan(y.m).kedudukan) + '</td><td data-l="Baki m/s" class="nombor">' + y.baki + '</td>' +
          '<td data-l="Perlu / minggu" class="nombor"><b>' + y.perlu + '</b></td><td data-l="Semasa / minggu" class="nombor">' + y.kadar + '</td>' +
          '<td data-l="Status">' + UI.lencana(LABEL[y.tahap][0], LABEL[y.tahap][1]) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="lembut kecil">' + ikon('info') + ' "Bacaan semasa" = purata muka surat seminggu dalam 4 minggu terakhir. "Perlu / minggu" = baki muka surat ÷ minggu sehingga tarikh sasaran (termasuk minggu cuti).</p>' +
      '</section>';
  }

  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  function pasang(el, murid, ulang) {
    var t = UI.$('#skTarikh', el);
    if (t) t.addEventListener('change', function () {
      if (!this.value) return;
      API.panggil('setConfig', { values: { sasaranKhatam: this.value } }).then(function (r) {
        if (!r || !r.ok) throw new Error(r && r.msg || 'Gagal menyimpan');
        App.DB.config = r.config; App.simpanDB(); UI.toast('Tarikh sasaran khatam disimpan', 'ok'); ulang();
      }).catch(function (e) { UI.toast(e.message, 'err'); });
    });
    var b = UI.$('#skCetak', el);
    if (b) b.addEventListener('click', function () {
      var c = App.DB.config || {}, s = tarikhSasaran(c), x = kira(murid, App.DB.rekod, s);
      Cetak.laporan({ tajuk: 'Sasaran Khatam Al-Quran Tahun 6', sub: 'Sasaran: ' + UI.tarikh(s.toISOString(), true) + ' · ' + x.length + ' murid belum khatam',
        headers: ['Bil', 'Nama Murid', 'Kelas', 'Kedudukan', 'Baki M/S', 'Perlu / Minggu', 'Semasa / Minggu', 'Status'],
        rows: x.map(function (y, i) { return [i + 1, y.m.nama, App.labelKelas(y.m.darjah + '|' + y.m.kelas), D.kemajuan(y.m).kedudukan, y.baki, y.perlu, y.kadar, LABEL[y.tahap][0]]; }) });
    });
  }

  return { kira: kira, baki: baki, tarikhSasaran: tarikhSasaran, kad: kad, pasang: pasang };
})();
