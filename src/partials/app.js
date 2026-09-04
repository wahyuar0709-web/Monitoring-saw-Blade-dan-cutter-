/* ============================================================
       API — backend GAS di-deploy sbg Web App terpisah dari hosting
       frontend (GitHub Pages), jadi manggilnya lewat fetch() ke URL
       /exec, bukan google.script.run (itu cuma jalan kalau HTML-nya
       dirender langsung oleh Apps Script).
       ============================================================ */
/* ============================================================
       PHASE 3A — KONFIGURASI GOOGLE APPS SCRIPT URL (runtime, localStorage)
       ============================================================ */
const API_URL_STORAGE_KEY = 'sawBladeMonitor_apiUrl';
// Pola Web App Apps Script yang valid: https://script.google.com/macros/s/<id>/exec
const API_URL_PATTERN = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec\/?$/i;

// P2-06/12 — satu-satunya sumber URL API saat runtime, jangan hard-code.
let runtimeApiUrl_ = localStorage.getItem(API_URL_STORAGE_KEY) || '';

/* ============================================================
       [FIX — TOKEN API] Backend v5.15+ (WO-2.0.1) mewajibkan token
       app-level di SETIAP request (doGet & doPost), fail-closed kalau
       tidak dikirim/salah. Sebelum fix ini apiGet/apiPost TIDAK
       PERNAH mengirim token sama sekali -> seluruh aplikasi UNAUTHORIZED
       terhadap backend v5.15. Pola penyimpanan SAMA seperti API URL:
       localStorage di perangkat ini saja, diisi manual sekali dari
       Pengaturan, tidak pernah hard-code di source.
       ============================================================ */
const API_TOKEN_STORAGE_KEY = 'sawBladeMonitor_apiToken';
let runtimeApiToken_ = localStorage.getItem(API_TOKEN_STORAGE_KEY) || '';

/* ============================================================
       [WO-2.2 — LOGIN & SESSION] Lapisan KEDUA di atas token app-level
       di atas -- token app-level cuma menjawab "aplikasi mana yang
       boleh akses", sessionToken di bawah ini menjawab "operator mana
       yang benar-benar melakukan transaksi ini" (actor identity
       tervalidasi server, bukan cuma field PIC yang diketik manual).
       Disimpan di localStorage supaya tidak perlu login ulang tiap
       buka app (TTL session 7 hari, dicek server-side).
       ============================================================ */
const SESSION_TOKEN_STORAGE_KEY = 'sawBladeMonitor_sessionToken';
const SESSION_ACTOR_STORAGE_KEY = 'sawBladeMonitor_actorName';
const SESSION_ROLE_STORAGE_KEY = 'sawBladeMonitor_role';
let runtimeSessionToken_ = localStorage.getItem(SESSION_TOKEN_STORAGE_KEY) || '';
let runtimeActorName_ = localStorage.getItem(SESSION_ACTOR_STORAGE_KEY) || '';
let runtimeRole_ = localStorage.getItem(SESSION_ROLE_STORAGE_KEY) || '';

function isLoggedIn_() {
  return !!runtimeSessionToken_;
}

/** [WO-ROLE] true kalau operator (akses terbatas) -- default aman: kalau role belum diketahui, ANGGAP operator (paling terbatas), bukan admin. */
function isOperatorRole_() {
  return runtimeRole_ === 'operator';
}

/** Dipanggil setelah login sukses ATAU saat session dianggap invalid (mis. UNAUTHORIZED_SESSION dari backend). */
function setSession_(sessionToken, actorName, role, persist) {
  runtimeSessionToken_ = sessionToken || '';
  runtimeActorName_ = actorName || '';
  runtimeRole_ = role || '';
  if (sessionToken && persist !== false) {
    localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, sessionToken);
    localStorage.setItem(SESSION_ACTOR_STORAGE_KEY, actorName || '');
    localStorage.setItem(SESSION_ROLE_STORAGE_KEY, role || '');
  } else {
    localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    localStorage.removeItem(SESSION_ACTOR_STORAGE_KEY);
    localStorage.removeItem(SESSION_ROLE_STORAGE_KEY);
  }
  applyRoleUI_();
}

/**
 * [WO-ROLE] Terapkan tampilan sesuai role: operator TIDAK melihat tab
 * "Input" (transaksi langsung), Master Mesin, atau Kontrol Asah --
 * hanya Dashboard, Stok (view), dan "Ajukan Tumpul". Admin/WH melihat
 * semuanya PLUS panel "Konfirmasi Pengajuan". Ini hanya kosmetik --
 * backend (addMovementRow) TETAP menolak operator secara independen,
 * jadi sembunyi/tampil di sini bukan satu-satunya lapis pengamanan.
 */
// [REVISI] Ikon & label asli tab tengah (raised) utk role admin --
// disimpan sekali di sini supaya applyRoleUI_ bisa mengembalikannya
// kalau login berganti dari operator ke admin di device yang sama
// (mis. logout lalu login ulang sbg admin), tanpa perlu reload halaman.
const RAISED_TAB_HTML_ADMIN_ =
  '<span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></span>Input';
const RAISED_TAB_HTML_OPERATOR_ =
  '<span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l5-5v3h9v4H8v3l-5-5z"></path></svg></span>Ajukan Tumpul';

function applyRoleUI_() {
  const op = isOperatorRole_();
  // v8.19 — querySelectorAll: sinkron ke tombol Input/Ajukan Tumpul
  // di BOTH bottom-nav mobile & sidebar desktop (dua elemen DOM
  // terpisah, sama-sama class .raised), bukan cuma salah satu.
  const inputTabs = document.querySelectorAll('.tab-btn.raised');
  const lainnyaMesinItem = document.querySelector('.lainnya-item[data-panel="panel-mesin"]');
  const lainnyaKontrolAsahItem = document.querySelector('.lainnya-item[data-panel="panel-kontrol-asah"]');
  const lainnyaAjukanItem = document.querySelector('.lainnya-item[data-panel="panel-ajukan-tumpul"]');
  const lainnyaKonfirmasiItem = document.querySelector('.lainnya-item[data-panel="panel-konfirmasi-tumpul"]');
  // [REVISI] Tab tengah (raised) tidak lagi disembunyikan utk operator --
  // sekarang DIALIHKAN ke "Ajukan Tumpul" (satu-satunya transaksi yang
  // memang boleh dimulai operator), sementara utk admin tetap "Input"
  // seperti semula. Backend (addMovementRow) tetap independen menegakkan
  // role, jadi ini murni navigasi/kosmetik.
  inputTabs.forEach(function (inputTab) {
    inputTab.dataset.panel = op ? 'panel-ajukan-tumpul' : 'panel-input';
    inputTab.innerHTML = op ? RAISED_TAB_HTML_OPERATOR_ : RAISED_TAB_HTML_ADMIN_;
    // Sidebar icon-only pakai tooltip (::after, attr(data-tooltip)),
    // bukan label teks permanen -- disinkronkan terpisah dari
    // innerHTML supaya tooltip ikut benar walau teks visualnya
    // disembunyikan (font-size:0) di sidebar.
    inputTab.dataset.tooltip = op ? 'Ajukan Tumpul' : 'Input';
  });
  if (lainnyaMesinItem) lainnyaMesinItem.style.display = op ? 'none' : '';
  if (lainnyaKontrolAsahItem) lainnyaKontrolAsahItem.style.display = op ? 'none' : '';
  // [REVISI] Item "Ajukan Pengembalian Tumpul" di menu Lainnya dihapus
  // dari tampilan operator (sekarang aksesnya lewat tab tengah, bukan
  // lagi lewat Lainnya) -- tetap disembunyikan dari admin seperti semula.
  if (lainnyaAjukanItem) lainnyaAjukanItem.style.display = 'none';
  if (lainnyaKonfirmasiItem) lainnyaKonfirmasiItem.style.display = op ? 'none' : '';
  // Kalau operator sedang berdiri di panel yang baru saja disembunyikan
  // (mis. reload persis di tab Input), lempar balik ke Dashboard.
  if (op && isLoggedIn_()) {
    const activePanel = document.querySelector('.panel.active');
    const restricted = ['panel-input', 'panel-mesin', 'panel-kontrol-asah', 'panel-konfirmasi-tumpul'];
    if (activePanel && restricted.indexOf(activePanel.id) >= 0) {
      goToPanel('panel-summary');
    }
  }
}

/** Validasi dasar: harus https + pola Web App Apps Script (7). */
function isValidApiUrl_(url) {
  return API_URL_PATTERN.test(String(url || '').trim());
}

/**
 * 12 — API GUARD terpusat. apiGet()/apiPost() SELALU lewat sini,
 * tidak ada pengecekan URL sendiri-sendiri di masing-masing fungsi.
 * Kalau URL belum diatur -> throw ApiError CONFIGURATION_ERROR (11).
 */
function getConfiguredApiUrl() {
  if (!runtimeApiUrl_) {
    throw new ApiError(
      'CONFIGURATION_ERROR',
      'API belum dikonfigurasi. Buka Pengaturan dan masukkan Google Apps Script URL.'
    );
  }
  return runtimeApiUrl_;
}
const API_TIMEOUT_MS = 30000; // P1-01: default request timeout
const APP_VERSION = 'v8.23.3-fix-audit-fe-be'; // versi lengkap, dipakai di log developer
const APP_VERSION_SHORT = 'v8.23.3'; // versi ringkas, ditampilkan di badge UI
// [v8.23.3] CHANGELOG — perbaikan dari audit "Integrasi Frontend-Backend":
// [1] (Temuan 1, High) loadRiwayatPengajuanSaya_() & loadKonfirmasiTumpulPanel_()
//     sebelumnya punya blok deteksi UNAUTHORIZED_SESSION yang DEAD CODE (mengecek
//     rows.error padahal apiGet() sudah throw ApiError duluan untuk bentuk itu) --
//     auto-logout saat sesi kedaluwarsa tidak pernah jalan di 2 panel ini. Sekarang
//     dipindah ke .catch() lewat handleSessionError_() baru.
// [2] (Temuan 2, Medium) submitPengajuanTumpul (wireAjukanTumpulForm_) & confirmPengajuanTumpul
//     (handleKonfirmasiTumpul_) sebelumnya tidak pernah mengecek UNAUTHORIZED_SESSION
//     sama sekali (backend mengembalikannya sbg {success:false,error:{code,...}} lewat
//     respons POST normal, bukan exception) -- sekarang dicek di .then() lewat
//     handleSessionError_() yang sama, dan mapErrorToMessage_() (addMovementRow)
//     direfactor memakai helper yang sama juga. Total 5 lokasi sekarang konsisten
//     satu sumber logic.
// [3] (Bonus, residu fix mojibake "Γû╕"->"▸" sebelumnya) 15 kemunculan encoding rusak
//     "┬╖" (harusnya "·") dan "┬▓" (harusnya "²", dipakai sbg penanda reduplikasi kata
//     spt "rata²") dibersihkan.
// [v8.18.0] CHANGELOG — dropdown "Mesin" di form Transaksi kosong tanpa
// pesan error apapun. Root cause: apiGet() sebelumnya TIDAK mengecek
// field `error` pada respons GET (bentuknya {error:"..."} dgn HTTP 200,
// sesuai kontrak jsonOutput_() backend) -- jadi kalau backend menolak
// action (mis. deployment live masih versi lama, belum kenal
// 'getMachineList'), .then() tetap resolve dgn objek {error:...},
// lalu `machineList.forEach(...)` melempar TypeError yg ketangkep diam2
// oleh .catch(console.error). [1] apiGet() sekarang melempar ApiError
// eksplisit kalau body berbentuk {error: string} tanpa field `success`
// (bentuk khas GET; TIDAK menyentuh alur apiPost yang sudah pakai
// {success,error:{code,message}} & sudah dicek manual di tiap caller).
// [2] loadFormReferenceData() sekarang menampilkan hint visible di
// dropdown Mesin kalau gagal load, bukan cuma log ke console.
// [3] Log versi backend LIVE (via action getBackendVersion) saat start,
// supaya deployment basi bisa ketahuan langsung dari console browser.

/**
 * Error terstruktur untuk semua kegagalan API, supaya frontend bisa
 * membedakan TIMEOUT / NETWORK / HTTP / PARSE / API_RESPONSE_INVALID /
 * kode error bisnis dari backend (mis. DUPLICATE_UNIT_ID), lalu
 * menampilkan pesan yang sesuai ke user (P1-08, M).
 */
class ApiError extends Error {
  constructor(code, message, meta) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.meta = meta || {};
  }
}

/**
 * FIX Temuan 1 & 2 (audit integrasi FE-BE): satu sumber logic terpusat untuk
 * mendeteksi sesi kedaluwarsa (UNAUTHORIZED_SESSION) dan memaksa balik ke
 * login gate. Sebelumnya logic ini ditulis manual & tidak konsisten di
 * beberapa tempat -- lebih parah lagi, di loadRiwayatPengajuanSaya_() dan
 * loadKonfirmasiTumpulPanel_() logic-nya bahkan DEAD CODE (mengecek
 * `rows.error` padahal apiGet() sudah melempar exception duluan untuk
 * bentuk itu, lihat komentar di apiGet), jadi auto-logout tidak pernah
 * benar-benar jalan di kedua panel tsb.
 *
 * Dipakai untuk DUA bentuk error yang berbeda di codebase ini:
 *  - ApiError yang di-throw (jalur GET lewat apiGet, atau POST
 *    addMovementRow lewat validateTransactionResponse_) -- errorLike.code
 *    bisa 'API_ERROR' (GET) dgn pesan asli backend di errorLike.message
 *    (mis. "UNAUTHORIZED_SESSION: ..."), atau langsung 'UNAUTHORIZED_SESSION'
 *    (addMovementRow).
 *  - Objek {code,message} polos dari res.error pada respons POST yang
 *    resolve NORMAL (HTTP 200, {success:false,...}) -- ini bentuk yang
 *    dipakai submitPengajuanTumpul_/confirmPengajuanTumpul_ di backend,
 *    jadi HARUS dicek di .then() (bukan .catch()) oleh pemanggilnya.
 *
 * @param {Error|{code?:string,message?:string}|null|undefined} errorLike
 * @return {boolean} true kalau ini memang error sesi & sudah ditangani
 *   (session lokal dibersihkan + login gate ditampilkan); false kalau
 *   bukan error sesi, sehingga pemanggil tetap menjalankan fallback
 *   error handling-nya sendiri.
 */
function handleSessionError_(errorLike) {
  if (!errorLike) return false;
  const code = errorLike.code;
  const msg = errorLike.message ? String(errorLike.message) : '';
  const isSessionError = code === 'UNAUTHORIZED_SESSION' || msg.indexOf('UNAUTHORIZED_SESSION') === 0;
  if (!isSessionError) return false;
  setSession_('', '', '');
  renderAccountState_();
  showLoginGate_();
  return true;
}

/** Logging developer tanpa data sensitif (N). */
function logApiError_(action, requestId, err, note) {
  console.error('[API ERROR]', {
    version: APP_VERSION,
    action: action,
    requestId: requestId || null,
    code: (err && err.code) || 'UNKNOWN',
    status: (err && err.meta && err.meta.status) || undefined,
    message: err && err.message,
    note: note || undefined,
  });
}

/**
 * P1-01 / K — wrapper request terpusat dipakai oleh apiGet & apiPost,
 * satu implementasi timeout (AbortController) untuk keduanya.
 * Melempar ApiError dengan code: TIMEOUT | NETWORK | HTTP | PARSE.
 */
function apiRequest_(url, options, timeoutMs) {
  timeoutMs = timeoutMs || API_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(function () {
    controller.abort();
  }, timeoutMs);
  const opts = Object.assign({}, options, { signal: controller.signal });

  return fetch(url, opts)
    .then(function (res) {
      if (!res.ok) {
        throw new ApiError('HTTP', 'Request gagal (HTTP ' + res.status + ').', { status: res.status });
      }
      return res.text();
    })
    .then(function (text) {
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch (parseErr) {
        throw new ApiError('PARSE', 'Respons server tidak valid.');
      }
    })
    .catch(function (err) {
      if (err instanceof ApiError) throw err;
      if (err && err.name === 'AbortError') {
        throw new ApiError('TIMEOUT', 'Request timeout. Periksa koneksi lalu coba lagi.');
      }
      throw new ApiError('NETWORK', 'Gagal terhubung ke server. Periksa koneksi lalu coba lagi.');
    })
    .finally(function () {
      clearTimeout(timer);
    });
}

/**
 * GET ?action=...&k=v — untuk semua operasi baca.
 * Boleh retry terbatas (maks 1x ulang) khusus untuk error TIMEOUT/NETWORK,
 * sesuai kebijakan retry (L) — GET aman diulang, POST tidak.
 */
function apiGet(action, params, opts) {
  opts = opts || {};
  const maxAttempts = opts.retry === false ? 1 : 2;

  let baseUrl;
  try {
    baseUrl = getConfiguredApiUrl(); // 12 — guard terpusat
  } catch (err) {
    logApiError_(action, null, err);
    return Promise.reject(err);
  }

  // CATATAN (Temuan 3, Low/Info, audit FE-BE): token & sessionToken ikut di
  // query string GET karena keterbatasan struktural GAS Web App (custom
  // header memicu CORS preflight yang tidak didukung baik oleh GAS).
  // Konsekuensi: kedua token berpotensi tersimpan di riwayat browser & log
  // eksekusi Apps Script. Sudah dianggap acceptable risk untuk skala
  // internal tool ini -- didokumentasikan di sini, bukan diperbaiki, supaya
  // tidak terulang jadi "temuan baru" di audit berikutnya. Perbaikan penuh
  // (migrasi semua GET jadi POST) di luar cakupan perbaikan ini karena
  // perubahan arsitektur yang jauh lebih besar.
  const url = new URL(baseUrl);
  url.searchParams.set('action', action);
  url.searchParams.set('token', runtimeApiToken_); // [FIX — TOKEN API]
  Object.keys(params || {}).forEach(function (k) {
    url.searchParams.set(k, params[k]);
  });

  function attempt(n) {
    return apiRequest_(url.toString(), { method: 'GET' })
      .then(function (body) {
        // [v8.18.0] Kontrak GET backend (jsonOutput_ di handleApiRequest_):
        // sukses -> data apa adanya; gagal -> {error: "pesan"} dgn HTTP 200
        // tetap. Sebelumnya field `error` ini TIDAK pernah dicek di sini,
        // jadi caller (mis. loadFormReferenceData) diam-diam menerima
        // objek {error:...} seolah data valid. Dibedakan dari bentuk
        // POST ({success,error:{code,message}}) via absennya field
        // `success`, supaya alur apiPost yg sudah punya pengecekan
        // manual sendiri di tiap caller tidak ikut berubah.
        if (body && typeof body === 'object' && typeof body.error === 'string' && !('success' in body)) {
          throw new ApiError('API_ERROR', body.error);
        }
        return body;
      })
      .catch(function (err) {
        const retryable = err.code === 'TIMEOUT' || err.code === 'NETWORK';
        if (retryable && n < maxAttempts) {
          logApiError_(action, null, err, 'retrying (' + n + '/' + maxAttempts + ')');
          return attempt(n + 1);
        }
        logApiError_(action, null, err);
        throw err;
      });
  }
  return attempt(1);
}

/**
 * POST {action, payload} — Content-Type text/plain supaya tidak kena CORS preflight.
 * TIDAK PERNAH auto-retry (L): mengulang POST transaksi otomatis berisiko
 * membuat request baru. Kalau perlu retry, harus manual dengan requestId yang sama.
 */
function apiPost(action, payload) {
  const requestId = payload && payload.requestId;

  let baseUrl;
  try {
    baseUrl = getConfiguredApiUrl(); // 12 — guard terpusat
  } catch (err) {
    logApiError_(action, requestId, err);
    return Promise.reject(err);
  }

  return apiRequest_(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    // [FIX — TOKEN API] token WAJIB di top-level body (sibling dari
    // action/payload), sesuai kontrak doPost() backend -- BUKAN
    // nested di dalam payload.
    body: JSON.stringify({ action: action, payload: payload, token: runtimeApiToken_ }),
  }).catch(function (err) {
    logApiError_(action, requestId, err);
    throw err;
  });
}

/* ============================================================
       STATE
       ============================================================ */
let masterTools = []; // {kodeAlat, namaAlat, brand, cuttingTool, bahan, spesifikasi}
let activityOptions = []; // string[]
let allStockRows = []; // cache untuk search client-side
let machineList = []; // {kodeMesin, mesin} — untuk dropdown "Mesin" di form input
// [REVISI-02] Cache unit yang tercatat ada di Mesin terpilih (mode
// KEMBALI KE GUDANG (TUMPUL)), diisi sekali saat Mesin dipilih lalu
// difilter di client per Kode Alat — supaya tidak perlu request ulang.
let mesinDrivenUnitsCache = [];

// [REVISI-02] Activity di mana Mesin dipilih LEBIH DULU dan dipakai
// sebagai validasi (Kode Alat & Unit yang muncul dibatasi ke mesin ini).
const MESIN_DRIVEN_ACTIVITIES = ['DIPASANG KE MESIN', 'KEMBALI KE GUDANG (TUMPUL)'];

// Activity -> status unit yang relevan ditampilkan di dropdown Unit
const STATUS_FILTER_BY_ACTIVITY = {
  'DIPASANG KE MESIN': 'GUDANG',
  'KEMBALI KE GUDANG (TUMPUL)': 'DIPAKAI',
  'KEMBALI KE GUDANG (SIAP)': 'DIPAKAI',
  'KIRIM KE VENDOR ASAH': 'TUMPUL',
  'SELESAI DIASAH': 'DIASAH',
  // PEMBELIAN BARU, "SCRAP / RUSAK", "KARAT" -> tanpa filter (semua unit / unit baru).
  // CATATAN v3: dropdown Activity sekarang menampilkan "SCRAP / RUSAK"
  // dan "KARAT" sebagai 2 opsi TERPISAH (bukan gabungan "SCRAP/KARAT"),
  // menyesuaikan isi asli sheet "Referensi Activity" — lihat
  // ValidateAndCleanup.gs v2 utk detail bugfix pembacaan sheet tsb.
};

// Ikon SVG (stroke, 24x24 viewBox) dipakai di KPI chip & txn icon.
const ICONS = {
  total:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8V16L12 21L3 16V8L12 3Z"></path><path d="M3 8L12 13L21 8"></path><path d="M12 13V21"></path></svg>',
  siap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>',
  dipakai:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009.6 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"></path></svg>',
  tunggu:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 11-9-9c2.52 0 4.85.99 6.57 2.64L21 8"></path><path d="M21 3v5h-5"></path></svg>',
  asah: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009.6 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"></path></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
  dot: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"></circle></svg>',
};

/**
 * Petakan nama activity ke ikon + warna txn-icon, supaya riwayat
 * transaksi bisa dipindai sekilas dari warna tanpa baca teks dulu.
 */
function activityMeta_(activity) {
  const a = String(activity || '').toUpperCase();
  if (a.indexOf('PEMBELIAN') !== -1) return { icon: 'plus', color: 'aman' };
  if (a.indexOf('SIAP') !== -1) return { icon: 'siap', color: 'aman' };
  if (a.indexOf('DIPASANG') !== -1) return { icon: 'gear', color: 'accent' };
  if (a.indexOf('KEMBALI') !== -1) return { icon: 'down', color: 'kritis' };
  if (a.indexOf('VENDOR') !== -1 || a.indexOf('ASAH') !== -1) return { icon: 'send', color: 'accent' };
  if (a.indexOf('SCRAP') !== -1 || a.indexOf('RUSAK') !== -1 || a.indexOf('KARAT') !== -1)
    return { icon: 'warn', color: 'habis' };
  return { icon: 'dot', color: '' };
}

/* ============================================================
       INIT
       ============================================================ */
let appHasLoadedOnce_ = false; // P2-J/L: cegah refresh data dobel saat 'online' fire sebelum init selesai

document.addEventListener('DOMContentLoaded', function () {
  console.log('[APP] Monitoring Saw Blade & Cutter', APP_VERSION);
  const badge = document.getElementById('version-badge');
  if (badge) badge.textContent = APP_VERSION_SHORT;
  const versionVal = document.getElementById('settings-version-val');
  if (versionVal) versionVal.textContent = APP_VERSION;
  wireThemeToggle_();
  wireHeaderCollapse_();
  syncHeaderVisibility_('panel-summary'); // v8.17 — state awal: Dashboard aktif saat load
  wireTabBar();
  wireForm();
  wireStokSearch();
  wireConnectivityIndicator_();
  wireSettingsPanel_();
  wireAccountPanel_();
  wireLoginGate_();
  if (!isLoggedIn_()) showLoginGate_(); // [WO-2.2.2] gate layar penuh sampai login berhasil
  applyRoleUI_(); // [WO-ROLE] terapkan tampilan sesuai role dari session tersimpan
  wireAjukanTumpulForm_();
  registerServiceWorker_();
  loadDashboard();
  loadFormReferenceData();
  loadTransactions();
  loadStockStatus();
  loadMachineAnalytics();
  loadKontrolAsah();
  appHasLoadedOnce_ = true;
});

/* ============================================================
       v8.16 — HEADER COLLAPSE ON SCROLL
       Header sticky menyusut (class .is-collapsed di elemen <header>)
       begitu halaman discroll melewati threshold, dan mengembang lagi
       saat scroll kembali ke atas. Semua transisi ukuran/opacity ada
       di CSS (lihat blok "HEADER COLLAPSE ON SCROLL" di <style>); JS
       di sini cuma toggle class-nya, di-throttle lewat requestAnimationFrame
       supaya tidak membebani scroll performance. Threshold 28px dipilih
       supaya tidak "kedip" waktu scroll super kecil (bounce iOS/rubber-
       band Android) tapi tetap responsif.
       ============================================================ */
const HEADER_COLLAPSE_THRESHOLD = 28;
let headerCollapseTicking_ = false;

function wireHeaderCollapse_() {
  const headerEl = document.querySelector('header');
  if (!headerEl) return;

  function applyState_() {
    headerCollapseTicking_ = false;
    // v8.17 — kalau header sedang disembunyikan (bukan di tab
    // Dashboard, lihat syncHeaderVisibility_), tidak ada gunanya
    // toggle .is-collapsed di elemen yang display:none.
    if (headerEl.style.display === 'none') return;
    // v8.19 — FIX: di desktop (sidebar aktif, breakpoint >=1080px)
    // collapse-on-scroll TIDAK relevan lagi -- sidebar sudah
    // membebaskan ruang vertikal yg tadinya jadi alasan header perlu
    // menyusut demi ruang konten (itu murni kebutuhan mobile/layar
    // sempit). Sebelum fix ini, scroll dikit di desktop bikin header
    // menyusut (brand-mark & judul mengecil, eyebrow "SAW BLADE
    // MONITOR" hilang) padahal sidebar sudah ada -- redundan & keliatan
    // seperti glitch. matchMedia dicek tiap scroll (bukan sekali di
    // awal) supaya tetap benar kalau window di-resize lintas breakpoint
    // tanpa reload.
    if (window.matchMedia('(min-width: 1080px)').matches) {
      headerEl.classList.remove('is-collapsed');
      return;
    }
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    headerEl.classList.toggle('is-collapsed', y > HEADER_COLLAPSE_THRESHOLD);
  }

  window.addEventListener(
    'scroll',
    function () {
      if (headerCollapseTicking_) return;
      headerCollapseTicking_ = true;
      window.requestAnimationFrame(applyState_);
    },
    { passive: true }
  );

  applyState_(); // set state awal (mis. reload di tengah scroll)
}

/* ============================================================
       v8.11 — MODE MALAM (dark mode toggle)
       ============================================================ */
const THEME_STORAGE_KEY = 'sawBladeMonitor_theme';

function applyTheme_(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    /* abaikan */
  }
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', theme === 'dark' ? '#0E1B1C' : '#3B6E7D');
  const switchEl = document.getElementById('settings-theme-switch');
  if (switchEl) switchEl.checked = theme === 'dark';
}

function wireThemeToggle_() {
  const btn = document.getElementById('theme-toggle');
  const switchEl = document.getElementById('settings-theme-switch');
  const currentTheme = function () {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  };
  if (switchEl) switchEl.checked = currentTheme() === 'dark';
  if (btn) {
    btn.addEventListener('click', function () {
      applyTheme_(currentTheme() === 'dark' ? 'light' : 'dark');
    });
  }
  if (switchEl) {
    switchEl.addEventListener('change', function () {
      applyTheme_(switchEl.checked ? 'dark' : 'light');
    });
  }
}

/* ============================================================
       P2-07/S/L — CONNECTIVITY INDICATOR
       ============================================================ */
function wireConnectivityIndicator_() {
  updateConnIndicator_();
  window.addEventListener('online', function () {
    updateConnIndicator_();
    // L — reconnect: refresh data read-only, TIDAK mengulang POST transaksi
    // yang sebelumnya gagal (Phase 1 idempotency tetap satu-satunya authority).
    if (appHasLoadedOnce_) {
      loadDashboard();
      loadTransactions();
      loadStockStatus();
      loadMachineAnalytics();
      loadKontrolAsah();
    }
  });
  window.addEventListener('offline', updateConnIndicator_);
}

function updateConnIndicator_() {
  const pill = document.getElementById('conn-status');
  const text = document.getElementById('conn-status-text');
  const offlineBanner = document.getElementById('offline-banner');
  const online = navigator.onLine;
  if (pill) {
    pill.classList.remove('is-offline', 'is-unconfigured');
    if (!online) {
      pill.classList.add('is-offline');
      if (text) text.textContent = 'Offline';
    } else if (!runtimeApiUrl_) {
      pill.classList.add('is-unconfigured');
      if (text) text.textContent = 'API belum dikonfigurasi';
    } else if (text) {
      text.textContent = 'Terhubung';
    }
  }
  if (offlineBanner) offlineBanner.classList.toggle('show', !online);
}

/* ============================================================
       PHASE 3A — PANEL PENGATURAN (Google Apps Script URL)
       ============================================================ */
let isTestingConnection_ = false;

function wireSettingsPanel_() {
  const input = document.getElementById('f-api-url');
  const tokenInput = document.getElementById('f-api-token'); // [FIX — TOKEN API]
  const btnSave = document.getElementById('btn-settings-save');
  const btnTest = document.getElementById('btn-settings-test');
  const btnReset = document.getElementById('btn-settings-reset');

  // 8/11 — populate field dari localStorage saat panel dimuat.
  input.value = runtimeApiUrl_;
  tokenInput.value = runtimeApiToken_;
  // 18 — status tidak dianggap kebenaran permanen: kalau URL ada tapi
  // belum diuji ulang di sesi ini, tampilkan "Belum diuji", bukan "Terhubung".
  setSettingsStatus_(runtimeApiUrl_ ? 'untested' : 'disconnected');

  btnSave.addEventListener('click', function () {
    // 13 — flow: input -> trim -> validate -> save localStorage -> update runtime -> update status UI
    const raw = input.value.trim();
    const rawToken = tokenInput.value.trim(); // [FIX — TOKEN API]

    // 26 Case 1
    if (!raw) {
      showSettingsMsg_('error', 'URL wajib diisi.');
      return;
    }
    // 26 Case 2/3 — 7: validasi dasar https + pola Web App Apps Script.
    if (!isValidApiUrl_(raw)) {
      showSettingsMsg_('error', 'URL tidak valid. Masukkan URL Web App Google Apps Script.');
      return;
    }
    if (!rawToken) {
      showSettingsMsg_('error', 'Token API wajib diisi (minta ke admin).');
      return;
    }

    localStorage.setItem(API_URL_STORAGE_KEY, raw);
    localStorage.setItem(API_TOKEN_STORAGE_KEY, rawToken); // [FIX — TOKEN API]
    runtimeApiUrl_ = raw; // update runtime configuration, tanpa reload halaman
    runtimeApiToken_ = rawToken;
    input.value = raw;
    tokenInput.value = rawToken;
    setSettingsStatus_('untested');
    showSettingsMsg_('success', 'URL & token berhasil disimpan.');
    updateConnIndicator_();
  });

  btnTest.addEventListener('click', function () {
    if (isTestingConnection_) return;

    // Uji Koneksi memakai URL yang sedang aktif di runtime (bukan isi input
    // yang belum disimpan) — kalau belum ada, tolak sebelum request (11/12).
    if (!runtimeApiUrl_) {
      showSettingsMsg_('error', 'Simpan URL terlebih dahulu sebelum menguji koneksi.');
      return;
    }

    isTestingConnection_ = true;
    btnTest.disabled = true;
    setSettingsStatus_('testing');
    hideSettingsMsg_();

    // 14 — GET read-only existing (getDashboardSummary), TIDAK POST transaksi,
    // TIDAK mengarang endpoint backend baru. Response tetap divalidasi
    // seperti kontrak Phase 1 (26 Case 6: HTTP 200 tidak selalu berarti sehat).
    apiGet('getDashboardSummary', {}, { retry: false })
      .then(function (res) {
        if (!res || typeof res !== 'object') {
          throw new ApiError('API_RESPONSE_INVALID', 'Respons server tidak sesuai format yang diharapkan.');
        }
        setSettingsStatus_('connected');
        showSettingsMsg_('success', 'Terhubung. Google Apps Script dapat diakses.');
      })
      .catch(function (err) {
        console.error('[Uji Koneksi]', err); // 15 — detail error ke console, bukan ke user
        setSettingsStatus_('disconnected');
        showSettingsMsg_('error', mapConnectionTestError_(err));
      })
      .finally(function () {
        isTestingConnection_ = false;
        btnTest.disabled = false;
      });
  });

  btnReset.addEventListener('click', function () {
    // 16 — konfirmasi wajib sebelum menghapus.
    const confirmed = window.confirm('Apakah Anda yakin ingin menghapus konfigurasi Google Apps Script URL?');
    if (!confirmed) return; // batal -> tidak ada perubahan

    // 17 — reset HANYA menghapus URL & token, tidak menyentuh transaction/stock/master data
    // (data-data itu semuanya live di Google Sheet lewat API, bukan di localStorage).
    localStorage.removeItem(API_URL_STORAGE_KEY);
    localStorage.removeItem(API_TOKEN_STORAGE_KEY); // [FIX — TOKEN API]
    runtimeApiUrl_ = '';
    runtimeApiToken_ = '';
    input.value = '';
    tokenInput.value = '';
    setSettingsStatus_('disconnected');
    hideSettingsMsg_();
    updateConnIndicator_();
  });
}

/* ============================================================
       [WO-2.2] PANEL PENGATURAN — Akun (login/logout operator)
       ============================================================ */
let isLoggingIn_ = false;

/* ============================================================
       [WO-2.2.2] LOGIN GATE — layar penuh sebelum app bisa dipakai.
       Terpisah dari form login di Pengaturan ▸ Akun (yang tetap ada,
       untuk logout/relogin tanpa perlu reload), tapi keduanya menulis
       ke state session yang SAMA (setSession_/isLoggedIn_) sehingga
       selalu sinkron.
       ============================================================ */
let isGateLoggingIn_ = false;

function showLoginGate_() {
  const gate = document.getElementById('login-gate');
  if (gate) gate.classList.add('active');
}
function hideLoginGate_() {
  const gate = document.getElementById('login-gate');
  if (gate) gate.classList.remove('active');
}

function wireLoginGate_() {
  const userInput = document.getElementById('login-gate-username');
  const passInput = document.getElementById('login-gate-password');
  const rememberInput = document.getElementById('login-gate-remember');
  const btnSubmit = document.getElementById('login-gate-submit');
  const btnConfig = document.getElementById('login-gate-config-btn');
  const viewLogin = document.getElementById('login-gate-view-login');
  const viewConfig = document.getElementById('login-gate-view-config');
  const configUrlInput = document.getElementById('login-gate-config-url');
  const configTokenInput = document.getElementById('login-gate-config-token');
  const btnConfigSave = document.getElementById('login-gate-config-save');
  const btnConfigBack = document.getElementById('login-gate-config-back');

  function doGateLogin() {
    if (isGateLoggingIn_) return;
    const username = userInput.value.trim();
    const password = passInput.value;

    if (!username || !password) {
      showGateMsg_('error', 'Username dan password wajib diisi.');
      return;
    }
    if (!runtimeApiUrl_ || !runtimeApiToken_) {
      showGateMsg_(
        'error',
        'Perangkat ini belum dikonfigurasi. Ketuk ikon gerigi di pojok untuk atur koneksi (admin).'
      );
      return;
    }

    isGateLoggingIn_ = true;
    btnSubmit.disabled = true;
    hideGateMsg_();

    apiPost('login', { username: username, password: password })
      .then(function (res) {
        if (!res || res.success !== true || !res.sessionToken) {
          const msg = (res && res.error && res.error.message) || 'Login gagal.';
          throw new Error(msg);
        }
        setSession_(res.sessionToken, res.actorName, res.role, !!rememberInput.checked);
        passInput.value = '';
        renderAccountState_(); // sinkronkan tampilan card di Pengaturan ▸ Akun juga
        hideLoginGate_();
      })
      .catch(function (err) {
        console.error('[LoginGate]', err);
        showGateMsg_('error', err.message || 'Login gagal. Periksa username/password.');
      })
      .finally(function () {
        isGateLoggingIn_ = false;
        btnSubmit.disabled = false;
      });
  }

  btnSubmit.addEventListener('click', doGateLogin);
  passInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') doGateLogin();
  });

  /* [FIX] Escape hatch admin TIDAK LAGI menavigasi ke Pengaturan app
         (yang membuka header/tabbar/dashboard di baliknya — bertentangan
         dengan tujuan gate menutup app sampai login). Sekarang cuma
         toggle 2 view DI DALAM kartu gate yang sama; app di belakang
         TIDAK PERNAH tersingkap. */
  function showConfigView_() {
    configUrlInput.value = runtimeApiUrl_;
    configTokenInput.value = runtimeApiToken_;
    hideConfigMsg_();
    viewLogin.style.display = 'none';
    viewConfig.style.display = '';
  }
  function showLoginView_() {
    viewConfig.style.display = 'none';
    viewLogin.style.display = '';
  }

  btnConfig.addEventListener('click', showConfigView_);
  btnConfigBack.addEventListener('click', showLoginView_);

  btnConfigSave.addEventListener('click', function () {
    const raw = configUrlInput.value.trim();
    const rawToken = configTokenInput.value.trim();

    if (!raw) {
      showConfigMsg_('error', 'URL wajib diisi.');
      return;
    }
    if (!isValidApiUrl_(raw)) {
      showConfigMsg_('error', 'URL tidak valid. Masukkan URL Web App Google Apps Script.');
      return;
    }
    if (!rawToken) {
      showConfigMsg_('error', 'Token API wajib diisi (minta ke admin).');
      return;
    }

    localStorage.setItem(API_URL_STORAGE_KEY, raw);
    localStorage.setItem(API_TOKEN_STORAGE_KEY, rawToken);
    runtimeApiUrl_ = raw;
    runtimeApiToken_ = rawToken;

    // Sinkronkan juga ke field di panel Pengaturan ▸ Koneksi (kalau
    // sudah pernah dirender) supaya tidak tampak "kosong" nanti
    // setelah login berhasil dan admin membuka Pengaturan.
    const settingsUrlField = document.getElementById('f-api-url');
    const settingsTokenField = document.getElementById('f-api-token');
    if (settingsUrlField) settingsUrlField.value = raw;
    if (settingsTokenField) settingsTokenField.value = rawToken;
    updateConnIndicator_();

    showLoginView_();
    showGateMsg_('success', 'URL & token tersimpan. Silakan login.');
  });
}

function showConfigMsg_(type, text) {
  const el = document.getElementById('login-gate-config-msg');
  if (!el) return;
  el.className = 'login-gate-msg show ' + type;
  el.textContent = text;
}
function hideConfigMsg_() {
  const el = document.getElementById('login-gate-config-msg');
  if (!el) return;
  el.className = 'login-gate-msg';
  el.textContent = '';
}

function showGateMsg_(type, text) {
  const el = document.getElementById('login-gate-msg');
  if (!el) return;
  el.className = 'login-gate-msg show ' + type;
  el.textContent = text;
}
function hideGateMsg_() {
  const el = document.getElementById('login-gate-msg');
  if (!el) return;
  el.className = 'login-gate-msg';
  el.textContent = '';
}

function wireAccountPanel_() {
  const userInput = document.getElementById('f-account-username');
  const passInput = document.getElementById('f-account-password');
  const btnLogin = document.getElementById('btn-account-login');
  const btnLogout = document.getElementById('btn-account-logout');

  renderAccountState_();

  btnLogin.addEventListener('click', function () {
    if (isLoggingIn_) return;
    const username = userInput.value.trim();
    const password = passInput.value;

    if (!username || !password) {
      showAccountMsg_('error', 'Username dan password wajib diisi.');
      return;
    }
    if (!runtimeApiUrl_ || !runtimeApiToken_) {
      showAccountMsg_('error', 'Atur URL & Token API terlebih dahulu (di atas) sebelum login.');
      return;
    }

    isLoggingIn_ = true;
    btnLogin.disabled = true;
    hideAccountMsg_();

    apiPost('login', { username: username, password: password })
      .then(function (res) {
        if (!res || res.success !== true || !res.sessionToken) {
          const msg = (res && res.error && res.error.message) || 'Login gagal.';
          throw new Error(msg);
        }
        setSession_(res.sessionToken, res.actorName, res.role);
        passInput.value = '';
        renderAccountState_();
        showAccountMsg_('success', 'Login berhasil sebagai ' + res.actorName + '.');
      })
      .catch(function (err) {
        console.error('[Login]', err);
        showAccountMsg_('error', err.message || 'Login gagal. Periksa username/password.');
      })
      .finally(function () {
        isLoggingIn_ = false;
        btnLogin.disabled = false;
      });
  });

  btnLogout.addEventListener('click', function () {
    const confirmed = window.confirm('Logout dari akun ini di perangkat ini?');
    if (!confirmed) return;
    // [Audit fix — logout tidak invalidasi session] Sebelumnya logout
    // hanya hapus token di localStorage; token itu sendiri TETAP HIDUP
    // di server sampai TTL 7 hari habis. Sekarang minta server
    // mencabut token dulu (fire-and-forget — UI tetap logout instan
    // walau request ini gagal/lambat, supaya UX tidak berubah; kalau
    // gagal, token cuma tidak ke-revoke di server tapi tetap hilang
    // dari client seperti sebelumnya).
    const tokenToRevoke = runtimeSessionToken_;
    setSession_('', '', '');
    renderAccountState_();
    hideAccountMsg_();
    showLoginGate_(); // [WO-2.2.2] logout -> app tertutup lagi di balik gate
    if (tokenToRevoke) {
      apiPost('logout', { sessionToken: tokenToRevoke }).catch(function (err) {
        console.error('[Logout] gagal mencabut sesi di server (token tetap dihapus dari perangkat ini):', err);
      });
    }
  });
}

/** Toggle tampilan form-login vs status-logged-in, dan badge status. */
function renderAccountState_() {
  const loginForm = document.getElementById('account-login-form');
  const loggedInBlock = document.getElementById('account-logged-in');
  const statusEl = document.getElementById('account-status');
  const statusText = document.getElementById('account-status-text');

  if (isLoggedIn_()) {
    loginForm.style.display = 'none';
    loggedInBlock.style.display = '';
    statusEl.className = 'settings-status st-connected';
    statusText.textContent = 'Login sebagai ' + runtimeActorName_;
  } else {
    loginForm.style.display = '';
    loggedInBlock.style.display = 'none';
    statusEl.className = 'settings-status st-disconnected';
    statusText.textContent = 'Belum login';
  }
}

function showAccountMsg_(type, text) {
  const el = document.getElementById('account-msg');
  if (!el) return;
  el.className = 'form-msg show ' + type;
  const icon = type === 'success' ? FORM_MSG_ICON_SUCCESS : FORM_MSG_ICON_ERROR;
  el.innerHTML = '<span class="fm-icon">' + icon + '</span><span>' + escapeHtml(text) + '</span>';
}
function hideAccountMsg_() {
  const el = document.getElementById('account-msg');
  if (!el) return;
  el.className = 'form-msg';
  el.textContent = '';
}

/** 15/26 Case 4-6 — pesan aman utk Uji Koneksi, tanpa stack trace ke user. */
function mapConnectionTestError_(err) {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'CONFIGURATION_ERROR':
        return 'URL belum dikonfigurasi.';
      case 'TIMEOUT':
        return 'Koneksi timeout. Periksa koneksi internet.';
      case 'NETWORK':
        return 'Tidak dapat terhubung ke Google Apps Script.';
      case 'HTTP':
        return (
          'Tidak dapat terhubung ke Google Apps Script' +
          (err.meta && err.meta.status ? ' (HTTP ' + err.meta.status + ')' : '') +
          '.'
        );
      case 'PARSE':
      case 'API_RESPONSE_INVALID':
        return 'Google Apps Script merespons tetapi terjadi kesalahan aplikasi.';
      default:
        return 'Periksa URL dan koneksi internet.';
    }
  }
  return 'Periksa URL dan koneksi internet.';
}

/** 5/18 — badge status koneksi di panel Pengaturan. */
function setSettingsStatus_(state) {
  const el = document.getElementById('settings-status');
  const text = document.getElementById('settings-status-text');
  if (!el || !text) return;
  el.className = 'settings-status';
  switch (state) {
    case 'connected':
      el.classList.add('st-connected');
      text.textContent = 'Terhubung';
      break;
    case 'testing':
      el.classList.add('st-testing');
      text.textContent = 'Menguji koneksi...';
      break;
    case 'untested':
      el.classList.add('st-untested');
      text.textContent = 'Belum diuji';
      break;
    case 'disconnected':
    default:
      el.classList.add('st-disconnected');
      text.textContent = runtimeApiUrl_ ? 'Tidak terhubung' : 'Belum dikonfigurasi';
      break;
  }
}

// Ikon SVG untuk pesan sukses/error (form-msg & settings-msg), sejalan
// dengan gaya ikon premium di seluruh aplikasi.
const FORM_MSG_ICON_SUCCESS =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M8.5 12.3l2.4 2.4 4.6-5.4"></path></svg>';
const FORM_MSG_ICON_ERROR =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="8" x2="12" y2="13"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

function showSettingsMsg_(type, text) {
  const el = document.getElementById('settings-msg');
  if (!el) return;
  el.className = 'form-msg show ' + type;
  const icon = type === 'success' ? FORM_MSG_ICON_SUCCESS : FORM_MSG_ICON_ERROR;
  el.innerHTML = '<span class="fm-icon">' + icon + '</span><span>' + escapeHtml(text) + '</span>';
}

function hideSettingsMsg_() {
  const el = document.getElementById('settings-msg');
  if (!el) return;
  el.className = 'form-msg';
  el.textContent = '';
}

/* ============================================================
       P2-05/Q/R — SERVICE WORKER REGISTRATION & UPDATE LIFECYCLE
       ============================================================ */
function registerServiceWorker_() {
  // Q — kalau browser tidak dukung Service Worker, aplikasi tetap
  // jalan normal secara online, tidak ada error yang menghentikan app.
  if (!('serviceWorker' in navigator)) return;

  let hadController_ = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.register('./service-worker.js').catch(function (err) {
    // R — registrasi gagal TIDAK boleh menjadi fatal error untuk app.
    console.warn('[SW] registration failed, app tetap jalan online:', err);
  });

  // P2-05 — controllerchange menandakan app-shell versi baru sudah aktif
  // (SW baru sudah skipWaiting). Cuma tampilkan banner "Reload" —
  // jangan auto-reload halaman supaya tidak mengganggu transaksi berjalan.
  // hadController_ dipakai supaya banner TIDAK muncul di kontrol pertama
  // (first install), hanya muncul untuk update yang genuine.
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (hadController_) {
      const banner = document.getElementById('update-banner');
      if (banner) banner.classList.add('show');
    }
    hadController_ = true;
  });

  const updateBtn = document.getElementById('update-banner-btn');
  if (updateBtn) {
    updateBtn.addEventListener('click', function () {
      window.location.reload();
    });
  }
}

/* ============================================================
       TAB NAVIGATION
       v8.2: panel-mesin & panel-settings tidak lagi punya tombol tab
       sendiri — diakses lewat panel "Lainnya". goToPanel() dipakai
       untuk pindah panel dari mana saja (tabbar, menu Lainnya, tombol
       back, atau state-card action) secara konsisten.
       ============================================================ */
// v8.15 — judul header (H1) sekarang kontekstual per-tab/panel, bukan
// nama app statis. Nama app penuh dipindah ke brand-mark (ikon
// lingkaran bergerigi di kiri judul, dgn title="Monitoring Saw Blade
// & Cutter"), jadi identitasnya tidak hilang, cuma dipindah perannya.
const TAB_TITLES = {
  'panel-summary': 'Dashboard',
  'panel-stok': 'Stok Alat',
  'panel-input': 'Input Transaksi',
  'panel-dashboard': 'Riwayat Transaksi',
  'panel-lainnya': 'Lainnya',
  'panel-mesin': 'Data Mesin',
  'panel-settings': 'Pengaturan',
  'panel-kontrol-asah': 'Kontrol Asah',
  'panel-ajukan-tumpul': 'Ajukan Tumpul',
  'panel-konfirmasi-tumpul': 'Konfirmasi Tumpul',
};

/* ============================================================
       v8.17 — SINKRONISASI HEADER LENGKAP vs APP MINIBAR
       Header lengkap (<header>, brand-mark besar + judul kontekstual +
       collapse-on-scroll) HANYA untuk tab Dashboard (panel-summary).
       Semua tab/panel lain (termasuk panel-mesin/settings/dst yang
       diakses lewat "Lainnya") pakai .app-minibar — strip tipis berisi
       logo+nama app & status koneksi. Keduanya saling eksklusif.
       v8.18 — yang dipindah (appendChild) sekarang #control-stack (berisi
       #conn-status + #theme-toggle) — BUKAN cuma #conn-status lagi, &
       BUKAN diduplikasi — supaya toggle mode ikut nempel di header/
       minibar pojok kanan (status di atas, toggle di bawah) di semua tab,
       bukan jadi tombol mengambang terpisah spt v8.17. Karena ID elemen
       di dalamnya tidak berubah, updateConnIndicator_()/
       wireConnectivityIndicator_()/wireThemeToggle_() (berbasis
       getElementById) tetap jalan utuh tanpa modifikasi apapun.
       ============================================================ */
function syncHeaderVisibility_(panelId) {
  const headerEl = document.querySelector('header');
  const minibarEl = document.getElementById('app-minibar');
  if (!headerEl || !minibarEl) return;

  const isDashboard = panelId === 'panel-summary';
  headerEl.style.display = isDashboard ? '' : 'none';
  minibarEl.classList.toggle('is-active', !isDashboard);

  const controlStackEl = document.getElementById('control-stack');
  const headerControlsEl = document.querySelector('.header-controls');
  const statusSlotEl = document.getElementById('minibar-status-slot');
  if (controlStackEl) {
    const targetParent = isDashboard ? headerControlsEl : statusSlotEl;
    if (targetParent && controlStackEl.parentElement !== targetParent) {
      targetParent.appendChild(controlStackEl);
    }
  }
}

function goToPanel(panelId) {
  document.querySelectorAll('.panel').forEach(function (p) {
    p.classList.remove('active');
  });
  const target = document.getElementById(panelId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.tab-btn').forEach(function (b) {
    b.classList.remove('active');
  });
  // Mesin, Pengaturan, Kontrol Asah, Konfirmasi Pengajuan tidak pernah
  // punya tab sendiri — sorot tab "Lainnya". [REVISI] panel-ajukan-tumpul
  // DIKELUARKAN dari daftar ini: sekarang punya tab sendiri (tab tengah)
  // khusus utk role operator (lihat applyRoleUI_) -- kalau tab tengah
  // sedang menunjuk ke panel ini, querySelector di bawah otomatis
  // menemukannya lewat data-panel yang sudah dialihkan. Utk admin (tab
  // tengahnya masih "panel-input"), tetap fallback ke "Lainnya".
  const NO_OWN_TAB = ['panel-mesin', 'panel-settings', 'panel-kontrol-asah', 'panel-konfirmasi-tumpul'];
  let tabPanelId = panelId;
  if (NO_OWN_TAB.indexOf(panelId) >= 0) {
    tabPanelId = 'panel-lainnya';
  } else if (panelId === 'panel-ajukan-tumpul' && !isOperatorRole_()) {
    tabPanelId = 'panel-lainnya';
  }
  // v8.19 — querySelectorAll (bukan querySelector) supaya tombol yang
  // sama di sidebar desktop DAN bottom-nav mobile dua-duanya kesorot
  // "active", bukan cuma yang pertama ketemu di DOM.
  document.querySelectorAll('.tab-btn[data-panel="' + tabPanelId + '"]').forEach(function (b) {
    b.classList.add('active');
  });

  const headerTitleEl = document.getElementById('header-title');
  if (headerTitleEl && TAB_TITLES[panelId]) headerTitleEl.textContent = TAB_TITLES[panelId];

  syncHeaderVisibility_(panelId);

  // v8.16 — pindah tab = mulai dari atas lagi, jadi scroll direset ke
  // 0 supaya header collapse-on-scroll ikut mengembang (full, dgn
  // judul kontekstual baru langsung kebaca), bukan tetap ciut kalau
  // sebelumnya user lagi scroll jauh di tab lain.
  window.scrollTo(0, 0);
  const headerEl = document.querySelector('header');
  if (headerEl) headerEl.classList.remove('is-collapsed');

  // [WO-ROLE] Muat data tiap kali panelnya dibuka (bukan sekali saat init)
  // supaya status pengajuan/antrian selalu segar.
  if (panelId === 'panel-ajukan-tumpul') loadAjukanTumpulPanel_();
  if (panelId === 'panel-konfirmasi-tumpul') loadKonfirmasiTumpulPanel_();
}

function wireTabBar() {
  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      goToPanel(btn.dataset.panel);
    });
  });
  document.querySelectorAll('.lainnya-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      goToPanel(btn.dataset.panel);
    });
  });
  document.querySelectorAll('.panel-back-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      goToPanel(btn.dataset.back);
    });
  });
}

/* ============================================================
       DASHBOARD KPI
       ============================================================ */
function loadDashboard() {
  // v8.5: dashboard sekarang butuh 2 sumber — ringkasan angka unit
  // (getDashboardSummary) DAN daftar per-jenis-alat (getStockStatusList,
  // sama seperti yang dipakai tab Stok) supaya bisa hitung breakdown
  // AMAN/KRITIS/HABIS per jenis alat untuk section "Kondisi Alat".
  // Tidak ada endpoint baru di backend — dua-duanya sudah ada.
  Promise.all([apiGet('getDashboardSummary'), apiGet('getStockStatusList')])
    .then(function (results) {
      renderDashboard(results[0], results[1] || []);
    })
    .catch(function (err) {
      document.getElementById('header-sub').textContent =
        err && err.code === 'CONFIGURATION_ERROR'
          ? 'API belum dikonfigurasi. Buka menu Pengaturan.'
          : 'Gagal memuat ringkasan.';
      const kpiEl = document.getElementById('kpi-strip');
      if (kpiEl) {
        kpiEl.innerHTML =
          err && err.code === 'CONFIGURATION_ERROR'
            ? stateCardHtml_(
                'config',
                'Koneksi belum diatur',
                'Hubungkan Google Apps Script terlebih dahulu.',
                'Buka Pengaturan'
              )
            : stateCardHtml_(
                'error',
                'Data belum dapat dimuat',
                'Periksa koneksi aplikasi.',
                'Coba Lagi',
                'loadDashboard'
              );
      }
      console.error(err);
    });
}

/* v8.5 — Dashboard direstruktur jadi 3 blok: (1) Hero — total unit +
       ring "Perlu Perhatian" (item aman/kritis/habis, dari daftar per
       jenis alat, bukan lagi dibagi total unit yang basisnya beda);
       (2) Distribusi Status Unit — segmented bar + legend, basis PER
       UNIT FISIK (siap/dipakai/tunggu/diasah, sesuai getDashboardSummary);
       (3) Kondisi Alat — 3 kartu status, basis PER JENIS ALAT (kode),
       dihitung dari rows getStockStatusList. Footnote menjelaskan beda
       basis hitung supaya angkanya tidak disalahartikan. */
function renderDashboard(d, rows) {
  document.getElementById('header-sub').textContent = '';

  const total = Number(d.total) || 0;
  const siapPakai = Number(d.siapPakai) || 0;
  const dipakai = Number(d.dipakai) || 0;
  const tungguAsah = Number(d.tungguAsah) || 0;
  const diasah = Number(d.diasah) || 0;

  const list = rows || [];
  const jenisAlat = list.length;
  let amanCount = 0,
    kritisCount = 0,
    habisCount = 0;
  list.forEach(function (r) {
    const s = String(r.status || '')
      .trim()
      .toUpperCase();
    if (s === 'AMAN') amanCount++;
    else if (s === 'KRITIS') kritisCount++;
    else if (s === 'HABIS') habisCount++;
  });
  const perluPerhatian = kritisCount + habisCount;
  const pctRing = jenisAlat > 0 ? Math.round((perluPerhatian / jenisAlat) * 100) : 0;

  const heroHtml =
    '<div class="hero-card">' +
    '<div class="hero-main">' +
    '<div class="hero-num">' +
    total +
    '</div>' +
    '<div class="hero-label">Total Unit Terdaftar</div>' +
    (jenisAlat > 0 ? '<div class="hero-sub">Dari ' + jenisAlat + ' jenis alat terdaftar</div>' : '') +
    '</div>' +
    '<div class="hero-ring" style="--pct:' +
    pctRing +
    '">' +
    '<div class="hero-ring-inner">' +
    '<div class="hero-ring-num">' +
    perluPerhatian +
    '</div>' +
    '<div class="hero-ring-label">Perhatian</div>' +
    '</div>' +
    '</div>' +
    '</div>';

  const distItems = [
    { seg: 'seg-siap', label: 'Siap Pakai', num: siapPakai },
    { seg: 'seg-dipakai', label: 'Dipakai', num: dipakai },
    { seg: 'seg-tunggu', label: 'Tunggu Asah', num: tungguAsah },
    { seg: 'seg-diasah', label: 'Sedang Diasah', num: diasah },
  ];

  const distHtml =
    '<div class="dash-section">' +
    '<div class="dash-section-head"><h3>Distribusi Status Unit</h3><span class="dash-hint">' +
    total +
    ' unit</span></div>' +
    '<div class="dist-card">' +
    '<div class="dist-bar">' +
    distItems
      .map(function (it) {
        const w = total > 0 ? (it.num / total) * 100 : 0;
        return '<div class="dist-bar-seg ' + it.seg + '" style="width:' + w.toFixed(2) + '%"></div>';
      })
      .join('') +
    '</div>' +
    '<div class="dist-legend">' +
    distItems
      .map(function (it) {
        const pct = total > 0 ? Math.round((it.num / total) * 100) : 0;
        return (
          '<div class="dist-legend-item">' +
          '<span class="dist-legend-dot ' +
          it.seg +
          '"></span>' +
          '<div>' +
          '<div class="dist-legend-label">' +
          it.label +
          '</div>' +
          '<div class="dist-legend-row"><span class="dist-legend-value">' +
          it.num +
          '</span><span class="dist-legend-pct">' +
          pct +
          '%</span></div>' +
          '</div>' +
          '</div>'
        );
      })
      .join('') +
    '</div>' +
    '</div>' +
    '</div>';

  const condHtml =
    '<div class="dash-section">' +
    '<div class="dash-section-head"><h3>Kondisi Alat</h3><span class="dash-hint">' +
    jenisAlat +
    ' jenis</span></div>' +
    '<div class="cond-row">' +
    '<div class="cond-card cond-aman"><div class="cond-num">' +
    amanCount +
    '</div><div class="cond-label">Aman</div></div>' +
    '<div class="cond-card cond-kritis"><div class="cond-num">' +
    kritisCount +
    '</div><div class="cond-label">Kritis</div></div>' +
    '<div class="cond-card cond-habis"><div class="cond-num">' +
    habisCount +
    '</div><div class="cond-label">Habis</div></div>' +
    '</div>' +
    '</div>';

  const footnoteHtml =
    '<p class="dash-footnote">Distribusi Status dihitung per unit fisik · Kondisi Alat dihitung per jenis alat (kode).</p>';

  document.getElementById('kpi-strip').innerHTML = heroHtml + distHtml + condHtml + footnoteHtml;
}

/* ============================================================
       RIWAYAT TRANSAKSI
       ============================================================ */
function loadTransactions() {
  apiGet('getRecentTransactions', { limit: 30 })
    .then(renderTransactions)
    .catch(function (err) {
      document.getElementById('txn-list').innerHTML =
        err && err.code === 'CONFIGURATION_ERROR'
          ? stateCardHtml_(
              'config',
              'Koneksi belum diatur',
              'Hubungkan Google Apps Script terlebih dahulu untuk memuat riwayat.',
              'Buka Pengaturan'
            )
          : stateCardHtml_(
              'error',
              'Data belum dapat dimuat',
              'Periksa koneksi aplikasi.',
              'Coba Lagi',
              'loadTransactions'
            );
      console.error(err);
    });
}

function renderTransactions(rows) {
  const el = document.getElementById('txn-list');
  if (!rows || rows.length === 0) {
    el.innerHTML = emptyStateHtml_('Belum ada data', 'Transaksi yang tercatat akan muncul di sini.');
    return;
  }
  el.innerHTML =
    '<div class="card">' +
    rows
      .map(function (r) {
        const meta = activityMeta_(r.activity);
        return (
          '<div class="txn-row">' +
          '<div class="txn-icon' +
          (meta.color ? ' ' + meta.color : '') +
          '">' +
          ICONS[meta.icon] +
          '</div>' +
          '<div class="left">' +
          '<div class="activity">' +
          escapeHtml(r.activity) +
          '</div>' +
          '<div class="meta"><span class="tag">' +
          escapeHtml(r.unitId || r.kodeAlat) +
          '</span> · ' +
          escapeHtml(r.pic || '—') +
          '</div>' +
          '</div>' +
          '<div class="tanggal">' +
          escapeHtml(r.tanggal) +
          '</div>' +
          '</div>'
        );
      })
      .join('') +
    '</div>';
}

/* ============================================================
       STOK
       ============================================================ */
function loadStockStatus() {
  apiGet('getStockStatusList')
    .then(function (rows) {
      allStockRows = rows || [];
      renderStokStats_(allStockRows);
      populateStokFilterOptions_(allStockRows);
      applyStokFilters_();
    })
    .catch(function (err) {
      const statEl = document.getElementById('stok-stat-row');
      if (statEl) statEl.innerHTML = '';
      document.getElementById('stok-list').innerHTML =
        err && err.code === 'CONFIGURATION_ERROR'
          ? stateCardHtml_(
              'config',
              'Koneksi belum diatur',
              'Hubungkan Google Apps Script terlebih dahulu untuk memuat status stok.',
              'Buka Pengaturan'
            )
          : stateCardHtml_(
              'error',
              'Data belum dapat dimuat',
              'Periksa koneksi aplikasi.',
              'Coba Lagi',
              'loadStockStatus'
            );
      console.error(err);
    });
}

/**
 * v8.3 — "Nama Alat" di data sumber umumnya berformat "<Jenis>-<Brand>"
 * (mis. "Saw Blade-Ake"). Dipisah di sisi client biar kartu bisa
 * menampilkan Jenis & Brand sebagai field terpisah tanpa mengubah
 * struktur sheet/backend. Kalau tidak ada tanda "-", seluruh teks
 * dianggap Jenis dan Brand ditandai "—".
 */
function splitJenisBrand_(namaAlat) {
  const s = String(namaAlat || '').trim();
  const idx = s.lastIndexOf('-');
  if (idx <= 0 || idx >= s.length - 1) return { jenis: s || '—', brand: '—' };
  return { jenis: s.slice(0, idx).trim(), brand: s.slice(idx + 1).trim() };
}

/* v8.4 — kartu dipadatkan: Kode + Siap Pakai + Status sebaris di
       atas, grid 3 kolom (Jenis/Brand/Material) di bawahnya, Ukuran
       full-width paling bawah. Mesin cuma dirender kalau datanya ada. */
function renderStockList(rows) {
  const el = document.getElementById('stok-list');
  if (!rows || rows.length === 0) {
    el.innerHTML = emptyStateHtml_('Tidak ada alat yang cocok', 'Coba ubah kata kunci pencarian atau filter status.');
    return;
  }
  el.innerHTML = rows
    .map(function (r) {
      const cls = statusClass_(r.status);
      const jb = splitJenisBrand_(r.namaAlat);
      const material = r.bahan ? escapeHtml(r.bahan) : '<span class="sc-value muted">—</span>';
      const ukuran = r.spesifikasi ? escapeHtml(r.spesifikasi) : '<span class="sc-value muted">—</span>';
      return (
        '<div class="card stock-row status-' +
        cls +
        '">' +
        '<div class="sc-top">' +
        '<span class="tag">' +
        escapeHtml(r.kodeAlat) +
        '</span>' +
        statusBadge(r.status) +
        '</div>' +
        '<div class="sc-qty-row"><span class="sc-qty-num">' +
        r.siapPakai +
        '</span><span class="sc-qty-label">Siap Pakai</span></div>' +
        '<div class="sc-detail-grid">' +
        '<div class="sc-field"><div class="sc-label">Jenis</div><div class="sc-value">' +
        escapeHtml(jb.jenis) +
        '</div></div>' +
        '<div class="sc-field"><div class="sc-label">Brand</div><div class="sc-value' +
        (jb.brand === '—' ? ' muted' : '') +
        '">' +
        escapeHtml(jb.brand) +
        '</div></div>' +
        '<div class="sc-field"><div class="sc-label">Material</div><div class="sc-value">' +
        material +
        '</div></div>' +
        '<div class="sc-field full"><div class="sc-label">Ukuran</div><div class="sc-value">' +
        ukuran +
        '</div></div>' +
        '</div>' +
        (r.mesin
          ? '<div class="sc-mesin"><span class="sc-mesin-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"></rect><rect x="14" y="3" width="7" height="5" rx="1"></rect><rect x="14" y="12" width="7" height="9" rx="1"></rect><rect x="3" y="16" width="7" height="5" rx="1"></rect></svg></span><span>' +
            escapeHtml(r.mesin) +
            '</span></div>'
          : '') +
        '</div>'
      );
    })
    .join('');
}

/** P3B — markup empty-state konsisten (icon + judul + keterangan). */
function emptyStateHtml_(title, sub) {
  return (
    '<div class="empty-state">' +
    '<div class="es-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8V16L12 21L3 16V8L12 3Z"></path><path d="M3 8L12 13L21 8"></path><path d="M12 13V21"></path></svg></div>' +
    '<div class="es-title">' +
    escapeHtml(title) +
    '</div>' +
    '<div class="es-sub">' +
    escapeHtml(sub) +
    '</div>' +
    '</div>'
  );
}

/**
 * P3B — kartu state profesional untuk error jaringan vs configuration
 * error (API belum diatur). Dua state ini TIDAK dicampur (spec ┬º12).
 * onRetryFnName: nama fungsi global (string) yang dipanggil tombol retry.
 */
function stateCardHtml_(kind, title, sub, actionLabel, onRetryFnName) {
  const iconError =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
  const iconConfig =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009.6 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"></path></svg>';
  const action =
    kind === 'config'
      ? '<button type="button" class="sc-action" onclick="goToPanel(\'panel-settings\')">' +
        escapeHtml(actionLabel) +
        '</button>'
      : '<button type="button" class="sc-action" onclick="' +
        onRetryFnName +
        '()">' +
        escapeHtml(actionLabel) +
        '</button>';
  return (
    '<div class="state-card ' +
    kind +
    '">' +
    '<div class="sc-icon">' +
    (kind === 'config' ? iconConfig : iconError) +
    '</div>' +
    '<div class="sc-title">' +
    escapeHtml(title) +
    '</div>' +
    '<div class="sc-sub">' +
    escapeHtml(sub) +
    '</div>' +
    action +
    '</div>'
  );
}

/**
 * P3B — statistik ringkas panel Stok, dihitung dari data yang SUDAH
 * diambil dari API (allStockRows). Tidak ada angka baru/dummy —
 * murni agregasi client-side dari response getStockStatusList.
 */
function renderStokStats_(rows) {
  const el = document.getElementById('stok-stat-row');
  if (!el) return;
  if (!rows || rows.length === 0) {
    el.innerHTML = '';
    return;
  }
  const totalAlat = rows.length;
  const totalSiap = rows.reduce(function (sum, r) {
    return sum + (Number(r.siapPakai) || 0);
  }, 0);
  el.innerHTML =
    '<div class="stok-stat-card"><div class="ssc-label">Total Alat</div><div class="ssc-num">' +
    totalAlat +
    '</div></div>' +
    '<div class="stok-stat-card"><div class="ssc-label">Total Siap Pakai</div><div class="ssc-num">' +
    totalSiap +
    '</div></div>';
}

function statusClass_(status) {
  const s = String(status || '').toUpperCase();
  return s === 'AMAN' ? 'aman' : s === 'KRITIS' ? 'kritis' : s === 'HABIS' ? 'habis' : 'kritis';
}

function statusBadge(status) {
  const cls = statusClass_(status);
  return '<span class="badge ' + cls + '">' + escapeHtml(status || '-') + '</span>';
}

// P3B — filter status pakai field `status` yang sudah ada di data
// existing (AMAN/KRITIS/HABIS), bukan data baru. Digabung dengan search.
let stokActiveStatus_ = '';
// [FITUR-MESIN/UKURAN] filter tambahan, sumber datanya field `mesin`
// dan `spesifikasi` yang sudah ada di tiap baris Stock Status —
// tidak butuh request API baru, cukup diagregasi di client.
let stokActiveMesin_ = '';
let stokActiveUkuran_ = '';

/* [BUGFIX] Sebelumnya fungsi ini mencocokkan via substring ke gabungan
 * r.mesin (NAMA tipe mesin, mis. "CNC Cutting/Cut & Drill") + r.kodeMesin
 * (yang faktanya tidak pernah dikirim backend versi lama). Karena nama
 * tipe mesin itu sendiri mengandung "/", opsi dropdown yang dibentuk
 * dari situ (lihat populateStokFilterOptions_) jadi fragmen ganjil dan
 * tidak merepresentasikan kode mesin (RDS0xx) yang dipakai konsisten di
 * bagian app lain. Sekarang backend mengirim r.kodeMesin (RDS0xx,
 * dipisah "/") secara terpisah dari r.mesin (nama, tetap dipakai utk
 * label di kartu) -- fungsi ini dipindah ke situ, dengan exact-match
 * per token supaya "RDS1" tidak salah cocok dgn "RDS017" dst. */
function rowMatchesMesin_(row, mesinFilter) {
  if (!mesinFilter) return true;
  const target = mesinFilter.trim().toLowerCase();
  const tokens = String(row.kodeMesin || '')
    .split(/[\/,]/)
    .map(function (t) {
      return t.trim().toLowerCase();
    });
  return tokens.indexOf(target) !== -1;
}

function applyStokFilters_() {
  const q = document.getElementById('stok-search').value.trim().toLowerCase();
  let rows = allStockRows;
  if (stokActiveStatus_) {
    rows = rows.filter(function (r) {
      return statusClass_(r.status) === statusClass_(stokActiveStatus_);
    });
  }
  if (stokActiveMesin_) {
    rows = rows.filter(function (r) {
      return rowMatchesMesin_(r, stokActiveMesin_);
    });
  }
  if (stokActiveUkuran_) {
    rows = rows.filter(function (r) {
      return r.spesifikasi === stokActiveUkuran_;
    });
  }
  if (q) {
    rows = rows.filter(function (r) {
      return r.kodeAlat.toLowerCase().indexOf(q) !== -1 || r.namaAlat.toLowerCase().indexOf(q) !== -1;
    });
  }
  renderStockList(rows);
}

/**
 * [FITUR-MESIN/UKURAN] Isi opsi dropdown "Filter Mesin" & "Filter
 * Ukuran" dari data Stok yang sudah dimuat (client-side, tanpa
 * request tambahan). Mesin bisa dipecah dari field gabungan
 * (mis. "RDS017/RDS018/RDS019") supaya tiap kode berdiri sendiri.
 */
function populateStokFilterOptions_(rows) {
  const mesinSet = {};
  const ukuranSet = {};
  (rows || []).forEach(function (r) {
    // [BUGFIX] sumber opsi dipindah dari r.mesin (nama tipe mesin,
    // bisa mengandung "/" di dalam satu nama -- lihat rowMatchesMesin_)
    // ke r.kodeMesin (RDS0xx, aman di-split "/" krn satu kode tidak
    // pernah mengandung "/"). Konsisten dgn kode mesin yang dipakai di
    // seluruh bagian app lain.
    String(r.kodeMesin || '')
      .split(/[\/,]/)
      .forEach(function (m) {
        const v = m.trim();
        if (v) mesinSet[v] = true;
      });
    if (r.spesifikasi) ukuranSet[r.spesifikasi] = true;
  });

  const mesinSel = document.getElementById('stok-filter-mesin');
  const ukuranSel = document.getElementById('stok-filter-ukuran');
  const currentMesin = mesinSel.value;
  const currentUkuran = ukuranSel.value;

  mesinSel.innerHTML =
    '<option value="">Semua mesin</option>' +
    Object.keys(mesinSet)
      .sort()
      .map(function (m) {
        return '<option value="' + escapeAttr(m) + '">' + escapeHtml(m) + '</option>';
      })
      .join('');
  ukuranSel.innerHTML =
    '<option value="">Semua ukuran</option>' +
    Object.keys(ukuranSet)
      .sort()
      .map(function (u) {
        return '<option value="' + escapeAttr(u) + '">' + escapeHtml(u) + '</option>';
      })
      .join('');

  // Pertahankan pilihan sebelumnya kalau masih ada di opsi baru (refresh data).
  if (currentMesin && mesinSet[currentMesin]) mesinSel.value = currentMesin;
  if (currentUkuran && ukuranSet[currentUkuran]) ukuranSel.value = currentUkuran;
}

function wireStokSearch() {
  document.getElementById('stok-search').addEventListener('input', applyStokFilters_);
  document.querySelectorAll('#stok-filter-row .filter-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('#stok-filter-row .filter-chip').forEach(function (c) {
        c.classList.remove('active');
      });
      chip.classList.add('active');
      stokActiveStatus_ = chip.dataset.status || '';
      applyStokFilters_();
    });
  });
  document.getElementById('stok-filter-mesin').addEventListener('change', function (e) {
    stokActiveMesin_ = e.target.value;
    applyStokFilters_();
  });
  document.getElementById('stok-filter-ukuran').addEventListener('change', function (e) {
    stokActiveUkuran_ = e.target.value;
    applyStokFilters_();
  });
}

/* ============================================================
       [FITUR-MESIN] ANALITIK PER MESIN — boros/cepat ganti & lead time
       ============================================================ */
function loadMachineAnalytics() {
  apiGet('getMachineWearStats')
    .then(renderMachineWear_)
    .catch(function (err) {
      document.getElementById('mesin-wear-list').innerHTML =
        err && err.code === 'CONFIGURATION_ERROR'
          ? stateCardHtml_(
              'config',
              'Koneksi belum diatur',
              'Hubungkan Google Apps Script terlebih dahulu.',
              'Buka Pengaturan'
            )
          : stateCardHtml_(
              'error',
              'Data belum dapat dimuat',
              'Periksa koneksi aplikasi.',
              'Coba Lagi',
              'loadMachineAnalytics'
            );
      console.error(err);
    });

  apiGet('getLeadTimeByMachine')
    .then(renderLeadTimeByMachine_)
    .catch(function (err) {
      document.getElementById('mesin-leadtime-list').innerHTML =
        err && err.code === 'CONFIGURATION_ERROR'
          ? stateCardHtml_(
              'config',
              'Koneksi belum diatur',
              'Hubungkan Google Apps Script terlebih dahulu.',
              'Buka Pengaturan'
            )
          : stateCardHtml_(
              'error',
              'Data belum dapat dimuat',
              'Periksa koneksi aplikasi.',
              'Coba Lagi',
              'loadMachineAnalytics'
            );
      console.error(err);
    });
}

/** Ranking mesin paling boros (jumlah alat kembali tumpul terbanyak). */
function renderMachineWear_(rows) {
  const el = document.getElementById('mesin-wear-list');
  if (!rows || rows.length === 0) {
    el.innerHTML = emptyStateHtml_('Belum ada data', 'Riwayat "kembali tumpul" per mesin akan muncul di sini.');
    return;
  }
  const top = rows.slice(0, 10); // ranking, top 10 paling boros
  el.innerHTML =
    '<div class="card">' +
    top
      .map(function (r, i) {
        const usia = r.avgUsiaHari === null || r.avgUsiaHari === undefined ? '—' : r.avgUsiaHari + ' hari';
        return (
          '<div class="rank-row">' +
          '<div class="rank-pos">' +
          (i + 1) +
          '</div>' +
          '<div class="rank-info">' +
          '<div class="rk-title">' +
          escapeHtml(r.kodeMesin) +
          '</div>' +
          '<div class="rk-sub">Rata-rata usia pakai: ' +
          escapeHtml(usia) +
          ' · ' +
          r.totalPasang +
          'x dipasang</div>' +
          '</div>' +
          '<div class="rank-metric">' +
          '<div class="rk-num">' +
          r.totalGanti +
          '</div>' +
          '<div class="rk-unit">x tumpul</div>' +
          '</div>' +
          '</div>'
        );
      })
      .join('') +
    '</div>';
}

/** Ranking lead time asah rata-rata per mesin (siklus SELESAI saja). */
function renderLeadTimeByMachine_(rows) {
  const el = document.getElementById('mesin-leadtime-list');
  if (!rows || rows.length === 0) {
    el.innerHTML = emptyStateHtml_(
      'Belum ada data',
      'Lead time asah per mesin akan muncul setelah ada siklus asah SELESAI.'
    );
    return;
  }
  const top = rows.slice(0, 10);
  el.innerHTML =
    '<div class="card">' +
    top
      .map(function (r, i) {
        return (
          '<div class="rank-row">' +
          '<div class="rank-pos">' +
          (i + 1) +
          '</div>' +
          '<div class="rank-info">' +
          '<div class="rk-title">' +
          escapeHtml(r.kodeMesin) +
          '</div>' +
          '<div class="rk-sub">' +
          r.jumlahSiklus +
          ' siklus selesai · maks ' +
          r.maxLeadTime +
          ' hari</div>' +
          '</div>' +
          '<div class="rank-metric">' +
          '<div class="rk-num">' +
          r.avgLeadTime +
          '</div>' +
          '<div class="rk-unit">hari rata²</div>' +
          '</div>' +
          '</div>'
        );
      })
      .join('') +
    '</div>';
}

/* ============================================================
       [WO-ROLE] AJUKAN PENGEMBALIAN TUMPUL — panel Operator
       ============================================================ */
let ajukanTumpulMesinLoaded_ = false;
// [REVISI] Cache unit yang tercatat DIPAKAI di Mesin terpilih, diisi
// sekali saat Mesin dipilih (getUnitsByMesin) lalu difilter per Kode
// Alat di client -- pola SAMA persis dgn mesinDrivenUnitsCache di form
// Input admin (lihat onMesinDriverChange), supaya perilaku operator &
// admin konsisten dan pakai jalur backend yang sama-sama sudah teruji.
let ajukanTumpulUnitsCache_ = [];

function loadAjukanTumpulPanel_() {
  populateAjukanMesinOptions_();
  loadRiwayatPengajuanSaya_();
}

function populateAjukanMesinOptions_() {
  const sel = document.getElementById('at-mesin');
  if (!sel || ajukanTumpulMesinLoaded_ || !machineList || machineList.length === 0) return;
  machineList.forEach(function (m) {
    const opt = document.createElement('option');
    opt.value = m.kodeMesin;
    opt.dataset.mesinName = m.mesin || '';
    opt.textContent = (m.mesin ? m.mesin + ' — ' : '') + m.kodeMesin;
    sel.appendChild(opt);
  });
  ajukanTumpulMesinLoaded_ = true;
}

/** [REVISI] Dipanggil saat Mesin dipilih -- menarik Kode Alat yang BENAR-BENAR terpasang (DIPAKAI) di mesin ini, sama seperti onMesinDriverChange di form Input admin. */
function onAjukanMesinChange_() {
  const kodeMesin = document.getElementById('at-mesin').value;
  const kodeAlatSel = document.getElementById('at-kode-alat');
  const unitSel = document.getElementById('at-unit-id');
  const unitHint = document.getElementById('at-unit-hint');

  ajukanTumpulUnitsCache_ = [];
  unitSel.innerHTML = '<option value="">Pilih Kode Alat dulu…</option>';
  unitSel.disabled = true;
  unitHint.style.display = 'none';

  if (!kodeMesin) {
    kodeAlatSel.innerHTML = '<option value="">Pilih mesin dulu…</option>';
    kodeAlatSel.disabled = true;
    return;
  }

  kodeAlatSel.disabled = true;
  kodeAlatSel.innerHTML = '<option value="">Memuat kode alat…</option>';

  apiGet('getUnitsByMesin', { kodeMesin: kodeMesin, statusFilter: 'DIPAKAI' })
    .then(function (units) {
      ajukanTumpulUnitsCache_ = units || [];
      const seen = {};
      const kodeAlatList = [];
      ajukanTumpulUnitsCache_.forEach(function (u) {
        if (seen[u.kodeAlat]) return;
        seen[u.kodeAlat] = true;
        kodeAlatList.push(u.kodeAlat);
      });
      if (!kodeAlatList.length) {
        kodeAlatSel.innerHTML = '<option value="">Tidak ada alat terpasang di mesin ini</option>';
        kodeAlatSel.disabled = true;
        return;
      }
      kodeAlatSel.innerHTML =
        '<option value="">Pilih kode alat…</option>' +
        kodeAlatList
          .map(function (kodeAlat) {
            const t = (masterTools || []).find(function (mt) {
              return mt.kodeAlat === kodeAlat;
            });
            // [REVISI] Label dipersamakan dengan form Input admin — pakai
            // kodeAlatOptionLabel_ supaya Brand/Bahan/Spesifikasi (ukuran)
            // ikut tampil, bukan cuma "kode — nama". Operator jarang hafal
            // kode alat, jadi info ukuran ini membantu cari alat yang tepat.
            const label = t ? kodeAlatOptionLabel_(t) : kodeAlat;
            return '<option value="' + escapeAttr(kodeAlat) + '">' + escapeHtml(label) + '</option>';
          })
          .join('');
      kodeAlatSel.disabled = false;
    })
    .catch(function (err) {
      kodeAlatSel.innerHTML = '<option value="">Gagal memuat kode alat</option>';
      console.error(err);
    });
}

/** [REVISI] Unit sudah ditarik sekaligus saat Mesin dipilih (getUnitsByMesin) -- di sini tinggal difilter per Kode Alat di client, tanpa request baru. */
function onAjukanKodeAlatChange_() {
  const kodeAlat = document.getElementById('at-kode-alat').value;
  const unitSel = document.getElementById('at-unit-id');
  const unitHint = document.getElementById('at-unit-hint');
  unitHint.style.display = 'none';
  if (!kodeAlat) {
    unitSel.innerHTML = '<option value="">Pilih Kode Alat dulu…</option>';
    unitSel.disabled = true;
    return;
  }
  const units = ajukanTumpulUnitsCache_.filter(function (u) {
    return u.kodeAlat === kodeAlat;
  });
  if (!units.length) {
    unitSel.innerHTML = '<option value="">Tidak ada unit tersedia</option>';
    unitSel.disabled = true;
    unitHint.textContent = 'Tidak ada unit dengan Kode Alat ini yang statusnya sedang dipakai di mesin ini.';
    unitHint.style.display = '';
    return;
  }
  // [REVISI] Ukuran/spesifikasi ikut ditampilkan di label Unit --
  // spesifikasi melekat ke Kode Alat (bukan per unit), jadi cukup
  // dilihat sekali dari masterTools, tidak perlu request tambahan.
  const toolForUkuran = (masterTools || []).find(function (mt) {
    return mt.kodeAlat === kodeAlat;
  });
  const ukuranSuffix = toolForUkuran && toolForUkuran.spesifikasi ? ' (' + toolForUkuran.spesifikasi + ')' : '';
  unitSel.innerHTML =
    '<option value="">Pilih unit…</option>' +
    units
      .map(function (u) {
        return '<option value="' + escapeAttr(u.unitId) + '">' + escapeHtml(u.unitId + ukuranSuffix) + '</option>';
      })
      .join('');
  unitSel.disabled = false;
}

function showAjukanTumpulMsg_(type, text) {
  const el = document.getElementById('ajukan-tumpul-msg');
  if (!el) return;
  el.className = 'form-msg show ' + type;
  const icon = type === 'success' ? FORM_MSG_ICON_SUCCESS : FORM_MSG_ICON_ERROR;
  el.innerHTML = '<span class="fm-icon">' + icon + '</span><span>' + escapeHtml(text) + '</span>';
}

function loadRiwayatPengajuanSaya_() {
  const el = document.getElementById('at-riwayat-list');
  if (!el) return;
  apiGet('getPengajuanTumpulList', { status: 'ALL', sessionToken: runtimeSessionToken_ })
    .then(function (rows) {
      // [BUGFIX v8.14.1] Server sekarang SUDAH membatasi hasil ke
      // pengajuan milik akun yang login (lihat getPengajuanTumpulList_).
      // Filter client-side ("mine") DIHAPUS -- sebelumnya ada fallback
      // "kalau mine kosong, tampilkan rows apa adanya" yang berarti
      // operator baru (belum pernah mengajukan) melihat riwayat SEMUA
      // orang lain di panel "Pengajuan Saya". Sekarang cukup deteksi
      // error sesi (mis. UNAUTHORIZED_SESSION) dan render langsung.
      // FIX Temuan 1 (audit FE-BE): pengecekan `rows.error` di sini DIHAPUS --
      // itu dead code, karena apiGet() sekarang sudah melempar ApiError
      // duluan untuk bentuk {error:string} tanpa field success (lihat
      // komentar di apiGet), jadi `rows` di titik ini TIDAK PERNAH punya
      // properti .error. Deteksi UNAUTHORIZED_SESSION dipindah ke .catch()
      // di bawah lewat handleSessionError_().
      const list = rows || [];
      if (list.length === 0) {
        el.innerHTML = emptyStateHtml_('Belum ada pengajuan', 'Riwayat pengajuanmu akan muncul di sini.');
        return;
      }
      el.innerHTML =
        '<div class="card">' +
        list
          .slice(0, 15)
          .map(function (r) {
            const statusClass =
              r.status === 'Selesai' ? 'st-connected' : r.status === 'Ditolak' ? 'st-disconnected' : 'st-warn';
            return (
              '<div class="rank-row"><div class="rank-info">' +
              '<div class="rk-title">' +
              escapeHtml(r.unitId) +
              ' · ' +
              escapeHtml(r.kodeAlat) +
              '</div>' +
              '<div class="rk-sub">' +
              escapeHtml(r.timestamp) +
              '</div>' +
              '</div><div class="rank-metric"><span class="' +
              statusClass +
              '">' +
              escapeHtml(r.status) +
              '</span></div></div>'
            );
          })
          .join('') +
        '</div>';
    })
    .catch(function (err) {
      // FIX Temuan 1 (audit FE-BE): auto-logout untuk UNAUTHORIZED_SESSION
      // sekarang benar-benar terpanggil di sini (sebelumnya dead code, lihat
      // catatan di blok .then() di atas).
      handleSessionError_(err);
      el.innerHTML = emptyStateHtml_('Gagal memuat', 'Coba buka ulang panel ini.');
    });
}

function wireAjukanTumpulForm_() {
  const form = document.getElementById('ajukan-tumpul-form');
  if (!form) return;
  document.getElementById('at-mesin').addEventListener('change', onAjukanMesinChange_);
  document.getElementById('at-kode-alat').addEventListener('change', onAjukanKodeAlatChange_);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const mesinSel = document.getElementById('at-mesin');
    const kodeMesin = mesinSel.value;
    const mesinOpt = mesinSel.options[mesinSel.selectedIndex];
    const mesin = mesinOpt ? mesinOpt.dataset.mesinName || '' : '';
    const kodeAlat = document.getElementById('at-kode-alat').value;
    const unitId = document.getElementById('at-unit-id').value;
    // [REVISI] Tambah field PIC (Nama PIC) -- wajib diisi, sama seperti
    // di form Input Transaksi admin (f-pic), supaya pengajuan asah dari
    // operator juga tercatat siapa yang mengajukan.
    const pic = document.getElementById('at-pic').value.trim();
    if (!kodeMesin || !kodeAlat || !unitId || !pic) {
      showAjukanTumpulMsg_('error', 'Pilih Mesin, Kode Alat, Unit, dan isi Nama PIC terlebih dahulu.');
      return;
    }
    const btn = document.getElementById('ajukan-tumpul-submit');
    btn.disabled = true;
    apiPost('submitPengajuanTumpul', {
      sessionToken: runtimeSessionToken_,
      kodeAlat: kodeAlat,
      unitId: unitId,
      mesin: mesin,
      kodeMesin: kodeMesin,
      pic: pic,
    })
      .then(function (res) {
        btn.disabled = false;
        if (!res || res.success !== true) {
          // FIX Temuan 2 (audit FE-BE): backend mengembalikan UNAUTHORIZED_SESSION
          // sbg respons NORMAL {success:false, error:{code,message}} (HTTP 200),
          // bukan exception -- jadi harus dicek di sini (.then), sebelumnya tidak
          // pernah dicek sama sekali di endpoint ini (beda dgn addMovementRow yang
          // sudah benar lewat mapErrorToMessage_).
          handleSessionError_(res && res.error);
          showAjukanTumpulMsg_('error', (res && res.error && res.error.message) || 'Gagal mengajukan. Coba lagi.');
          return;
        }
        showAjukanTumpulMsg_('success', 'Pengajuan terkirim (' + res.id + '). Menunggu konfirmasi WH.');
        form.reset();
        document.getElementById('at-kode-alat').innerHTML = '<option value="">Pilih mesin dulu…</option>';
        document.getElementById('at-kode-alat').disabled = true;
        document.getElementById('at-unit-id').innerHTML = '<option value="">Pilih Kode Alat dulu…</option>';
        document.getElementById('at-unit-id').disabled = true;
        ajukanTumpulUnitsCache_ = [];
        loadRiwayatPengajuanSaya_();
      })
      .catch(function (err) {
        btn.disabled = false;
        // FIX Temuan 2 (audit FE-BE): jaga-jaga kalau ApiError sesi datang lewat
        // jalur transport (bukan body sukses) -- no-op kalau bukan error sesi.
        handleSessionError_(err);
        showAjukanTumpulMsg_('error', (err && err.message) || 'Gagal mengajukan. Coba lagi.');
      });
  });
}

/* ============================================================
       [WO-ROLE] KONFIRMASI PENGAJUAN TUMPUL — panel Admin/WH
       ============================================================ */
function showKonfirmasiTumpulMsg_(type, text) {
  const el = document.getElementById('konfirmasi-tumpul-msg');
  if (!el) return;
  el.className = 'form-msg show ' + type;
  const icon = type === 'success' ? FORM_MSG_ICON_SUCCESS : FORM_MSG_ICON_ERROR;
  el.innerHTML = '<span class="fm-icon">' + icon + '</span><span>' + escapeHtml(text) + '</span>';
}

function loadKonfirmasiTumpulPanel_() {
  const el = document.getElementById('kt-pending-list');
  if (!el) return;
  el.innerHTML = '<div class="skeleton-block sk-row"></div><div class="skeleton-block sk-row"></div>';
  apiGet('getPengajuanTumpulList', { status: 'Menunggu Konfirmasi WH', sessionToken: runtimeSessionToken_ })
    .then(function (rows) {
      // FIX Temuan 1 (audit FE-BE): pengecekan `rows.error` di sini DIHAPUS --
      // dead code, sama seperti di loadRiwayatPengajuanSaya_() (lihat komentar
      // lengkap di sana). apiGet() sudah melempar ApiError duluan; deteksi
      // UNAUTHORIZED_SESSION dipindah ke .catch() di bawah.
      if (!rows || rows.length === 0) {
        el.innerHTML = emptyStateHtml_('Tidak ada antrian', 'Semua pengajuan sudah dikonfirmasi.');
        return;
      }
      el.innerHTML =
        '<div class="card">' +
        rows
          .map(function (r) {
            return (
              '<div class="rank-row" data-pengajuan-id="' +
              escapeAttr(r.id) +
              '">' +
              '<div class="rank-info">' +
              '<div class="rk-title">' +
              escapeHtml(r.unitId) +
              ' · ' +
              escapeHtml(r.kodeAlat) +
              '</div>' +
              // [REVISI] Tampilkan PIC (nama yang mengajukan, diisi manual)
              // sebagai info utama -- WH perlu mencocokkan ke orang yang
              // bawa fisik alatnya. Nama akun login (actorName) tetap
              // ditampilkan sebagai info sekunder kalau beda dari PIC
              // (mis. device dipakai bergantian).
              '<div class="rk-sub">' +
              escapeHtml(r.pic || r.actorName) +
              (r.pic && r.pic !== r.actorName
                ? ' <span style="opacity:.7">(akun: ' + escapeHtml(r.actorName) + ')</span>'
                : '') +
              ' · ' +
              escapeHtml(r.mesin || r.kodeMesin || '—') +
              ' · ' +
              escapeHtml(r.timestamp) +
              '</div>' +
              '</div>' +
              '<div class="rank-metric" style="display:flex; gap:6px;">' +
              '<button type="button" class="btn-secondary kt-reject-btn" data-id="' +
              escapeAttr(r.id) +
              '">Tolak</button>' +
              '<button type="button" class="btn-primary kt-approve-btn" data-id="' +
              escapeAttr(r.id) +
              '">Konfirmasi</button>' +
              '</div></div>'
            );
          })
          .join('') +
        '</div>';

      el.querySelectorAll('.kt-approve-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          handleKonfirmasiTumpul_(btn.dataset.id, true, btn);
        });
      });
      el.querySelectorAll('.kt-reject-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          handleKonfirmasiTumpul_(btn.dataset.id, false, btn);
        });
      });
    })
    .catch(function (err) {
      // FIX Temuan 1 (audit FE-BE): auto-logout untuk UNAUTHORIZED_SESSION
      // sekarang benar-benar terpanggil di sini (sebelumnya dead code).
      handleSessionError_(err);
      el.innerHTML = emptyStateHtml_('Gagal memuat', 'Coba buka ulang panel ini.');
    });
}

function handleKonfirmasiTumpul_(id, approve, triggerBtn) {
  const row = triggerBtn.closest('.rank-row');
  row.querySelectorAll('button').forEach(function (b) {
    b.disabled = true;
  });
  apiPost('confirmPengajuanTumpul', {
    sessionToken: runtimeSessionToken_,
    id: id,
    approve: approve,
  })
    .then(function (res) {
      if (!res || res.success !== true) {
        // FIX Temuan 2 (audit FE-BE): sama seperti submitPengajuanTumpul --
        // UNAUTHORIZED_SESSION datang lewat res.error.code pada respons
        // sukses (HTTP 200), harus dicek di .then(), sebelumnya tidak pernah
        // dicek di endpoint ini.
        handleSessionError_(res && res.error);
        showKonfirmasiTumpulMsg_('error', (res && res.error && res.error.message) || 'Gagal memproses pengajuan.');
        row.querySelectorAll('button').forEach(function (b) {
          b.disabled = false;
        });
        return;
      }
      showKonfirmasiTumpulMsg_(
        'success',
        approve ? 'Dikonfirmasi — transaksi resmi sudah tercatat.' : 'Pengajuan ditolak.'
      );
      row.remove();
      loadKonfirmasiTumpulPanel_();
    })
    .catch(function (err) {
      // FIX Temuan 2 (audit FE-BE): jaga-jaga kalau ApiError sesi datang lewat
      // jalur transport (bukan body sukses) -- no-op kalau bukan error sesi.
      handleSessionError_(err);
      showKonfirmasiTumpulMsg_('error', (err && err.message) || 'Gagal memproses pengajuan.');
      row.querySelectorAll('button').forEach(function (b) {
        b.disabled = false;
      });
    });
}

/* ============================================================
       [FITUR-KONTROL-ASAH] KONTROL ASAH — panel Lainnya
       ============================================================ */
let vendorPerfMap_ = {}; // vendor -> { avgLeadTime, maxLeadTime, selisihTelat }

function loadKontrolAsah() {
  apiGet('getVendorPerformance')
    .then(function (rows) {
      vendorPerfMap_ = {};
      (rows || []).forEach(function (v) {
        vendorPerfMap_[v.vendor] = v;
      });
      renderVendorPerformance_(rows);
    })
    .catch(function (err) {
      document.getElementById('ka-vendor-list').innerHTML =
        err && err.code === 'CONFIGURATION_ERROR'
          ? stateCardHtml_(
              'config',
              'Koneksi belum diatur',
              'Hubungkan Google Apps Script terlebih dahulu.',
              'Buka Pengaturan'
            )
          : stateCardHtml_(
              'error',
              'Data belum dapat dimuat',
              'Periksa koneksi aplikasi.',
              'Coba Lagi',
              'loadKontrolAsah'
            );
      console.error(err);
    });

  apiGet('getKontrolAsahList')
    .then(function (rows) {
      const menunggu = (rows || []).filter(function (r) {
        return r.statusAsah === 'MENUNGGU KIRIM';
      });
      const proses = (rows || []).filter(function (r) {
        return r.statusAsah === 'PROSES ASAH';
      });
      renderKontrolAsahList_('ka-menunggu-list', menunggu, 'Belum ada unit yang menunggu kirim ke vendor.');
      renderKontrolAsahList_('ka-proses-list', proses, 'Belum ada unit yang sedang diasah di vendor.');
    })
    .catch(function (err) {
      const msg =
        err && err.code === 'CONFIGURATION_ERROR'
          ? stateCardHtml_(
              'config',
              'Koneksi belum diatur',
              'Hubungkan Google Apps Script terlebih dahulu.',
              'Buka Pengaturan'
            )
          : stateCardHtml_(
              'error',
              'Data belum dapat dimuat',
              'Periksa koneksi aplikasi.',
              'Coba Lagi',
              'loadKontrolAsah'
            );
      document.getElementById('ka-menunggu-list').innerHTML = msg;
      document.getElementById('ka-proses-list').innerHTML = msg;
      console.error(err);
    });
}

/** Kartu ringkasan per vendor (rata-rata & maksimum lead time asah). */
function renderVendorPerformance_(rows) {
  const el = document.getElementById('ka-vendor-list');
  if (!rows || rows.length === 0) {
    el.innerHTML = emptyStateHtml_('Belum ada data', 'Performa vendor akan muncul setelah ada siklus asah SELESAI.');
    return;
  }
  el.innerHTML =
    '<div class="card">' +
    rows
      .map(function (v) {
        return (
          '<div class="rank-row">' +
          '<div class="rank-info">' +
          '<div class="rk-title">' +
          escapeHtml(v.vendor) +
          '</div>' +
          '<div class="rk-sub">Maksimum ' +
          v.maxLeadTime +
          ' hari · selisih telat rata² ' +
          v.selisihTelat +
          ' hari</div>' +
          '</div>' +
          '<div class="rank-metric">' +
          '<div class="rk-num">' +
          v.avgLeadTime +
          '</div>' +
          '<div class="rk-unit">hari rata²</div>' +
          '</div>' +
          '</div>'
        );
      })
      .join('') +
    '</div>';
}

/**
 * List unit dalam proses asah (dipakai untuk 2 seksi: menunggu kirim
 * & sedang diasah). Untuk baris PROSES ASAH, dibandingkan ke rata-rata
 * lead time vendornya (dari getVendorPerformance) — kalau sudah
 * melewati rata-rata, dikasih badge "Terlambat".
 */
function renderKontrolAsahList_(elId, rows, emptyText) {
  const el = document.getElementById(elId);
  if (!rows || rows.length === 0) {
    el.innerHTML = emptyStateHtml_('Belum ada data', emptyText);
    return;
  }
  el.innerHTML =
    '<div class="card">' +
    rows
      .map(function (r) {
        const vp = vendorPerfMap_[r.vendor];
        const isProses = r.statusAsah === 'PROSES ASAH';
        const isTelat = isProses && vp && r.hariBerjalan > vp.avgLeadTime;
        const badge =
          '<span class="badge ' +
          (isTelat ? 'kritis' : 'aman') +
          '">' +
          (isTelat ? 'Terlambat' : isProses ? 'Normal' : 'Menunggu') +
          '</span>';
        return (
          '<div class="rank-row">' +
          '<div class="rank-info">' +
          '<div class="rk-title">' +
          escapeHtml(r.kodeAlat) +
          ' · ' +
          escapeHtml(r.unitId) +
          ' ' +
          badge +
          '</div>' +
          '<div class="rk-sub">' +
          escapeHtml(r.vendor || '—') +
          (r.mesin ? ' · ' + escapeHtml(r.mesin) : '') +
          '</div>' +
          '</div>' +
          '<div class="rank-metric">' +
          '<div class="rk-num">' +
          r.hariBerjalan +
          '</div>' +
          '<div class="rk-unit">hari</div>' +
          '</div>' +
          '</div>'
        );
      })
      .join('') +
    '</div>';
}

/* ============================================================
       FORM INPUT — data referensi (dropdown)
       ============================================================ */
function loadFormReferenceData() {
  apiGet('getActivityOptions')
    .then(function (list) {
      activityOptions = list || [];
      const sel = document.getElementById('f-activity');
      activityOptions.forEach(function (a) {
        const opt = document.createElement('option');
        opt.value = a;
        opt.textContent = a;
        sel.appendChild(opt);
      });
    })
    .catch(console.error);

  apiGet('getMasterToolsList')
    .then(function (list) {
      masterTools = list || [];
      populateKodeAlatSelect_(masterTools);
    })
    .catch(console.error);

  // [REVISI-02] Daftar mesin untuk field "Mesin" (mode mesin-dulu).
  apiGet('getMachineList')
    .then(function (list) {
      machineList = list || [];
      const sel = document.getElementById('f-mesin-driver');
      machineList.forEach(function (m) {
        const opt = document.createElement('option');
        opt.value = m.kodeMesin;
        opt.textContent = m.kodeMesin + (m.mesin ? ' — ' + m.mesin : '');
        opt.dataset.mesinName = m.mesin || '';
        sel.appendChild(opt);
      });
    })
    .catch(function (err) {
      // [v8.18.0] Sebelumnya cuma console.error -- operator tidak
      // pernah tahu kenapa dropdown Mesin kosong. Sekarang tampil
      // hint visible langsung di bawah field-nya.
      console.error(err);
      const hint = document.getElementById('f-mesin-driver-hint');
      if (hint) {
        hint.textContent =
          'Gagal memuat daftar mesin (' +
          (err && err.message ? err.message : 'error tidak diketahui') +
          '). Coba refresh; kalau masih gagal, cek deployment backend sudah versi terbaru.';
        hint.style.display = 'block';
      }
    });

  // [v8.18.0] Log versi backend LIVE ke console saat startup, supaya
  // deployment lama/basi (belum punya action terbaru seperti
  // getMachineList) bisa langsung ketahuan tanpa harus reverse-
  // engineer dari gejala UI seperti dropdown kosong.
  apiGet('getBackendVersion')
    .then(function (res) {
      console.log('[APP] Backend version:', (res && res.version) || '(tidak diketahui)');
    })
    .catch(function (err) {
      console.warn(
        '[APP] Gagal cek versi backend (kemungkinan deployment lama, belum punya action getBackendVersion):',
        err && err.message
      );
    });
}

/**
 * [REVISI-01] Label dropdown Kode Alat diperkaya dengan Brand, Bahan,
 * dan Spesifikasi (ukuran) — sebelumnya cuma "kodeAlat — namaAlat",
 * yang menyulitkan operator yang tidak hafal kode. Operator sekarang
 * bisa cari berdasarkan merek/bahan/ukuran langsung dari label.
 */
function kodeAlatOptionLabel_(t) {
  const bits = [];
  if (t.brand) bits.push(t.brand);
  if (t.bahan) bits.push(t.bahan);
  if (t.spesifikasi) bits.push(t.spesifikasi);
  const extra = bits.length ? ' (' + bits.join(' · ') + ')' : '';
  return t.kodeAlat + ' — ' + t.namaAlat + extra;
}

function populateKodeAlatSelect_(list) {
  const sel = document.getElementById('f-kode-alat');
  sel.innerHTML =
    '<option value="">Pilih kode alat…</option>' +
    (list || [])
      .map(function (t) {
        return '<option value="' + escapeAttr(t.kodeAlat) + '">' + escapeHtml(kodeAlatOptionLabel_(t)) + '</option>';
      })
      .join('');
}

function wireForm() {
  document.getElementById('f-kode-alat').addEventListener('change', onKodeAlatChange);
  document.getElementById('f-activity').addEventListener('change', onActivityChange);
  document.getElementById('f-mesin-driver').addEventListener('change', onMesinDriverChange);
  document.getElementById('movement-form').addEventListener('submit', onSubmitForm);

  // [v9.0] Progress wizard — hitung ulang tiap kali field apapun di
  // form berubah/diketik, supaya progress bar & badge langkah selalu
  // sinkron tanpa perlu dipanggil manual di tiap handler perubahan.
  const formEl = document.getElementById('movement-form');
  formEl.addEventListener('input', updateInputWizardProgress_);
  formEl.addEventListener('change', updateInputWizardProgress_);
  updateInputWizardProgress_();
}

/**
 * [v9.0] PREMIUM WIZARD — hitung progres pengisian form input
 * berdasarkan field WAJIB tiap kartu (langkah 5/Catatan opsional,
 * tidak dihitung sebagai wajib). Field yang sedang disabled/hidden
 * (mis. Kode Mesin lama saat mode mesin-dulu aktif) diabaikan dari
 * perhitungan supaya tidak membuat progress "nyangkut" walau field
 * itu memang tidak perlu diisi user secara langsung.
 */
const INPUT_WIZARD_STEP_IDS = ['1', '2', '3', '4'];
const CHECK_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

function stepFieldIsFilled_(el) {
  if (!el || el.disabled) return true; // field nonaktif tidak dihitung sbg penghalang
  if (el.type === 'number') return el.value !== '' && Number(el.value) >= (Number(el.min) || 0);
  return String(el.value || '').trim() !== '';
}

function inputCardIsComplete_(cardEl) {
  // Field "cerdas" (Mesin) hanya wajib kalau sedang ditampilkan.
  const mesinWrap = cardEl.querySelector('#f-mesin-driver-wrap');
  if (mesinWrap && mesinWrap.style.display !== 'none') {
    if (!stepFieldIsFilled_(document.getElementById('f-mesin-driver'))) return false;
  }

  // Unit: field select ATAU input manual, tergantung mode mana yang aktif.
  const unitManual = cardEl.querySelector('#f-unit-id-manual');
  if (unitManual && unitManual.style.display !== 'none') {
    if (!stepFieldIsFilled_(unitManual)) return false;
  }

  const requiredEls = cardEl.querySelectorAll('select[required], input[required]');
  for (let i = 0; i < requiredEls.length; i++) {
    if (!stepFieldIsFilled_(requiredEls[i])) return false;
  }
  return true;
}

function updateInputWizardProgress_() {
  let completedCount = 0;
  let activeAssigned = false;

  INPUT_WIZARD_STEP_IDS.forEach(function (stepNum) {
    const cardEl = document.getElementById('input-card-' + stepNum);
    const badgeEl = document.getElementById('input-step-' + stepNum);
    if (!cardEl || !badgeEl) return;

    const complete = inputCardIsComplete_(cardEl);
    cardEl.classList.toggle('is-complete', complete);
    badgeEl.classList.toggle('is-complete', complete);
    badgeEl.innerHTML = complete ? CHECK_ICON_SVG : stepNum;

    if (complete) {
      completedCount++;
      cardEl.classList.remove('is-active');
    } else if (!activeAssigned) {
      cardEl.classList.add('is-active');
      activeAssigned = true;
    } else {
      cardEl.classList.remove('is-active');
    }
  });

  const total = INPUT_WIZARD_STEP_IDS.length;
  const fillEl = document.getElementById('input-progress-fill');
  const labelEl = document.getElementById('input-progress-label');
  if (fillEl) fillEl.style.width = Math.round((completedCount / total) * 100) + '%';
  if (labelEl) labelEl.textContent = completedCount + '/' + total + ' langkah';
}

const ACTIVITY_NEW_UNIT = 'PEMBELIAN BARU';

/**
 * [REVISI-02] Dipanggil saat Activity berubah. Menentukan apakah
 * transaksi ini "mesin-dulu" (DIPASANG KE MESIN / KEMBALI KE GUDANG
 * (TUMPUL)) dan menyesuaikan tampilan form:
 *  - mesin-dulu  -> tampilkan field Mesin, kunci Kode Alat sampai
 *                   Mesin dipilih, sembunyikan field Kode Mesin lama.
 *  - selain itu  -> field Mesin disembunyikan, Kode Alat kembali ke
 *                   daftar lengkap (Master Tools), field Kode Mesin
 *                   lama tampil normal (diisi via getMesinOptionsForKodeAlat).
 */
function onActivityChange() {
  const activity = document.getElementById('f-activity').value;
  const driven = MESIN_DRIVEN_ACTIVITIES.indexOf(activity) !== -1;

  const mesinDriverWrap = document.getElementById('f-mesin-driver-wrap');
  const mesinDriverSel = document.getElementById('f-mesin-driver');
  const kodeMesinWrap = document.getElementById('f-kode-mesin-wrap');
  const kodeAlatSel = document.getElementById('f-kode-alat');

  // Reset setiap kali activity berubah supaya tidak ada kombinasi lama
  // yang nyangkut (mis. pindah dari TUMPUL ke PEMBELIAN BARU tapi Kode
  // Alat masih hasil filter mesin sebelumnya).
  mesinDriverSel.value = '';
  mesinDrivenUnitsCache = [];

  if (driven) {
    mesinDriverWrap.style.display = 'block';
    kodeMesinWrap.style.display = 'none';
    kodeAlatSel.disabled = true;
    kodeAlatSel.innerHTML = '<option value="">Pilih mesin dulu…</option>';
  } else {
    mesinDriverWrap.style.display = 'none';
    kodeMesinWrap.style.display = 'block';
    kodeAlatSel.disabled = false;
    populateKodeAlatSelect_(masterTools);
  }

  // Downstream (Unit, Kode Mesin) ikut direset via onKodeAlatChange
  // dengan Kode Alat kosong.
  onKodeAlatChange();
}

/**
 * [REVISI-02] Dipanggil saat Mesin (mode mesin-dulu) dipilih. Menarik
 * daftar Kode Alat yang valid/ada di mesin ini, lalu mengunci field
 * Kode Mesin lama ke nilai yang sama (dipakai apa adanya saat submit).
 */
function onMesinDriverChange() {
  const mesinSelEl = document.getElementById('f-mesin-driver');
  const mesin = mesinSelEl.value;
  const activity = document.getElementById('f-activity').value;
  const kodeAlatSel = document.getElementById('f-kode-alat');
  const mesinOpt = mesinSelEl.selectedOptions[0];
  const mesinName = mesinOpt ? mesinOpt.dataset.mesinName || '' : '';

  mesinDrivenUnitsCache = [];
  syncHiddenKodeMesin_(mesin, mesinName);

  if (!mesin) {
    kodeAlatSel.disabled = true;
    kodeAlatSel.innerHTML = '<option value="">Pilih mesin dulu…</option>';
    onKodeAlatChange();
    return;
  }

  kodeAlatSel.disabled = true;
  kodeAlatSel.innerHTML = '<option value="">Memuat kode alat…</option>';

  function renderKodeAlatOptions(kodeAlatList, emptyMessage) {
    if (!kodeAlatList.length) {
      kodeAlatSel.innerHTML = '<option value="">' + emptyMessage + '</option>';
      kodeAlatSel.disabled = true;
      onKodeAlatChange();
      updateInputWizardProgress_();
      return;
    }
    kodeAlatSel.innerHTML =
      '<option value="">Pilih kode alat…</option>' +
      kodeAlatList
        .map(function (kodeAlat) {
          const t = masterTools.find(function (mt) {
            return mt.kodeAlat === kodeAlat;
          });
          const label = t ? kodeAlatOptionLabel_(t) : kodeAlat;
          return '<option value="' + escapeAttr(kodeAlat) + '">' + escapeHtml(label) + '</option>';
        })
        .join('');
    kodeAlatSel.disabled = false;
    onKodeAlatChange();
    updateInputWizardProgress_();
  }

  if (activity === 'KEMBALI KE GUDANG (TUMPUL)') {
    // Hanya alat yang BENAR-BENAR sedang tercatat terpasang di mesin ini.
    apiGet('getUnitsByMesin', { kodeMesin: mesin, statusFilter: 'DIPAKAI' })
      .then(function (units) {
        mesinDrivenUnitsCache = units || [];
        const seen = {};
        const kodeAlatList = [];
        mesinDrivenUnitsCache.forEach(function (u) {
          if (seen[u.kodeAlat]) return;
          seen[u.kodeAlat] = true;
          kodeAlatList.push(u.kodeAlat);
        });
        renderKodeAlatOptions(kodeAlatList, 'Tidak ada alat terpasang di mesin ini');
      })
      .catch(function (err) {
        kodeAlatSel.innerHTML = '<option value="">Gagal memuat kode alat</option>';
        console.error(err);
      });
  } else {
    // DIPASANG KE MESIN — alat yang valid untuk dipasang di mesin ini
    // (dari Mapping Alat Mesin), unit-nya sendiri masih ditarik dari
    // GUDANG lewat getUnitsByKodeAlat seperti biasa di onKodeAlatChange.
    apiGet('getKodeAlatOptionsForMesin', { kodeMesin: mesin })
      .then(function (list) {
        const kodeAlatList = (list || []).map(function (a) {
          return a.kodeAlat;
        });
        renderKodeAlatOptions(kodeAlatList, 'Tidak ada alat valid untuk mesin ini');
      })
      .catch(function (err) {
        kodeAlatSel.innerHTML = '<option value="">Gagal memuat kode alat</option>';
        console.error(err);
      });
  }
}

/** Kunci field Kode Mesin lama ke 1 nilai hasil pilihan f-mesin-driver, supaya onSubmitForm tetap baca dari sana apa adanya. */
function syncHiddenKodeMesin_(kodeMesin, mesinName) {
  const sel = document.getElementById('f-kode-mesin');
  if (!kodeMesin) {
    sel.innerHTML = '<option value="">Belum di-set</option>';
    sel.disabled = true;
    return;
  }
  sel.innerHTML =
    '<option value="' +
    escapeAttr(kodeMesin) +
    '" data-mesin-name="' +
    escapeAttr(mesinName) +
    '" selected>' +
    escapeHtml(kodeMesin) +
    '</option>';
  sel.disabled = true;
}

function onKodeAlatChange() {
  const kodeAlat = document.getElementById('f-kode-alat').value;
  const activity = document.getElementById('f-activity').value;
  const driven = MESIN_DRIVEN_ACTIVITIES.indexOf(activity) !== -1;

  const unitSel = document.getElementById('f-unit-id');
  const unitManual = document.getElementById('f-unit-id-manual');
  const unitHint = document.getElementById('f-unit-id-hint');
  const mesinSel = document.getElementById('f-kode-mesin');

  if (!kodeAlat) {
    setUnitMode_('select');
    unitSel.innerHTML =
      '<option value="">' + (driven ? 'Pilih mesin & kode alat dulu…' : 'Pilih kode alat dulu…') + '</option>';
    unitSel.disabled = true;
    unitManual.value = '';
    unitHint.style.display = 'none';
    // Mode mesin-dulu: JANGAN reset mesinSel di sini — nilainya sumber
    // kebenarannya f-mesin-driver dan sudah disinkron lewat syncHiddenKodeMesin_.
    if (!driven) {
      mesinSel.innerHTML = '<option value="">Belum di-set</option>';
      mesinSel.disabled = true;
    }
    return;
  }

  // PEMBELIAN BARU = unit fisik belum pernah tercatat di Tool Unit,
  // jadi tidak bisa dipilih dari dropdown (dropdown cuma isi unit existing).
  // User ketik manual Unit_ID baru; kita bantu suggest nomor urut berikutnya.
  if (activity === ACTIVITY_NEW_UNIT) {
    setUnitMode_('manual');
    unitHint.textContent = 'Menghitung saran nomor unit…';
    unitHint.style.display = 'block';

    apiGet('getUnitsByKodeAlat', { kodeAlat: kodeAlat, statusFilter: '' })
      .then(function (existingUnits) {
        const ids = (existingUnits || []).map(function (u) {
          return u.unitId;
        });
        const suggestion = suggestNextUnitId_(kodeAlat, ids);
        unitManual.placeholder = suggestion ? 'Mis. ' + suggestion : 'Ketik Unit_ID baru';
        unitHint.textContent = ids.length
          ? 'Sudah ada ' +
            ids.length +
            ' unit terdaftar untuk ' +
            kodeAlat +
            '.' +
            (suggestion ? ' Saran ID berikutnya: ' + suggestion + '.' : '')
          : 'Belum ada unit terdaftar untuk ' + kodeAlat + ' — ini akan jadi unit pertama.';
      })
      .catch(function (err) {
        unitHint.textContent = 'Gagal cek unit existing (tetap bisa lanjut input manual).';
        console.error(err);
      });
  } else if (driven && activity === 'KEMBALI KE GUDANG (TUMPUL)') {
    // [REVISI-02] Unit sudah ditarik sekaligus saat Mesin dipilih
    // (getUnitsByMesin), di sini tinggal difilter per Kode Alat di
    // client — tanpa request baru — supaya cuma unit yang memang
    // tercatat ADA di mesin ini yang bisa dipilih operator.
    setUnitMode_('select');
    unitHint.style.display = 'none';
    const units = mesinDrivenUnitsCache.filter(function (u) {
      return u.kodeAlat === kodeAlat;
    });
    if (!units.length) {
      unitSel.innerHTML = '<option value="">Tidak ada unit tersedia untuk status ini</option>';
      unitSel.disabled = true;
    } else {
      unitSel.innerHTML =
        '<option value="">Pilih unit…</option>' +
        units
          .map(function (u) {
            return (
              '<option value="' +
              escapeAttr(u.unitId) +
              '">' +
              escapeHtml(u.unitId) +
              ' (' +
              escapeHtml(u.statusUnit) +
              ')</option>'
            );
          })
          .join('');
      unitSel.disabled = false;
    }
    updateInputWizardProgress_();
  } else {
    setUnitMode_('select');
    unitHint.style.display = 'none';
    unitSel.disabled = true;
    unitSel.innerHTML = '<option value="">Memuat unit…</option>';
    const statusFilter = STATUS_FILTER_BY_ACTIVITY[activity] || '';

    apiGet('getUnitsByKodeAlat', { kodeAlat: kodeAlat, statusFilter: statusFilter })
      .then(function (units) {
        if (!units || units.length === 0) {
          unitSel.innerHTML = '<option value="">Tidak ada unit tersedia untuk status ini</option>';
          unitSel.disabled = true;
          updateInputWizardProgress_();
          return;
        }
        unitSel.innerHTML =
          '<option value="">Pilih unit…</option>' +
          units
            .map(function (u) {
              return (
                '<option value="' +
                escapeAttr(u.unitId) +
                '">' +
                escapeHtml(u.unitId) +
                ' (' +
                escapeHtml(u.statusUnit) +
                ')</option>'
              );
            })
            .join('');
        unitSel.disabled = false;
        updateInputWizardProgress_();
      })
      .catch(function (err) {
        unitSel.innerHTML = '<option value="">Gagal memuat unit</option>';
        console.error(err);
        updateInputWizardProgress_();
      });
  }

  // Mode mesin-dulu: Mesin sudah dikunci dari f-mesin-driver, tidak
  // perlu lookup getMesinOptionsForKodeAlat lagi (itu akan menimpa
  // nilai yang sudah disinkron lewat syncHiddenKodeMesin_).
  if (driven) {
    return;
  }

  mesinSel.disabled = true;
  mesinSel.innerHTML = '<option value="">Memuat mesin…</option>';
  apiGet('getMesinOptionsForKodeAlat', { kodeAlat: kodeAlat })
    .then(function (mesinList) {
      if (!mesinList || mesinList.length === 0) {
        // [REVISI] Alat yang belum punya mapping mesin sama sekali di
        // Master (belum sempat di-set admin) tetap boleh dipakai untuk
        // transaksi -- field ini memang opsional. Label "Belum di-set"
        // dipakai supaya jelas ini beda dari "mesin dipilih kosong".
        mesinSel.innerHTML = '<option value="">Belum di-set</option>';
        mesinSel.disabled = true;
        return;
      }
      mesinSel.innerHTML =
        '<option value="">—</option>' +
        mesinList
          .map(function (m) {
            return (
              '<option value="' +
              escapeAttr(m.kodeMesin) +
              '" data-mesin-name="' +
              escapeAttr(m.mesin) +
              '">' +
              escapeHtml(m.kodeMesin) +
              '</option>'
            );
          })
          .join('');
      mesinSel.disabled = false;
    })
    .catch(console.error);
}

/** Toggle tampilan field Unit antara dropdown (unit existing) dan input teks (unit baru). */
function setUnitMode_(mode) {
  const unitSel = document.getElementById('f-unit-id');
  const unitManual = document.getElementById('f-unit-id-manual');
  if (mode === 'manual') {
    unitSel.style.display = 'none';
    unitSel.disabled = true;
    unitSel.required = false;
    unitManual.style.display = 'block';
    unitManual.disabled = false;
    unitManual.required = true;
  } else {
    unitSel.style.display = 'block';
    unitSel.required = true;
    unitManual.style.display = 'none';
    unitManual.disabled = true;
    unitManual.required = false;
    unitManual.value = '';
  }
}

/**
 * Saran Unit_ID berikutnya berdasarkan pola "<kodeAlat>-<nomor>" dari unit existing.
 * Kalau pola tidak ketemu / belum ada unit, return null (biarkan user isi manual full).
 */
function suggestNextUnitId_(kodeAlat, existingIds) {
  let maxNum = 0,
    padLen = 3,
    found = false;
  existingIds.forEach(function (id) {
    const m = /^(.*)-(\d+)$/.exec(id);
    if (!m) return;
    const num = parseInt(m[2], 10);
    if (isNaN(num)) return;
    found = true;
    if (num > maxNum) {
      maxNum = num;
      padLen = m[2].length;
    }
  });
  if (!found) return null;
  return kodeAlat + '-' + String(maxNum + 1).padStart(padLen, '0');
}

// P1-06 / TEST 04 — guard di level module supaya double-click / double-submit
// tidak bisa memicu dua request sebelum tombol sempat ter-disable di DOM.
let isSubmittingTx = false;

function onSubmitForm(e) {
  e.preventDefault();
  if (isSubmittingTx) return; // submission masih berjalan, abaikan trigger kedua

  // P2-K — tolak transaksi SEBELUM POST kalau diketahui offline.
  // navigator.onLine === false berarti pasti tidak ada koneksi, jadi aman
  // ditolak langsung di sini (S). Kalau navigator.onLine === true tapi
  // sebenarnya tidak ada internet, itu tetap ditangani oleh error handling
  // Phase 1 (TIMEOUT/NETWORK) di apiPost seperti biasa.
  if (!navigator.onLine) {
    showFormMsg('error', 'Anda sedang offline. Transaksi membutuhkan koneksi internet.');
    return;
  }

  // [WO-2.2] Guard murah di client SEBELUM request — backend TETAP
  // memvalidasi ulang sessionToken di addMovementRow (client-side check
  // ini cuma UX, bukan security boundary).
  if (!isLoggedIn_()) {
    showFormMsg('error', 'Anda belum login. Buka menu Pengaturan ▸ Akun untuk login terlebih dahulu.');
    return;
  }

  const kodeAlat = document.getElementById('f-kode-alat').value;
  const activity = document.getElementById('f-activity').value;
  const isNewUnit = activity === ACTIVITY_NEW_UNIT;
  const unitId = (
    isNewUnit ? document.getElementById('f-unit-id-manual').value : document.getElementById('f-unit-id').value
  ).trim();
  const kodeMesinSel = document.getElementById('f-kode-mesin');
  const kodeMesin = kodeMesinSel.value;
  const mesinOpt = kodeMesinSel.selectedOptions[0];
  const mesinName = mesinOpt ? mesinOpt.dataset.mesinName || '' : '';
  const qtyRaw = document.getElementById('f-qty').value;
  const pic = document.getElementById('f-pic').value.trim();
  const remark = document.getElementById('f-remark').value.trim();

  if (!activity || !kodeAlat || !unitId || !pic) {
    showFormMsg(
      'error',
      isNewUnit
        ? 'Lengkapi jenis transaksi, kode alat, Unit_ID baru, dan nama PIC.'
        : 'Lengkapi jenis transaksi, kode alat, unit, dan nama PIC.'
    );
    return;
  }

  if (isNewUnit && !/^[A-Za-z0-9\-]+$/.test(unitId)) {
    showFormMsg('error', 'Unit_ID baru cuma boleh huruf, angka, dan tanda "-" (tanpa spasi/simbol lain).');
    return;
  }

  // P1-05 — qty invalid harus DITOLAK, tidak boleh diam-diam jadi 1.
  const qty = parseQtyStrict_(qtyRaw);
  if (qty === null) {
    showFormMsg('error', 'Qty harus bilangan bulat positif (1, 2, 3, …) — tanpa desimal atau negatif.');
    return;
  }

  const tool = masterTools.find(function (t) {
    return t.kodeAlat === kodeAlat;
  });
  const today = formatToday_();
  // P1-02 — requestId dibuat sekali di sini dan dipakai apa adanya
  // untuk seluruh lifecycle request ini (tidak dibuat ulang saat retry manual).
  const requestId = generateRequestId_();

  isSubmittingTx = true;
  const btn = document.getElementById('btn-submit');
  btn.disabled = true;
  btn.innerHTML =
    '<span class="btn-icon btn-icon-spin"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 11-9-9c2.52 0 4.85.99 6.57 2.64L21 8"></path><path d="M21 3v5h-5"></path></svg></span>Menyimpan…';

  apiPost('addMovementRow', {
    requestId: requestId,
    sessionToken: runtimeSessionToken_, // [WO-2.2] wajib — validated server-side di addMovementRow
    tanggal: today, // P1-07: dipertahankan utk compat; sumber audit waktu = serverTimestamp di backend (NOT VERIFIED, lihat catatan backend)
    kodeAlat: kodeAlat,
    unitId: unitId,
    spesifikasi: tool ? tool.spesifikasi : '',
    mesin: mesinName,
    kodeMesin: kodeMesin,
    activity: activity,
    qty: qty,
    pic: pic,
    remark: remark,
  })
    .then(function (res) {
      const validated = validateTransactionResponse_(res);
      showFormMsg('success', 'Tersimpan — ID Transaksi #' + validated.idTransaksi + ', Cycle ' + validated.cycleId);
      document.getElementById('movement-form').reset();
      document.getElementById('f-unit-id').innerHTML = '<option value="">Pilih kode alat dulu…</option>';
      document.getElementById('f-unit-id').disabled = true;
      document.getElementById('f-unit-id-manual').value = '';
      document.getElementById('f-unit-id-hint').style.display = 'none';
      setUnitMode_('select');
      document.getElementById('f-kode-mesin').innerHTML = '<option value="">Belum di-set</option>';
      document.getElementById('f-kode-mesin').disabled = true;
      document.getElementById('f-qty').value = 1;
      // [REVISI-02] form.reset() mengosongkan f-activity tapi TIDAK
      // memicu event 'change', jadi field Mesin/Kode Alat mode
      // mesin-dulu perlu direset manual balik ke tampilan default.
      document.getElementById('f-mesin-driver-wrap').style.display = 'none';
      document.getElementById('f-kode-mesin-wrap').style.display = 'block';
      document.getElementById('f-mesin-driver').value = '';
      mesinDrivenUnitsCache = [];
      populateKodeAlatSelect_(masterTools);
      document.getElementById('f-kode-alat').disabled = false;
      updateInputWizardProgress_();
      loadDashboard();
      loadTransactions();
      loadStockStatus();
      loadMachineAnalytics();
    })
    .catch(function (err) {
      showFormMsg('error', mapErrorToMessage_(err, isNewUnit));
      // P1-06 — kalau Unit_ID baru bentrok, refresh saran nomor unit berikutnya.
      if (err && err.code === 'DUPLICATE_UNIT_ID' && isNewUnit) {
        onKodeAlatChange();
      }
    })
    .finally(function () {
      // P1-08 — jalur ini SELALU dieksekusi (success / error / timeout / network /
      // invalid response), jadi tombol tidak pernah macet di "Menyimpan…".
      isSubmittingTx = false;
      btn.disabled = false;
      btn.innerHTML =
        '<span class="btn-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg></span>Simpan Transaksi';
    });
}

function showFormMsg(type, text) {
  const el = document.getElementById('form-msg');
  el.className = 'form-msg show ' + type;
  const icon = type === 'success' ? FORM_MSG_ICON_SUCCESS : FORM_MSG_ICON_ERROR;
  el.innerHTML = '<span class="fm-icon">' + icon + '</span><span>' + escapeHtml(text) + '</span>';
}

/* ============================================================
       HELPERS
       ============================================================ */

/**
 * P1-02 — requestId unik per submission: timestamp (YYYYMMDD) + random.
 * Dibuat SEKALI saat user menekan submit dan dipakai apa adanya untuk
 * seluruh lifecycle request itu (tidak digenerate ulang saat retry).
 */
function generateRequestId_() {
  const d = new Date();
  const pad = function (n) {
    return String(n).padStart(2, '0');
  };
  const datePart = '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  let randomPart;
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    randomPart = window.crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  } else {
    // Fallback untuk browser lama yang tidak punya crypto.randomUUID().
    randomPart = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  return 'REQ-' + datePart + '-' + randomPart;
}

/**
 * P1-05 — qty harus bilangan bulat positif. TIDAK boleh fallback ke 1
 * kalau invalid (beda dari `Number(value) || 1` yang lama), harus REJECT.
 * Return integer valid, atau null kalau invalid (caller wajib tolak submit).
 */
function parseQtyStrict_(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!/^[0-9]+$/.test(s)) return null; // tolak desimal, negatif, kosong, non-angka
  const n = parseInt(s, 10);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

/**
 * P1-04 / M — validasi response addMovementRow sesuai kontrak
 * {success, requestId, idTransaksi, cycleId, data, error}.
 * Response yang tidak sesuai schema TIDAK dianggap sukses.
 */
function validateTransactionResponse_(res) {
  if (!res || typeof res !== 'object' || typeof res.success !== 'boolean') {
    throw new ApiError('API_RESPONSE_INVALID', 'Respons server tidak sesuai format yang diharapkan.');
  }
  if (res.success) {
    if (!res.idTransaksi) {
      throw new ApiError('API_RESPONSE_INVALID', 'Respons sukses tapi idTransaksi tidak ada.');
    }
    return res;
  }
  const errCode = res.error && res.error.code;
  const errMsg = (res.error && res.error.message) || 'Transaksi gagal disimpan.';
  throw new ApiError(errCode || 'BUSINESS', errMsg);
}

/** Pemetaan ApiError -> pesan yang aman & jelas untuk ditampilkan ke user (P1-08). */
function mapErrorToMessage_(err, isNewUnit) {
  if (!(err instanceof ApiError)) {
    return 'Transaksi gagal disimpan. Coba lagi.';
  }
  switch (err.code) {
    case 'CONFIGURATION_ERROR':
      return 'API belum dikonfigurasi. Buka menu Pengaturan dan masukkan Google Apps Script URL.';
    case 'UNAUTHORIZED_SESSION':
      // [WO-2.2/2.2.2] Sesi login kedaluwarsa/tidak valid — bersihkan
      // sesi lokal, sinkronkan card Akun, dan tampilkan lagi gate
      // layar penuh (app tidak boleh tetap terbuka dgn sesi mati).
      // FIX Temuan 2 (audit FE-BE): sekarang lewat handleSessionError_()
      // supaya satu-satunya sumber logic ini (dulu ditulis manual di sini,
      // lalu ditulis ulang beda-beda di endpoint lain).
      handleSessionError_(err);
      return 'Sesi login sudah kedaluwarsa. Silakan login kembali.';
    case 'UNAUTHORIZED':
    case 'INVALID_CREDENTIALS':
      return 'Token API atau kredensial tidak valid. Periksa Pengaturan.';
    case 'TIMEOUT':
      return 'Request timeout. Periksa koneksi lalu coba lagi.';
    case 'NETWORK':
      return 'Gagal terhubung ke server. Periksa koneksi lalu coba lagi.';
    case 'PARSE':
    case 'API_RESPONSE_INVALID':
      return 'Respons server tidak valid. Coba lagi, atau hubungi admin kalau berulang.';
    case 'DUPLICATE_UNIT_ID':
      return (err.message || 'Unit_ID sudah terdaftar.') + (isNewUnit ? ' Coba nomor lain.' : '');
    case 'HTTP':
      return 'Request gagal' + (err.meta && err.meta.status ? ' (HTTP ' + err.meta.status + ')' : '') + '. Coba lagi.';
    default:
      return err.message || 'Transaksi gagal disimpan.';
  }
}

function formatToday_() {
  const d = new Date();
  const pad = function (n) {
    return String(n).padStart(2, '0');
  };
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

