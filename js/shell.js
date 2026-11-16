/* ================================================================
   SHELL — pilih sekolah, log masuk, susun atur, tema
   ================================================================ */
var Shell = (function () {
  var esc = UI.esc, ikon = UI.ikon;

  /* ── Tema ── */
  function tema() { try { return localStorage.getItem('td:tema') || 'auto'; } catch (e) { return 'auto'; } }
  function setTema(t) {
    try { localStorage.setItem('td:tema', t); } catch (e) { }
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    var gelap = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', gelap ? '#0d1613' : '#0b5d4b');
  }

  function logoHTML(logo, nama, cls) {
    if (logo) return '<img class="logo ' + (cls || '') + '" src="' + esc(logo) + '" alt="">';
    return '<span class="logo logo-teks ' + (cls || '') + '">' + esc(UI.inisial(nama || 'TD')) + '</span>';
  }

  /* ── Skrin: pilih sekolah ── */
  function skrinSekolah(ralat) {
    document.body.className = 'skrin-luar';
    UI.$('#akar').innerHTML =
      '<main class="luar">' +
      '<section class="luar-kad">' +
      '<div class="jenama">' + jenamaSVG() + '<div><b>Tasmik Digital</b><span>Sistem rekod tasmik sekolah</span></div></div>' +
      '<h1>Selamat datang</h1><p class="lembut">Masukkan kod sekolah anda untuk bermula. Kod ini diberi oleh pentadbir sistem.</p>' +
      '<form id="fSekolah" class="borang" autocomplete="off">' +
      '<label class="medan"><span>Kod sekolah</span><input id="kodSekolah" name="kod" required maxlength="20" placeholder="cth: PBB1234" autocapitalize="characters" autofocus></label>' +
      (ralat ? '<p class="ralat-borang">' + ikon('alert') + esc(ralat) + '</p>' : '') +
      '<button class="btn btn-utama btn-besar" type="submit">Teruskan ' + ikon('chevR') + '</button>' +
      '</form>' +
      '<div class="pemisah"><span>atau</span></div>' +
      '<button class="btn btn-ghost btn-besar" id="cubaDemo">' + ikon('sparkle') + ' Cuba versi DEMO</button>' +
      '</section>' + kakiLuar() + '</main>';
    UI.$('#fSekolah').addEventListener('submit', function (e) {
      e.preventDefault();
      mulaSekolah(UI.$('#kodSekolah').value);
    });
    UI.$('#cubaDemo').addEventListener('click', function () { mulaSekolah('DEMO'); });
  }

  function kakiLuar() {
    return '<footer class="kaki-luar">Tasmik Digital v' + APP_VERSI + ' · Data murid diurus oleh sekolah masing-masing</footer>';
  }

  function jenamaSVG() {
    return '<svg class="jenama-ikon" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="12" fill="var(--pri)"/>' +
      '<path d="M24 9l4.2 5.8 7-1.9-1.9 7L39 24l-5.8 4.2 1.9 7-7-1.9L24 39l-4.2-5.8-7 1.9 1.9-7L9 24l5.8-4.2-1.9-7 7 1.9z" fill="none" stroke="var(--emas)" stroke-width="1.6"/>' +
      '<path d="M17 20.5c2.5-.8 5-.8 7 .8 2-1.6 4.5-1.6 7-.8v8.5c-2.5-.8-5-.8-7 .8-2-1.6-4.5-1.6-7-.8z" fill="#fff"/></svg>';
  }

  function mulaSekolah(kod) {
    return API.pilihSekolah(kod).then(function (s) {
      if (!s) return skrinSekolah('Kod sekolah "' + String(kod || '').toUpperCase() + '" tidak dijumpai.');
      var sesi = API.sesiSemasa();
      if (sesi && sesi.user) return masukApp(sesi.user);
      skrinLogin();
    });
  }

  /* ── Skrin: log masuk ── */
  function skrinLogin(mesej) {
    document.body.className = 'skrin-luar';
    var s = API.sekolah;
    var cache = API.baca('profil') || {};
    UI.$('#akar').innerHTML =
      '<main class="luar">' +
      '<section class="luar-kad">' +
      '<div class="sekolah-login">' + logoHTML(cache.logo, s.nama, 'besar') + '<div><b id="lgNama">' + esc(cache.namaSekolah || s.nama) + '</b><span>Tasmik Digital</span></div></div>' +
      '<h1>Log masuk</h1>' +
      (s.demo ? demoInfo() : '<p class="lembut">Gunakan nama pengguna dan kata laluan yang diberi oleh penyelaras sekolah.</p>') +
      '<form id="fLogin" class="borang">' +
      '<label class="medan"><span>Nama pengguna</span><input id="lgU" name="username" required autocomplete="username" autocapitalize="none" spellcheck="false" autofocus></label>' +
      '<label class="medan"><span>Kata laluan</span><div class="input-ikon"><input id="lgP" name="password" type="password" required autocomplete="current-password">' +
      '<button type="button" class="btn-ikon" id="lgLihat" aria-label="Tunjuk kata laluan">' + ikon('eye') + '</button></div></label>' +
      '<label class="semak"><input type="checkbox" id="lgIngat" checked><span>Ingat saya di peranti ini</span></label>' +
      '<p class="ralat-borang" id="lgRalat" ' + (mesej ? '' : 'hidden') + '>' + ikon('alert') + '<span>' + esc(mesej || '') + '</span></p>' +
      '<button class="btn btn-utama btn-besar" type="submit" id="lgBtn">Log masuk</button>' +
      '</form>' +
      '<button class="pautan" id="tukarSekolah">' + ikon('school') + ' Bukan sekolah ini? Tukar sekolah</button>' +
      '</section>' + kakiLuar() + '</main>';

    // Kemas kini nama/logo sekolah dari pelayan (tanpa log masuk)
    API.panggil('ping').then(function (r) {
      if (!r.ok) return;
      API.tulis('profil', { namaSekolah: r.namaSekolah, logo: r.logo });
      var n = UI.$('#lgNama'); if (n && r.namaSekolah) n.textContent = r.namaSekolah;
      var wrap = UI.$('.sekolah-login'); if (wrap && r.logo) wrap.firstElementChild.outerHTML = logoHTML(r.logo, r.namaSekolah, 'besar');
    });

    UI.$('#lgLihat').addEventListener('click', function () {
      var p = UI.$('#lgP'); var t = p.type === 'password';
      p.type = t ? 'text' : 'password';
      this.innerHTML = ikon(t ? 'eyeOff' : 'eye');
      this.setAttribute('aria-label', t ? 'Sembunyi kata laluan' : 'Tunjuk kata laluan');
    });
    UI.$('#tukarSekolah').addEventListener('click', function () { API.lupakanSekolah(); history.replaceState(null, '', location.pathname); skrinSekolah(); });
    UI.$$('[data-demo]').forEach(function (b) {
      b.addEventListener('click', function () { UI.$('#lgU').value = b.dataset.demo; UI.$('#lgP').value = 'demo1234'; UI.$('#fLogin').requestSubmit(); });
    });
    UI.$('#fLogin').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = UI.$('#lgBtn'); btn.disabled = true; btn.innerHTML = '<span class="pusing"></span> Menyemak…';
      var ingat = UI.$('#lgIngat').checked;
      API.panggil('login', { username: UI.$('#lgU').value, password: UI.$('#lgP').value, ingat: ingat }).then(function (r) {
        btn.disabled = false; btn.textContent = 'Log masuk';
        if (!r.ok) {
          var el = UI.$('#lgRalat'); el.hidden = false;
          el.querySelector('span').textContent = r.rangkaian ? 'Tiada sambungan internet. Log masuk kali pertama perlukan internet.' : r.msg;
          return;
        }
        API.simpanSesi(r.token, r.user, ingat);
        masukApp(r.user, true);
      });
    });
  }

  function demoInfo() {
    var akaun = [['guru', 'Guru', 'cikgu.aminah'], ['penyelaras', 'Penyelaras', 'penyelaras'], ['gb', 'Guru Besar', 'guru.besar'], ['superadmin', 'Super Admin', 'superadmin']];
    return '<div class="demo-kotak"><p><b>Mod DEMO</b> — data rekaan, ditetapkan semula setiap kali dibuka. Pilih peranan untuk mencuba:</p>' +
      '<div class="demo-grid">' + akaun.map(function (a) { return '<button type="button" class="btn btn-ghost btn-kecil" data-demo="' + a[2] + '">' + esc(a[1]) + '</button>'; }).join('') + '</div>' +
      '<p class="kecil">Kata laluan semua akaun: <code>demo1234</code></p></div>';
  }

  /* ── Masuk aplikasi ── */
  function masukApp(user, baru) {
    App.user = user;
    var adaCache = !!API.baca('db');
    App.muatDBTempatan();
    App.memuatPertama = !adaCache;
    binaShell();
    if (!location.hash || location.hash === '#') location.hash = '#/utama';
    if (adaCache) App.papar();
    else UI.$('#kandungan').innerHTML = '<div class="memuat"><span class="pusing"></span> Memuat turun data sekolah…</div>';
    var p = App.muatSemula(true).then(function (r) {
      if (!adaCache) { App.memuatPertama = false; if (r && r.ok) App.papar(); }
      if (!adaCache && (!r || !r.ok) && App.user) {
        UI.$('#kandungan').innerHTML = UI.kosong('wifiOff', 'Data belum dapat dimuat turun', r && r.msg ? r.msg : 'Semak sambungan internet, kemudian tekan butang segerak di atas.');
      }
      if (r && !r.ok && r.kod === 'SESI') return;
      if (App.user && App.user.tukarKata) paksaTukarKata();
      semakVersiBackend();
    });
    if (baru) UI.toast('Assalamualaikum, ' + UI.tajukNama(UI.namaPanggilan(user.nama)) + '!', 'ok');
    return p;
  }

  function semakVersiBackend() {
    var v = App.versiBackend;
    if (!v || !App.ialah('superadmin')) return;
    if (banding(v, BACKEND_MIN) < 0) UI.toast('Backend sekolah ini versi ' + v + ' — perlukan ' + BACKEND_MIN + '. Sila kemas kini Code.gs.', 'warn', 9000);
  }
  function banding(a, b) {
    var x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (var i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); }
    return 0;
  }

  function binaShell() {
    document.body.className = 'skrin-app';
    var menu = App.menuDibenar();
    UI.$('#akar').innerHTML =
      '<a class="langkau" href="#kandungan">Langkau ke kandungan</a>' +
      '<aside class="sisi" id="sisi">' +
      '<div class="sisi-kepala" id="sisiSekolah"></div>' +
      '<nav class="sisi-nav" aria-label="Menu utama">' + menu.map(function (m) {
        return '<a href="#/' + m.id + '" data-nav="' + m.id + '">' + ikon(m.ikon) + '<span>' + esc(m.label) + '</span>' + (m.id === 'amaran' ? '<b class="kiraan" data-kiraan-amaran hidden></b>' : '') + '</a>';
      }).join('') + '</nav>' +
      '<div class="sisi-kaki" id="sisiPengguna"></div>' +
      '</aside>' +
      '<div class="utama">' +
      '<header class="atas" id="atas"></header>' +
      '<main id="kandungan" class="kandungan" tabindex="-1"></main>' +
      '</div>' +
      '<nav class="bawah" aria-label="Menu pantas">' + (App.BAWAH[App.user.peranan] || []).filter(function (id) { return menu.some(function (m) { return m.id === id; }); }).map(function (id) {
        var m = menu.filter(function (x) { return x.id === id; })[0];
        return '<a href="#/' + id + '" data-nav="' + id + '">' + ikon(m.ikon) + '<span>' + esc(m.label.split(' ')[0]) + '</span>' + (id === 'amaran' ? '<b class="kiraan" data-kiraan-amaran hidden></b>' : '') + '</a>';
      }).join('') + '<button id="btnLagi" aria-label="Menu lain">' + ikon('grid') + '<span>Lagi</span></button></nav>';
    UI.$('#btnLagi').addEventListener('click', bukaLagi);
    kemasKepala();
  }

  function kemasKepala() {
    if (!App.user || !UI.$('#atas')) return;
    var c = App.DB.config, s = API.sekolah, u = App.user;
    var nama = c.namaSekolah || s.nama;
    API.tulis('profil', { namaSekolah: nama, logo: c.logo || '' });
    UI.$('#sisiSekolah').innerHTML = logoHTML(c.logo, nama) + '<div><b>' + esc(nama) + '</b><span>Tasmik Digital' + (s.demo ? ' · DEMO' : '') + '</span></div>';
    UI.$('#sisiPengguna').innerHTML = '<div class="avatar">' + esc(UI.inisial(u.nama)) + '</div><div class="sisi-u"><b>' + esc(UI.tajukNama(UI.namaPanggilan(u.nama))) + '</b><span>' + esc(App.NAMA_PERANAN[u.peranan] || u.peranan) + '</span></div>' +
      '<button class="btn-ikon" id="btnKeluar" aria-label="Log keluar" title="Log keluar">' + ikon('logout') + '</button>';
    UI.$('#btnKeluar').addEventListener('click', logKeluar);

    // Pilihan skop kelas (guru dengan lebih dari satu kelas / pentadbir)
    var kls = App.kelasSaya();
    var skopHTML = '';
    if (kls.length > 1) {
      skopHTML = '<label class="skop"><span class="sr">Kelas dipaparkan</span>' + ikon('filter') +
        '<select id="pilihSkop"><option value="">' + (App.lihatSemua() ? 'Semua kelas' : 'Semua kelas saya') + '</option>' +
        kls.map(function (k) { return '<option value="' + esc(k) + '"' + (App.skop === k ? ' selected' : '') + '>' + esc(App.labelKelasPenuh(k)) + '</option>'; }).join('') +
        '</select></label>';
    } else if (kls.length === 1) {
      skopHTML = '<span class="skop statik">' + ikon('users') + esc(App.labelKelasPenuh(kls[0])) + '</span>';
    }
    UI.$('#atas').innerHTML =
      '<div class="atas-kiri">' + logoHTML(c.logo, nama, 'kecil mudah-alih') + '<div class="atas-tajuk"><b id="tajukHalaman"></b><span class="mudah-alih">' + esc(nama) + '</span></div></div>' +
      '<div class="atas-kanan">' + skopHTML + '<span id="statusSync"></span></div>';
    var ps = UI.$('#pilihSkop');
    if (ps) ps.addEventListener('change', function () { App.skop = ps.value; App.papar(); });
    statusSync();
    kiraanAmaran();
  }

  function statusSync() {
    var el = UI.$('#statusSync'); if (!el) return;
    var n = Sync.giliran().length;
    var online = API.dalamTalian;
    var html, cls;
    if (!online) { cls = 'offline'; html = ikon('wifiOff') + '<span>Offline' + (n ? ' · ' + n + ' menunggu' : '') + '</span>'; }
    else if (n || Sync.sedangHantar) { cls = 'hantar'; html = '<span class="pusing"></span><span>Menyegerak' + (n ? ' ' + n : '') + '</span>'; }
    else { cls = 'ok'; html = ikon('cloud') + '<span>Disegerak</span>'; }
    el.className = 'sync ' + cls;
    el.innerHTML = '<button class="sync-btn" title="Muat semula data">' + html + '</button>';
    el.firstChild.addEventListener('click', function () {
      UI.toast('Memuat semula data…');
      App.muatSemula().then(function (r) { if (r && r.ok) UI.toast('Data terkini dimuatkan', 'ok'); else if (r && r.rangkaian) UI.toast('Tiada internet — guna data tersimpan', 'warn'); });
    });
  }
  API.onUbah(function () {
    statusSync();
    if (App.user && !API.sesiSemasa()) { App.user = null; skrinLogin('Sesi tamat. Sila log masuk semula.'); }
  });

  function kiraanAmaran() {
    var hari = parseInt(App.DB.config.alertDays || '7', 10) || 7;
    var n = App.muridSaya().filter(function (m) { var r = App.rekodAkhir(m.id); return !r || UI.hariLalu(r.tarikh) > hari; }).length;
    UI.$$('[data-kiraan-amaran]').forEach(function (b) { b.textContent = n > 99 ? '99+' : n; b.hidden = !n; });
  }

  function tandaMenu(id) {
    UI.$$('[data-nav]').forEach(function (a) {
      var aktif = a.dataset.nav === id;
      a.classList.toggle('aktif', aktif);
      if (aktif) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var bawah = App.BAWAH[App.user.peranan] || [];
    var b = UI.$('#btnLagi'); if (b) b.classList.toggle('aktif', bawah.indexOf(id) < 0);
    var m = App.MENU.filter(function (x) { return x.id === id; })[0];
    var t = UI.$('#tajukHalaman'); if (t && m) t.textContent = m.label;
    document.title = (m ? m.label + ' · ' : '') + 'Tasmik Digital';
    kiraanAmaran();
  }

  function bukaLagi() {
    var menu = App.menuDibenar();
    var m = UI.modal({
      tajuk: 'Menu',
      isi: '<div class="grid-lagi">' + menu.map(function (x) {
        return '<a href="#/' + x.id + '" class="kad-lagi' + (App.semasa === x.id ? ' aktif' : '') + '">' + ikon(x.ikon) + '<span>' + esc(x.label) + '</span></a>';
      }).join('') + '</div>' +
        '<div class="lagi-pengguna"><div class="avatar">' + esc(UI.inisial(App.user.nama)) + '</div><div><b>' + esc(UI.tajukNama(UI.namaPanggilan(App.user.nama))) + '</b><span>' + esc(App.NAMA_PERANAN[App.user.peranan]) + '</span></div>' +
        '<button class="btn btn-ghost btn-kecil" id="lagiKeluar">' + ikon('logout') + ' Log keluar</button></div>'
    });
    UI.$$('.kad-lagi', m).forEach(function (a) { a.addEventListener('click', function () { m.tutup(); }); });
    UI.$('#lagiKeluar', m).addEventListener('click', function () { m.tutup(); logKeluar(); });
  }

  function logKeluar() {
    var n = Sync.giliran().length;
    var mesej = n ? '<b>' + n + ' rekod belum dihantar ke pelayan</b> dan akan hilang jika anda log keluar sekarang. Sambung ke internet dahulu untuk menyegerak.' : 'Anda akan log keluar dari peranti ini.';
    UI.sahkan('Log keluar?', mesej, 'Log keluar', !!n).then(function (ya) {
      if (!ya) return;
      API.panggil('logout');
      API.padamSesi(); API.buang('db'); API.buang('giliran');
      App.user = null; App.DB = App.kosongDB(); App.skop = '';
      history.replaceState(null, '', location.pathname + location.search);
      skrinLogin();
    });
  }

  function paksaTukarKata() {
    if (document.getElementById('fTukar')) return;
    var m = UI.modal({
      tajuk: 'Tetapkan kata laluan baharu', wajib: true,
      isi: '<p class="lembut">Akaun anda menggunakan kata laluan sementara. Sila tetapkan kata laluan peribadi (minimum 6 aksara).</p>' +
        '<form id="fTukar" class="borang">' +
        '<label class="medan"><span>Kata laluan sementara</span><input type="password" id="tkLama" required autocomplete="current-password" autofocus></label>' +
        '<label class="medan"><span>Kata laluan baharu</span><input type="password" id="tkBaru" required minlength="6" autocomplete="new-password"></label>' +
        '<label class="medan"><span>Ulang kata laluan baharu</span><input type="password" id="tkUlang" required minlength="6" autocomplete="new-password"></label>' +
        '<p class="ralat-borang" id="tkRalat" hidden></p>' +
        '<button class="btn btn-utama btn-besar" type="submit">Simpan kata laluan</button></form>'
    });
    UI.$('#fTukar', m).addEventListener('submit', function (e) {
      e.preventDefault();
      var r = UI.$('#tkRalat', m);
      if (UI.$('#tkBaru', m).value !== UI.$('#tkUlang', m).value) { r.hidden = false; r.textContent = 'Kata laluan baharu tidak sepadan.'; return; }
      API.panggil('changePass', { oldPass: UI.$('#tkLama', m).value, newPass: UI.$('#tkBaru', m).value }).then(function (x) {
        if (!x.ok) { r.hidden = false; r.textContent = x.msg; return; }
        API.gantiToken(x.token);
        App.user.tukarKata = false; API.kemasPengguna(App.user);
        m.tutup(); UI.toast('Kata laluan disimpan', 'ok');
      });
    });
  }

  return {
    setTema: setTema, tema: tema, skrinSekolah: skrinSekolah, skrinLogin: skrinLogin, mulaSekolah: mulaSekolah,
    kemasKepala: kemasKepala, tandaMenu: tandaMenu, statusSync: statusSync, kiraanAmaran: kiraanAmaran,
    logoHTML: logoHTML, jenamaSVG: jenamaSVG, logKeluar: logKeluar
  };
})();
