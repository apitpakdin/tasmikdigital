/* LAPORAN BULANAN SEKOLAH — satu halaman A4 untuk Guru Besar / mesyuarat panitia */
var LaporanGB = (function () {
  var esc = UI.esc;

  /* Kira semua angka untuk bulan (0-11) & tahun tertentu. Fungsi tulen — mudah diuji. */
  function kira(DB, bulan, tahun) {
    var mula = new Date(tahun, bulan, 1), akhir = new Date(tahun, bulan + 1, 1);
    var dlm = function (t) { var d = new Date(t); return d >= mula && d < akhir; };
    var murid = DB.murid.filter(function (m) { return m.status === 'Aktif'; });
    var ids = {}; murid.forEach(function (m) { ids[m.id] = m; });
    var rekod = DB.rekod.filter(function (r) { return ids[r.muridId]; });
    var rb = rekod.filter(function (r) { return dlm(r.tarikh); });
    var ditasmik = {}; rb.forEach(function (r) { ditasmik[r.muridId] = 1; });
    var ms = rb.reduce(function (s, r) { return s + (parseInt(r.jumlah, 10) || 0); }, 0);

    // Kelas
    var kelas = {};
    murid.forEach(function (m) {
      var k = m.darjah + '|' + m.kelas;
      var x = kelas[k] = kelas[k] || { k: k, murid: 0, iqra: 0, quran: 0, sesi: 0, ditasmik: 0 };
      x.murid++;
      if (m.peringkat === 'Al-Quran' || m.peringkat === 'Khatam') x.quran++; else x.iqra++;
      if (ditasmik[m.id]) x.ditasmik++;
    });
    rb.forEach(function (r) { var m = ids[r.muridId]; kelas[m.darjah + '|' + m.kelas].sesi++; });
    var senaraiKelas = Object.keys(kelas).sort(function (a, b) { return a.localeCompare(b, 'ms', { numeric: true }); }).map(function (k) {
      var x = kelas[k]; x.liputan = x.murid ? Math.round(x.ditasmik / x.murid * 100) : 0; return x;
    });

    // Naik peringkat: peringkat terakhir sebelum bulan ini → peringkat terakhir dalam bulan ini
    var P = D.PERINGKAT, naik = [], keQuran = 0;
    var ikutMurid = {};
    rekod.forEach(function (r) { (ikutMurid[r.muridId] = ikutMurid[r.muridId] || []).push(r); });
    Object.keys(ikutMurid).forEach(function (id) {
      var rs = ikutMurid[id].sort(function (a, b) { return new Date(a.tarikh) - new Date(b.tarikh); });
      var sebelum = null, selepas = null;
      rs.forEach(function (r) { var d = new Date(r.tarikh); if (d < mula) sebelum = r; else if (d < akhir) selepas = r; });
      if (!selepas) return;
      var dari = (sebelum || rs.filter(function (r) { return dlm(r.tarikh); })[0]).peringkat;
      var ke = selepas.peringkat;
      if (P.indexOf(ke) > P.indexOf(dari) && P.indexOf(dari) >= 0) {
        naik.push({ m: ids[id], dari: dari, ke: ke });
        if (/^Iqra/.test(dari) && (ke === 'Al-Quran' || ke === 'Khatam')) keQuran++;
      }
    });

    // Khatam
    var khatamBulan = DB.khatam.filter(function (k) { return dlm(k.tarikh); });
    var khatamTahun = DB.khatam.filter(function (k) { return Number(k.tahun) === tahun || new Date(k.tarikh).getFullYear() === tahun; }).length;

    // Guru paling aktif (tidak termasuk Super Admin)
    var guru = {};
    var sa = {}; DB.guru.forEach(function (g) { if (g.peranan === 'superadmin') sa[g.id] = 1; });
    rb.forEach(function (r) {
      if (sa[r.guruId]) return;
      var g = guru[r.guruId || r.guru] = guru[r.guruId || r.guru] || { nama: r.guru || '—', sesi: 0, murid: {} };
      g.sesi++; g.murid[r.muridId] = 1;
    });
    var guruAktif = Object.keys(guru).map(function (k) { return { nama: guru[k].nama, sesi: guru[k].sesi, murid: Object.keys(guru[k].murid).length }; })
      .sort(function (a, b) { return b.sesi - a.sesi; });

    return {
      bulan: bulan, tahun: tahun,
      murid: murid.length, sesi: rb.length, ditasmik: Object.keys(ditasmik).length,
      liputan: murid.length ? Math.round(Object.keys(ditasmik).length / murid.length * 100) : 0,
      ms: ms, kelas: senaraiKelas, naik: naik, keQuran: keQuran,
      khatamBulan: khatamBulan, khatamTahun: khatamTahun, guru: guruAktif,
      tiadaRekod: murid.length - Object.keys(ditasmik).length,
      kelasRendah: senaraiKelas.filter(function (x) { return x.murid && x.liputan < 50; })
    };
  }

  function kotak(nilai, label) { return '<div class="lgb-kpi"><b>' + esc(nilai) + '</b><span>' + esc(label) + '</span></div>'; }

  function cetak(bulan, tahun) {
    var c = App.DB.config, x = kira(App.DB, bulan, tahun);
    // Penyedia: penyelaras yang mencetak, atau penyelaras aktif pertama (bukan GB / Super Admin)
    var penyedia = App.user.peranan === 'penyelaras' ? App.user
      : App.DB.guru.filter(function (g) { return g.peranan === 'penyelaras' && g.status === 'Aktif'; })[0];
    var bl = D.BULAN_PENUH[bulan] + ' ' + tahun;
    var lk = function (k) { return App.labelKelas(k); };
    var html = '<div class="halaman-cetak lgb">' + Cetak.kop() +
      '<h2 class="tajuk-laporan">LAPORAN BULANAN PROGRAM TASMIK AL-QURAN</h2><p class="sub-laporan">' + esc(bl.toUpperCase()) + '</p>' +
      '<div class="lgb-kpis">' + kotak(x.murid, 'Murid aktif') + kotak(x.sesi, 'Sesi tasmik') + kotak(x.liputan + '%', 'Murid ditasmik (' + x.ditasmik + ')') +
        kotak(x.ms, 'Muka surat dibaca') + kotak(x.naik.length, 'Naik peringkat') + kotak(x.khatamBulan.length, 'Khatam bulan ini') + '</div>' +

      '<h3>1. Prestasi mengikut kelas</h3>' +
      '<table class="jadual-cetak"><thead><tr><th>Kelas</th><th>Murid</th><th>Iqra</th><th>Al-Quran</th><th>Sesi</th><th>Murid ditasmik</th><th>Liputan</th><th>Purata sesi / murid</th></tr></thead><tbody>' +
      (x.kelas.length ? x.kelas.map(function (k) {
        return '<tr><td>' + esc(App.labelKelasPenuh(k.k)) + '</td><td>' + k.murid + '</td><td>' + k.iqra + '</td><td>' + k.quran + '</td><td>' + k.sesi + '</td><td>' + k.ditasmik + '</td><td><b>' + k.liputan + '%</b></td><td>' + (k.murid ? (k.sesi / k.murid).toFixed(1) : '0') + '</td></tr>';
      }).join('') : '<tr><td colspan="8">Tiada kelas</td></tr>') +
      '<tr class="lgb-jumlah"><td>JUMLAH</td><td>' + x.murid + '</td><td>' + x.kelas.reduce(function (s, k) { return s + k.iqra; }, 0) + '</td><td>' + x.kelas.reduce(function (s, k) { return s + k.quran; }, 0) +
      '</td><td>' + x.sesi + '</td><td>' + x.ditasmik + '</td><td><b>' + x.liputan + '%</b></td><td>' + (x.murid ? (x.sesi / x.murid).toFixed(1) : '0') + '</td></tr>' +
      '</tbody></table>' +

      '<div class="lgb-dua">' +
      '<div><h3>2. Pencapaian bulan ini</h3><ul>' +
        '<li><b>' + x.naik.length + '</b> murid naik peringkat bacaan' + (x.keQuran ? ', termasuk <b>' + x.keQuran + '</b> murid beralih dari Iqra ke Al-Quran' : '') + '.</li>' +
        '<li><b>' + x.khatamBulan.length + '</b> murid khatam bulan ini (<b>' + x.khatamTahun + '</b> sepanjang ' + tahun + ').</li>' +
        (x.khatamBulan.length ? '<li class="lgb-nama">' + x.khatamBulan.slice(0, 8).map(function (k) { return esc(k.muridNama || k.nama || '') + ' (' + esc(lk(k.darjah + '|' + k.kelas)) + ')'; }).join('; ') + (x.khatamBulan.length > 8 ? '; dan ' + (x.khatamBulan.length - 8) + ' lagi' : '') + '</li>' : '') +
      '</ul></div>' +
      '<div><h3>3. Guru paling aktif</h3>' +
        (x.guru.length ? '<table class="jadual-cetak"><thead><tr><th>Guru</th><th>Sesi</th><th>Murid</th></tr></thead><tbody>' +
          x.guru.slice(0, 5).map(function (g) { return '<tr><td>' + esc(g.nama) + '</td><td>' + g.sesi + '</td><td>' + g.murid + '</td></tr>'; }).join('') + '</tbody></table>'
          : '<p>Tiada rekod bulan ini.</p>') +
      '</div></div>' +

      '<h3>4. Perlu perhatian</h3><ul>' +
        '<li><b>' + x.tiadaRekod + '</b> murid tidak ditasmik langsung pada bulan ini.</li>' +
        (x.kelasRendah.length ? '<li>Kelas dengan liputan bawah 50%: ' + x.kelasRendah.map(function (k) { return '<b>' + esc(lk(k.k)) + '</b> (' + k.liputan + '%)'; }).join(', ') + '.</li>'
          : '<li>Semua kelas mencapai liputan 50% ke atas.</li>') +
      '</ul>' +

      '<div class="tandatangan"><div><p>Disediakan oleh:</p><span class="garis"></span><b>' + esc(penyedia ? penyedia.nama : '') + '</b><small>Penyelaras Program Tasmik</small></div>' +
      '<div><p>Disahkan oleh:</p><span class="garis"></span><b>' + esc(c.namaGB || '') + '</b><small>' + esc(c.jawatanGB || 'Guru Besar') + '</small><small>Tarikh: ' + esc(UI.tarikh(new Date().toISOString(), true)) + '</small></div></div>' +
      '<footer class="kaki-cetak">Dijana melalui Tasmik Digital pada ' + esc(UI.tarikh(new Date().toISOString(), true) + ', ' + UI.masa(new Date().toISOString())) + '</footer></div>';
    var el = Cetak.kawasan();
    el.innerHTML = Cetak.bingkai(html);
    Cetak.cetakSekarang(el);
  }

  return { kira: kira, cetak: cetak };
})();
