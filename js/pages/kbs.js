/* KEM BESTARI SOLAT — senarai semak M (Menguasai) / BM (Belum Menguasai) */
(function () {
  var esc = UI.esc, ikon = UI.ikon;
  var st = { kelas: '', cari: '', murid: '' };

  function kemajuan(m, tahun) {
    var sec = D.kbsBahagian(D.kbsTahap(m.darjah)), jum = 0, ok = 0;
    var rek = {};
    App.DB.kbs.forEach(function (r) { if (r.muridId === m.id && Number(r.tahun) === tahun) rek[r.itemId] = r.status; });
    sec.forEach(function (s) { s.items.forEach(function (it) { jum++; if (rek[it.id] === 'M') ok++; }); });
    return { jum: jum, ok: ok, pct: jum ? Math.round(ok / jum * 100) : 0 };
  }

  function papar(el) {
    var tahun = new Date().getFullYear();
    // KBS: semua guru boleh isi mana-mana kelas (kekal seperti versi asal)
    var semua = App.DB.murid.filter(function (m) { return m.status === 'Aktif'; });
    var kelas = App.semuaKelas();
    if (!st.kelas) st.kelas = App.skop || App.kelasSaya()[0] || kelas[0] || '';
    var list = semua.filter(function (m) { return !st.kelas || m.darjah + '|' + m.kelas === st.kelas; })
      .filter(function (m) { return !st.cari || m.nama.toLowerCase().indexOf(st.cari.toLowerCase()) >= 0; })
      .sort(function (a, b) { return a.nama.localeCompare(b.nama); });

    el.innerHTML = '<div class="rekod-susun">' +
      '<section class="kad pilih-murid"><div class="kad-kepala"><h2>Murid</h2>' +
      '<select id="kbsKelas" class="pilih-kecil" aria-label="Kelas">' + kelas.map(function (k) { return '<option value="' + esc(k) + '"' + (k === st.kelas ? ' selected' : '') + '>' + esc(App.labelKelasPenuh(k)) + '</option>'; }).join('') + '</select></div>' +
      '<div class="cari">' + ikon('search') + '<input id="kbsCari" type="search" placeholder="Cari nama…" value="' + esc(st.cari) + '" aria-label="Cari nama"></div>' +
      '<ul class="senarai-murid">' + (list.length ? list.map(function (m) {
        var k = kemajuan(m, tahun);
        return '<li><button class="murid-item' + (m.id === st.murid ? ' pilih' : '') + '" data-m="' + esc(m.id) + '"><span class="avatar kecil">' + esc(UI.inisial(m.nama)) + '</span>' +
          '<span class="baris-isi"><b>' + esc(UI.namaPendek(m.nama)) + '</b><span class="sel-bar">' + UI.bar(k.pct) + '<small>' + k.ok + '/' + k.jum + '</small></span></span></button></li>';
      }).join('') : '<li>' + UI.kosong('users', 'Tiada murid') + '</li>') + '</ul></section>' +
      '<section class="kad" id="kbsSemak"></section></div>';

    UI.$('#kbsKelas').addEventListener('change', function () { st.kelas = this.value; st.murid = ''; papar(el); });
    UI.$('#kbsCari').addEventListener('input', function () { st.cari = this.value; var pos = this.selectionStart; papar(el); var c = UI.$('#kbsCari'); c.focus(); c.setSelectionRange(pos, pos); });
    UI.$$('[data-m]', el).forEach(function (b) { b.addEventListener('click', function () { st.murid = b.dataset.m; papar(el); if (matchMedia('(max-width: 899px)').matches) UI.$('#kbsSemak').scrollIntoView({ behavior: 'smooth' }); }); });
    paparSemak(el, tahun);
  }

  function paparSemak(el, tahun) {
    var box = UI.$('#kbsSemak');
    var m = App.DB.murid.filter(function (x) { return x.id === st.murid; })[0];
    if (!m) { box.innerHTML = UI.kosong('moon', 'Pilih murid', 'Senarai semak amali wuduk dan solat mengikut tahap murid akan dipaparkan.'); return; }
    var tahap = D.kbsTahap(m.darjah);
    var rek = {};
    App.DB.kbs.forEach(function (r) { if (r.muridId === m.id && Number(r.tahun) === tahun) rek[r.itemId] = r; });
    var k = kemajuan(m, tahun);
    var boleh = App.bolehTulis();
    box.innerHTML = '<div class="kad-kepala murid-kepala"><span class="avatar">' + esc(UI.inisial(m.nama)) + '</span><div><h2>' + esc(UI.namaPendek(m.nama)) + '</h2><p class="lembut">' +
      esc(App.labelKelasPenuh(m.darjah + '|' + m.kelas)) + ' · Tahap ' + tahap + ' · ' + tahun + '</p></div></div>' +
      '<div class="kemajuan-mini">' + UI.bar(k.pct) + '<span>' + k.ok + ' / ' + k.jum + ' item dikuasai (' + k.pct + '%)</span></div>' +
      D.kbsBahagian(tahap).map(function (s) {
        return '<h3 class="tajuk-bahagian">' + esc(s.label) + '</h3><ul class="semak-senarai">' + s.items.map(function (it) {
          var r = rek[it.id], v = r ? r.status : '';
          return '<li><div><span>' + esc(it.teks) + '</span>' + (it.j ? ' ' + UI.lencana(it.j, it.j === 'Rukun' ? 'info' : 'muted') : '') +
            (r && v ? '<small>' + esc(UI.tarikh(r.tarikh) + (r.guru ? ' · ' + r.guru : '')) + '</small>' : '') + '</div>' +
            '<div class="mbm" role="group" aria-label="Status ' + esc(it.teks) + '">' +
            '<button data-it="' + it.id + '" data-sec="' + s.key + '" data-v="M" class="' + (v === 'M' ? 'on m' : '') + '" ' + (boleh ? '' : 'disabled') + ' aria-pressed="' + (v === 'M') + '">M</button>' +
            '<button data-it="' + it.id + '" data-sec="' + s.key + '" data-v="BM" class="' + (v === 'BM' ? 'on bm' : '') + '" ' + (boleh ? '' : 'disabled') + ' aria-pressed="' + (v === 'BM') + '">BM</button></div></li>';
        }).join('') + '</ul>';
      }).join('');

    UI.$$('[data-it]', box).forEach(function (b) {
      b.addEventListener('click', function () {
        var it = b.dataset.it, sedia = rek[it];
        var status = sedia && sedia.status === b.dataset.v ? '' : b.dataset.v;
        var teks = '';
        D.kbsBahagian(tahap).forEach(function (s) { s.items.forEach(function (x) { if (x.id === it) teks = x.teks; }); });
        Sync.tulis([{ op: 'upsert', table: 'KBS', id: App.genId('KBS'), row: {
          muridId: m.id, muridNama: m.nama, darjah: m.darjah, kelas: m.kelas, tahap: tahap, tahun: tahun,
          sectionKey: b.dataset.sec, itemId: it, itemTeks: teks, status: status, guru: App.user.nama, tarikh: new Date().toISOString()
        } }], 'KBS');
        papar(UI.$('#kandungan'));
      });
    });
  }

  App.daftar('kbs', { papar: papar });
})();
