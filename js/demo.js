/* DATA DEMO — nama rekaan sepenuhnya. Dijana semula setiap kali mod DEMO dibuka. */
var Demo = (function () {
  var NAMA_P = ['AISYAH', 'NUR IMAN', 'SOFEA', 'HUMAIRA', 'BATRISYA', 'QISTINA', 'ALYA', 'DAMIA', 'ZAHRA', 'HANNA', 'MARYAM', 'ARISSA', 'NAURA', 'SAFIYA', 'IRDINA'];
  var NAMA_L = ['MUHAMMAD ADAM', 'AHMAD IRFAN', 'HARRIS', 'AQIL', 'DANIAL', 'IMRAN', 'FARIS', 'RAYYAN', 'ZAFRAN', 'HAKIMI', 'UMAR', 'ISKANDAR', 'NAUFAL', 'ARIF', 'HAZIQ'];
  var BAPA = ['AHMAD', 'RAZAK', 'SULAIMAN', 'HASSAN', 'ISMAIL', 'YUSOF', 'IBRAHIM', 'OMAR', 'ZAINAL', 'RAHMAN', 'HAMZAH', 'KAMAL'];
  var KELAS = [['Darjah 1', 'Bestari'], ['Darjah 2', 'Bestari'], ['Darjah 3', 'Cerdas'], ['Darjah 4', 'Bestari'], ['Darjah 5', 'Cerdas'], ['Darjah 6', 'Bestari']];

  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }

  function data() {
    var r = rng(20261115);
    var teras = TasmikCore.cipta(StoreMemori.cipta().env);
    var pw = teras.hashKata('demo1234', 'demosalt');
    var guru = [
      { id: 'GD01', nama: 'AMINAH BINTI YUSOF', email: 'cikgu.aminah', peranan: 'guru', kelasList: 'Darjah 1|Bestari;Darjah 4|Bestari' },
      { id: 'GD02', nama: 'KHAIRUL ANUAR BIN SALLEH', email: 'cikgu.khairul', peranan: 'guru', kelasList: 'Darjah 2|Bestari;Darjah 5|Cerdas' },
      { id: 'GD03', nama: 'ROSLINA BINTI HAMID', email: 'cikgu.roslina', peranan: 'guru', kelasList: 'Darjah 3|Cerdas;Darjah 6|Bestari' },
      { id: 'GD04', nama: 'NORHAYATI BINTI ISMAIL', email: 'penyelaras', peranan: 'penyelaras', kelasList: '' },
      { id: 'GD05', nama: 'HJ. ZULKIFLI BIN OMAR', email: 'guru.besar', peranan: 'gb', kelasList: '' },
      { id: 'GD06', nama: 'PENTADBIR TASMIK DIGITAL', email: 'superadmin', peranan: 'superadmin', kelasList: '' }
    ].map(function (g) { return Object.assign(g, { password: pw, status: 'Aktif', tukarKata: 'FALSE', tarikhDaftar: '2026-01-05T00:00:00.000Z' }); });

    var murid = [], rekod = [], khatam = [];
    var kod = {}; var n = 0;
    KELAS.forEach(function (kl, ki) {
      var d = ki + 1;
      for (var i = 0; i < 9; i++) {
        var p = r() < 0.5;
        var nama = (p ? NAMA_P : NAMA_L)[Math.floor(r() * 15)] + (p ? ' BINTI ' : ' BIN ') + BAPA[Math.floor(r() * BAPA.length)];
        if (murid.some(function (m) { return m.nama === nama; })) { i--; continue; }
        // Kemajuan ikut darjah
        var tahap = Math.min(7, Math.max(0, Math.round(d * 1.1 - 0.5 + (r() - 0.5) * 2.2)));
        var per = ['Iqra 1', 'Iqra 2', 'Iqra 3', 'Iqra 4', 'Iqra 5', 'Iqra 6', 'Al-Quran', 'Al-Quran'][tahap];
        var jenis = per === 'Al-Quran' ? 'Al-Quran' : 'Iqra Baru';
        var jl = D.julat(jenis, per);
        var ms = per === 'Al-Quran' ? Math.round(20 + r() * (d >= 6 ? 560 : 300)) : Math.round(jl.dari + r() * (jl.ke - jl.dari - 4));
        var bil = 0;
        if (d === 6 && i < 2) { per = 'Khatam'; ms = 604; bil = 1; }
        // Kod tetap (deterministik) supaya QR DEMO berfungsi di mana-mana peranti
        var k; do { k = ''; for (var c = 0; c < 7; c++) k += 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.charAt(Math.floor(r() * 32)); } while (kod[k]); kod[k] = 1;
        var id = 'MD' + String(++n).padStart(3, '0');
        murid.push({ id: id, nama: nama, no: '', darjah: kl[0], kelas: kl[1], guruId: '', jenis: jenis, peringkat: per, iqraLabel: D.labelBacaan(jenis, per, ms, ms), mukaSurat: ms, bilKhatam: bil, status: 'Aktif', tarikhDaftar: '2026-01-05T00:00:00.000Z', tarikhKemaskini: new Date().toISOString(), kodIbuBapa: k });
        if (bil) khatam.push({ id: 'KD' + n, muridId: id, muridNama: nama, darjah: kl[0], kelas: kl[1], bilangan: 1, tahun: 2026, tarikh: '2026-0' + (3 + i) + '-1' + i, guru: 'ROSLINA BINTI HAMID', catatan: 'Majlis khatam sekolah', guruId: 'GD03' });
        // Sejarah rekod 6 minggu lepas (hari persekolahan)
        var g = guru.filter(function (x) { return x.kelasList.indexOf(kl[0] + '|' + kl[1]) >= 0; })[0];
        var rajin = r();
        var akhir = ms;
        for (var h = 42; h >= 0; h--) {
          var t = new Date(); t.setDate(t.getDate() - h); t.setHours(8 + Math.floor(r() * 4), Math.floor(r() * 60), 0, 0);
          if (t.getDay() === 0 || t.getDay() === 6 || t > new Date()) continue;
          if (r() > rajin * 0.55 || (i === 8 && h < 12) || (i === 7 && d % 2 && h < 9)) continue;
          if (per === 'Khatam') continue;
          var jum = 1 + Math.floor(r() * 3);
          var dari = Math.max(jl.dari, akhir - jum * Math.floor(h / 2) - 1);
          var ke = Math.min(jl.ke, dari + jum - 1);
          var kq = D.KUALITI[r() < 0.55 ? 0 : r() < 0.75 ? 1 : r() < 0.9 ? 2 : 3].v;
          rekod.push({ id: 'RD' + rekod.length, tarikh: t.toISOString(), hari: D.HARI[t.getDay()], masa: UI.masa(t.toISOString()), muridId: id, muridNama: nama, darjah: kl[0], kelas: kl[1], guruId: g.id, guru: g.nama, jenis: jenis, peringkat: per, iqraLabel: D.labelBacaan(jenis, per, dari, ke), dari: dari, ke: ke, jumlah: ke - dari + 1, kualiti: kq, catatan: '' });
        }
      }
    });
    // Rekod KBS contoh untuk 3 murid pertama setiap kelas
    var kbs = [];
    KELAS.forEach(function (kl) {
      murid.filter(function (m) { return m.darjah === kl[0]; }).slice(0, 3).forEach(function (m) {
        var tahap = D.kbsTahap(m.darjah);
        var g = guru.filter(function (x) { return x.kelasList.indexOf(kl[0] + '|' + kl[1]) >= 0; })[0];
        D.kbsBahagian(tahap).forEach(function (b) {
          b.items.forEach(function (it) {
            var x = r(); if (x < 0.15) return;
            kbs.push({ id: 'KBD' + kbs.length, muridId: m.id, muridNama: m.nama, darjah: m.darjah, kelas: m.kelas, tahap: tahap, tahun: 2026, sectionKey: b.key, itemId: it.id, itemTeks: it.teks, status: x < 0.3 ? 'BM' : 'M', guru: g.nama, tarikh: '2026-0' + (4 + Math.floor(r() * 5)) + '-1' + Math.floor(r() * 9) + 'T02:00:00.000Z' });
          });
        });
      });
    });
    return {
      Guru: guru, Murid: murid, Rekod: rekod, Khatam: khatam, KBS: kbs, Kumpulan: [
        { id: 'KPD1', nama: 'Kumpulan A', darjah: 'Darjah 1', kelas: 'Bestari', warna: '#0b5d4b', muridIds: murid.filter(function (m) { return m.darjah === 'Darjah 1'; }).slice(0, 4).map(function (m) { return m.id; }).join(','), guruId: 'GD01' },
        { id: 'KPD2', nama: 'Kumpulan B', darjah: 'Darjah 1', kelas: 'Bestari', warna: '#2563eb', muridIds: murid.filter(function (m) { return m.darjah === 'Darjah 1'; }).slice(4).map(function (m) { return m.id; }).join(','), guruId: 'GD01' }
      ],
      Config: { namaSekolah: 'SK Contoh Tasmik Digital', alamat: 'Jalan Pendidikan, 30000 Ipoh, Perak', namaGB: 'HJ. ZULKIFLI BIN OMAR', modulKBS: 'TRUE', alertDays: '7', tahunSemasa: '2026', senaraiKelas: 'Bestari, Cerdas', sandaranAkhir: new Date(Date.now() - 2 * 864e5).toISOString() },
      Log: [], Sesi: {}
    };
  }
  return { data: data };
})();
