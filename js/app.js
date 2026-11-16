/* ================================================================
   APLIKASI — keadaan, peranan, skop data, navigasi
   ================================================================ */
var APP_VERSI = '3.4.3';
var BACKEND_MIN = '3.4.0';

var App = (function () {
  var DB = kosongDB();
  var user = null;
  var halaman = {};
  var skop = '';          // '' = semua kelas saya; atau 'Darjah 1|Bestari'
  var indeks = null;

  function kosongDB() { return { guru: [], murid: [], rekod: [], khatam: [], kbs: [], kumpulan: [], config: {} }; }

  var NAMA_PERANAN = { guru: 'Guru', penyelaras: 'Penyelaras', gb: 'Guru Besar', superadmin: 'Super Admin' };
  var SEMUA = ['guru', 'penyelaras', 'gb', 'superadmin'];
  var MENU = [
    { id: 'utama', label: 'Utama', ikon: 'home', peranan: SEMUA },
    { id: 'rekod', label: 'Rekod Tasmik', ikon: 'book', peranan: ['guru', 'penyelaras', 'superadmin'] },
    { id: 'khatam', label: 'Khatam', ikon: 'trophy', peranan: SEMUA },
    { id: 'kbs', label: 'Bestari Solat', ikon: 'moon', peranan: SEMUA, modul: 'kbs' },
    { id: 'laporan', label: 'Laporan', ikon: 'chart', peranan: SEMUA },
    { id: 'amaran', label: 'Amaran', ikon: 'bell', peranan: SEMUA },
    { id: 'murid', label: 'Murid', ikon: 'users', peranan: SEMUA },
    { id: 'guru', label: 'Pengguna', ikon: 'shield', peranan: ['penyelaras', 'gb', 'superadmin'] },
    { id: 'data', label: 'Import / Export', ikon: 'download', peranan: SEMUA },
    { id: 'tahun', label: 'Tukar Tahun', ikon: 'calendar', peranan: ['superadmin'] },
    { id: 'tetapan', label: 'Tetapan', ikon: 'settings', peranan: SEMUA }
  ];
  var BAWAH = {
    guru: ['utama', 'rekod', 'murid', 'amaran'],
    penyelaras: ['utama', 'rekod', 'laporan', 'murid'],
    superadmin: ['utama', 'rekod', 'laporan', 'murid'],
    gb: ['utama', 'laporan', 'murid', 'amaran']
  };

  function daftar(id, h) { halaman[id] = h; }

  /* ── Peranan & kebenaran ── */
  function ialah() { var a = Array.prototype.slice.call(arguments); return !!user && a.indexOf(user.peranan) >= 0; }
  function bolehTulis() { return ialah('guru', 'penyelaras', 'superadmin'); }
  function pentadbir() { return ialah('penyelaras', 'superadmin'); }
  function lihatSemua() { return ialah('penyelaras', 'gb', 'superadmin'); }
  function modulKBS() { return DB.config.modulKBS !== 'FALSE'; }
  function menuDibenar() {
    return MENU.filter(function (m) { return user && m.peranan.indexOf(user.peranan) >= 0 && (m.modul !== 'kbs' || modulKBS()); });
  }

  /* ── Indeks (dibina semula bila data berubah) ── */
  function bina() {
    var akhir = {}, bil = {};
    DB.rekod.forEach(function (r) {
      var t = r.tarikh;
      if (!akhir[r.muridId] || new Date(t) > new Date(akhir[r.muridId].tarikh)) akhir[r.muridId] = r;
      bil[r.muridId] = (bil[r.muridId] || 0) + 1;
    });
    var kelas = {};
    DB.murid.forEach(function (m) { if (m.status === 'Aktif' && m.darjah) kelas[m.darjah + '|' + m.kelas] = 1; });
    indeks = { akhir: akhir, bil: bil, kelas: Object.keys(kelas).sort() };
  }
  function rekodAkhir(id) { if (!indeks) bina(); return indeks.akhir[id]; }
  function semuaKelas() {
    if (!indeks) bina();
    var set = {};
    indeks.kelas.forEach(function (k) { set[k] = 1; });
    DB.guru.forEach(function (g) { (g.senaraiKelas || []).forEach(function (k) { set[k.darjah + '|' + k.kelas] = 1; }); });
    return Object.keys(set).sort();
  }
  function namaKelasSekolah() {
    var c = String(DB.config.senaraiKelas || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var set = {}; c.forEach(function (x) { set[x] = 1; });
    semuaKelas().forEach(function (k) { set[k.split('|')[1]] = 1; });
    return Object.keys(set).sort();
  }

  /* Kelas yang "milik" pengguna semasa */
  function kelasSaya() {
    if (!user) return [];
    if (lihatSemua()) return semuaKelas();
    var g = DB.guru.filter(function (x) { return x.id === user.id; })[0] || user;
    return (g.senaraiKelas || []).map(function (k) { return k.darjah + '|' + k.kelas; });
  }
  /* Murid dalam skop paparan semasa */
  function muridSaya(termasukSemua) {
    var aktif = DB.murid.filter(function (m) { return m.status === 'Aktif'; });
    if (skop) return aktif.filter(function (m) { return m.darjah + '|' + m.kelas === skop; });
    if (lihatSemua() || termasukSemua) return aktif;
    var k = kelasSaya();
    if (!k.length) return aktif.filter(function (m) { return m.guruId === user.id; });
    return aktif.filter(function (m) { return k.indexOf(m.darjah + '|' + m.kelas) >= 0; });
  }
  function rekodSaya() {
    var ids = {}; muridSaya().forEach(function (m) { ids[m.id] = 1; });
    return DB.rekod.filter(function (r) { return ids[r.muridId]; });
  }
  function labelKelas(k) { if (!k) return ''; var p = k.split('|'); return p[0].replace('Darjah ', '') + ' ' + p[1]; }
  function labelKelasPenuh(k) { if (!k) return ''; var p = k.split('|'); return p[0] + ' ' + p[1]; }

  /* ── Simpan & muat ── */
  function simpanDB() { indeks = null; API.tulis('db', DB); }
  function muatDBTempatan() {
    var d = API.baca('db');
    DB = d ? Object.assign(kosongDB(), d) : kosongDB();
    D.setConfig(DB.config); indeks = null;
  }

  function muatSemula(senyap) {
    return Sync.flush().then(function () {
      return API.panggil('getAll');
    }).then(function (r) {
      if (!r.ok) {
        if (!senyap && !r.rangkaian) UI.toast(r.msg || 'Gagal muat data', 'err');
        return r;
      }
      DB = Object.assign(kosongDB(), r.data);
      Sync.giliran().forEach(function (g) { Sync.gunaOps(DB, g.ops); });
      D.setConfig(DB.config);
      if (r.user) { user = r.user; API.kemasPengguna(r.user); }
      App.versiBackend = r.versi;
      simpanDB();
      Shell.kemasKepala();
      papar();
      return r;
    });
  }

  /* ── Navigasi ── */
  var semasa = 'utama';
  function pergi(id, param) {
    if (!menuDibenar().some(function (m) { return m.id === id; })) id = 'utama';
    var hash = '#/' + id + (param ? '/' + encodeURIComponent(param) : '');
    if (location.hash !== hash) location.hash = hash; else papar();
  }
  function bacaHash() {
    var p = location.hash.replace(/^#\/?/, '').split('/');
    return { id: p[0] || 'utama', param: p[1] ? decodeURIComponent(p[1]) : '' };
  }
  var memuatPertama = false;
  function papar() {
    if (!user || memuatPertama) return;
    var h = bacaHash();
    if (!menuDibenar().some(function (m) { return m.id === h.id; })) h.id = 'utama';
    var berubah = semasa !== h.id;
    semasa = h.id;
    var el = UI.$('#kandungan');
    var pg = halaman[h.id];
    if (!pg) { el.innerHTML = UI.kosong('info', 'Halaman tidak dijumpai'); return; }
    Shell.tandaMenu(h.id);
    try { pg.papar(el, h.param); } catch (e) { console.error(e); el.innerHTML = UI.kosong('alert', 'Ralat paparan', String(e.message || e)); }
    if (berubah) { window.scrollTo(0, 0); el.focus({ preventScroll: true }); }
  }
  window.addEventListener('hashchange', papar);

  function genId(pfx) {
    var a = new Uint8Array(4); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; });
    return pfx + Date.now().toString(36).toUpperCase() + Array.prototype.map.call(a, function (b) { return 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.charAt(b % 32); }).join('');
  }

  return {
    get DB() { return DB; }, set DB(v) { DB = v; },
    get user() { return user; }, set user(v) { user = v; },
    get skop() { return skop; }, set skop(v) { skop = v; },
    get semasa() { return semasa; },
    versiBackend: '',
    set memuatPertama(v) { memuatPertama = v; },
    NAMA_PERANAN: NAMA_PERANAN, MENU: MENU, BAWAH: BAWAH,
    daftar: daftar, ialah: ialah, bolehTulis: bolehTulis, pentadbir: pentadbir, lihatSemua: lihatSemua, modulKBS: modulKBS,
    menuDibenar: menuDibenar, bina: bina, rekodAkhir: rekodAkhir, semuaKelas: semuaKelas, kelasSaya: kelasSaya,
    namaKelasSekolah: namaKelasSekolah, muridSaya: muridSaya, rekodSaya: rekodSaya, labelKelas: labelKelas, labelKelasPenuh: labelKelasPenuh,
    simpanDB: simpanDB, muatDBTempatan: muatDBTempatan, muatSemula: muatSemula, pergi: pergi, papar: papar, genId: genId,
    kosongDB: kosongDB
  };
})();
