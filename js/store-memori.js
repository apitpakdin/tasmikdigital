/* Storan dalam memori untuk TasmikCore — digunakan oleh mod DEMO & ujian.
   `simpan` (pilihan) dipanggil setiap kali data berubah. */
var StoreMemori = (function () {
  function cipta(data, simpan) {
    data = data || {};
    ['Guru', 'Murid', 'Rekod', 'Khatam', 'KBS', 'Kumpulan'].forEach(function (t) { data[t] = data[t] || []; });
    data.Config = data.Config || {};
    data.Log = data.Log || [];
    data.Sesi = data.Sesi || {};
    var cacheMem = {};
    function ubah() { if (simpan) simpan(data); }
    function salin(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }

    var store = {
      all: function (t) { return data[t].map(salin); },
      insert: function (t, row) { data[t].push(salin(row)); ubah(); },
      update: function (t, id, patch) {
        var r = data[t].filter(function (x) { return x.id === id; })[0];
        if (r) { for (var k in patch) r[k] = patch[k]; ubah(); }
      },
      updateMany: function (t, peta) {
        data[t].forEach(function (x) { var p = peta[x.id]; if (p) for (var k in p) x[k] = p[k]; }); ubah();
      },
      insertMany: function (t, rows) { rows.forEach(function (r) { data[t].push(salin(r)); }); ubah(); },
      remove: function (t, id) { data[t] = data[t].filter(function (x) { return x.id !== id; }); ubah(); },
      config: function () { return salin(data.Config); },
      setConfig: function (k, v) { data.Config[k] = v; ubah(); },
      log: function (arr) { data.Log.push(arr); if (data.Log.length > 300) data.Log.shift(); ubah(); }
    };
    return {
      data: data,
      env: {
        store: store,
        rawakBytes: function (n) {
          var a = new Uint8Array(n);
          if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(a);
          else for (var i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256);
          return Array.prototype.slice.call(a);
        },
        iterasi: 50,
        sesi: {
          get: function (t) { return data.Sesi[t] || null; },
          put: function (t, d) { data.Sesi[t] = d; ubah(); },
          del: function (t) { delete data.Sesi[t]; ubah(); }
        },
        cache: {
          get: function (k) { var c = cacheMem[k]; return c && c.tamat > Date.now() ? c.v : null; },
          put: function (k, v, s) { cacheMem[k] = { v: v, tamat: Date.now() + s * 1000 }; },
          remove: function (k) { delete cacheMem[k]; }
        },
        kunci: function (fn) { return fn(); },
        sandaran: function (nama) {
          data.Sandaran = data.Sandaran || [];
          var kini = new Date().toISOString();
          data.Sandaran.push({ nama: nama, masa: kini, bil: data.Murid.length });
          data.Config.sandaranAkhir = kini; data.Config.sandaranNama = nama;
          ubah();
          return { ok: true, nama: nama, url: '', tarikh: kini };
        }
      }
    };
  }
  return { cipta: cipta };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = StoreMemori;
