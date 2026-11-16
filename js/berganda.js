/* ================================================================
   SEMAK MURID BERGANDA — Penyelaras / Super Admin
   Kesan nama hampir sama dalam darjah yang sama dan gabungkan
   rekod (tasmik, khatam, KBS, kumpulan) ke satu murid.
   ================================================================ */
var Berganda = (function () {
  var esc = UI.esc, ikon = UI.ikon;

  /* "Siti Sumaiyyah binti Ahmad" → "SITISUMAIA" */
  /* Ejaan fonetik nama Melayu: variasi ejaan biasa dianggap sama.
     MUHD/MOHD/MUHAMMAD → MHD · AISHAH/AISYAH → AISA · SUMAYYAH/SUMAIYAH → SUMAIA */
  var GANTI_PERKATAAN = [
    [/^(MUHAMMAD|MUHAMAD|MOHAMMAD|MOHAMAD|MOHAMMED|MOHAMED|MUHAMMED|MUHAMED|MOHD|MUHD|MOHAMD|MD|MHD|MOHAMMAD)$/, 'MHD'],
    [/^(ABDUL|ABD|ABDOL|AB)$/, 'ABD'],
    [/^(NOOR|NOR|NUR|NOORUL|NURUL|NORUL)$/, 'NUR'],
    [/^(SITI|STI|SITTI)$/, 'SITI'],
    [/^(AHMAD|AHMED|AHMD)$/, 'AHMAD']
  ];
  function fonetik(teks) {
    return String(teks || '').split(' ').filter(Boolean).map(function (w) {
      for (var i = 0; i < GANTI_PERKATAAN.length; i++) if (GANTI_PERKATAAN[i][0].test(w)) return GANTI_PERKATAAN[i][1];
      return w.replace(/SY|SH/g, 'S').replace(/KH/g, 'K').replace(/TH/g, 'T').replace(/DZ|DH/g, 'Z').replace(/GH/g, 'G')
        .replace(/Q/g, 'K').replace(/OO/g, 'U').replace(/EE/g, 'I').replace(/Y/g, 'I').replace(/(.)\1+/g, '$1').replace(/H$/, '');
    }).join(' ');
  }
  function pecah(nama) {
    var up = ' ' + String(nama || '').toUpperCase().replace(/[^A-Z\s\/]/g, ' ').replace(/\s+/g, ' ') + ' ';
    var p = up.split(/\s(?:BINTI|BIN|BINTE|BT|BTE|B|A\/L|A\/P)\s/);
    return { diberi: fonetik(p[0]), bapa: p.length > 1 ? fonetik(p.slice(1).join(' ')) : '' };
  }
  function kunci(nama) { return pecah(nama).diberi.replace(/\s/g, ''); }
  function kunciBapa(nama) { return pecah(nama).bapa.replace(/\s/g, ''); }

  /* Kesamaan 0–1 (Levenshtein) */
  function sama(a, b) {
    if (a === b) return 1;
    if (!a || !b) return 0;
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) d[i] = [i];
    for (j = 0; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
    return 1 - d[m][n] / Math.max(m, n);
  }
  /* Dua murid dianggap mungkin berganda jika nama diberi hampir sama dan
     nama bapa (jika kedua-duanya ada) juga hampir sama. */
  function mungkinSama(x, y) {
    var a = x.k, b = y.k;
    var pendek = a.length < b.length ? a : b, panjang = a.length < b.length ? b : a;
    var diberiSama = a === b || sama(a, b) >= 0.85 || (pendek.length >= 8 && panjang.indexOf(pendek) === 0);
    if (!diberiSama) return false;
    if (x.b && y.b) return sama(x.b, y.b) >= 0.8;
    return true;
  }

  function cariKumpulan() {
    var murid = App.DB.murid.filter(function (m) { return m.status === 'Aktif' || m.status === 'Dikecualikan'; });
    var ikut = {};
    murid.forEach(function (m) {
      var k = kunci(m.nama); if (k.length < 3) return;
      (ikut[m.darjah] = ikut[m.darjah] || []).push({ m: m, k: k, b: kunciBapa(m.nama) });
    });
    var kumpulan = [];
    Object.keys(ikut).sort().forEach(function (d) {
      var list = ikut[d], induk = list.map(function (_, i) { return i; });
      function akar(i) { while (induk[i] !== i) i = induk[i] = induk[induk[i]]; return i; }
      for (var i = 0; i < list.length; i++) for (var j = i + 1; j < list.length; j++) {
        if (mungkinSama(list[i], list[j])) induk[akar(i)] = akar(j);
      }
      var g = {};
      list.forEach(function (x, i) { (g[akar(i)] = g[akar(i)] || []).push(x.m); });
      Object.keys(g).forEach(function (r) { if (g[r].length > 1) kumpulan.push(g[r]); });
    });
    var abai = abaian();
    return kumpulan.filter(function (g) { return !abai[tandatangan(g)]; });
  }
  function tandatangan(g) { return g.map(function (m) { return m.id; }).sort().join(','); }
  function abaian() { return API.baca('bukanGanda') || {}; }

  function bilRekod(id) { return App.DB.rekod.filter(function (r) { return r.muridId === id; }).length; }

  function papar(el, segar, bukaProfil) {
    var g = cariKumpulan();
    el.innerHTML = '<section class="kad"><div class="kad-kepala"><h2>' + ikon('users') + ' Semak murid berganda</h2>' + UI.lencana(g.length + ' kumpulan', g.length ? 'warn' : 'ok') + '</div>' +
      '<p class="lembut">Senarai murid dengan nama <b>hampir sama</b> dalam darjah yang sama, contohnya murid yang didaftar berulang kali. ' +
      'Pilih rekod yang hendak <b>dikekalkan</b>, kemudian tekan <b>Gabungkan</b>. Semua rekod tasmik, khatam, KBS dan kumpulan akan dipindah ke murid itu, ' +
      'dan yang lain ditanda "Padam" (tidak dipadam dari Google Sheet).</p>' +
      (Object.keys(abaian()).length ? '<button class="btn btn-teks btn-kecil" id="bgSemula">' + ikon('refresh') + ' Tunjuk semula kumpulan yang ditanda "bukan berganda"</button>' : '') +
      '</section>' +
      (g.length ? g.map(function (kp, i) {
        var lalai = kp.slice().sort(function (a, b) { return bilRekod(b.id) - bilRekod(a.id) || String(a.tarikhDaftar || '').localeCompare(String(b.tarikhDaftar || '')); })[0].id;
        return '<section class="kad ganda" data-g="' + i + '"><div class="kad-kepala"><h3>' + esc(kp[0].darjah) + ' · ' + kp.length + ' rekod murid</h3></div>' +
          '<div class="jadual-wrap"><table class="jadual"><thead><tr><th>Kekal</th><th>Nama</th><th>Kelas</th><th>Kedudukan</th><th class="nombor">Sesi tasmik</th><th>Didaftar</th><th></th></tr></thead><tbody>' +
          kp.map(function (m) {
            var r = App.rekodAkhir(m.id);
            return '<tr><td><input type="radio" name="kekal' + i + '" value="' + esc(m.id) + '"' + (m.id === lalai ? ' checked' : '') + ' aria-label="Kekalkan ' + esc(m.nama) + '"></td>' +
              '<td><b>' + esc(m.nama) + '</b>' + (m.status !== 'Aktif' ? ' ' + UI.lencana(m.status, 'muted') : '') + '<br><small class="lembut">ID ' + esc(m.id) + '</small></td>' +
              '<td>' + esc(m.kelas) + '</td><td>' + esc(D.kemajuan(m).kedudukan) + '</td>' +
              '<td class="nombor">' + bilRekod(m.id) + (r ? '<br><small class="lembut">' + esc(UI.tarikh(r.tarikh)) + '</small>' : '') + '</td>' +
              '<td><small>' + esc(m.tarikhDaftar ? UI.tarikh(m.tarikhDaftar) : '—') + (m.ditambahOleh ? '<br>' + esc(m.ditambahOleh) : '') + '</small></td>' +
              '<td class="aksi"><button class="btn-ikon" data-lihat="' + esc(m.id) + '" aria-label="Lihat profil">' + ikon('eye') + '</button></td></tr>';
          }).join('') + '</tbody></table></div>' +
          '<div class="grid-butang"><button class="btn btn-ghost" data-bukan="' + i + '">Bukan berganda</button><button class="btn btn-utama" data-gabung="' + i + '">' + ikon('check') + ' Gabungkan</button></div></section>';
      }).join('') : '<section class="kad">' + UI.kosong('check', 'Tiada murid berganda dikesan', 'Semua nama murid dalam setiap darjah adalah unik.') + '</section>');

    var sm = UI.$('#bgSemula', el);
    if (sm) sm.addEventListener('click', function () { API.tulis('bukanGanda', {}); segar(); });
    UI.$$('[data-lihat]', el).forEach(function (b) { b.addEventListener('click', function () { bukaProfil(b.dataset.lihat, el); }); });
    UI.$$('[data-bukan]', el).forEach(function (b) {
      b.addEventListener('click', function () {
        var a = abaian(); a[tandatangan(g[+b.dataset.bukan])] = 1; API.tulis('bukanGanda', a);
        UI.toast('Ditanda bukan berganda', 'ok'); segar();
      });
    });
    UI.$$('[data-gabung]', el).forEach(function (b) {
      b.addEventListener('click', function () {
        var kp = g[+b.dataset.gabung];
        var simpanId = (UI.$('input[name=kekal' + b.dataset.gabung + ']:checked', el) || {}).value;
        var simpan = kp.filter(function (m) { return m.id === simpanId; })[0];
        var buang = kp.filter(function (m) { return m.id !== simpanId; });
        var jum = buang.reduce(function (s, m) { return s + bilRekod(m.id); }, 0);
        UI.sahkan('Gabungkan murid?', 'Kekalkan <b>' + esc(simpan.nama) + '</b> (' + esc(simpan.kelas) + ').<br>' + buang.length + ' rekod murid lain akan ditanda Padam, dan ' + jum +
          ' sesi tasmik mereka dipindah ke murid yang dikekalkan. Kedudukan bacaan yang paling jauh akan digunakan.', 'Gabungkan').then(function (ya) {
          if (!ya) return;
          b.disabled = true; b.innerHTML = '<span class="pusing"></span> Menggabung…';
          API.panggil('gabungMurid', { simpanId: simpanId, buangIds: buang.map(function (m) { return m.id; }) }).then(function (r) {
            if (!r.ok) { b.disabled = false; b.innerHTML = ikon('check') + ' Gabungkan'; return UI.toast(r.rangkaian ? 'Perlukan internet' : r.msg, 'err'); }
            UI.toast('Digabung: ' + r.rekod + ' sesi tasmik, ' + r.khatam + ' khatam, ' + r.kbs + ' KBS dipindah', 'ok', 6000);
            App.muatSemula(true).then(segar);
          });
        });
      });
    });
  }

  return { papar: papar, kunci: kunci, kunciBapa: kunciBapa, sama: sama, mungkinSama: mungkinSama, cariKumpulan: cariKumpulan };
})();
