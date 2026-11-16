/* ================================================================
   UI ASAS — ikon, format, toast, modal, helper DOM
   ================================================================ */
var UI = (function () {
  var P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 7h7M9 11h5"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    transfer: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    chevR: '<path d="m9 6 6 6-6 6"/>',
    chevL: '<path d="m15 6-6 6 6 6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
    download: '<path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5"/><path d="M4 17v3h16v-3"/>',
    upload: '<path d="M12 21V9m0 0 4.5 4.5M12 9l-4.5 4.5"/><path d="M4 7V4h16v3"/>',
    printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4"/>',
    logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/>',
    wifiOff: '<path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 4.2-2.3M12 20h.01M16.5 10.8A10 10 0 0 1 19 12.5M2 8.8a15 15 0 0 1 4.3-2.6M10.7 5a15 15 0 0 1 11.3 3.8"/>',
    cloud: '<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 5.1A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3 3.9M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3M14 9l2 2"/>',
    alert: '<path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    school: '<path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M10 21v-5h4v5M12 9.5v.01"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    file: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    whatsapp: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2z"/>'
  };
  function ikon(n, cls) {
    return '<svg class="ikon ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (P[n] || P.info) + '</svg>';
  }

  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function tarikh(iso, panjang) {
    if (!iso) return '—';
    var d = new Date(iso); if (isNaN(d)) return String(iso);
    if (panjang) return d.getDate() + ' ' + D.BULAN_PENUH[d.getMonth()] + ' ' + d.getFullYear();
    return d.getDate() + ' ' + D.BULAN[d.getMonth()] + ' ' + d.getFullYear();
  }
  function masa(iso) {
    if (!iso) return ''; var d = new Date(iso);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function hariLalu(iso) {
    if (!iso) return 999;
    var a = new Date(); a.setHours(0, 0, 0, 0);
    var b = new Date(iso); b.setHours(0, 0, 0, 0);
    return Math.round((a - b) / 864e5);
  }
  function relatif(iso) {
    var n = hariLalu(iso);
    if (n >= 999) return 'Belum ada rekod';
    if (n === 0) return 'Hari ini';
    if (n === 1) return 'Semalam';
    return n + ' hari lalu';
  }
  function inisial(n) {
    return String(n || '?').replace(/\b(BINTI|BIN|A\/L|A\/P)\b.*/i, '').trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase() || '?';
  }
  /* Nama penuh (dipotong jika terlalu panjang) — elak kekeliruan nama sama */
  function namaPendek(n) {
    var s = String(n || '').trim();
    return s.length > 44 ? s.slice(0, 43) + '…' : s;
  }
  /* Nama panggilan untuk sapaan sahaja */
  function namaPanggilan(n) {
    return String(n || '').replace(/^(HJ\.?|HAJI|HAJAH|HJH\.?)\s+/i, '').replace(/\s+\b(BINTI|BIN|A\/L|A\/P)\b.*/i, '').trim();
  }
  function tajukNama(n) { return String(n || '').toLowerCase().replace(/(^|\s|-|')\S/g, function (c) { return c.toUpperCase(); }); }

  /* ── Toast ── */
  function toast(msg, jenis, ms) {
    var wrap = $('#toasts');
    var el = document.createElement('div');
    el.className = 'toast ' + (jenis || '');
    var ik = jenis === 'ok' ? 'check' : jenis === 'err' ? 'alert' : jenis === 'warn' ? 'alert' : 'info';
    el.innerHTML = ikon(ik) + '<span>' + esc(msg) + '</span>';
    el.setAttribute('role', jenis === 'err' ? 'alert' : 'status');
    wrap.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () { el.classList.remove('show'); setTimeout(function () { el.remove(); }, 300); }, ms || (jenis === 'err' ? 5000 : 2800));
  }

  /* ── Modal / helaian bawah ── */
  var tindanan = [];
  function modal(opts) {
    var el = document.createElement('div');
    el.className = 'modal-wrap';
    el.innerHTML = '<div class="modal ' + (opts.besar ? 'besar' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(opts.tajuk || '') + '">' +
      '<div class="modal-kepala"><h2>' + esc(opts.tajuk || '') + '</h2>' +
      '<button class="btn-ikon" data-tutup aria-label="Tutup">' + ikon('x') + '</button></div>' +
      '<div class="modal-badan">' + (opts.isi || '') + '</div>' +
      (opts.kaki ? '<div class="modal-kaki">' + opts.kaki + '</div>' : '') + '</div>';
    document.body.appendChild(el);
    document.body.classList.add('ada-modal');
    tindanan.push(el);
    requestAnimationFrame(function () { el.classList.add('buka'); });
    function tutup() {
      if (!el.parentNode) return;
      el.classList.remove('buka');
      tindanan = tindanan.filter(function (x) { return x !== el; });
      if (!tindanan.length) document.body.classList.remove('ada-modal');
      setTimeout(function () { el.remove(); }, 220);
      if (opts.onTutup) opts.onTutup();
    }
    el.addEventListener('click', function (e) {
      if (opts.wajib) return;
      if (e.target === el || e.target.closest('[data-tutup]')) tutup();
    });
    el.tutup = tutup;
    el.wajib = !!opts.wajib;
    if (opts.wajib) { var x = el.querySelector('.modal-kepala [data-tutup]'); if (x) x.remove(); }
    var f = el.querySelector('[autofocus]');
    if (f) setTimeout(function () { f.focus(); }, 60);
    return el;
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && tindanan.length && !tindanan[tindanan.length - 1].wajib) tindanan[tindanan.length - 1].tutup();
  });

  function sahkan(tajuk, mesej, labelYa, bahaya) {
    return new Promise(function (resolve) {
      var dijawab = false;
      var m = modal({
        tajuk: tajuk,
        isi: '<p class="teks-sahkan">' + mesej + '</p>',
        kaki: '<button class="btn btn-ghost" data-tutup>Batal</button><button class="btn ' + (bahaya ? 'btn-bahaya' : 'btn-utama') + '" data-ya>' + esc(labelYa || 'Ya, teruskan') + '</button>',
        onTutup: function () { if (!dijawab) resolve(false); }
      });
      m.querySelector('[data-ya]').addEventListener('click', function () { dijawab = true; resolve(true); m.tutup(); });
    });
  }

  function kosong(ik, tajuk, sub, aksi) {
    return '<div class="kosong">' + ikon(ik || 'sparkle') + '<h3>' + esc(tajuk) + '</h3>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + (aksi || '') + '</div>';
  }

  function lencana(teks, ton) { return '<span class="lencana ' + (ton || '') + '">' + esc(teks) + '</span>'; }

  function lencanaKualiti(v) {
    var k = D.kualiti(v);
    return '<span class="lencana ' + k.ton + '">' + esc(k.label) + '</span>';
  }

  function tonPeringkat(p) {
    if (p === 'Khatam') return 'emas';
    if (p === 'Al-Quran') return 'ungu';
    return 'hijau';
  }

  function bar(pct, ton) {
    return '<div class="bar ' + (ton || '') + '" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + Math.max(0, Math.min(100, pct)) + '%"></span></div>';
  }

  function muatSkrip(src) {
    return new Promise(function (ok, gagal) {
      if (document.querySelector('script[src="' + src + '"]')) return ok();
      var s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = function () { gagal(new Error('Gagal muat ' + src)); };
      document.head.appendChild(s);
    });
  }

  function muatTurun(namaFail, isi, jenis) {
    var blob = isi instanceof Blob ? isi : new Blob([isi], { type: jenis || 'application/octet-stream' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = namaFail;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  return {
    ikon: ikon, esc: esc, $: $, $$: $$, tarikh: tarikh, masa: masa, hariLalu: hariLalu, relatif: relatif,
    inisial: inisial, namaPendek: namaPendek, namaPanggilan: namaPanggilan, tajukNama: tajukNama, toast: toast, modal: modal, sahkan: sahkan,
    kosong: kosong, lencana: lencana, lencanaKualiti: lencanaKualiti, tonPeringkat: tonPeringkat, bar: bar,
    muatSkrip: muatSkrip, muatTurun: muatTurun
  };
})();
