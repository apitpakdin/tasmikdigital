/* ================================================================
   TASMIK DIGITAL — TERAS BACKEND (dikongsi)
   ----------------------------------------------------------------
   Fail ini mengandungi SEMUA logik backend: log masuk, sesi,
   kebenaran peranan, baca/tulis data dan paparan ibu bapa.
   Ia tidak tahu di mana data disimpan — itu kerja "adapter":
     • backend/gas-adapter.js  → Google Sheet (Apps Script)
     • app/js/demo.js          → localStorage (mod DEMO)
   Jangan sunting Code.gs secara terus; jalankan tools/bina-backend.sh
   ================================================================ */
var TasmikCore = (function () {
  'use strict';

  var VERSI = '3.4.1';

  /* ── Skema jadual: [kunci, tajuk lajur dalam Sheet] ──
     Tajuk lajur kekal sama seperti versi lama (SKDK) supaya
     migrasi tidak perlu ubah data sedia ada. Lajur baharu
     ditambah di hujung secara automatik. */
  var SKEMA = {
    Guru: [
      ['id', 'ID'], ['nama', 'Nama'], ['email', 'Email/Username'], ['password', 'Password'],
      ['peranan', 'Peranan'], ['darjah', 'Darjah'], ['kelas', 'Kelas'], ['status', 'Status'],
      ['tarikhDaftar', 'Tarikh Daftar'], ['kelasList', 'Senarai Kelas'],
      ['tukarKata', 'Perlu Tukar Kata Laluan']
    ],
    Murid: [
      ['id', 'ID'], ['nama', 'Nama'], ['no', 'No. Murid'], ['darjah', 'Darjah'], ['kelas', 'Kelas'],
      ['guruId', 'Guru ID'], ['jenis', 'Jenis Iqra'], ['peringkat', 'Peringkat'],
      ['iqraLabel', 'Iqra Label'], ['mukaSurat', 'Muka Surat'], ['bilKhatam', 'Bil Khatam'],
      ['status', 'Status'], ['tarikhDaftar', 'Tarikh Daftar'], ['tarikhKemaskini', 'Tarikh Kemaskini'],
      ['kodIbuBapa', 'Kod Ibu Bapa'], ['ditambahOleh', 'Ditambah Oleh'], ['tarikhPindah', 'Tarikh Pindah'],
      ['sekolahBaharu', 'Sekolah Baharu']
    ],
    Rekod: [
      ['id', 'ID'], ['tarikh', 'Tarikh'], ['hari', 'Hari'], ['masa', 'Masa'], ['muridId', 'Murid ID'],
      ['muridNama', 'Nama Murid'], ['darjah', 'Darjah'], ['kelas', 'Kelas'], ['guruId', 'Guru ID'],
      ['guru', 'Nama Guru'], ['jenis', 'Jenis'], ['peringkat', 'Peringkat'], ['iqraLabel', 'Iqra Label'],
      ['dari', 'M/S Dari'], ['ke', 'M/S Ke'], ['jumlah', 'Jumlah'], ['kualiti', 'Kualiti'],
      ['catatan', 'Catatan']
    ],
    Khatam: [
      ['id', 'ID'], ['muridId', 'Murid ID'], ['muridNama', 'Nama Murid'], ['darjah', 'Darjah'],
      ['kelas', 'Kelas'], ['bilangan', 'Bilangan'], ['tahun', 'Tahun'], ['tarikh', 'Tarikh'],
      ['guru', 'Guru'], ['catatan', 'Catatan'], ['guruId', 'Guru ID']
    ],
    KBS: [
      ['id', 'ID'], ['muridId', 'Murid ID'], ['muridNama', 'Nama Murid'], ['darjah', 'Darjah'],
      ['kelas', 'Kelas'], ['tahap', 'Tahap'], ['tahun', 'Tahun'], ['sectionKey', 'Section'],
      ['itemId', 'Item ID'], ['itemTeks', 'Item Teks'], ['status', 'Status'], ['guru', 'Guru'],
      ['tarikh', 'Tarikh']
    ],
    Kumpulan: [
      ['id', 'ID'], ['nama', 'Nama'], ['darjah', 'Darjah'], ['kelas', 'Kelas'], ['warna', 'Warna'],
      ['muridIds', 'Murid IDs'], ['guruId', 'Guru ID']
    ]
  };

  var NOMBOR = { mukaSurat: 1, bilKhatam: 1, dari: 1, ke: 1, jumlah: 1, bilangan: 1, tahun: 1, tahap: 1 };

  var PERANAN = ['guru', 'penyelaras', 'gb', 'superadmin'];
  var STAF_TULIS = ['guru', 'penyelaras', 'superadmin'];
  var PENTADBIR = ['penyelaras', 'superadmin'];

  /* Medan murid yang boleh dikemas kini oleh guru biasa (kemajuan bacaan sahaja) */
  var MURID_MEDAN_GURU = ['jenis', 'peringkat', 'iqraLabel', 'mukaSurat', 'bilKhatam', 'tarikhKemaskini'];

  /* Kunci tetapan sekolah & siapa boleh ubah */
  var CONFIG_KUNCI = {
    namaSekolah: PENTADBIR, kodSekolah: ['superadmin'], alamat: PENTADBIR, logo: PENTADBIR,
    namaGB: PENTADBIR, jawatanGB: PENTADBIR, modulKBS: PENTADBIR, alertDays: PENTADBIR, iqraBaru: PENTADBIR,
    iqraLama: PENTADBIR, senaraiKelas: PENTADBIR, tahunSemasa: ['superadmin']
  };

  var SESI_HARI = 3650;        // "ingat saya": kekal sehingga log keluar / log masuk akaun lain / kata laluan ditukar
  var SESI_HARI_PENDEK = 1;    // tanpa "ingat saya"
  var CUBAAN_MAKS = 5;         // cubaan log masuk gagal sebelum dikunci
  var KUNCI_MINIT = 10;
  var IMPORT_MAKS_PENYELARAS = 10; // tambah murid > 10 serentak = import pukal (Super Admin)
  var TAMBAH_MAKS_GURU = 3;        // guru boleh tambah maks 3 murid (pindah masuk) setiap kali
  /* Medan yang guru boleh isi semasa menambah murid ke kelas sendiri */
  var MURID_MEDAN_TAMBAH_GURU = ['nama', 'no', 'darjah', 'kelas', 'jenis', 'peringkat', 'iqraLabel', 'mukaSurat', 'status', 'tarikhDaftar'];

  /* ── Penyeragaman darjah & kelas ──
     "4 JAUHARI", "jauhari", "Darjah 4 Jauhari", " Jauhari " → "Jauhari"  */
  function normalKelas(k) {
    var s = String(k === undefined || k === null ? '' : k).replace(/\s+/g, ' ').trim();
    var t = s.replace(/^(darjah|tahun)?\s*[1-6](\s+|\s*[-\/.]\s*)/i, '');
    if (t && t !== s) s = t;
    return s.toLowerCase().replace(/(^|[\s\-'(])(\S)/g, function (m, a, b) { return a + b.toUpperCase(); });
  }
  function normalDarjah(d) {
    var s = String(d === undefined || d === null ? '' : d).trim();
    var n = s.replace(/\D/g, '');
    return /^[1-6]$/.test(n) ? 'Darjah ' + n : s;
  }
  function normalKelasList(l) {
    var lihat = {}, out = [];
    String(l || '').split(';').forEach(function (p) {
      var b = p.split('|');
      if (!b[0] || !b[1]) return;
      var x = normalDarjah(b[0]) + '|' + normalKelas(b[1]);
      if (!lihat[x]) { lihat[x] = 1; out.push(x); }
    });
    return out.join(';');
  }

  /* ── Pembetulan peringkat Al-Quran ──
     Data lama: Jenis = "Al-Quran" tetapi Peringkat = "Iqra 1" (medan tersembunyi
     dalam borang lama). Juga murid yang ada sesi tasmik Al-Quran tetapi
     peringkatnya Iqra. Kembalikan { id: patch } untuk murid yang perlu dibetulkan. */
  function ialahQuran(x) {
    return x && (x.jenis === 'Al-Quran' || x.peringkat === 'Al-Quran' || /^Al-Quran/i.test(String(x.iqraLabel || '')));
  }
  function betulkanPeringkat(murid, rekod) {
    var akhirQuran = {};
    (rekod || []).forEach(function (r) {
      if (!ialahQuran(r) || !r.muridId) return;
      var a = akhirQuran[r.muridId];
      if (!a || new Date(r.tarikh) > new Date(a.tarikh)) akhirQuran[r.muridId] = r;
    });
    var patch = {};
    (murid || []).forEach(function (m) {
      if (m.peringkat === 'Khatam' || m.peringkat === 'Al-Quran') {
        if (m.peringkat === 'Al-Quran' && m.jenis !== 'Al-Quran') patch[m.id] = { jenis: 'Al-Quran' };
        return;
      }
      var r = akhirQuran[m.id];
      if (ialahQuran(m) || r) {
        var p = { jenis: 'Al-Quran', peringkat: 'Al-Quran' };
        if (r && (parseInt(r.ke, 10) || 0) > 0) {
          var ms = parseInt(r.ke, 10);
          if (!ialahQuran(m) || (parseInt(m.mukaSurat, 10) || 0) < ms) p.mukaSurat = ms;
        }
        var akhir = p.mukaSurat || parseInt(m.mukaSurat, 10) || 1;
        p.iqraLabel = 'Al-Quran (Juzuk ' + (akhir <= 1 ? 1 : Math.min(30, Math.floor((akhir - 1) / 20) + 1)) + ')';
        patch[m.id] = p;
      }
    });
    return patch;
  }

  /* ── SHA-256 tulen JS (digunakan jika adapter tiada versi pantas) ── */
  function sha256Hex(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var mp = Math.pow, maxWord = mp(2, 32), result = '', words = [], i, j;
    var str = unescape(encodeURIComponent(ascii));
    var bitLen = str.length * 8;
    var hash = [], k = [], pc = 0, isC = {};
    for (var c = 2; pc < 64; c++) {
      if (!isC[c]) {
        for (i = 0; i < 313; i += c) isC[i] = c;
        hash[pc] = (mp(c, .5) * maxWord) | 0;
        k[pc++] = (mp(c, 1 / 3) * maxWord) | 0;
      }
    }
    hash = hash.slice(0, 8);
    str += '\x80';
    while (str.length % 64 - 56) str += '\x00';
    for (i = 0; i < str.length; i++) {
      j = str.charCodeAt(i);
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((bitLen / maxWord) | 0);
    words[words.length] = (bitLen);
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2];
        var a = hash[0], e = hash[4];
        var t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] +
          (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] +
            (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash);
        hash[4] = (hash[4] + t1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        var b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? 0 : '') + b.toString(16);
      }
    }
    return result;
  }

  /* Hash versi lama (SKDK v2) — hanya untuk naik taraf kata laluan sekali */
  function hashLama(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return String(Math.abs(h));
  }

  var ABJAD_KOD = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // tiada 0/O/1/I

  function cipta(env) {
    var sha = env.sha256 || sha256Hex;
    var ITER = env.iterasi || 1000;

    function hashKata(pw, salt) {
      var h = salt + '|' + pw;
      for (var i = 0; i < ITER; i++) h = sha(h + salt);
      return 'v2$' + salt + '$' + h;
    }
    function rawak(n, abjad) {
      abjad = abjad || 'abcdefghijklmnopqrstuvwxyz0123456789';
      var bytes = env.rawakBytes(n), s = '';
      for (var i = 0; i < n; i++) s += abjad.charAt(bytes[i] % abjad.length);
      return s;
    }
    function janaId(pfx) { return pfx + Date.now().toString(36).toUpperCase() + rawak(4, ABJAD_KOD); }
    function janaKodIbuBapa(sedia) {
      var kod;
      do { kod = rawak(7, ABJAD_KOD); } while (sedia && sedia[kod]);
      return kod;
    }
    function janaKataSementara() { return rawak(4, 'abcdefghjkmnpqrstuvwxyz') + rawak(4, '23456789'); }

    function semakKata(pw, simpan) {
      simpan = String(simpan || '');
      if (!pw || !simpan) return { ok: false };
      if (simpan.indexOf('v2$') === 0) {
        var salt = simpan.split('$')[1];
        return { ok: hashKata(pw, salt) === simpan };
      }
      // Hash lama 32-bit: terima sekali, kemudian naik taraf
      if (/^\d{4,}$/.test(simpan) && hashLama(pw) === simpan) return { ok: true, naikTaraf: true };
      return { ok: false };
    }

    function iso() { return new Date(env.now ? env.now() : Date.now()).toISOString(); }

    function bersih(table, row) {
      var out = {};
      var skema = SKEMA[table];
      for (var i = 0; i < skema.length; i++) {
        var k = skema[i][0];
        if (!(k in row)) continue;
        var v = row[k];
        if (v === null || v === undefined) v = '';
        if (NOMBOR[k]) { v = v === '' ? '' : (parseInt(v, 10) || 0); }
        else { v = String(v).slice(0, k === 'muridIds' ? 20000 : 1000).trim(); }
        if (k === 'kelas' && v) v = normalKelas(v);
        else if (k === 'darjah' && v) v = normalDarjah(v);
        else if (k === 'kelasList') v = normalKelasList(v);
        out[k] = v;
      }
      return out;
    }

    function tanpaRahsia(g) {
      var o = {};
      for (var k in g) if (k !== 'password' && k.charAt(0) !== '_') o[k] = g[k];
      o.tukarKata = String(g.tukarKata).toUpperCase() === 'TRUE';
      return o;
    }

    function senaraiKelasGuru(g) {
      var list = [];
      String(g.kelasList || '').split(';').forEach(function (p) {
        var bh = p.split('|');
        if (bh[0] && bh[1]) list.push({ darjah: normalDarjah(bh[0]), kelas: normalKelas(bh[1]) });
      });
      if (!list.length && g.darjah && g.kelas) list.push({ darjah: normalDarjah(g.darjah), kelas: normalKelas(g.kelas) });
      return list;
    }

    function profil(g) {
      var p = tanpaRahsia(g);
      p.senaraiKelas = senaraiKelasGuru(g);
      return p;
    }

    function log(tindakan, oleh, detail) {
      try { env.store.log([iso(), tindakan, oleh || '', detail || '']); } catch (e) { /* abaikan */ }
    }

    /* ── Sesi ── */
    function penggunaDariToken(token) {
      if (!token) return null;
      var s = env.sesi.get(token);
      if (!s) return null;
      if (s.tamat < Date.now()) { env.sesi.del(token); return null; }
      var g = env.store.all('Guru').filter(function (x) { return x.id === s.uid; })[0];
      if (!g || g.status === 'Tamat') { env.sesi.del(token); return null; }
      // Sesi terikat pada kata laluan: reset / tukar kata laluan membatalkan semua sesi lama
      if (s.kp && s.kp !== capKata(g.password)) { env.sesi.del(token); return null; }
      return profil(g);
    }
    function capKata(hash) { return sha('sesi|' + String(hash || '')).slice(0, 16); }
    function ciptaSesi(g, ingat) {
      var token = rawak(40);
      var hari = ingat ? SESI_HARI : SESI_HARI_PENDEK;
      env.sesi.put(token, { uid: g.id, tamat: Date.now() + hari * 864e5, kp: capKata(g.password), ingat: !!ingat }, hari);
      return token;
    }

    function perlu(user, senarai) {
      if (!user) throw ralat('SESI', 'Sesi tamat. Sila log masuk semula.');
      if (senarai && senarai.indexOf(user.peranan) < 0) throw ralat('AKSES', 'Anda tiada kebenaran untuk tindakan ini.');
    }

    function ralat(kod, msg) { var e = new Error(msg); e.kod = kod; return e; }

    /* ── Tindakan ── */
    function apiPing() {
      var c = env.store.config();
      return { ok: true, versi: VERSI, namaSekolah: c.namaSekolah || '', logo: c.logo || '', modulKBS: c.modulKBS !== 'FALSE' };
    }

    function apiLogin(b) {
      var u = String(b.username || '').trim().toLowerCase();
      var pw = String(b.password || '');
      if (!u || !pw) return { ok: false, msg: 'Sila isi nama pengguna dan kata laluan.' };
      var kunciCache = 'gagal_' + sha(u).slice(0, 20);
      var gagal = parseInt(env.cache.get(kunciCache) || '0', 10);
      if (gagal >= CUBAAN_MAKS) return { ok: false, msg: 'Terlalu banyak cubaan. Cuba lagi selepas ' + KUNCI_MINIT + ' minit.' };

      var g = env.store.all('Guru').filter(function (x) {
        return String(x.email || '').trim().toLowerCase() === u && x.status !== 'Tamat';
      })[0];
      var hasil = g ? semakKata(pw, g.password) : { ok: false };
      if (!hasil.ok) {
        env.cache.put(kunciCache, String(gagal + 1), KUNCI_MINIT * 60);
        return { ok: false, msg: 'Nama pengguna atau kata laluan tidak betul.' };
      }
      env.cache.remove(kunciCache);
      if (hasil.naikTaraf) env.store.update('Guru', g.id, { password: hashKata(pw, rawak(16)) });

      if (hasil.naikTaraf) g = env.store.all('Guru').filter(function (x) { return x.id === g.id; })[0];
      var token = ciptaSesi(g, b.ingat);
      log('Log masuk', g.nama, g.peranan);
      return { ok: true, token: token, user: profil(g) };
    }

    function apiLogout(b) { if (b.token) env.sesi.del(b.token); return { ok: true }; }

    function apiMe(user) { return { ok: true, user: user }; }

    function apiGetAll(user) {
      var c = env.store.config();
      var data = {
        guru: env.store.all('Guru').filter(function (g) { return g.status !== 'Padam'; }).map(profil),
        murid: env.store.all('Murid').filter(function (m) { return m.status !== 'Padam'; }).map(bersihObj),
        rekod: env.store.all('Rekod').map(bersihObj),
        khatam: env.store.all('Khatam').map(bersihObj),
        kbs: env.store.all('KBS').map(bersihObj),
        kumpulan: env.store.all('Kumpulan').map(bersihObj),
        config: c
      };
      // Paparkan peringkat sebenar (cth murid Al-Quran yang tersimpan sebagai "Iqra 1")
      var betul = betulkanPeringkat(data.murid, data.rekod);
      data.murid.forEach(function (m) { if (betul[m.id]) for (var k in betul[m.id]) m[k] = betul[m.id][k]; });
      data.rekod.forEach(function (r) { if (ialahQuran(r) && r.peringkat !== 'Al-Quran') { r.peringkat = 'Al-Quran'; r.jenis = 'Al-Quran'; } });
      // Guru biasa tidak perlu nampak kod ibu bapa murid kelas lain — tetap dihantar
      // kerana guru boleh cetak slip kelas sendiri; tapis di sini:
      if (user.peranan === 'guru') {
        var kls = user.senaraiKelas.map(function (k) { return k.darjah + '|' + k.kelas; });
        data.murid.forEach(function (m) { if (kls.indexOf(m.darjah + '|' + m.kelas) < 0) m.kodIbuBapa = ''; });
      }
      return { ok: true, data: data, user: user, versi: VERSI, masaServer: iso() };
    }

    function bersihObj(o) {
      var r = {};
      for (var k in o) if (k.charAt(0) !== '_') r[k] = o[k];
      // Seragamkan data lama yang ditaip tidak konsisten (cth "4 JAUHARI")
      if (r.kelas) r.kelas = normalKelas(r.kelas);
      if (r.darjah) r.darjah = normalDarjah(r.darjah);
      return r;
    }

    function apiChangePass(user, b) {
      var baru = String(b.newPass || '');
      if (baru.length < 6) return { ok: false, msg: 'Kata laluan baharu minimum 6 aksara.' };
      var g = env.store.all('Guru').filter(function (x) { return x.id === user.id; })[0];
      if (!semakKata(String(b.oldPass || ''), g.password).ok) return { ok: false, msg: 'Kata laluan semasa tidak betul.' };
      var hashBaru = hashKata(baru, rawak(16));
      env.store.update('Guru', g.id, { password: hashBaru, tukarKata: 'FALSE' });
      // Semua peranti lain log keluar; peranti ini terima sesi baharu
      var lama = b.token ? env.sesi.get(b.token) : null;
      if (b.token) env.sesi.del(b.token);
      g.password = hashBaru;
      log('Tukar kata laluan', g.nama, '');
      return { ok: true, msg: 'Kata laluan berjaya ditukar.', token: ciptaSesi(g, lama ? lama.ingat !== false : true) };
    }

    function apiResetPass(user, b) {
      perlu(user, PENTADBIR);
      var g = env.store.all('Guru').filter(function (x) { return x.id === b.guruId; })[0];
      if (!g) return { ok: false, msg: 'Pengguna tidak dijumpai.' };
      if (g.peranan === 'superadmin' && user.peranan !== 'superadmin') throw ralat('AKSES', 'Tidak boleh reset akaun Super Admin.');
      var sementara = janaKataSementara();
      env.store.update('Guru', g.id, { password: hashKata(sementara, rawak(16)), tukarKata: 'TRUE' });
      log('Reset kata laluan', user.nama, g.nama);
      return { ok: true, kataSementara: sementara };
    }

    function apiSetConfig(user, b) {
      perlu(user, PENTADBIR);
      var nilai = b.values || {};
      for (var k in nilai) {
        if (!CONFIG_KUNCI[k]) throw ralat('INPUT', 'Tetapan tidak dikenali: ' + k);
        if (CONFIG_KUNCI[k].indexOf(user.peranan) < 0) throw ralat('AKSES', 'Tiada kebenaran ubah tetapan: ' + k);
        var v = String(nilai[k] === undefined || nilai[k] === null ? '' : nilai[k]);
        if (k === 'logo' && v.length > 45000) throw ralat('INPUT', 'Logo terlalu besar.');
        if (k !== 'logo' && v.length > 5000) throw ralat('INPUT', 'Nilai tetapan terlalu panjang.');
        env.store.setConfig(k, v);
      }
      log('Tetapan', user.nama, Object.keys(nilai).join(', '));
      return { ok: true, config: env.store.config() };
    }

    function apiJanaKod(user, b) {
      perlu(user, PENTADBIR);
      var ids = b.muridIds || [];
      var murid = env.store.all('Murid');
      var sedia = {};
      murid.forEach(function (m) { if (m.kodIbuBapa) sedia[m.kodIbuBapa] = 1; });
      var hasil = {};
      murid.forEach(function (m) {
        if (ids.indexOf(m.id) < 0) return;
        var kod = janaKodIbuBapa(sedia); sedia[kod] = 1;
        env.store.update('Murid', m.id, { kodIbuBapa: kod });
        hasil[m.id] = kod;
      });
      log('Jana kod ibu bapa', user.nama, Object.keys(hasil).length + ' murid');
      return { ok: true, kod: hasil };
    }

    /* ── TUKAR TAHUN (transaksi tunggal) ──────────────────────────
       b.tahunBaharu  : tahun persekolahan baharu (wajib)
       b.petaKelas    : { 'Darjah 1|Bestari': 'Cerdas', ... } nama kelas tahun depan
                        (tiada = nama kelas kekal)
       b.muridBaru    : [{ nama, kelas }]  murid Tahun 1
       b.guru         : [{ id, kelasList }] kelas guru tahun depan
       b.sandaran     : true → salin Google Sheet dahulu (gagal = batal)  */
    function apiTukarTahun(user, b) {
      perlu(user, ['superadmin']);
      var tahun = parseInt(b.tahunBaharu, 10);
      var c = env.store.config();
      var semasa = parseInt(c.tahunSemasa, 10) || 0;
      if (!tahun || tahun < 2000 || tahun > 2100) return { ok: false, msg: 'Tahun baharu tidak sah.' };
      if (semasa && tahun !== semasa + 1) return { ok: false, msg: 'Tahun baharu mestilah ' + (semasa + 1) + ' (tahun semasa ' + semasa + ').' };
      var peta = b.petaKelas || {};
      var baru = b.muridBaru || [];
      var guruBaru = b.guru || [];
      if (baru.length > 600) return { ok: false, msg: 'Terlalu banyak murid baharu (maks 600).' };

      // 1) Semak dahulu — tiada apa diubah jika ada ralat
      var murid = env.store.all('Murid');
      var guru = env.store.all('Guru');
      var semakKelas = function (k) { return normalKelas(String(k || '').slice(0, 40)); };
      for (var key in peta) {
        if (!/^Darjah [1-5]\|.+$/.test(key)) throw ralat('INPUT', 'Peta kelas tidak sah: ' + key);
        if (!semakKelas(peta[key])) throw ralat('INPUT', 'Nama kelas baharu kosong untuk ' + key.replace('|', ' '));
      }
      var dlmSenarai = {};
      baru.forEach(function (m, i) {
        var nama = String(m.nama || '').trim().toUpperCase().replace(/\s+/g, ' ');
        if (nama.length < 3) throw ralat('INPUT', 'Nama murid baharu baris ' + (i + 1) + ' tidak sah.');
        if (!semakKelas(m.kelas)) throw ralat('INPUT', 'Kelas kosong untuk ' + nama + '.');
        var k = nama + '|' + semakKelas(m.kelas).toUpperCase();
        if (dlmSenarai[k]) throw ralat('INPUT', 'Nama berganda dalam senarai Tahun 1: ' + nama);
        dlmSenarai[k] = 1;
      });
      guruBaru.forEach(function (g) {
        var ada = guru.filter(function (x) { return x.id === g.id; })[0];
        if (!ada) throw ralat('INPUT', 'Guru tidak dijumpai: ' + g.id);
        if (!/^(Darjah [1-6]\|[^;|]{1,40})?(;Darjah [1-6]\|[^;|]{1,40})*$/.test(String(g.kelasList || ''))) throw ralat('INPUT', 'Senarai kelas tidak sah untuk ' + ada.nama);
      });

      // 2) Sandaran
      var sandaran = null;
      if (b.sandaran) {
        if (!env.sandaran) throw ralat('INPUT', 'Sandaran automatik tidak disokong di sini.');
        sandaran = env.sandaran('Tasmik_Backup_' + (semasa || (tahun - 1)) + '_' + iso().slice(0, 10));
        if (!sandaran || !sandaran.ok) return { ok: false, msg: 'Sandaran gagal — Tukar Tahun DIBATALKAN. ' + (sandaran && sandaran.msg || '') };
      }

      // 3) Naik kelas / alumni
      var kini = iso(), naik = 0, tamat = 0, kemas = {};
      murid.forEach(function (m) {
        if (m.status !== 'Aktif' && m.status !== 'Dikecualikan') return;   // murid dikecualikan juga naik darjah
        var d = parseInt(String(m.darjah || '').replace(/\D/g, ''), 10) || 0;
        if (d === 6) { kemas[m.id] = { status: 'Tamat', tarikhKemaskini: kini }; tamat++; }
        else if (d >= 1 && d <= 5) {
          var kb = peta[m.darjah + '|' + m.kelas];
          kemas[m.id] = { darjah: 'Darjah ' + (d + 1), kelas: kb ? semakKelas(kb) : m.kelas, tarikhKemaskini: kini };
          naik++;
        }
      });
      env.store.updateMany('Murid', kemas);

      // 4) Kumpulan bacaan ikut murid naik; kumpulan Darjah 6 dibuang
      var kp = {}, kpBuang = [];
      env.store.all('Kumpulan').forEach(function (k) {
        var d = parseInt(String(k.darjah || '').replace(/\D/g, ''), 10) || 0;
        if (d >= 6 || d < 1) kpBuang.push(k.id);
        else { var kb2 = peta[k.darjah + '|' + k.kelas]; kp[k.id] = { darjah: 'Darjah ' + (d + 1), kelas: kb2 ? semakKelas(kb2) : k.kelas }; }
      });
      env.store.updateMany('Kumpulan', kp);
      kpBuang.forEach(function (id) { env.store.remove('Kumpulan', id); });

      // 5) Murid Tahun 1
      var sediaKod = {};
      murid.forEach(function (m) { if (m.kodIbuBapa) sediaKod[m.kodIbuBapa] = 1; });
      var rows = baru.map(function (m) {
        var kod = janaKodIbuBapa(sediaKod); sediaKod[kod] = 1;
        return { id: janaId('M'), nama: String(m.nama).trim().toUpperCase().replace(/\s+/g, ' '), no: '', darjah: 'Darjah 1', kelas: semakKelas(m.kelas),
          guruId: '', jenis: 'Iqra Baru', peringkat: 'Iqra 1', iqraLabel: 'Iqra 1 (Jilid 1)', mukaSurat: 0, bilKhatam: 0,
          status: 'Aktif', tarikhDaftar: kini, tarikhKemaskini: kini, kodIbuBapa: kod };
      });
      if (rows.length) env.store.insertMany('Murid', rows);

      // 6) Kelas guru tahun depan
      var gk = {};
      guruBaru.forEach(function (g) {
        var l = String(g.kelasList || ''), p = l.split(';')[0].split('|');
        gk[g.id] = { kelasList: l, darjah: p[0] || '', kelas: p[1] || '' };
      });
      env.store.updateMany('Guru', gk);

      env.store.setConfig('tahunSemasa', String(tahun));
      log('Tukar Tahun', user.nama, naik + ' naik, ' + tamat + ' alumni, ' + rows.length + ' Tahun 1, ' + Object.keys(gk).length + ' guru, tahun ' + tahun + (sandaran ? ', sandaran ' + sandaran.nama : ''));
      return { ok: true, naik: naik, tamat: tamat, baru: rows.length, guru: Object.keys(gk).length, kumpulan: Object.keys(kp).length, sandaran: sandaran };
    }

    /* ── GABUNG MURID BERGANDA ──
       b.simpanId : murid yang dikekalkan
       b.buangIds : murid berganda — rekod tasmik/khatam/KBS dipindah ke simpanId,
                    kemudian ditanda 'Padam' (tidak dipadam dari Sheet)       */
    function apiGabungMurid(user, b) {
      perlu(user, PENTADBIR);
      var murid = env.store.all('Murid');
      var simpan = murid.filter(function (m) { return m.id === b.simpanId; })[0];
      var buangIds = (b.buangIds || []).filter(function (id) { return id && id !== b.simpanId; });
      if (!simpan) return { ok: false, msg: 'Murid yang dikekalkan tidak dijumpai.' };
      if (!buangIds.length) return { ok: false, msg: 'Tiada murid untuk digabung.' };
      var buang = murid.filter(function (m) { return buangIds.indexOf(m.id) >= 0; });
      if (buang.length !== buangIds.length) return { ok: false, msg: 'Sebahagian murid tidak dijumpai.' };
      var kini = iso();

      // Kedudukan bacaan: ambil yang paling jauh
      var PO = ['Iqra 1', 'Iqra 2', 'Iqra 3', 'Iqra 4', 'Iqra 5', 'Iqra 6', 'Al-Quran', 'Khatam'];
      var jauh = [simpan].concat(buang).reduce(function (a, m) {
        var ia = PO.indexOf(a.peringkat), im = PO.indexOf(m.peringkat);
        if (im > ia || (im === ia && (parseInt(m.mukaSurat, 10) || 0) > (parseInt(a.mukaSurat, 10) || 0))) return m;
        return a;
      }, simpan);

      // Rekod & khatam
      var pr = {}, pk = {}, nRekod = 0, nKhatam = 0;
      env.store.all('Rekod').forEach(function (r) { if (buangIds.indexOf(r.muridId) >= 0) { pr[r.id] = { muridId: simpan.id, muridNama: simpan.nama }; nRekod++; } });
      env.store.updateMany('Rekod', pr);
      var khatamSemua = env.store.all('Khatam');
      khatamSemua.forEach(function (k) { if (buangIds.indexOf(k.muridId) >= 0) { pk[k.id] = { muridId: simpan.id, muridNama: simpan.nama }; nKhatam++; } });
      env.store.updateMany('Khatam', pk);

      // KBS: pindah, tetapi jika item yang sama sudah ada pada murid dikekalkan, kekalkan yang terkini
      var kbs = env.store.all('KBS'), ada = {}, pkbs = {}, kbsBuang = [];
      kbs.forEach(function (r) { if (r.muridId === simpan.id) ada[r.tahun + '|' + r.itemId] = r; });
      kbs.filter(function (r) { return buangIds.indexOf(r.muridId) >= 0; })
        .sort(function (a, c) { return new Date(c.tarikh) - new Date(a.tarikh); })
        .forEach(function (r) {
          var key = r.tahun + '|' + r.itemId, sedia = ada[key];
          if (!sedia) { pkbs[r.id] = { muridId: simpan.id, muridNama: simpan.nama }; ada[key] = r; }
          else if (new Date(r.tarikh) > new Date(sedia.tarikh) && pkbs[sedia.id] === undefined) {
            kbsBuang.push(sedia.id); pkbs[r.id] = { muridId: simpan.id, muridNama: simpan.nama }; ada[key] = r;
          } else kbsBuang.push(r.id);
        });
      env.store.updateMany('KBS', pkbs);
      kbsBuang.forEach(function (id) { env.store.remove('KBS', id); });

      // Kumpulan bacaan: ganti ID
      var pkp = {};
      env.store.all('Kumpulan').forEach(function (k) {
        var ids = String(k.muridIds || '').split(',').filter(Boolean), ubah = false;
        ids = ids.map(function (id) { if (buangIds.indexOf(id) >= 0) { ubah = true; return simpan.id; } return id; });
        if (ubah) pkp[k.id] = { muridIds: ids.filter(function (id, i) { return ids.indexOf(id) === i; }).join(',') };
      });
      env.store.updateMany('Kumpulan', pkp);

      // Murid dikekalkan & murid berganda
      var bilKhatam = 0;
      env.store.all('Khatam').forEach(function (k) { if (k.muridId === simpan.id) bilKhatam = Math.max(bilKhatam, parseInt(k.bilangan, 10) || 0); });
      var kemas = {};
      kemas[simpan.id] = { jenis: jauh.jenis, peringkat: jauh.peringkat, iqraLabel: jauh.iqraLabel, mukaSurat: jauh.mukaSurat,
        bilKhatam: Math.max(bilKhatam, parseInt(simpan.bilKhatam, 10) || 0), status: 'Aktif', tarikhKemaskini: kini };
      buang.forEach(function (m) { kemas[m.id] = { status: 'Padam', tarikhKemaskini: kini, ditambahOleh: String(m.ditambahOleh || '') + ' [digabung ke ' + simpan.id + ']' }; });
      env.store.updateMany('Murid', kemas);
      log('Gabung murid', user.nama, simpan.nama + ' ← ' + buang.map(function (m) { return m.id; }).join(', ') + ' (' + nRekod + ' rekod, ' + nKhatam + ' khatam)');
      return { ok: true, rekod: nRekod, khatam: nKhatam, kbs: Object.keys(pkbs).length };
    }

    /* Sandaran manual (Super Admin) */
    function apiSandaran(user) {
      perlu(user, ['superadmin']);
      if (!env.sandaran) return { ok: false, msg: 'Sandaran automatik tidak disokong di sini.' };
      var r = env.sandaran('Tasmik_Backup_' + iso().slice(0, 10));
      if (r && r.ok) log('Sandaran', user.nama, r.nama);
      return r;
    }

    /* Paparan ibu bapa — HANYA data prestasi semasa seorang murid */
    function apiIbuBapa(b) {
      var kod = String(b.kod || '').trim().toUpperCase();
      if (!/^[A-Z0-9]{6,10}$/.test(kod)) return { ok: false, msg: 'Kod tidak sah.' };
      var m = env.store.all('Murid').filter(function (x) { return x.kodIbuBapa === kod && x.status === 'Aktif'; })[0];
      if (!m) return { ok: false, msg: 'Kod tidak dijumpai atau telah ditukar. Sila hubungi guru kelas.' };
      var rekod = env.store.all('Rekod').filter(function (r) { return r.muridId === m.id; })
        .sort(function (a, b2) { return new Date(b2.tarikh) - new Date(a.tarikh); });
      var akhir = rekod[0];
      var guru = env.store.all('Guru').filter(function (g) {
        return g.status !== 'Tamat' && g.peranan === 'guru' && senaraiKelasGuru(g).some(function (k) { return k.darjah === normalDarjah(m.darjah) && k.kelas === normalKelas(m.kelas); });
      }).map(function (g) { return g.nama; });
      var c = env.store.config();
      return {
        ok: true,
        sekolah: { nama: c.namaSekolah || '', logo: c.logo || '' },
        murid: {
          nama: m.nama, darjah: m.darjah, kelas: m.kelas, jenis: m.jenis, peringkat: m.peringkat,
          iqraLabel: m.iqraLabel, mukaSurat: m.mukaSurat, bilKhatam: m.bilKhatam || 0,
          guru: guru,
          tasmikAkhir: akhir ? { tarikh: akhir.tarikh, kualiti: akhir.kualiti, dari: akhir.dari, ke: akhir.ke, iqraLabel: akhir.iqraLabel } : null
        },
        iqraBaru: c.iqraBaru || '', iqraLama: c.iqraLama || ''
      };
    }

    /* ── Batch tulis: semua operasi disemak dahulu, kemudian dilaksana ── */
    function bolehTulis(user, op, jadual, lama, baru) {
      var p = user.peranan;
      if (p === 'superadmin') return true;
      if (p === 'gb') return false;
      switch (jadual) {
        case 'Rekod':
          if (op === 'insert') return true;
          return PENTADBIR.indexOf(p) >= 0 || (lama && lama.guruId === user.id);
        case 'Khatam':
          if (op === 'insert') return true;
          return PENTADBIR.indexOf(p) >= 0;
        case 'KBS':
          return op !== 'delete' || PENTADBIR.indexOf(p) >= 0;
        case 'Kumpulan':
          return PENTADBIR.indexOf(p) >= 0 || op === 'insert' || (lama && lama.guruId === user.id);
        case 'Murid':
          if (PENTADBIR.indexOf(p) >= 0) return true;   // padam = status 'Padam' (data kekal dalam Sheet)
          if (op === 'insert') {
            // Guru: tambah murid (cth pindah masuk) ke kelas sendiri sahaja
            for (var f in baru) if (MURID_MEDAN_TAMBAH_GURU.indexOf(f) < 0) return false;
            if (baru.status && baru.status !== 'Aktif') return false;
            return (user.senaraiKelas || []).some(function (k) { return k.darjah === baru.darjah && k.kelas === baru.kelas; });
          }
          if (op !== 'update') return false;
          // Guru boleh kecualikan / aktifkan semula murid kelas sendiri (cth murid bukan Islam)
          if ('status' in baru) {
            for (var f2 in baru) if (f2 !== 'status' && f2 !== 'tarikhKemaskini') return false;
            if (['Aktif', 'Dikecualikan'].indexOf(baru.status) < 0) return false;
            if (!lama || ['Aktif', 'Dikecualikan'].indexOf(lama.status) < 0) return false;
            return (user.senaraiKelas || []).some(function (k) { return k.darjah === normalDarjah(lama.darjah) && k.kelas === normalKelas(lama.kelas); });
          }
          for (var k in baru) if (MURID_MEDAN_GURU.indexOf(k) < 0) return false;
          return true;
        case 'Guru':
          if (p !== 'penyelaras') return false;
          if (op === 'delete') return false;
          if (lama && lama.peranan === 'superadmin') return false;
          if (baru && baru.peranan === 'superadmin') return false;
          return true;
      }
      return false;
    }

    function apiBatch(user, b) {
      perlu(user, STAF_TULIS);
      var ops = b.ops || [];
      if (!ops.length) return { ok: true, hasil: [] };
      if (ops.length > 600) return { ok: false, msg: 'Terlalu banyak operasi dalam satu permintaan.' };

      var tambahMurid = ops.filter(function (o) { return o.op === 'insert' && o.table === 'Murid'; }).length;
      if (tambahMurid > IMPORT_MAKS_PENYELARAS && user.peranan !== 'superadmin')
        throw ralat('AKSES', 'Import murid secara pukal hanya oleh Super Admin.');
      if (user.peranan === 'guru' && tambahMurid > TAMBAH_MAKS_GURU)
        throw ralat('AKSES', 'Guru boleh menambah maksimum ' + TAMBAH_MAKS_GURU + ' murid sekali gus. Hubungi penyelaras untuk lebih.');

      var cache = {};
      function semua(t) { if (!cache[t]) cache[t] = env.store.all(t); return cache[t]; }
      function cari(t, id) { return semua(t).filter(function (x) { return x.id === id; })[0]; }

      // 1) Semak
      var rancang = ops.map(function (o) {
        if (!SKEMA[o.table]) throw ralat('INPUT', 'Jadual tidak dikenali: ' + o.table);
        var row = bersih(o.table, o.row || o.patch || {});
        var lama = null;
        if (o.op === 'insert') {
          if (o.table === 'Guru' && row.peranan && PERANAN.indexOf(row.peranan) < 0) throw ralat('INPUT', 'Peranan tidak sah.');
          if (o.id && !/^[A-Za-z0-9_-]{4,40}$/.test(o.id)) throw ralat('INPUT', 'ID tidak sah.');
          if (o.id && cari(o.table, o.id)) return { o: o, abai: true }; // sudah wujud (sync berulang)
          if (o.table === 'Murid') {
            var nm = String(row.nama || '').toUpperCase().replace(/\s+/g, ' ');
            if (nm.length < 3) throw ralat('INPUT', 'Nama murid tidak sah.');
            row.nama = nm;
            var ganda = semua('Murid').filter(function (m) { return m.status === 'Aktif' && String(m.nama).toUpperCase().replace(/\s+/g, ' ').trim() === nm && normalDarjah(m.darjah) === row.darjah && normalKelas(m.kelas) === row.kelas; })[0];
            if (ganda) throw ralat('INPUT', nm + ' sudah wujud dalam ' + row.darjah + ' ' + row.kelas + '.');
          }
        } else if (o.op === 'update' || o.op === 'delete') {
          lama = cari(o.table, o.id);
          if (!lama) {
            if (o.op === 'delete') return { o: o, abai: true };
            throw ralat('INPUT', 'Rekod tidak dijumpai (' + o.table + ' ' + o.id + ').');
          }
          delete row.id;
          if (o.table === 'Guru') { delete row.password; if (row.peranan && PERANAN.indexOf(row.peranan) < 0) throw ralat('INPUT', 'Peranan tidak sah.'); }
          if (o.table === 'Murid' && user.peranan !== 'superadmin') delete row.kodIbuBapa;
        } else if (o.op === 'upsert') {
          if (o.table !== 'KBS') throw ralat('INPUT', 'Upsert hanya untuk KBS.');
          if (o.id && !/^[A-Za-z0-9_-]{4,40}$/.test(o.id)) throw ralat('INPUT', 'ID tidak sah.');
          lama = semua('KBS').filter(function (x) {
            return x.muridId === row.muridId && Number(x.tahun) === Number(row.tahun) && x.itemId === row.itemId;
          })[0] || null;
        } else throw ralat('INPUT', 'Operasi tidak dikenali: ' + o.op);

        if (!bolehTulis(user, o.op === 'upsert' ? (lama ? 'update' : 'insert') : o.op, o.table, lama, row))
          throw ralat('AKSES', 'Tiada kebenaran: ' + o.op + ' ' + o.table + '.');
        return { o: o, row: row, lama: lama };
      });

      // 2) Laksana
      var sediaKod = {};
      semua('Murid').forEach(function (m) { if (m.kodIbuBapa) sediaKod[m.kodIbuBapa] = 1; });
      var hasil = [], kataSementara = {};
      rancang.forEach(function (r) {
        var o = r.o;
        if (r.abai) { hasil.push({ id: o.id, abai: true }); return; }
        if (o.op === 'insert' || (o.op === 'upsert' && !r.lama)) {
          var row = r.row;
          row.id = o.id || janaId(o.table.charAt(0));
          if (o.table === 'Murid') {
            if (!row.status) row.status = 'Aktif';
            if (!row.tarikhDaftar) row.tarikhDaftar = iso();
            row.tarikhKemaskini = iso();
            row.kodIbuBapa = janaKodIbuBapa(sediaKod); sediaKod[row.kodIbuBapa] = 1;
            row.ditambahOleh = user.nama + ' (' + user.peranan + ')';
          }
          if (o.table === 'Guru') {
            var pw = (o.row && o.row.password) ? String(o.row.password) : '';
            if (!pw) { pw = janaKataSementara(); kataSementara[row.id] = pw; }
            row.password = hashKata(pw, rawak(16));
            row.tukarKata = 'TRUE';
            row.status = row.status || 'Aktif';
            row.peranan = row.peranan || 'guru';
            row.tarikhDaftar = iso();
            row.email = String(row.email || '').toLowerCase();
            if (semua('Guru').some(function (g) { return String(g.email).toLowerCase() === row.email; }))
              throw ralat('INPUT', 'Nama pengguna "' + row.email + '" sudah digunakan.');
          }
          if (o.table === 'Rekod' && !row.tarikh) row.tarikh = iso();
          env.store.insert(o.table, row);
          semua(o.table).push(row);
          hasil.push({ id: row.id, kodIbuBapa: row.kodIbuBapa });
        } else if (o.op === 'update' || o.op === 'upsert') {
          if (o.table === 'Murid') r.row.tarikhKemaskini = iso();
          env.store.update(o.table, r.lama.id, r.row);
          for (var k in r.row) r.lama[k] = r.row[k];
          hasil.push({ id: r.lama.id });
        } else if (o.op === 'delete') {
          if (o.table === 'Murid' || o.table === 'Guru') env.store.update(o.table, r.lama.id, { status: 'Padam' });
          else env.store.remove(o.table, r.lama.id);
          hasil.push({ id: r.lama.id });
        }
      });
      if (ops.length > 1 || ['Rekod', 'KBS'].indexOf(ops[0].table) < 0)
        log('Kemas kini', user.nama, ops.map(function (o) { return o.op + ' ' + o.table; }).slice(0, 5).join(', ') + (ops.length > 5 ? '…' : ''));
      return { ok: true, hasil: hasil, kataSementara: kataSementara };
    }

    /* ── Pintu masuk tunggal ── */
    function handle(body) {
      try {
        body = body || {};
        var a = body.action;
        if (a === 'ping') return apiPing();
        if (a === 'login') return apiLogin(body);
        if (a === 'logout') return apiLogout(body);
        if (a === 'ibubapa') return apiIbuBapa(body);

        var user = penggunaDariToken(body.token);
        if (!user) return { ok: false, kod: 'SESI', msg: 'Sesi tamat. Sila log masuk semula.' };
        switch (a) {
          case 'me': return apiMe(user);
          case 'getAll': return apiGetAll(user);
          case 'changePass': return apiChangePass(user, body);
          case 'resetPass': return env.kunci(function () { return apiResetPass(user, body); });
          case 'setConfig': return env.kunci(function () { return apiSetConfig(user, body); });
          case 'janaKod': return env.kunci(function () { return apiJanaKod(user, body); });
          case 'tukarTahun': return env.kunci(function () { return apiTukarTahun(user, body); });
          case 'sandaran': return env.kunci(function () { return apiSandaran(user); });
          case 'gabungMurid': return env.kunci(function () { return apiGabungMurid(user, body); });
          case 'batch': return env.kunci(function () { return apiBatch(user, body); });
        }
        return { ok: false, msg: 'Tindakan tidak dikenali.' };
      } catch (e) {
        if (e.kod) return { ok: false, kod: e.kod, msg: e.message };
        log('RALAT', '', String(e && e.message || e));
        return { ok: false, msg: 'Ralat pelayan: ' + (e && e.message || e) };
      }
    }

    return {
      handle: handle, hashKata: hashKata, rawak: rawak, janaId: janaId,
      janaKodIbuBapa: janaKodIbuBapa, janaKataSementara: janaKataSementara, semakKata: semakKata
    };
  }

  return {
    VERSI: VERSI, SKEMA: SKEMA, betulkanPeringkat: betulkanPeringkat, normalKelas: normalKelas, normalDarjah: normalDarjah, normalKelasList: normalKelasList, NOMBOR: NOMBOR, PERANAN: PERANAN, CONFIG_KUNCI: CONFIG_KUNCI,
    cipta: cipta, sha256Hex: sha256Hex, hashLama: hashLama
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = TasmikCore;
