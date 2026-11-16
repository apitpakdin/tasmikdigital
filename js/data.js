/* ================================================================
   DATA DOMAIN — Iqra, Al-Quran, Kualiti, Bestari Solat
   ================================================================ */
var D = (function () {
  var IQRA_BARU = {
    'Iqra 1': { dari: 3, ke: 34, j: 'Jilid 1' }, 'Iqra 2': { dari: 37, ke: 66, j: 'Jilid 1' },
    'Iqra 3': { dari: 69, ke: 98, j: 'Jilid 1' }, 'Iqra 4': { dari: 101, ke: 130, j: 'Jilid 1' },
    'Iqra 5': { dari: 3, ke: 32, j: 'Jilid 2' }, 'Iqra 6': { dari: 35, ke: 67, j: 'Jilid 2' }
  };
  var IQRA_LAMA = {
    'Iqra 1': { dari: 1, ke: 32 }, 'Iqra 2': { dari: 1, ke: 30 }, 'Iqra 3': { dari: 1, ke: 30 },
    'Iqra 4': { dari: 1, ke: 30 }, 'Iqra 5': { dari: 1, ke: 30 }, 'Iqra 6': { dari: 1, ke: 31 }
  };
  var QURAN_MS = 604;
  var JUZ_MULA = {};
  for (var j = 1; j <= 30; j++) JUZ_MULA[j] = j === 1 ? 1 : (j - 1) * 20 + 1;

  var PERINGKAT = ['Iqra 1', 'Iqra 2', 'Iqra 3', 'Iqra 4', 'Iqra 5', 'Iqra 6', 'Al-Quran', 'Khatam'];
  var IQRA_SAHAJA = PERINGKAT.slice(0, 6);
  var JENIS = ['Iqra Baru', 'Iqra Lama', 'Al-Quran'];
  var DARJAH = ['Darjah 1', 'Darjah 2', 'Darjah 3', 'Darjah 4', 'Darjah 5', 'Darjah 6'];
  var HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
  var BULAN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  var BULAN_PENUH = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];

  // Nilai disimpan sama seperti versi lama supaya data lama kekal serasi
  var KUALITI = [
    { v: 'Cemerlang ⭐⭐⭐', label: 'Cemerlang', sub: 'Lancar & tepat', ton: 'ok', bintang: 3 },
    { v: 'Baik ⭐⭐', label: 'Baik', sub: 'Kesilapan kecil', ton: 'info', bintang: 2 },
    { v: 'Perlu Ulang ⭐', label: 'Perlu Ulang', sub: 'Banyak kesilapan', ton: 'warn', bintang: 1 },
    { v: 'Belum Lulus ❌', label: 'Belum Lulus', sub: 'Latihan semula', ton: 'bad', bintang: 0 }
  ];
  function kualiti(v) {
    v = String(v || '');
    for (var i = 0; i < KUALITI.length; i++) if (v.indexOf(KUALITI[i].label) === 0) return KUALITI[i];
    return { v: v, label: v.split(' ')[0] || '—', ton: 'muted', bintang: 0 };
  }

  var iqraOverride = { baru: null, lama: null };
  function setConfig(c) {
    try { iqraOverride.baru = c && c.iqraBaru ? JSON.parse(c.iqraBaru) : null; } catch (e) { iqraOverride.baru = null; }
    try { iqraOverride.lama = c && c.iqraLama ? JSON.parse(c.iqraLama) : null; } catch (e) { iqraOverride.lama = null; }
  }
  function jadualIqra(jenis) {
    return jenis === 'Iqra Lama' ? (iqraOverride.lama || IQRA_LAMA) : (iqraOverride.baru || IQRA_BARU);
  }
  function julat(jenis, peringkat) {
    if (jenis === 'Al-Quran' || peringkat === 'Al-Quran' || peringkat === 'Khatam') return { dari: 1, ke: QURAN_MS };
    return jadualIqra(jenis)[peringkat] || { dari: 1, ke: 40 };
  }
  function juzuk(ms) {
    ms = parseInt(ms, 10) || 1;
    for (var j = 30; j >= 1; j--) if (ms >= JUZ_MULA[j]) return j;
    return 1;
  }
  function labelBacaan(jenis, peringkat, dari, ke) {
    if (jenis === 'Al-Quran' || peringkat === 'Al-Quran') {
      var a = juzuk(dari), b = juzuk(ke || dari);
      return a === b ? 'Al-Quran (Juzuk ' + a + ')' : 'Al-Quran (Juzuk ' + a + '-' + b + ')';
    }
    var r = jadualIqra(jenis)[peringkat];
    return peringkat + ' (' + (r && r.j ? r.j : jenis) + ')';
  }
  function peringkatSeterusnya(p) {
    var i = PERINGKAT.indexOf(p);
    return i >= 0 && i < PERINGKAT.length - 1 ? PERINGKAT[i + 1] : p;
  }

  /* Kemajuan keseluruhan seorang murid (0-100) + label mesra ibu bapa */
  function kemajuan(m) {
    var p = m.peringkat || 'Iqra 1', ms = parseInt(m.mukaSurat, 10) || 0, jenis = m.jenis || 'Iqra Baru';
    if (p === 'Khatam') return { pct: 100, fasa: 'Khatam', label: 'Khatam Al-Quran', langkah: 'Khatam ' + (m.bilKhatam || 1) + 'x', kedudukan: 'Khatam' };
    if (p === 'Al-Quran' || jenis === 'Al-Quran') {
      var pct = Math.min(100, Math.round(ms / QURAN_MS * 100));
      return { pct: pct, fasa: 'Al-Quran', label: 'Al-Quran Juzuk ' + juzuk(ms), langkah: 'Juzuk ' + juzuk(ms) + ' daripada 30', kedudukan: 'Juzuk ' + juzuk(ms) + ' · m/s ' + (ms || 1) };
    }
    var t = jadualIqra(jenis), jum = 0, siap = 0, idx = IQRA_SAHAJA.indexOf(p);
    IQRA_SAHAJA.forEach(function (pp, i) {
      var r = t[pp]; if (!r) return;
      var n = r.ke - r.dari + 1; jum += n;
      if (i < idx) siap += n; else if (i === idx) siap += Math.max(0, Math.min(n, ms - r.dari + 1));
    });
    var pc = jum ? Math.min(100, Math.round(siap / jum * 100)) : 0;
    return { pct: pc, fasa: 'Iqra', label: p, langkah: p.replace('Iqra ', 'Iqra ') + ' daripada 6', kedudukan: p + ' · m/s ' + (ms || '—') };
  }

  /* ── Kem Bestari Solat ── */
  var KBS_WUDUK = [
    ['w1', 'Bacaan basmalah', 'Sunat'], ['w2', 'Membasuh kedua-dua tangan', 'Sunat'], ['w3', 'Berkumur-kumur', 'Sunat'],
    ['w4', 'Memasukkan air ke dalam hidung', 'Sunat'], ['w5', 'Niat wuduk', 'Rukun'], ['w6', 'Membasuh muka', 'Rukun'],
    ['w7', 'Membasuh kedua-dua tangan hingga ke siku', 'Rukun'], ['w8', 'Menyapu air ke sebahagian kepala', 'Rukun'],
    ['w9', 'Menyapu air pada kedua-dua belah telinga', 'Sunat'], ['w10', 'Membasuh kedua-dua belah kaki hingga ke buku lali', 'Rukun'],
    ['w11', 'Tertib', 'Rukun'], ['w12', 'Doa selepas wuduk', 'Sunat']
  ];
  var KBS_PERLAKUAN_T1 = [
    ['p1', 'Berdiri tegak', 'Rukun'], ['p2', 'Kedudukan tangan semasa takbiratulihram', 'Sunat'],
    ['p3', 'Kedudukan tangan selepas takbiratulihram', 'Sunat'], ['p4', 'Rukuk', 'Rukun'], ['p5', 'Iktidal', 'Rukun'],
    ['p6', 'Sujud', 'Rukun'], ['p7', 'Duduk antara dua sujud', 'Rukun'], ['p8', 'Duduk semasa tahiyat awal', 'Sunat'],
    ['p9', 'Duduk semasa tahiyat akhir', 'Rukun'], ['p10', 'Berpaling ketika salam', 'Sunat'], ['p11', 'Perlakuan qunut', 'Sunat'],
    ['p12', 'Tamakninah', 'Rukun'], ['p13', 'Kedudukan imam dan makmum', '']
  ];
  var KBS_PERLAKUAN_T2 = KBS_PERLAKUAN_T1.slice(0, 12).concat([['p12b', 'Perlakuan sujud sahwi', 'Sunat'], ['p13', 'Kedudukan imam dan makmum', '']]);
  var KBS_BACAAN_T1 = [
    ['b1', 'Lafaz niat solat Subuh', 'Rukun'], ['b2', 'Lafaz niat solat Zohor', 'Rukun'], ['b3', 'Lafaz niat solat Asar', 'Rukun'],
    ['b4', 'Lafaz niat solat Maghrib', 'Rukun'], ['b5', 'Lafaz niat solat Isyak', 'Rukun'], ['b6', 'Takbiratulihram', 'Rukun'],
    ['b7', 'Doa Iftitah', 'Sunat'], ['b8', 'Surah al-Fatihah', 'Rukun'], ['b9', 'Surah al-Ikhlas (Tahun 1)', 'Sunat'],
    ['b10', 'Surah an-Nas (Tahun 2)', 'Sunat'], ['b11', 'Surah al-Falaq (Tahun 2)', 'Sunat'], ['b12', 'Surah al-Masad (Tahun 3)', 'Sunat'],
    ['b13', 'Surah an-Nasr (Tahun 3)', 'Sunat'], ['b14', 'Surah al-Kafirun (Tahun 3)', 'Sunat'], ['b15', 'Surah al-Kauthar (Tahun 3)', 'Sunat'],
    ['b16', 'Bacaan Rukuk', ''], ['b17', 'Bacaan Iktidal', ''], ['b18', 'Bacaan Sujud', ''], ['b19', 'Bacaan Duduk Antara Dua Sujud', ''],
    ['b20', 'Bacaan Tahiyat Awal', ''], ['b21', 'Bacaan Tahiyat Akhir', 'Rukun'], ['b22', 'Selawat Ibrahimiyah', ''],
    ['b23', 'Salam Pertama', ''], ['b24', 'Salam Kedua', 'Sunat'], ['b25', 'Doa Qunut', 'Sunat']
  ];
  var KBS_BACAAN_T2 = KBS_BACAAN_T1.slice(0, 8).concat([
    ['b9b', "Surah al-Qari'ah (Tahun 4)", 'Sunat'], ['b10b', "Surah al-'Adiyat (Tahun 4)", 'Sunat'], ['b11b', 'Surah al-Zalzalah (Tahun 4)', 'Sunat'],
    ['b12b', 'Surah al-Baiyinah (Tahun 5)', 'Sunat'], ['b13b', 'Surah al-Qadr (Tahun 5)', 'Sunat'], ['b14b', "Surah al-'Alaq (Tahun 5)", 'Sunat'],
    ['b15b', 'Surah at-Tin (Tahun 6)', 'Sunat'], ['b16b', 'Surah Asy-Syarh (Tahun 6)', 'Sunat'], ['b17b', 'Surah Ad-Dhuha (Tahun 6)', 'Sunat'],
    ['b18b', 'Bacaan Rukuk', ''], ['b19b', 'Bacaan Iktidal', ''], ['b20b', 'Bacaan Sujud', ''], ['b21b', 'Bacaan Duduk Antara Dua Sujud', ''],
    ['b22b', 'Bacaan Tahiyat Awal', ''], ['b23b', 'Bacaan Tahiyat Akhir', 'Rukun'], ['b24b', 'Selawat Ibrahimiyah', ''],
    ['b25b', 'Salam Pertama', ''], ['b26b', 'Salam Kedua', 'Sunat'], ['b27b', 'Doa Qunut', 'Sunat'], ['b28b', 'Bacaan Sujud Sahwi', '']
  ]);
  var KBS_TAMBAHAN_T2 = [
    ['t1', 'Syarat-syarat wajib solat', ''], ['t2', 'Syarat-syarat sah solat', ''], ['t3', 'Lafaz azan dan jawab azan', ''],
    ['t4', 'Lafaz iqamah dan jawab iqamah', ''], ['t5', 'Doa selepas azan dan iqamah', ''], ['t6', 'Muafik dan Masbuk', ''],
    ['t7', 'Tayammum', ''], ['t8', 'Pengertian Surah al-Fatihah', ''], ['t9', 'Solat Jenazah — Kedudukan imam dan makmum', ''],
    ['t10', 'Solat Jenazah — Lafaz niat', ''], ['t11', 'Solat Jenazah — Takbir pertama (al-Fatihah)', ''],
    ['t12', 'Solat Jenazah — Takbir kedua (selawat)', ''], ['t13', 'Solat Jenazah — Takbir ketiga (doa)', ''],
    ['t14', 'Solat Jenazah — Takbir keempat (doa dan salam)', '']
  ];
  function item(a) { return a.map(function (x) { return { id: x[0], teks: x[1], j: x[2] }; }); }
  function kbsTahap(darjah) { var d = parseInt(String(darjah || '').replace(/\D/g, ''), 10) || 1; return d <= 3 ? 1 : 2; }
  function kbsBahagian(tahap) {
    var s = [
      { key: 'wuduk', label: 'Amali Wuduk', items: item(KBS_WUDUK) },
      { key: 'perlakuan', label: 'Amali Solat — Perlakuan', items: item(tahap === 1 ? KBS_PERLAKUAN_T1 : KBS_PERLAKUAN_T2) },
      { key: 'bacaan', label: 'Amali Solat — Bacaan', items: item(tahap === 1 ? KBS_BACAAN_T1 : KBS_BACAAN_T2) }
    ];
    if (tahap === 2) s.push({ key: 'tambahan', label: 'Amali Solat — Tambahan', items: item(KBS_TAMBAHAN_T2) });
    return s;
  }

  return {
    IQRA_BARU: IQRA_BARU, IQRA_LAMA: IQRA_LAMA, QURAN_MS: QURAN_MS, PERINGKAT: PERINGKAT, IQRA_SAHAJA: IQRA_SAHAJA,
    JENIS: JENIS, DARJAH: DARJAH, HARI: HARI, BULAN: BULAN, BULAN_PENUH: BULAN_PENUH, KUALITI: KUALITI,
    kualiti: kualiti, setConfig: setConfig, jadualIqra: jadualIqra, julat: julat, juzuk: juzuk,
    labelBacaan: labelBacaan, peringkatSeterusnya: peringkatSeterusnya, kemajuan: kemajuan,
    kbsTahap: kbsTahap, kbsBahagian: kbsBahagian
  };
})();
