/* REKOD TASMIK — aliran pantas: pilih murid → tambah m/s → simpan */
(function () {
  var esc = UI.esc, ikon = UI.ikon;
  var st = { cari: '', kump: '', muridId: '' };

  function senaraiMurid() {
    var list = App.muridSaya();
    if (st.kump) {
      var k = App.DB.kumpulan.filter(function (x) { return x.id === st.kump; })[0];
      var ids = k ? String(k.muridIds || '').split(',') : [];
      list = list.filter(function (m) { return ids.indexOf(m.id) >= 0; });
    }
    if (st.cari) {
      var q = st.cari.toLowerCase();
      list = list.filter(function (m) { return m.nama.toLowerCase().indexOf(q) >= 0; });
    }
    var hariIni = new Date().toDateString();
    return list.map(function (m) {
      var r = App.rekodAkhir(m.id);
      return { m: m, r: r, siap: r && new Date(r.tarikh).toDateString() === hariIni };
    }).sort(function (a, b) {
      if (a.siap !== b.siap) return a.siap ? 1 : -1;     // belum direkod hari ini di atas
      return a.m.nama.localeCompare(b.m.nama);
    });
  }

  function papar(el, param) {
    if (param) st.muridId = param;
    var kump = App.DB.kumpulan.filter(function (k) {
      var kls = App.skop ? [App.skop] : App.kelasSaya();
      return kls.indexOf(k.darjah + '|' + k.kelas) >= 0 && String(k.muridIds || '');
    });
    el.innerHTML =
      '<div class="rekod-susun">' +
      '<section class="kad pilih-murid">' +
      '<div class="kad-kepala"><h2>Pilih murid</h2><span class="lembut" id="rkKira"></span></div>' +
      '<div class="cari">' + ikon('search') + '<input id="rkCari" type="search" placeholder="Cari nama murid…" value="' + esc(st.cari) + '" aria-label="Cari nama murid"></div>' +
      (kump.length ? '<div class="cip-baris" role="group" aria-label="Kumpulan bacaan"><button class="cip' + (st.kump ? '' : ' aktif') + '" data-kump="">Semua</button>' +
        kump.map(function (k) { return '<button class="cip' + (st.kump === k.id ? ' aktif' : '') + '" data-kump="' + esc(k.id) + '"><i style="background:' + esc(k.warna || '#0b5d4b') + '"></i>' + esc(k.nama) + '</button>'; }).join('') + '</div>' : '') +
      '<ul class="senarai-murid" id="rkSenarai"></ul>' +
      '</section>' +
      '<section class="kad borang-rekod" id="rkBorang" aria-live="polite"></section>' +
      '</div>' +
      '<section class="kad" id="rkHariIni"></section>';

    UI.$('#rkCari').addEventListener('input', function () { st.cari = this.value; paparSenarai(); });
    UI.$$('[data-kump]').forEach(function (b) { b.addEventListener('click', function () { st.kump = b.dataset.kump; papar(el); }); });
    paparSenarai();
    paparBorang();
    paparHariIni();
  }

  function paparSenarai() {
    var l = senaraiMurid();
    var siap = l.filter(function (x) { return x.siap; }).length;
    UI.$('#rkKira').textContent = siap + '/' + l.length + ' selesai hari ini';
    var ul = UI.$('#rkSenarai');
    if (!l.length) { ul.innerHTML = '<li>' + UI.kosong('users', 'Tiada murid', st.cari ? 'Tiada nama sepadan dengan carian.' : 'Belum ada murid dalam kelas ini.') + '</li>'; return; }
    ul.innerHTML = l.map(function (x) {
      var m = x.m, n = x.r ? UI.hariLalu(x.r.tarikh) : 999;
      return '<li><button class="murid-item' + (m.id === st.muridId ? ' pilih' : '') + (x.siap ? ' siap' : '') + '" data-murid="' + esc(m.id) + '">' +
        '<span class="avatar kecil ' + UI.tonPeringkat(m.peringkat) + '">' + (x.siap ? ikon('check') : esc(UI.inisial(m.nama))) + '</span>' +
        '<span class="baris-isi"><b>' + esc(UI.namaPendek(m.nama)) + '</b><span>' + esc(D.kemajuan(m).kedudukan) + ' · ' + esc(x.siap ? 'Selesai hari ini' : UI.relatif(x.r && x.r.tarikh)) + '</span></span>' +
        (n > 7 && n < 999 ? UI.lencana(n + 'h', 'warn') : n >= 999 ? UI.lencana('Baru', 'muted') : '') +
        '</button></li>';
    }).join('');
    UI.$$('[data-murid]', ul).forEach(function (b) {
      b.addEventListener('click', function () {
        st.muridId = b.dataset.murid;
        UI.$$('.murid-item', ul).forEach(function (x) { x.classList.toggle('pilih', x === b); });
        paparBorang();
        if (matchMedia('(max-width: 899px)').matches) UI.$('#rkBorang').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* Muka surat permulaan sesi seterusnya */
  function dariCadangan(m) {
    var ms = parseInt(m.mukaSurat, 10) || 0;
    var j = D.julat(m.jenis || 'Iqra Baru', m.peringkat || 'Iqra 1');
    var ada = !!App.rekodAkhir(m.id);
    var d = ada ? ms + 1 : (ms || j.dari);
    return Math.max(j.dari, Math.min(j.ke, d));
  }

  function paparBorang() {
    var box = UI.$('#rkBorang');
    var m = App.DB.murid.filter(function (x) { return x.id === st.muridId && x.status === 'Aktif'; })[0];
    if (!m) {
      box.innerHTML = UI.kosong('book', 'Pilih murid untuk mula', 'Tekan nama murid dalam senarai. Muka surat semasa akan diisi secara automatik.');
      return;
    }
    if (m.peringkat === 'Khatam') {
      box.innerHTML = '<div class="kad-kepala"><h2>' + esc(UI.namaPendek(m.nama)) + '</h2></div>' +
        UI.kosong('trophy', 'Telah khatam Al-Quran', 'Murid ini telah khatam ' + (m.bilKhatam || 1) + ' kali. Untuk mula bacaan semula, kemas kini peringkat di halaman Murid.',
          '<a class="btn btn-ghost" href="#/khatam">Rekod khatam</a>');
      return;
    }
    // Peringkat dari pelayan sudah disemak: hanya "Al-Quran" yang sah dibuka sebagai Al-Quran.
    // Data bercanggah (m.semakPeringkat) → guru diminta pilih jenis bacaan yang betul.
    var quran = m.peringkat === 'Al-Quran';
    var f = { jenis: quran ? 'Al-Quran' : (m.jenis === 'Iqra Lama' ? 'Iqra Lama' : 'Iqra Baru'), peringkat: quran ? 'Al-Quran' : (D.IQRA_SAHAJA.indexOf(m.peringkat) >= 0 ? m.peringkat : 'Iqra 1'), kualiti: D.KUALITI[0].v, kemaskini: true, naik: false };
    var akhir = App.rekodAkhir(m.id);
    var kj = D.kemajuan(m);

    box.innerHTML =
      '<div class="kad-kepala murid-kepala"><span class="avatar ' + UI.tonPeringkat(m.peringkat) + '">' + esc(UI.inisial(m.nama)) + '</span>' +
      '<div><h2>' + esc(UI.namaPendek(m.nama)) + '</h2><p class="lembut">' + esc(App.labelKelasPenuh(m.darjah + '|' + m.kelas)) + (akhir ? ' · Terakhir ' + esc(UI.relatif(akhir.tarikh).toLowerCase()) + ' (m/s ' + esc(akhir.dari + '–' + akhir.ke) + ', ' + esc(D.kualiti(akhir.kualiti).label) + ')' : ' · Belum ada rekod') + '</p></div></div>' +
      '<div class="kemajuan-mini">' + UI.bar(kj.pct, kj.fasa === 'Al-Quran' ? 'ungu' : '') + '<span>' + esc(kj.kedudukan) + ' · ' + kj.pct + '%</span></div>' +
      rekodLepas(m) +
      (m.semakPeringkat ? '<div class="amaran-kotak warn" id="rkSemak">' + UI.ikon('alert') + '<div><b>Sahkan jenis bacaan murid ini</b><p>' + esc(m.semakPeringkat.sebab) +
        ' (data sistem lama). Pilih <b>Iqra</b> atau <b>Al-Quran</b> di bawah mengikut bacaan sebenar — kedudukan murid akan dikemas kini bila rekod disimpan.</p></div></div>' : '') +
      '<form id="fRekod" class="borang">' +
      '<div class="segmen" role="radiogroup" aria-label="Jenis bacaan">' + D.JENIS.map(function (j) {
        return '<button type="button" role="radio" data-jenis="' + j + '" aria-checked="' + (f.jenis === j) + '">' + esc(j) + '</button>';
      }).join('') + '</div>' +
      '<div class="baris-medan">' +
      '<label class="medan" id="rkPGrp"><span>Peringkat</span><select id="rkP">' + D.IQRA_SAHAJA.map(function (p) { return '<option' + (p === f.peringkat ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select></label>' +
      '<label class="medan"><span>Dari m/s <small id="rkJulat"></small></span><input id="rkDari" type="number" inputmode="numeric" required></label>' +
      '<label class="medan"><span>Hingga m/s</span><input id="rkKe" type="number" inputmode="numeric" required></label>' +
      '</div>' +
      '<div class="cip-baris pantas" aria-label="Tambah muka surat pantas">' + [1, 2, 3, 4, 5, 10].map(function (n) { return '<button type="button" class="cip" data-tambah="' + n + '">+' + n + ' m/s</button>'; }).join('') + '</div>' +
      '<p class="info-medan" id="rkInfo"></p>' +
      '<fieldset class="kualiti"><legend>Penilaian</legend>' + D.KUALITI.map(function (k, i) {
        return '<label class="kualiti-pilih ' + k.ton + '"><input type="radio" name="kualiti" value="' + esc(k.v) + '"' + (i === 0 ? ' checked' : '') + '><span><b>' + esc(k.label) + '</b><small>' + esc(k.sub) + '</small></span></label>';
      }).join('') + '</fieldset>' +
      '<div class="togol-baris">' +
      '<label class="togol"><input type="checkbox" id="rkKemas" checked><span></span>Kemas kini kedudukan murid</label>' +
      '<label class="togol" id="rkNaikWrap"><input type="checkbox" id="rkNaik"><span></span><b id="rkNaikLabel">Naik peringkat</b></label>' +
      '</div>' +
      '<details class="catatan"><summary>Tambah catatan (pilihan)</summary><textarea id="rkCatatan" rows="2" maxlength="300" placeholder="cth: Perlu latih makhraj huruf ع"></textarea></details>' +
      '<button class="btn btn-utama btn-besar btn-penuh" type="submit" id="rkSimpan">' + ikon('check') + ' Simpan rekod</button>' +
      '</form>';

    var elDari = UI.$('#rkDari'), elKe = UI.$('#rkKe'), elP = UI.$('#rkP');

    function setJenis(j) {
      f.jenis = j;
      UI.$$('[data-jenis]', box).forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.jenis === j)); });
      UI.$('#rkPGrp').hidden = j === 'Al-Quran';
      f.peringkat = j === 'Al-Quran' ? 'Al-Quran' : elP.value;
      kemasJulat();
    }
    function kemasJulat() {
      var jl = D.julat(f.jenis, f.peringkat);
      UI.$('#rkJulat').textContent = '(' + jl.dari + '–' + jl.ke + ')';
      [elDari, elKe].forEach(function (x) { x.min = jl.dari; x.max = jl.ke; });
      semak();
    }
    function semak() {
      var jl = D.julat(f.jenis, f.peringkat);
      var a = parseInt(elDari.value, 10), b = parseInt(elKe.value, 10);
      var info = UI.$('#rkInfo'), msg = '', ton = '';
      if (a && b) {
        if (b < a) { msg = 'Muka surat "hingga" mesti sama atau lebih besar daripada "dari".'; ton = 'ralat'; }
        else if (a < jl.dari || b > jl.ke) { msg = 'Di luar julat ' + f.peringkat + ' (' + jl.dari + '–' + jl.ke + ').'; ton = 'ralat'; }
        else {
          msg = (b - a + 1) + ' muka surat';
          if (f.jenis === 'Al-Quran') msg += ' · ' + D.labelBacaan('Al-Quran', 'Al-Quran', a, b).replace('Al-Quran ', '');
          if (b >= jl.ke && f.jenis !== 'Al-Quran') msg += ' · Tamat ' + f.peringkat + '!';
        }
      }
      var jangka = dariCadangan(m);
      if (ton !== 'ralat' && akhir && a && a !== jangka && f.jenis === m.jenis && f.peringkat === (m.peringkat || 'Iqra 1')) {
        msg = '⚠ Tidak bersambung — bacaan sepatutnya bermula m/s ' + jangka + '. Pastikan murid membaca di tempat yang betul.' + (msg ? ' (' + msg + ')' : '');
        ton = 'amaran';
      }
      info.textContent = msg; info.className = 'info-medan ' + ton;
      // Cadang naik peringkat bila sampai muka surat akhir
      var habis = b && b >= jl.ke;
      var seterus = f.jenis === 'Al-Quran' ? 'Khatam' : D.peringkatSeterusnya(f.peringkat);
      UI.$('#rkNaikLabel').textContent = f.jenis === 'Al-Quran' ? 'Tamat Al-Quran (rekod khatam berasingan)' : 'Naik ke ' + seterus;
      UI.$('#rkNaikWrap').hidden = f.jenis === 'Al-Quran';
      if (habis && f.jenis !== 'Al-Quran' && !UI.$('#rkNaik').dataset.disentuh) UI.$('#rkNaik').checked = true;
      if (!habis && !UI.$('#rkNaik').dataset.disentuh) UI.$('#rkNaik').checked = false;
      return ton !== 'ralat';
    }

    UI.$$('[data-jenis]', box).forEach(function (b) { b.addEventListener('click', function () { setJenis(b.dataset.jenis); elDari.value = D.julat(f.jenis, f.peringkat).dari; elKe.value = ''; semak(); }); });
    elP.addEventListener('change', function () { f.peringkat = elP.value; elDari.value = D.julat(f.jenis, f.peringkat).dari; elKe.value = ''; kemasJulat(); });
    [elDari, elKe].forEach(function (x) { x.addEventListener('input', semak); });
    UI.$('#rkNaik').addEventListener('change', function () { this.dataset.disentuh = '1'; });
    UI.$$('[data-tambah]', box).forEach(function (b) {
      b.addEventListener('click', function () {
        var a = parseInt(elDari.value, 10) || D.julat(f.jenis, f.peringkat).dari;
        var jl = D.julat(f.jenis, f.peringkat);
        elKe.value = Math.min(jl.ke, a + parseInt(b.dataset.tambah, 10) - 1);
        semak();
      });
    });

    setJenis(f.jenis);
    elDari.value = dariCadangan(m);
    semak();

    UI.$('#fRekod').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!App.bolehTulis()) return UI.toast('Peranan anda tidak boleh merekod.', 'err');
      var a = parseInt(elDari.value, 10), b = parseInt(elKe.value, 10);
      if (!a || !b) { elKe.focus(); return UI.toast('Isi muka surat "hingga" — atau tekan butang +m/s', 'warn'); }
      if (!semak()) return UI.toast(UI.$('#rkInfo').textContent, 'err');
      simpan(m, f, a, b);
    });
  }

  function simpan(m, f, a, b) {
    var kini = new Date();
    var kualiti = (UI.$('input[name=kualiti]:checked') || {}).value || D.KUALITI[0].v;
    var label = D.labelBacaan(f.jenis, f.peringkat, a, b);
    var id = App.genId('R');
    var rekod = {
      tarikh: kini.toISOString(), hari: D.HARI[kini.getDay()], masa: UI.masa(kini.toISOString()),
      muridId: m.id, muridNama: m.nama, darjah: m.darjah, kelas: m.kelas,
      guruId: App.user.id, guru: App.user.nama, jenis: f.jenis, peringkat: f.peringkat, iqraLabel: label,
      dari: a, ke: b, jumlah: b - a + 1, kualiti: kualiti, catatan: UI.$('#rkCatatan').value.trim()
    };
    var ops = [{ op: 'insert', table: 'Rekod', id: id, row: rekod }];
    var kemas = UI.$('#rkKemas').checked, naik = UI.$('#rkNaik').checked && f.jenis !== 'Al-Quran';
    var lulus = D.kualiti(kualiti).bintang >= 2;
    var patch = null, mesej = 'Rekod disimpan';
    if (naik) {
      var next = D.peringkatSeterusnya(f.peringkat);
      if (next === 'Al-Quran') patch = { jenis: 'Al-Quran', peringkat: 'Al-Quran', iqraLabel: 'Al-Quran (Juzuk 1)', mukaSurat: 0 };
      else { var jl = D.julat(f.jenis, next); patch = { jenis: f.jenis, peringkat: next, iqraLabel: D.labelBacaan(f.jenis, next), mukaSurat: jl.dari - 1 }; }
      mesej = 'Tahniah! Naik ke ' + next;
    } else if (kemas) {
      patch = { jenis: f.jenis, peringkat: f.peringkat, iqraLabel: label, mukaSurat: lulus ? b : Math.max(a - 1, 0) };
    }
    if (patch) ops.push({ op: 'update', table: 'Murid', id: m.id, patch: patch });

    var btn = UI.$('#rkSimpan'); btn.disabled = true;
    Sync.tulis(ops, m.nama).then(function () { Shell.statusSync(); });
    UI.toast(mesej + (API.dalamTalian ? '' : ' (offline — akan dihantar kemudian)'), 'ok');
    App.bina();
    // Pergi ke murid seterusnya yang belum direkod
    var seterus = senaraiMurid().filter(function (x) { return !x.siap && x.m.id !== m.id; })[0];
    st.muridId = seterus ? seterus.m.id : '';
    paparSenarai(); paparBorang(); paparHariIni(); Shell.kiraanAmaran();
  }

  /* 3 rekod terakhir murid — guru semak murid membaca di tempat yang betul */
  function rekodLepas(m) {
    var rs = App.DB.rekod.filter(function (r) { return r.muridId === m.id; })
      .sort(function (a, b) { return new Date(b.tarikh) - new Date(a.tarikh); }).slice(0, 3);
    if (!rs.length) return '';
    return '<div class="rk-lepas"><small>' + ikon('clock') + ' ' + rs.length + ' bacaan terakhir</small><ol>' + rs.map(function (r, i) {
      // Jurang dengan rekod sebelumnya (lebih lama) dalam bacaan yang sama
      var lama = rs[i + 1], putus = lama && lama.jenis === r.jenis && lama.peringkat === r.peringkat &&
        parseInt(r.dari, 10) > parseInt(lama.ke, 10) + 1;
      var d = new Date(r.tarikh);
      return '<li' + (i === 0 ? ' class="akhir"' : '') + '><span class="rk-tarikh">' + esc(D.HARI[d.getDay()].slice(0, 3) + ', ' + d.getDate() + ' ' + D.BULAN[d.getMonth()]) + '</span>' +
        '<span class="rk-bacaan"><b>' + esc((r.jenis === 'Al-Quran' ? 'Al-Quran' : r.peringkat) + ' · m/s ' + r.dari + '–' + r.ke) + '</b>' +
        '<em>' + esc(D.kualiti(r.kualiti).label + (r.guru && r.guruId !== App.user.id ? ' · ' + UI.namaPendek(r.guru) : '')) + (putus ? ' · <i class="rk-putus">lompat m/s ' + (parseInt(lama.ke, 10) + 1) + '–' + (parseInt(r.dari, 10) - 1) + '</i>' : '') + '</em>' +
        (r.catatan ? '<q>' + esc(r.catatan) + '</q>' : '') + '</span></li>';
    }).join('') + '</ol></div>';
  }

  function paparHariIni() {
    var box = UI.$('#rkHariIni'); if (!box) return;
    var hari = new Date().toDateString();
    var ids = {}; App.muridSaya().forEach(function (m) { ids[m.id] = 1; });
    var rs = App.DB.rekod.filter(function (r) { return ids[r.muridId] && new Date(r.tarikh).toDateString() === hari; })
      .sort(function (a, b) { return new Date(b.tarikh) - new Date(a.tarikh); });
    var pending = {}; Sync.giliran().forEach(function (g) { g.ops.forEach(function (o) { pending[o.id] = 1; }); });
    box.innerHTML = '<div class="kad-kepala"><h2>Rekod hari ini</h2>' + UI.lencana(rs.length + ' sesi', 'muted') + '</div><div class="kad-badan">' +
      (rs.length ? '<ul class="senarai">' + rs.map(function (r) {
        return '<li class="baris"><div class="baris-isi"><b>' + esc(UI.namaPendek(r.muridNama)) + '</b><span>' + esc((r.iqraLabel || r.peringkat) + ' · m/s ' + r.dari + '–' + r.ke) + '</span></div>' +
          UI.lencanaKualiti(r.kualiti) + '<span class="masa">' + (pending[r.id] ? '<span title="Belum dihantar">' + ikon('clock') + '</span>' : '') + esc(UI.masa(r.tarikh)) + '</span>' +
          (bolehPadam(r) ? '<button class="btn-ikon" data-padam="' + esc(r.id) + '" aria-label="Padam rekod">' + ikon('trash') + '</button>' : '') + '</li>';
      }).join('') + '</ul>' : UI.kosong('clock', 'Belum ada rekod hari ini')) + '</div>';
    UI.$$('[data-padam]', box).forEach(function (b) {
      b.addEventListener('click', function () {
        UI.sahkan('Padam rekod?', 'Rekod ini akan dipadam. Kedudukan murid tidak berubah — kemas kini di halaman Murid jika perlu.', 'Padam', true).then(function (ya) {
          if (!ya) return;
          Sync.tulis([{ op: 'delete', table: 'Rekod', id: b.dataset.padam }], 'padam rekod');
          App.bina(); paparSenarai(); paparHariIni(); UI.toast('Rekod dipadam', 'ok');
        });
      });
    });
  }
  function bolehPadam(r) { return App.pentadbir() || (App.ialah('guru') && r.guruId === App.user.id); }

  App.daftar('rekod', { papar: papar });
})();
