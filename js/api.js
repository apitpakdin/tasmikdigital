/* ================================================================
   SAMBUNGAN — pilih sekolah, panggilan API, sesi, giliran offline
   ================================================================ */
var API = (function () {
  var sekolah = null;      // { kod, nama, api, demo }
  var demoTeras = null;
  var dalamTalian = navigator.onLine;
  var pendengar = [];

  function kunci(k) { return 'td:' + (sekolah ? sekolah.kod : '_') + ':' + k; }
  function baca(k, store) { try { return JSON.parse((store || localStorage).getItem(kunci(k)) || 'null'); } catch (e) { return null; } }
  function tulis(k, v, store) { try { (store || localStorage).setItem(kunci(k), JSON.stringify(v)); } catch (e) { /* storan penuh/disekat */ } }
  function buang(k) { try { localStorage.removeItem(kunci(k)); sessionStorage.removeItem(kunci(k)); } catch (e) { } }

  function maklum() { pendengar.forEach(function (f) { try { f(); } catch (e) { } }); }
  function onUbah(f) { pendengar.push(f); }

  /* ── Pilih sekolah ── */
  var senarai = null;
  function muatSenarai() {
    if (senarai) return Promise.resolve(senarai);
    return fetch('sekolah.json', { cache: 'no-cache' }).then(function (r) { return r.json(); })
      .then(function (j) { senarai = j; try { localStorage.setItem('td:senarai', JSON.stringify(j)); } catch (e) { } return j; })
      .catch(function () {
        try { senarai = JSON.parse(localStorage.getItem('td:senarai') || '{}'); } catch (e) { senarai = {}; }
        return senarai;
      });
  }
  function pilihSekolah(kod) {
    kod = String(kod || '').trim().toUpperCase();
    return muatSenarai().then(function (s) {
      var e = s[kod];
      if (!e) return null;
      sekolah = { kod: kod, nama: e.nama || kod, api: e.api || '', demo: !!e.demo };
      try { localStorage.setItem('td:sekolah', kod); } catch (er) { }
      if (sekolah.demo) sediakanDemo();
      return sekolah;
    });
  }
  function sekolahDisimpan() { try { return localStorage.getItem('td:sekolah') || ''; } catch (e) { return ''; } }
  function lupakanSekolah() { try { localStorage.removeItem('td:sekolah'); } catch (e) { } sekolah = null; }

  function sediakanDemo() {
    var data = null;
    try { data = JSON.parse(sessionStorage.getItem('td:DEMO:data') || 'null'); } catch (e) { }
    var s = StoreMemori.cipta(data || Demo.data(), function (d) {
      try { sessionStorage.setItem('td:DEMO:data', JSON.stringify(d)); } catch (e) { }
    });
    if (!data) try { sessionStorage.setItem('td:DEMO:data', JSON.stringify(s.data)); } catch (e) { }
    demoTeras = TasmikCore.cipta(s.env);
  }

  /* ── Panggilan ── */
  function panggil(action, body) {
    body = Object.assign({}, body || {}, { action: action });
    var sesi = sesiSemasa();
    if (sesi && !body.token) body.token = sesi.token;
    if (sekolah && sekolah.demo) {
      return new Promise(function (ok) {
        setTimeout(function () { ok(JSON.parse(JSON.stringify(demoTeras.handle(body)))); }, 120);
      });
    }
    if (!sekolah || !sekolah.api) return Promise.resolve({ ok: false, rangkaian: true, msg: 'Sekolah belum disambungkan.' });
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000);
    return fetch(sekolah.api, {
      method: 'POST', redirect: 'follow', signal: ctrl ? ctrl.signal : undefined,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body)
    }).then(function (r) { return r.json(); }).then(function (j) {
      clearTimeout(t); setTalian(true);
      if (j && j.kod === 'SESI' && action !== 'login') { padamSesi(); maklum(); }
      return j;
    }).catch(function () {
      clearTimeout(t); setTalian(false);
      return { ok: false, rangkaian: true, msg: 'Tiada sambungan internet.' };
    });
  }

  function setTalian(v) { if (dalamTalian !== v) { dalamTalian = v; maklum(); } }
  window.addEventListener('online', function () { setTalian(true); Sync.flush(); });
  window.addEventListener('offline', function () { setTalian(false); });

  /* ── Sesi ── */
  function sesiSemasa() { return baca('sesi') || baca('sesi', sessionStorage); }
  function simpanSesi(token, user, ingat) {
    var s = { token: token, user: user };
    if (ingat) tulis('sesi', s); else tulis('sesi', s, sessionStorage);
  }
  function kemasPengguna(user) {
    var s = sesiSemasa(); if (!s) return;
    s.user = user;
    if (baca('sesi')) tulis('sesi', s); else tulis('sesi', s, sessionStorage);
  }
  function padamSesi() { buang('sesi'); }

  return {
    get sekolah() { return sekolah; },
    get dalamTalian() { return dalamTalian || (sekolah && sekolah.demo); },
    muatSenarai: muatSenarai, pilihSekolah: pilihSekolah, sekolahDisimpan: sekolahDisimpan, lupakanSekolah: lupakanSekolah,
    panggil: panggil, sesiSemasa: sesiSemasa, simpanSesi: simpanSesi, kemasPengguna: kemasPengguna, padamSesi: padamSesi,
    baca: baca, tulis: tulis, buang: buang, onUbah: onUbah, maklum: maklum, setTalian: setTalian
  };
})();

/* ================================================================
   DATA TEMPATAN + PENYEGERAKAN (offline-first)
   Setiap tindakan tulis = satu "kumpulan operasi". Ia diguna terus
   pada data tempatan, disimpan dalam giliran, kemudian dihantar.
   ================================================================ */
var Sync = (function () {
  var sedangHantar = false;

  function giliran() { return API.baca('giliran') || []; }
  function setGiliran(g) { API.tulis('giliran', g); API.maklum(); }

  function gunaOps(DB, ops) {
    ops.forEach(function (o) {
      var key = { Guru: 'guru', Murid: 'murid', Rekod: 'rekod', Khatam: 'khatam', KBS: 'kbs', Kumpulan: 'kumpulan' }[o.table];
      var arr = DB[key]; if (!arr) return;
      if (o.op === 'insert') { if (!arr.some(function (x) { return x.id === o.id; })) arr.push(Object.assign({ id: o.id }, o.row)); }
      else if (o.op === 'update') { var r = arr.filter(function (x) { return x.id === o.id; })[0]; if (r) Object.assign(r, o.patch); }
      else if (o.op === 'delete') {
        if (key === 'murid' || key === 'guru') { var x = arr.filter(function (y) { return y.id === o.id; })[0]; if (x) x.status = 'Padam'; }
        else DB[key] = arr.filter(function (y) { return y.id !== o.id; });
      } else if (o.op === 'upsert') {
        var row = o.row;
        var ada = arr.filter(function (y) { return y.muridId === row.muridId && Number(y.tahun) === Number(row.tahun) && y.itemId === row.itemId; })[0];
        if (ada) Object.assign(ada, row, { id: ada.id }); else arr.push(Object.assign({ id: o.id }, row));
      }
    });
  }

  /* Tulis dengan sokongan offline */
  function tulis(ops, label) {
    var uid = App.user ? App.user.id : '';
    gunaOps(App.DB, ops);
    App.simpanDB();
    var g = giliran();
    g.push({ uid: uid, ops: ops, label: label || '', masa: Date.now() });
    setGiliran(g);
    return flush();
  }

  /* Tulis yang mesti dalam talian (cth tambah murid/guru — perlukan kod/kata laluan dari pelayan) */
  function tulisTerus(ops) {
    return API.panggil('batch', { ops: ops }).then(function (r) {
      if (r.ok) {
        gunaOps(App.DB, ops.map(function (o, i) {
          var h = r.hasil[i] || {};
          if (o.op === 'insert') { var row = Object.assign({}, o.row); delete row.password; if (h.kodIbuBapa) row.kodIbuBapa = h.kodIbuBapa; return Object.assign({}, o, { id: h.id || o.id, row: row }); }
          return o;
        }));
        App.simpanDB();
      }
      return r;
    });
  }

  function flush() {
    if (sedangHantar) return Promise.resolve();
    var g = giliran();
    if (!g.length) return Promise.resolve();
    var uid = App.user ? App.user.id : null;
    if (!uid) return Promise.resolve();
    sedangHantar = true; API.maklum();
    var pertama = g[0];
    if (pertama.uid && pertama.uid !== uid) {
      // Disimpan oleh pengguna lain di peranti ini — tidak boleh dihantar atas nama pengguna semasa
      g.shift(); setGiliran(g); sedangHantar = false;
      UI.toast('1 rekod offline milik pengguna lain dibuang.', 'warn');
      return flush();
    }
    return API.panggil('batch', { ops: pertama.ops }).then(function (r) {
      sedangHantar = false;
      if (r.rangkaian) { API.maklum(); return; }
      var g2 = giliran(); g2.shift(); setGiliran(g2);
      if (!r.ok) {
        if (r.kod === 'SESI') { g2.unshift(pertama); setGiliran(g2); return; }
        UI.toast('Tidak disimpan: ' + (r.msg || 'ralat') + (pertama.label ? ' (' + pertama.label + ')' : ''), 'err', 7000);
        return App.muatSemula(true);
      }
      return flush();
    });
  }

  return { tulis: tulis, tulisTerus: tulisTerus, flush: flush, giliran: giliran, gunaOps: gunaOps, get sedangHantar() { return sedangHantar; } };
})();
