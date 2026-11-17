/* PAPARAN IBU BAPA — dibuka melalui QR (?s=KOD&ib=KODMURID). Tiada log masuk. */
var IbuBapa = (function () {
  var esc = UI.esc, ikon = UI.ikon;

  function papar(kod) {
    document.body.className = 'skrin-luar ibubapa';
    UI.$('#akar').innerHTML = '<main class="luar"><section class="luar-kad ib-kad"><div class="memuat"><span class="pusing"></span> Memuatkan kemajuan…</div></section></main>';
    API.panggil('ibubapa', { kod: kod, token: '' }).then(function (r) {
      var box = UI.$('.ib-kad');
      if (!r.ok) {
        box.innerHTML = '<div class="kosong">' + ikon(r.rangkaian ? 'wifiOff' : 'alert') + '<h3>' + esc(r.rangkaian ? 'Tiada sambungan internet' : 'Kod tidak sah') + '</h3><p>' + esc(r.msg) + '</p></div>';
        return;
      }
      var m = r.murid;
      D.setConfig({ iqraBaru: r.iqraBaru, iqraLama: r.iqraLama });
      var k = D.kemajuan(m);
      var t = m.tasmikAkhir;
      var q = t ? D.kualiti(t.kualiti) : null;
      document.title = 'Kemajuan ' + UI.namaPendek(m.nama) + ' · Tasmik Digital';
      var langkah = '';
      if (k.fasa === 'Iqra') {
        var idx = D.IQRA_SAHAJA.indexOf(m.peringkat);
        langkah = '<ol class="tangga" aria-label="Peringkat Iqra">' + D.IQRA_SAHAJA.concat(['Al-Quran']).map(function (p, i) {
          return '<li class="' + (i < idx ? 'siap' : i === idx ? 'kini' : '') + '"><span>' + (i < idx ? ikon('check') : (i < 6 ? i + 1 : ikon('book'))) + '</span><small>' + (i < 6 ? 'Iqra ' + (i + 1) : 'Al-Quran') + '</small></li>';
        }).join('') + '</ol>';
      }
      box.innerHTML =
        '<div class="sekolah-login">' + Shell.logoHTML(r.sekolah.logo, r.sekolah.nama, 'besar') + '<div><b>' + esc(r.sekolah.nama) + '</b><span>Kemajuan Bacaan Al-Quran</span></div></div>' +
        '<div class="ib-murid"><span class="avatar besar ' + UI.tonPeringkat(m.peringkat) + '">' + esc(UI.inisial(m.nama)) + '</span><div><h1>' + esc(m.nama) + '</h1><p class="lembut">' + esc(m.darjah + ' ' + m.kelas) + (m.guru && m.guru.length ? ' · Guru: ' + esc(m.guru.map(UI.tajukNama).join(', ')) : '') + '</p></div></div>' +
        '<div class="ib-tahap"><small>Tahap semasa</small><b>' + esc(k.label) + '</b><span>' + esc(k.fasa === 'Khatam' ? 'Alhamdulillah, telah khatam Al-Quran' : k.kedudukan) + '</span></div>' +
        '<div class="ib-kemajuan"><div class="ib-kemajuan-label"><span>' + esc(k.fasa === 'Iqra' ? 'Kemajuan Iqra' : k.fasa === 'Al-Quran' ? 'Kemajuan Al-Quran' : 'Selesai') + '</span><b>' + k.pct + '%</b></div>' + UI.bar(k.pct, k.fasa === 'Al-Quran' ? 'ungu' : k.fasa === 'Khatam' ? 'emas' : '') + '<small>' + esc(k.langkah) + '</small></div>' +
        langkah +
        '<div class="ib-grid">' +
        '<div><small>Tasmik terakhir</small><b>' + esc(t ? UI.tarikh(t.tarikh, true) : 'Belum ada') + '</b>' + (t ? '<span>' + esc(UI.relatif(t.tarikh)) + ' · m/s ' + esc(t.dari + '–' + t.ke) + '</span>' : '') + '</div>' +
        '<div><small>Penilaian terakhir</small><b class="ton-' + (q ? q.ton : 'muted') + '">' + esc(q ? q.label : '—') + '</b>' + (q ? '<span class="bintang" aria-label="' + q.bintang + ' bintang">' + [1, 2, 3].map(function (i) { return '<i class="' + (i <= q.bintang ? 'on' : '') + '">' + ikon('star') + '</i>'; }).join('') + '</span>' : '') + '</div>' +
        '<div><small>Khatam Al-Quran</small><b>' + (m.bilKhatam > 0 ? m.bilKhatam + ' kali' : 'Belum') + '</b></div>' +
        '</div>' +
        (r.bulanan ? kemajuan3Bulan(r.bulanan) : '') +
        galakan(m, k, t, q, r.bulanan) +
        '<p class="ib-nota">' + ikon('info') + ' Maklumat ini dikemas kini setiap kali guru merekod tasmik. Untuk pertanyaan, sila hubungi guru kelas.</p>' +
        '<details class="ib-privasi"><summary>Notis privasi</summary><p>Data diurus oleh ' + esc(r.sekolah.nama) + ' semata-mata untuk pemantauan bacaan Al-Quran murid. Halaman ini hanya memaparkan prestasi semasa seorang murid dan tidak menyimpan sebarang maklumat ibu bapa. Jika slip QR hilang atau tersebar, minta guru menjana kod baharu.</p></details>';
    });
  }

  /* Graf 3 bulan: muka surat dibaca & sesi */
  function kemajuan3Bulan(b) {
    var mx = Math.max.apply(null, b.map(function (x) { return x.ms; }).concat([1]));
    return '<div class="ib-graf"><small>Bacaan 3 bulan terakhir</small><div class="ib-graf-baris">' + b.map(function (x, i) {
      return '<div class="ib-graf-lajur' + (i === b.length - 1 ? ' kini' : '') + '"><b>' + x.ms + ' m/s</b><span style="height:' + Math.max(4, Math.round(x.ms / mx * 100)) + '%"></span>' +
        '<i>' + esc(D.BULAN[x.bulan]) + '</i><em>' + x.sesi + ' sesi</em></div>';
    }).join('') + '</div></div>';
  }

  /* Ayat galakan automatik — positif, tanpa menyalahkan */
  function galakan(m, k, t, q, b) {
    var nama = UI.tajukNama(UI.namaPanggilan(m.nama));
    var ayat;
    var hari = t ? UI.hariLalu(t.tarikh) : 999;
    var ini = b && b[2] ? b[2].ms : 0, lalu = b && b[1] ? b[1].ms : 0;
    if (k.fasa === 'Khatam') ayat = 'Tahniah! ' + nama + ' telah khatam Al-Quran. Teruskan membaca setiap hari supaya bacaan kekal lancar.';
    else if (hari > 14) ayat = nama + ' belum ditasmik sejak ' + (hari >= 999 ? 'awal' : hari + ' hari lalu') + '. Galakkan ' + nama + ' membaca sekurang-kurangnya satu muka surat sehari di rumah, dan berjumpa guru untuk tasmik minggu ini.';
    else if (q && q.bintang === 3 && ini >= lalu && ini > 0) ayat = 'MasyaAllah, bacaan ' + nama + ' semakin baik! Penilaian terakhir Cemerlang dan bacaan bulan ini ' + (ini > lalu ? 'meningkat' : 'konsisten') + '. Teruskan sokongan di rumah.';
    else if (ini > lalu && lalu > 0) ayat = 'Bagus! ' + nama + ' membaca lebih banyak bulan ini (' + ini + ' m/s) berbanding bulan lalu (' + lalu + ' m/s). Puji usahanya supaya terus bersemangat.';
    else if (q && q.bintang <= 1) ayat = nama + ' sedang berusaha memperbaiki bacaan. Bantu ' + nama + ' mengulang muka surat terakhir di rumah — 10 minit sehari sudah memadai.';
    else ayat = nama + ' sedang membaca ' + k.label + '. Sedikit bacaan setiap hari di rumah akan membantu ' + nama + ' maju dengan lebih cepat.';
    return '<div class="ib-galakan">' + ikon('star') + '<p>' + esc(ayat) + '</p></div>';
  }

  return { papar: papar, galakan: galakan };
})();
