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
        '<p class="ib-nota">' + ikon('info') + ' Maklumat ini dikemas kini setiap kali guru merekod tasmik. Untuk pertanyaan, sila hubungi guru kelas.</p>' +
        '<details class="ib-privasi"><summary>Notis privasi</summary><p>Data diurus oleh ' + esc(r.sekolah.nama) + ' semata-mata untuk pemantauan bacaan Al-Quran murid. Halaman ini hanya memaparkan prestasi semasa seorang murid dan tidak menyimpan sebarang maklumat ibu bapa. Jika slip QR hilang atau tersebar, minta guru menjana kod baharu.</p></details>';
    });
  }

  return { papar: papar };
})();
