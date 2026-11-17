/* DASHBOARD */
(function () {
  var esc = UI.esc, ikon = UI.ikon;

  function hariSekolah(n) {
    var out = [], d = new Date();
    for (var i = 0; i < 30 && out.length < n; i++) {
      var x = new Date(d); x.setDate(d.getDate() - i);
      if (x.getDay() >= 1 && x.getDay() <= 5) out.unshift(x);
    }
    return out;
  }
  function samaHari(a, b) { return new Date(a).toDateString() === b.toDateString(); }

  function papar(el) {
    var u = App.user, DB = App.DB;
    var murid = App.muridSaya();
    var ids = {}; murid.forEach(function (m) { ids[m.id] = 1; });
    var rekod = DB.rekod.filter(function (r) { return ids[r.muridId]; });
    var kini = new Date();
    var hariIni = rekod.filter(function (r) { return samaHari(r.tarikh, kini); });
    var hari = parseInt(DB.config.alertDays || '7', 10) || 7;
    var amaran = murid.map(function (m) { var r = App.rekodAkhir(m.id); return { m: m, n: r ? UI.hariLalu(r.tarikh) : 999 }; })
      .filter(function (x) { return x.n > hari; }).sort(function (a, b) { return b.n - a.n; });
    var minggu = hariSekolah(5);
    var mulaMinggu = App.mulaMinggu();
    var unikMinggu = {}; rekod.forEach(function (r) { if (new Date(r.tarikh) >= mulaMinggu) unikMinggu[r.muridId] = 1; });
    var liputan = murid.length ? Math.round(Object.keys(unikMinggu).length / murid.length * 100) : 0;
    var tahun = kini.getFullYear();
    var khatamTahun = DB.khatam.filter(function (k) { return Number(k.tahun) === tahun && (!Object.keys(ids).length || ids[k.muridId] || !k.muridId); }).length;

    var salam = kini.getHours() < 12 ? 'Selamat pagi' : kini.getHours() < 15 ? 'Selamat tengah hari' : kini.getHours() < 19 ? 'Selamat petang' : 'Selamat malam';
    var tajukSkop = App.skop ? App.labelKelasPenuh(App.skop) : (App.lihatSemua() ? 'Seluruh sekolah' : 'Kelas saya');

    var html = '<section class="sambutan">' +
      '<div><p class="lembut">' + salam + ',</p><h1>' + esc(UI.tajukNama(UI.namaPanggilan(u.nama))) + '</h1>' +
      '<p class="lembut">' + esc(D.HARI[kini.getDay()] + ', ' + UI.tarikh(kini.toISOString(), true)) + ' · ' + esc(tajukSkop) + '</p></div>' +
      (App.bolehTulis() ? '<a class="btn btn-emas btn-besar" href="#/rekod">' + ikon('plus') + ' Rekod tasmik</a>' : '') +
      '</section>';

    var nSemak = App.bolehTulis() && window.SemakPeringkat ? SemakPeringkat.bilangan() : 0;
    if (nSemak) html += '<div class="amaran-kotak warn">' + ikon('alert') + '<div><b>' + nSemak + ' murid perlu pengesahan peringkat bacaan</b>' +
      '<p>Data dari sistem lama bercanggah (cth jenis "Al-Quran" tetapi peringkat Iqra). <button class="pautan" id="keSemakP">Semak sekarang ' + ikon('chevR') + '</button></p></div></div>';

    // Peringatan guru (Rabu–Jumaat): murid kelasnya yang belum ditasmik sejak Isnin
    var hariKini = kini.getDay();
    if (App.ialah('guru') && hariKini >= 3 && hariKini <= 5) {
      var belum = murid.filter(function (m) { return !unikMinggu[m.id]; });
      if (belum.length) {
        var ikutKelas = {};
        belum.forEach(function (m) { var k = m.darjah + '|' + m.kelas; (ikutKelas[k] = ikutKelas[k] || []).push(m); });
        html += '<section class="kad belum-tasmik"><div class="kad-kepala"><h2>' + ikon('bell') + ' ' + belum.length + ' murid belum ditasmik minggu ini</h2></div><div class="kad-badan">' +
          '<p class="lembut kecil">' + (hariKini === 5 ? 'Hari terakhir minggu ini.' : 'Masih ada ' + (5 - hariKini + 1) + ' hari persekolahan minggu ini.') + ' Tekan nama untuk terus merekod.</p>' +
          Object.keys(ikutKelas).sort().map(function (k) {
            return '<div class="bt-kelas"><b>' + esc(App.labelKelas(k)) + '</b><div class="bt-nama">' + ikutKelas[k].sort(function (a, b) { return a.nama < b.nama ? -1 : 1; }).map(function (m) {
              return '<a class="cip" href="#/rekod/' + esc(m.id) + '">' + esc(UI.namaPendek(m.nama)) + '</a>';
            }).join('') + '</div></div>';
          }).join('') + '</div></section>';
      }
    }

    html += '<section class="kpi">' +
      kpi('users', murid.length, 'Murid aktif', '') +
      kpi('book', hariIni.length, 'Tasmik hari ini', new Set(hariIni.map(function (r) { return r.muridId; })).size + ' murid') +
      kpi('chart', liputan + '%', 'Liputan minggu ini', Object.keys(unikMinggu).length + ' / ' + murid.length + ' murid') +
      kpi('bell', amaran.length, 'Perlu perhatian', '> ' + hari + ' hari tiada rekod', amaran.length ? 'amaran' : '') +
      kpi('trophy', khatamTahun, 'Khatam ' + tahun, '', 'emas') +
      '</section>';

    // Graf mingguan
    var data5 = minggu.map(function (d) {
      var rs = rekod.filter(function (r) { return samaHari(r.tarikh, d); });
      return { label: D.HARI[d.getDay()].slice(0, 3), tarikh: d.getDate() + '/' + (d.getMonth() + 1), n: rs.length, u: new Set(rs.map(function (r) { return r.muridId; })).size, hariIni: d.toDateString() === kini.toDateString() };
    });
    var bulanan = D.BULAN.map(function (b, i) {
      return { label: b, n: rekod.filter(function (r) { var d = new Date(r.tarikh); return d.getFullYear() === tahun && d.getMonth() === i; }).length, hariIni: i === kini.getMonth() };
    });

    html += '<div class="grid-2">' +
      kad('Sesi 5 hari persekolahan', graf(data5, function (x) { return x.n + ' sesi · ' + x.u + ' murid (' + x.tarikh + ')'; })) +
      kad('Sesi bulanan ' + tahun, graf(bulanan, function (x) { return x.n + ' sesi'; }, true)) +
      '</div>';

    // Taburan peringkat
    var tab = {}; D.PERINGKAT.forEach(function (p) { tab[p] = 0; });
    murid.forEach(function (m) { var p = m.peringkat || 'Iqra 1'; tab[p] = (tab[p] || 0) + 1; });
    var jumlah = murid.length || 1;
    var warna = ['#8fd3b8', '#5fbf9a', '#36a982', '#1f9070', '#13775c', '#0b5d4b', '#6d4fc2', '#c9a227'];
    var taburan = '<div class="taburan">' + D.PERINGKAT.map(function (p, i) {
      return tab[p] ? '<span style="flex:' + tab[p] + ';background:' + warna[i] + '" title="' + esc(p + ': ' + tab[p]) + '"></span>' : '';
    }).join('') + '</div><ul class="petunjuk">' + D.PERINGKAT.map(function (p, i) {
      return '<li><i style="background:' + warna[i] + '"></i>' + esc(p) + ' <b>' + tab[p] + '</b> <span class="lembut">' + Math.round(tab[p] / jumlah * 100) + '%</span></li>';
    }).join('') + '</ul>';

    var senaraiAmaran = amaran.length ? '<ul class="senarai">' + amaran.slice(0, 6).map(function (x) {
      return '<li class="baris">' + avatar(x.m) + '<div class="baris-isi"><b>' + esc(UI.namaPendek(x.m.nama)) + '</b><span>' + esc(App.labelKelas(x.m.darjah + '|' + x.m.kelas) + ' · ' + x.m.peringkat) + '</span></div>' +
        UI.lencana(x.n >= 999 ? 'Belum ada' : x.n + ' hari', x.n > hari * 2 ? 'bad' : 'warn') +
        (App.bolehTulis() ? '<a class="btn-ikon" href="#/rekod/' + esc(x.m.id) + '" aria-label="Rekod ' + esc(x.m.nama) + '">' + ikon('chevR') + '</a>' : '') + '</li>';
    }).join('') + '</ul>' + (amaran.length > 6 ? '<a class="pautan" href="#/amaran">Lihat semua ' + amaran.length + ' murid ' + ikon('chevR') + '</a>' : '')
      : UI.kosong('check', 'Semua murid aktif', 'Tiada murid melebihi ' + hari + ' hari tanpa rekod.');

    html += '<div class="grid-2">' + kad('Analisis Peringkat Bacaan Murid', taburan) + kad('Perlu perhatian', senaraiAmaran) + '</div>';

    // Analisis Tasmik Mingguan: pentadbir & GB (semua kelas); guru yang mengajar 2 kelas atau lebih (kelasnya sahaja)
    var kelasAnalisis = App.lihatSemua() ? App.semuaKelas() : App.kelasSaya();
    if (!App.skop && (App.lihatSemua() || kelasAnalisis.length >= 2)) {
      var kelas = kelasAnalisis;
      var u = {}; DB.rekod.forEach(function (r) { if (new Date(r.tarikh) >= mulaMinggu) u[r.muridId] = 1; });
      var baris = kelas.map(function (k) {
        var ms = DB.murid.filter(function (m) { return m.status === 'Aktif' && m.darjah + '|' + m.kelas === k; });
        var aktif = ms.filter(function (m) { return u[m.id]; }).length;
        var pc = ms.length ? Math.round(aktif / ms.length * 100) : 0;
        var quran = ms.filter(function (m) { return m.peringkat === 'Al-Quran' || m.peringkat === 'Khatam'; }).length;
        return '<tr><td><b><span class="pjg">' + esc(App.labelKelasPenuh(k)) + '</span><span class="pdk">' + esc(App.labelKelas(k)) + '</span></b></td><td class="nombor">' + ms.length + '</td><td class="nombor">' + quran + '</td>' +
          '<td><div class="sel-bar">' + UI.bar(pc, pc < 50 ? 'warn' : '') + '<span>' + pc + '%</span></div></td></tr>';
      }).join('');
      html += kad('Analisis Tasmik Mingguan', baris ? '<table class="jadual analisis-mingguan"><colgroup><col class="c-kelas"><col class="c-n"><col class="c-n"><col class="c-liputan"></colgroup>' +
        '<thead><tr><th>Kelas</th><th class="nombor">Murid</th><th class="nombor"><span class="pjg">Al-Quran</span><span class="pdk">Quran</span></th><th>Liputan</th></tr></thead><tbody>' + baris + '</tbody></table>' : UI.kosong('users', 'Belum ada kelas'));
    }

    // Rekod terkini
    var terkini = rekod.slice().sort(function (a, b) { return new Date(b.tarikh) - new Date(a.tarikh); }).slice(0, 8);
    html += kad('Rekod terkini', terkini.length ? '<ul class="senarai">' + terkini.map(function (r) {
      return '<li class="baris"><div class="baris-isi"><b>' + esc(UI.namaPendek(r.muridNama)) + '</b><span>' + esc((r.iqraLabel || r.peringkat) + ' · m/s ' + r.dari + '–' + r.ke + ' · ' + (r.guru || '')) + '</span></div>' +
        UI.lencanaKualiti(r.kualiti) + '<span class="masa">' + esc(UI.relatif(r.tarikh) === 'Hari ini' ? UI.masa(r.tarikh) : UI.tarikh(r.tarikh)) + '</span></li>';
    }).join('') + '</ul>' : UI.kosong('book', 'Belum ada rekod', 'Rekod tasmik pertama akan dipaparkan di sini.'));

    el.innerHTML = html;
    var ks = UI.$('#keSemakP', el);
    if (ks) ks.addEventListener('click', function () { window.__tabMurid = 'peringkat'; App.pergi('murid'); });
  }

  function kpi(ik, nilai, label, sub, ton) {
    return '<div class="kpi-kad ' + (ton || '') + '">' + ikon(ik) + '<b>' + esc(nilai) + '</b><span>' + esc(label) + '</span>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
  }
  function kad(tajuk, isi, aksi) {
    return '<section class="kad"><div class="kad-kepala"><h2>' + esc(tajuk) + '</h2>' + (aksi || '') + '</div><div class="kad-badan">' + isi + '</div></section>';
  }
  function avatar(m) { return '<span class="avatar kecil ' + UI.tonPeringkat(m.peringkat) + '">' + esc(UI.inisial(m.nama)) + '</span>'; }
  function graf(data, tip, padat) {
    var mx = Math.max.apply(null, data.map(function (x) { return x.n; }).concat([1]));
    return '<div class="graf' + (padat ? ' padat' : '') + '" role="img" aria-label="Graf bar">' + data.map(function (x) {
      return '<div class="graf-lajur' + (x.hariIni ? ' kini' : '') + '" title="' + esc(x.label + ': ' + tip(x)) + '"><b>' + (x.n || '') + '</b><span style="height:' + Math.max(3, Math.round(x.n / mx * 100)) + '%"></span><i>' + esc(x.label) + '</i></div>';
    }).join('') + '</div>';
  }

  window.Kom = { kad: kad, kpi: kpi, avatar: avatar, graf: graf };
  App.daftar('utama', { papar: papar });
})();
