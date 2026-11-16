/* LAPORAN — paparan, cetak PDF rasmi & Excel */
(function () {
  var esc = UI.esc, ikon = UI.ikon;
  var kini = new Date();
  var st = { tab: 'murid', bulan: kini.getMonth(), tahun: kini.getFullYear() };

  var TAB = [
    { id: 'murid', label: 'Prestasi murid' },
    { id: 'kelas', label: 'Ringkasan kelas', lihatSemua: true },
    { id: 'mingguan', label: 'Mingguan' },
    { id: 'bulanan', label: 'Bulanan' },
    { id: 'rekod', label: 'Log rekod' },
    { id: 'guru', label: 'Aktiviti guru', lihatSemua: true },
    { id: 'kbs', label: 'Bestari Solat', kbs: true }
  ];

  function dalamBulan(t) { var d = new Date(t); return d.getFullYear() === st.tahun && d.getMonth() === st.bulan; }
  function labelSkop() { return App.skop ? App.labelKelasPenuh(App.skop) : (App.lihatSemua() ? 'Semua kelas' : App.kelasSaya().map(App.labelKelasPenuh).join(', ')); }
  function bulanLabel() { return D.BULAN_PENUH[st.bulan] + ' ' + st.tahun; }

  var JANA = {
    murid: function () {
      var murid = App.muridSaya().slice().sort(function (a, b) { return (a.darjah + a.kelas).localeCompare(b.darjah + b.kelas) || a.nama.localeCompare(b.nama); });
      return {
        tajuk: 'Laporan Prestasi Bacaan Murid', sub: labelSkop() + ' · ' + bulanLabel(),
        headers: ['Bil', 'Nama Murid', 'Kelas', 'Kedudukan', 'Kemajuan', 'Sesi Bulan Ini', 'M/S Bulan Ini', 'Tasmik Terakhir', 'Penilaian Terakhir'],
        rows: murid.map(function (m, i) {
          var rs = App.DB.rekod.filter(function (r) { return r.muridId === m.id && dalamBulan(r.tarikh); });
          var a = App.rekodAkhir(m.id), k = D.kemajuan(m);
          return [i + 1, m.nama, App.labelKelas(m.darjah + '|' + m.kelas), k.kedudukan, k.pct + '%', rs.length, rs.reduce(function (s, r) { return s + (parseInt(r.jumlah, 10) || 0); }, 0), a ? UI.tarikh(a.tarikh) : '—', a ? D.kualiti(a.kualiti).label : '—'];
        })
      };
    },
    kelas: function () {
      var mula = new Date(); mula.setDate(mula.getDate() - ((mula.getDay() + 6) % 7)); mula.setHours(0, 0, 0, 0);
      return {
        tajuk: 'Ringkasan Tasmik Mengikut Kelas', sub: bulanLabel(),
        headers: ['Kelas', 'Murid', 'Iqra', 'Al-Quran', 'Khatam', 'Sesi Bulan Ini', 'Purata Sesi/Murid', 'Liputan Minggu Ini'],
        rows: App.semuaKelas().map(function (k) {
          var ms = App.DB.murid.filter(function (m) { return m.status === 'Aktif' && m.darjah + '|' + m.kelas === k; });
          var ids = {}; ms.forEach(function (m) { ids[m.id] = 1; });
          var rs = App.DB.rekod.filter(function (r) { return ids[r.muridId] && dalamBulan(r.tarikh); });
          var u = {}; App.DB.rekod.forEach(function (r) { if (ids[r.muridId] && new Date(r.tarikh) >= mula) u[r.muridId] = 1; });
          return [App.labelKelasPenuh(k), ms.length, ms.filter(function (m) { return /^Iqra/.test(m.peringkat || 'Iqra'); }).length, ms.filter(function (m) { return m.peringkat === 'Al-Quran'; }).length,
            ms.filter(function (m) { return m.peringkat === 'Khatam'; }).length, rs.length, ms.length ? (rs.length / ms.length).toFixed(1) : '0', (ms.length ? Math.round(Object.keys(u).length / ms.length * 100) : 0) + '%'];
        })
      };
    },
    mingguan: function () {
      var rekod = App.rekodSaya(), hari = [];
      for (var i = 0; i < 21 && hari.length < 5; i++) { var d = new Date(); d.setDate(d.getDate() - i); if (d.getDay() >= 1 && d.getDay() <= 5) hari.unshift(d); }
      return {
        tajuk: 'Laporan Tasmik Mingguan', sub: labelSkop() + ' · 5 hari persekolahan terakhir',
        headers: ['Hari', 'Tarikh', 'Sesi', 'Murid', 'Jumlah M/S', '% Cemerlang'],
        rows: hari.map(function (d) {
          var rs = rekod.filter(function (r) { return new Date(r.tarikh).toDateString() === d.toDateString(); });
          var c = rs.filter(function (r) { return D.kualiti(r.kualiti).bintang === 3; }).length;
          return [D.HARI[d.getDay()], UI.tarikh(d.toISOString()), rs.length, new Set(rs.map(function (r) { return r.muridId; })).size, rs.reduce(function (s, r) { return s + (parseInt(r.jumlah, 10) || 0); }, 0), (rs.length ? Math.round(c / rs.length * 100) : 0) + '%'];
        })
      };
    },
    bulanan: function () {
      var rekod = App.rekodSaya();
      var ids = {}; App.muridSaya().forEach(function (m) { ids[m.id] = 1; });
      return {
        tajuk: 'Laporan Tasmik Bulanan ' + st.tahun, sub: labelSkop(),
        headers: ['Bulan', 'Sesi', 'Murid Ditasmik', 'Jumlah M/S', '% Cemerlang', 'Khatam'],
        rows: D.BULAN_PENUH.map(function (b, i) {
          var rs = rekod.filter(function (r) { var d = new Date(r.tarikh); return d.getFullYear() === st.tahun && d.getMonth() === i; });
          var c = rs.filter(function (r) { return D.kualiti(r.kualiti).bintang === 3; }).length;
          var kt = App.DB.khatam.filter(function (k) { var d = new Date(k.tarikh); return ids[k.muridId] && d.getFullYear() === st.tahun && d.getMonth() === i; }).length;
          return [b, rs.length, new Set(rs.map(function (r) { return r.muridId; })).size, rs.reduce(function (s, r) { return s + (parseInt(r.jumlah, 10) || 0); }, 0), (rs.length ? Math.round(c / rs.length * 100) : 0) + '%', kt];
        })
      };
    },
    rekod: function () {
      var rs = App.rekodSaya().filter(function (r) { return dalamBulan(r.tarikh); }).sort(function (a, b) { return new Date(b.tarikh) - new Date(a.tarikh); });
      return {
        tajuk: 'Log Rekod Tasmik', sub: labelSkop() + ' · ' + bulanLabel(),
        headers: ['Tarikh', 'Masa', 'Nama Murid', 'Kelas', 'Bacaan', 'M/S', 'Jumlah', 'Penilaian', 'Guru', 'Catatan'],
        rows: rs.map(function (r) { return [UI.tarikh(r.tarikh), UI.masa(r.tarikh), r.muridNama, App.labelKelas(r.darjah + '|' + r.kelas), r.iqraLabel || r.peringkat, r.dari + '–' + r.ke, r.jumlah, D.kualiti(r.kualiti).label, r.guru, r.catatan || ''] }),
        ids: rs.map(function (r) { return r.id; })
      };
    },
    guru: function () {
      return {
        tajuk: 'Laporan Aktiviti Guru', sub: bulanLabel(),
        headers: ['Nama Guru', 'Peranan', 'Kelas', 'Sesi Bulan Ini', 'Murid Ditasmik', 'Rekod Terakhir'],
        rows: App.DB.guru.filter(function (g) { return g.status === 'Aktif' && g.peranan !== 'superadmin'; }).map(function (g) {
          var rs = App.DB.rekod.filter(function (r) { return r.guruId === g.id; });
          var bln = rs.filter(function (r) { return dalamBulan(r.tarikh); });
          var akhir = rs.reduce(function (a, r) { return !a || new Date(r.tarikh) > new Date(a) ? r.tarikh : a; }, '');
          return [g.nama, App.NAMA_PERANAN[g.peranan], (g.senaraiKelas || []).map(function (k) { return App.labelKelas(k.darjah + '|' + k.kelas); }).join(', '), bln.length, new Set(bln.map(function (r) { return r.muridId; })).size, akhir ? UI.tarikh(akhir) : '—'];
        }).sort(function (a, b) { return b[3] - a[3]; })
      };
    },
    kbs: function () {
      var murid = App.muridSaya().slice().sort(function (a, b) { return (a.darjah + a.kelas).localeCompare(b.darjah + b.kelas) || a.nama.localeCompare(b.nama); });
      return {
        tajuk: 'Laporan Kem Bestari Solat ' + st.tahun, sub: labelSkop(),
        headers: ['Bil', 'Nama Murid', 'Kelas', 'Tahap', 'Dikuasai (M)', 'Belum (BM)', 'Jumlah Item', '% Penguasaan'],
        rows: murid.map(function (m, i) {
          var t = D.kbsTahap(m.darjah), jum = 0;
          D.kbsBahagian(t).forEach(function (s) { jum += s.items.length; });
          var rs = App.DB.kbs.filter(function (r) { return r.muridId === m.id && Number(r.tahun) === st.tahun; });
          var mm = rs.filter(function (r) { return r.status === 'M'; }).length, bm = rs.filter(function (r) { return r.status === 'BM'; }).length;
          return [i + 1, m.nama, App.labelKelas(m.darjah + '|' + m.kelas), t, mm, bm, jum, Math.round(mm / jum * 100) + '%'];
        })
      };
    }
  };

  function papar(el) {
    var tabs = TAB.filter(function (t) { return (!t.lihatSemua || App.lihatSemua()) && (!t.kbs || App.modulKBS()); });
    if (!tabs.some(function (t) { return t.id === st.tab; })) st.tab = tabs[0].id;
    var lap = JANA[st.tab]();
    var perluBulan = ['murid', 'kelas', 'rekod', 'guru'].indexOf(st.tab) >= 0;
    var perluTahun = perluBulan || st.tab === 'bulanan' || st.tab === 'kbs';
    var tahunList = []; for (var y = kini.getFullYear(); y >= kini.getFullYear() - 4; y--) tahunList.push(y);
    var bolehPadam = st.tab === 'rekod' && App.bolehTulis();

    el.innerHTML = '<div class="tab tab-gulung" role="tablist">' + tabs.map(function (t) { return '<button role="tab" data-tab="' + t.id + '" aria-selected="' + (st.tab === t.id) + '">' + esc(t.label) + '</button>'; }).join('') + '</div>' +
      '<section class="kad"><div class="alat">' +
      '<div><h2>' + esc(lap.tajuk) + '</h2><p class="lembut kecil">' + esc(lap.sub) + ' · ' + lap.rows.length + ' baris</p></div><span class="ruang"></span>' +
      (perluBulan ? '<select id="lBulan" aria-label="Bulan">' + D.BULAN_PENUH.map(function (b, i) { return '<option value="' + i + '"' + (i === st.bulan ? ' selected' : '') + '>' + b + '</option>'; }).join('') + '</select>' : '') +
      (perluTahun ? '<select id="lTahun" aria-label="Tahun">' + tahunList.map(function (y) { return '<option' + (y === st.tahun ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select>' : '') +
      '<button class="btn btn-ghost" id="lCetak">' + ikon('printer') + ' Cetak / PDF</button>' +
      '<button class="btn btn-ghost" id="lExcel">' + ikon('download') + ' Excel</button></div>' +
      (lap.rows.length ? '<div class="jadual-wrap"><table class="jadual"><thead><tr>' + lap.headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + (bolehPadam ? '<th></th>' : '') + '</tr></thead><tbody>' +
        lap.rows.map(function (r, i) {
          return '<tr>' + r.map(function (v, j) {
            var h = lap.headers[j];
            if (/Penilaian/.test(h) && v !== '—') return '<td>' + UI.lencanaKualiti(v) + '</td>';
            if (h === 'Kemajuan' || h === '% Penguasaan' || h === 'Liputan Minggu Ini') return '<td><div class="sel-bar">' + UI.bar(parseInt(v, 10)) + '<span>' + esc(v) + '</span></div></td>';
            return '<td' + (typeof v === 'number' ? ' class="nombor"' : '') + '>' + esc(v) + '</td>';
          }).join('') + (bolehPadam ? '<td class="aksi">' + (bolehPadamRekod(lap.ids[i]) ? '<button class="btn-ikon" data-padam="' + esc(lap.ids[i]) + '" aria-label="Padam rekod">' + ikon('trash') + '</button>' : '') + '</td>' : '') + '</tr>';
        }).join('') + '</tbody></table></div>' : UI.kosong('chart', 'Tiada data untuk tempoh ini')) +
      '</section>';

    UI.$$('[data-tab]', el).forEach(function (b) { b.addEventListener('click', function () { st.tab = b.dataset.tab; papar(el); }); });
    var lb = UI.$('#lBulan'); if (lb) lb.addEventListener('change', function () { st.bulan = parseInt(this.value, 10); papar(el); });
    var lt = UI.$('#lTahun'); if (lt) lt.addEventListener('change', function () { st.tahun = parseInt(this.value, 10); papar(el); });
    UI.$('#lCetak').addEventListener('click', function () { Cetak.laporan(lap); });
    UI.$('#lExcel').addEventListener('click', function () {
      Cetak.excel(lap.tajuk.replace(/[^\w]+/g, '_') + '_' + (App.DB.config.namaSekolah || '').replace(/[^\w]+/g, '_') + '.xlsx', [{ nama: lap.tajuk, headers: lap.headers, rows: lap.rows }]);
    });
    UI.$$('[data-padam]', el).forEach(function (b) {
      b.addEventListener('click', function () {
        UI.sahkan('Padam rekod?', 'Rekod tasmik ini akan dipadam secara kekal.', 'Padam', true).then(function (ya) {
          if (!ya) return;
          Sync.tulis([{ op: 'delete', table: 'Rekod', id: b.dataset.padam }], 'padam rekod');
          App.bina(); papar(el); UI.toast('Rekod dipadam', 'ok');
        });
      });
    });
  }
  function bolehPadamRekod(id) {
    if (App.pentadbir()) return true;
    var r = App.DB.rekod.filter(function (x) { return x.id === id; })[0];
    return r && r.guruId === App.user.id;
  }

  App.daftar('laporan', { papar: papar });
})();
