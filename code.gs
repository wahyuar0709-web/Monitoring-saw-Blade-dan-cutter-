/**
 * ============================================================
 *  Code.gs — v5.9 (GABUNGAN 1 FILE + DIVALIDASI KE SHEET ASLI)
 *  Sistem Monitoring Saw Blade & Cutter
 *
 *  ============================================================
 *  CHANGELOG v5.18.3 -> v5.19.0 (FITUR — PIC di Pengajuan Tumpul)
 *  ============================================================
 *  Sinkron dengan revisi frontend (index v8.23): form "Ajukan Pengembalian
 *  Tumpul" sekarang punya field wajib "Nama PIC" (siapa yang membawa/
 *  mengajukan fisik alatnya -- bisa beda dari akun login kalau device
 *  dipakai bergantian).
 *  [1] Kolom baru 'PIC' ditambahkan di AKHIR sheet "Pengajuan Tumpul"
 *      (PTCOL.PIC = 13) -- sengaja di akhir, bukan disisip di tengah,
 *      supaya baris lama yang sudah ada tidak perlu migrasi/geser kolom.
 *  [2] submitPengajuanTumpul_() sekarang mewajibkan payload.pic, disimpan
 *      ke kolom PIC.
 *  [3] getPengajuanTumpulList_() ikut mengembalikan field pic ke frontend.
 *  [4] confirmPengajuanTumpul_() -- PIC yang tercatat di Movement Log final
 *      (lewat addMovementRow) sekarang diambil dari PIC hasil pengajuan
 *      (rowData[PTCOL.PIC]), BUKAN actorName admin/WH yang konfirmasi
 *      seperti sebelumnya. Atribusi admin yang konfirmasi tetap tersimpan
 *      terpisah di kolom KonfirmasiOleh -- tidak ada info yang hilang.
 *      Fallback ke actorName kalau baris lama (pra-fitur ini) belum
 *      punya nilai PIC.
 *  >>> WAJIB: Deploy > Manage deployments > Edit deployment aktif >
 *      New version, setelah upload file ini. <<<
 *  ============================================================
 *
 *  ============================================================
 *  CHANGELOG v5.18.2 -> v5.18.3 (DEPLOY MARKER — dropdown Mesin kosong)
 *  ============================================================
 *  Konteks: operator melaporkan dropdown "Mesin" di form Transaksi kosong
 *  tanpa opsi sama sekali saat memilih activity "DIPASANG KE MESIN" /
 *  "KEMBALI KE GUDANG (TUMPUL)". Hasil investigasi: fungsi getMachineList()/
 *  getUnitsByMesin()/getKodeAlatOptionsForMesin() SUDAH BENAR di file ini
 *  (sudah ada sejak v5.18.2), tapi Web App yang live kemungkinan besar
 *  masih menjalankan DEPLOYMENT LAMA yang belum punya case ini di
 *  handleApiRequest_() -- jadi action ditolak sbg "tidak dikenali" dan
 *  frontend gagal isi dropdown secara diam-diam (lihat catatan di
 *  index-8.html soal apiGet() sekarang membedakan error ini).
 *  [1] Ditambahkan BACKEND_VERSION + action 'getBackendVersion' supaya
 *      versi backend yang BENAR-BENAR live bisa dicek dari console
 *      browser (log '[APP] Backend version: ...'), bukan cuma diasumsikan
 *      dari nama file lokal. Tidak ada perubahan logika bisnis lain.
 *  >>> WAJIB: Deploy > Manage deployments > Edit deployment aktif >
 *      New version, setelah upload file ini, atau dropdown Mesin akan
 *      tetap kosong walau kode sudah benar. <<<
 *  ============================================================
 *  CHANGELOG v5.18.0 -> v5.18.1 (BUGFIX — 3 temuan review pasca WO-ROLE)
 *  ============================================================
 *  [1] getUnitsByKodeAlat() sudah membaca kolom KodeMesin (getRange sampai
 *      TUCOL.KODE_MESIN) tapi TIDAK PERNAH memasukkannya ke object hasil --
 *      akibatnya field "Mesin" di panel Ajukan Pengembalian Tumpul tidak
 *      pernah auto-terisi, dan setiap pengajuan tersimpan dgn Mesin/
 *      KodeMesin kosong. Ditambahkan field kodeMesin di object hasil.
 *  [2] getPengajuanTumpulList_() TIDAK memvalidasi sessionToken sama sekali
 *      (satu-satunya gerbang adalah token API level-app yang sama utk semua
 *      device) -- operator manapun bisa panggil langsung & lihat SEMUA
 *      pengajuan semua operator, termasuk antrian admin-only, padahal jalur
 *      POST (confirmPengajuanTumpul_/addMovementRow) sudah benar menegakkan
 *      role. Sekarang wajib sessionToken valid; operator hanya melihat baris
 *      miliknya sendiri (match by username tervalidasi, bukan actorName).
 *  [3] Frontend loadRiwayatPengajuanSaya_(): fallback "kalau baris milik
 *      sendiri kosong, tampilkan SEMUA baris" -- artinya operator baru yang
 *      belum pernah mengajukan (selalu true di percobaan pertama) melihat
 *      riwayat pengajuan SEMUA orang lain di bawah judul "Pengajuan Saya".
 *      Filter sekarang dilakukan server-side (lihat fix [2]); frontend
 *      tidak lagi filter ulang di client & fallback berbahaya itu dihapus.
 *
 *  ============================================================
 *  CHANGELOG v5.17.3 -> v5.17.4 (DX FIX — fungsi admin tidak
 *  muncul di dropdown "Select function to run")
 *  ============================================================
 *  Fungsi yang namanya diakhiri "_" (setupUsersSheet_, createUser
 *  Account_, createUserAccountsBatch_, setupIdempotencyCleanupTrigger_)
 *  memang privat by design (bukan endpoint publik) -- tapi ternyata
 *  editor Apps Script JUGA otomatis sembunyikan semua fungsi "_" dari
 *  dropdown toolbar Run, jadi tidak bisa dipilih dari situ (harus
 *  cari ikon ▷ di gutter baris kode, gampang kelewat/tidak jelas).
 *  Ditambahkan 4 wrapper tipis TANPA akhiran "_" di ujung file
 *  (runSetupUsersSheet, runCreateUserAccount, runCreateUserAccounts
 *  Batch, runSetupIdempotencyCleanupTrigger) -- isinya cuma manggil
 *  fungsi aslinya, sekarang semua muncul & bisa dipilih di dropdown.
 *
 *  ============================================================
 *  CHANGELOG v5.17.2 -> v5.17.3 (FITUR — setup sheet Users eksplisit)
 *  ============================================================
 *  Sebelumnya sheet "Users" cuma ter-provision SECARA TIDAK LANGSUNG
 *  lewat side-effect getOrCreateUsersSheet_() di dalam upsertUser
 *  Account_() -- tidak ada fungsi admin yang tugasnya murni menyiapkan
 *  sheet-nya. Ditambahkan setupUsersSheet_() (pola sama dgn setup
 *  IdempotencyCleanupTrigger_(): manual-run sekali, idempotent, aman
 *  dipanggil ulang) -- membuat sheet + header kalau belum ada, atau
 *  memperbaiki header baris 1 kalau sudah ada tapi berubah/kosong,
 *  TANPA menyentuh data akun yang sudah ada di baris di bawahnya.
 *
 *  ============================================================
 *  CHANGELOG v5.17.1 -> v5.17.2 (AUDIT FIX — session lifecycle)
 *  ============================================================
 *  Follow-up review pasca v5.17.1 (bukan bug baru yang ditemukan
 *  sejak itu, dua gap yang belum tercakup audit sebelumnya):
 *  [1] Logout SEBELUMNYA murni client-side (hapus token dari
 *      localStorage) -- token itu sendiri TETAP HIDUP di Script
 *      Properties sampai TTL 7 hari habis. Kalau token bocor
 *      (device dipinjam, dll), klik "Logout" tidak menutup akses
 *      sama sekali. Ditambahkan logoutUser_() + revokeSession_() +
 *      action 'logout' baru di doPost -- client sekarang memanggil
 *      server utk mencabut token saat logout (fire-and-forget,
 *      tidak mengubah UX kalau request gagal/lambat).
 *  [2] Tidak ada rate-limit di loginUser_() -- brute-force online
 *      terhadap password (pelan, dibatasi PBKDF2, tapi tanpa
 *      batas percobaan) tetap memungkinkan selama token API app
 *      diketahui. Ditambahkan lockout 15 menit setelah 5 kali
 *      gagal berturut-turut per username, dikunci SEBELUM PBKDF2
 *      dijalankan (hemat compute) dan diterapkan ke username apa
 *      pun yang dicoba (termasuk yang tidak terdaftar) supaya
 *      respons "terkunci" tidak jadi oracle baru. Counter direset
 *      begitu login berhasil; record ikut dibersihkan oleh
 *      cleanupExpiredIdempotencyRecords_() (TTL 24 jam) — trigger
 *      yang sudah ada, tidak perlu setup baru.
 *
 *  ============================================================
 *  CHANGELOG v5.17 -> v5.17.1 (AUDIT FIX — full function review)
 *  ============================================================
 *  Diminta "cek semua fungsi di code gs" -- 73 fungsi direview satu-
 *  per-satu (cross-reference definisi vs pemanggilan, syntax check,
 *  konsistensi kontrak data). Dua temuan P2 diperbaiki:
 *  [1] Timing side-channel di verifyUserCredentials_(): PBKDF2
 *      SEBELUMNYA cuma dijalankan kalau username cocok (return cepat
 *      kalau tidak cocok) -- beda waktu respons ini bisa dipakai
 *      menebak username valid. Sekarang PBKDF2 SELALU dijalankan
 *      sekali per percobaan (pakai DUMMY_SALT_HEX_ kalau username
 *      tidak ditemukan), semua jalur gagal menempuh biaya yang sama.
 *  [2] 4 titik logTransactionFailure_() (COMMIT_TOOL_UNIT/COMMIT_
 *      MOVEMENT_LOG/VERIFY/UNEXPECTED_EXCEPTION) + 2 event idempotency
 *      (REQUEST_ID_REUSE_CONFLICT/IDEMPOTENT_REPLAY) SEBELUMNYA tidak
 *      pernah mengirim actorReported/authenticatedActor -- jatuh ke
 *      "UNKNOWN" di Audit Log, padahal justru titik kegagalan/rollback
 *      yang paling butuh identity forensik. Sekarang semua call site
 *      (20 dari 22 pemanggilan logAuditEvent_/logTransactionFailure_
 *      di addMovementRow) mengirim keduanya -- 2 sisanya (requestId
 *      invalid & session invalid) memang terjadi SEBELUM ada session
 *      tervalidasi, jadi authenticatedActor sengaja tidak ada di situ.
 *  Temuan P3 (fungsi include() dead code, sisa era index.html di-
 *  serve dari GAS) TIDAK diperbaiki -- disimpan utk LEVEL 3/4 cleanup.
 *
 *  ============================================================
 *  CHANGELOG v5.16 -> v5.17 (WO-2.2.1 — BATCH USER CREATION)
 *  ============================================================
 *  createUserAccount_() (single, edit-3-baris-lalu-Run) TETAP ADA,
 *  tidak dihapus -- masih valid untuk tambah 1 operator cepat.
 *  Tambahan: createUserAccountsBatch_() untuk banyak operator
 *  sekaligus dalam satu kali Run (isi array USERS_BATCH_, tidak perlu
 *  edit-Run berulang satu-satu). Logika upsert diekstrak ke
 *  upsertUserAccount_() dan dipakai BERSAMA oleh keduanya, supaya
 *  perilaku single & batch selalu identik (hash, salt, update-vs-
 *  insert). Baris batch yang username/password/actorName-nya kosong
 *  di-skip (dicatat di ringkasan Logger.log), tidak menggagalkan
 *  baris lain.
 *
 *  ============================================================
 *  CHANGELOG v5.15 -> v5.16 (LEVEL 2 — AUDIT LOG RELIABILITY &
 *  TRUSTED ACTOR IDENTITY)
 *  ============================================================
 *  [WO-2.1.3] Audit Log reliability: logAuditEvent_() sebelumnya
 *    silent-fail ke Logger.log() saja (ephemeral, tidak dipantau).
 *    Sekarang kalau gagal tulis, notifyAuditLogFailure_() mengirim
 *    email ke ADMIN_ALERT_EMAIL (Script Property, wajib di-set
 *    manual), rate-limited maks 1x/6 jam (ADMIN_ALERT_LAST_TS_KEY)
 *    supaya kegagalan berulang tidak membanjiri inbox. Transaksi
 *    bisnis TETAP tidak pernah terganggu -- alert dibungkus try/catch
 *    sendiri di dalam catch block logAuditEvent_() yang sudah ada.
 *
 *  [WO-2.2] Trusted actor identity: field PIC di payload TETAP ada
 *    (field bisnis, self-reported, tidak dihapus), TAPI sekarang ada
 *    lapisan kedua yang tervalidasi server -- login username/password
 *    (sheet "Users" baru, password di-hash PBKDF2-HMAC-SHA256 10.000
 *    iterasi + salt per user, akun dibuat manual oleh admin lewat
 *    createUserAccount_()). Login menghasilkan sessionToken (TTL 7
 *    hari, lifecycle-nya digabung ke trigger cleanup idempotency yang
 *    sudah ada -- tidak perlu setup trigger baru). addMovementRow()
 *    SEKARANG MEWAJIBKAN sessionToken valid (UNAUTHORIZED_SESSION
 *    kalau tidak ada/kedaluwarsa, ditolak SEBELUM lock). Kolom baru
 *    "AuthenticatedActor" di Audit Log (dengan migrasi header
 *    otomatis untuk sheet lama) mencatat identitas tervalidasi ini
 *    terpisah dari ActorReported (PIC self-reported).
 *
 *  [FIX] index.html (frontend terpisah) SEBELUMNYA tidak pernah
 *    mengirim token API sama sekali ke doGet/doPost -- akibatnya
 *    SELURUH aplikasi UNAUTHORIZED terhadap backend v5.15 (WO-2.0.1).
 *    Frontend diperbaiki sekalian: field "Token API" baru di
 *    Pengaturan (localStorage, sama pola dgn URL), disambungkan ke
 *    apiGet/apiPost. Field "Akun" baru untuk login/logout operator.
 * ============================================================
 *
 *  Digabung dari 3 file terpisah (WebApp_v3.gs, GenerateID_v2.gs,
 *  ValidateAndCleanup_v2.gs) jadi 1 file .gs, sesuai permintaan —
 *  ditaruh sebagai satu-satunya file Code.gs di project Apps
 *  Script yang bound ke spreadsheet. index.html tetap file
 *  terpisah (wajib, dipakai HtmlService).
 *
 *  Semua konstanta kolom (COL, TUCOL, MTCOL, resolveStockStatus-
 *  Columns_) sudah dicocokkan langsung ke header sheet asli
 *  "Monitoring Saw blade & cutter" — semua match, TIDAK ada
 *  perubahan di area itu selain yang tercatat di bawah.
 *
 *  ============================================================
 *  CHANGELOG v3 -> v4
 *  ============================================================
 *  [CHANGE-01] Regrind Count (Cycle_ID/Counter di Movement Log)
 *    sekarang naik saat activity = "SELESAI DIASAH" (regrind selesai
 *    dikerjakan), BUKAN lagi saat "KEMBALI KE GUDANG (TUMPUL)" (unit
 *    baru pulang dalam kondisi tumpul, belum tentu jadi diasah kapan
 *    itu). Urutan cycle sekarang:
 *      PEMBELIAN BARU            -> cycle 01 (mulai)
 *      DIPASANG KE MESIN         -> tetap
 *      KEMBALI KE GUDANG(TUMPUL) -> tetap
 *      KIRIM KE VENDOR ASAH      -> tetap
 *      SELESAI DIASAH            -> cycle NAIK +1 (regrind ke-N selesai)
 *      DIPASANG KE MESIN (lagi)  -> tetap cycle yang baru itu
 *    Lihat resolveCycleInfo_() untuk detail.
 *
 *  ============================================================
 *  CHANGELOG v5.8 -> v5.9 (WORK ORDER PHASE 1.9 — TRANSACTION AUDIT
 *  TRAIL, TRACEABILITY & FORENSIC LOGGING)
 *  ============================================================
 *  [WO-1.9] AUDIT MEKANISME EXISTING (§3/§4 work order) SEBELUM
 *    CODING — hasil: logTransactionFailure_() (Phase 1.7) SUDAH ADA
 *    tapi pakai Logger.log GAS (ephemeral, execution transcript —
 *    tidak persistent/queryable dari UI, tidak memenuhi §43 forensic
 *    query by requestId/Unit_ID/date). TIDAK ADA event untuk
 *    REQUESTED/REJECTED/COMMITTED/LOCK_TIMEOUT/IDEMPOTENT_REPLAY/
 *    REQUEST_ID_REUSE_CONFLICT sama sekali sebelum fase ini. TIDAK
 *    ADA server-side actor identity (Session.getActiveUser() tidak
 *    pernah dipakai di file ini) — field "PIC" di payload adalah
 *    input form manual, bukan identity ter-autentikasi.
 *
 *    Movement Log TETAP satu-satunya transaction source of truth
 *    (§2 work order, tidak diubah). Sheet baru "Audit Log" ditambah
 *    (auto-provision via getOrCreateAuditLogSheet_() kalau belum ada)
 *    sebagai lapisan traceability/forensic TAMBAHAN — bukan pengganti
 *    Movement Log, bukan dipakai untuk keputusan bisnis apa pun.
 *
 *    logAuditEvent_() adalah satu-satunya titik tulis, PERSIS mengikuti
 *    pola logTransactionFailure_() (Phase 1.7): dibungkus try/catch,
 *    silent-fail, TIDAK PERNAH throw — audit log write failure TIDAK
 *    PERNAH menggagalkan atau rollback business transaction (§34/§35).
 *    Ditambahkan panggilan logAuditEvent_() di 16 titik return dalam
 *    addMovementRow(): requestId invalid, TRANSACTION_REQUESTED
 *    (sekali per attempt, di luar lock — §9 work order: timestamp
 *    server via new Date(), tidak menerima timestamp client),
 *    LOCK_TIMEOUT, REQUEST_ID_REUSE_CONFLICT, IDEMPOTENT_REPLAY,
 *    9 titik TRANSACTION_REJECTED pre-write (schema/qty/reference/
 *    state — stage-nya di-mapping dari errorCode existing lewat
 *    mapErrorCodeToStage_(), TIDAK mengubah errorCode yang dikirim ke
 *    client), dan TRANSACTION_COMMITTED (dengan state diff ringkas —
 *    lihat buildToolUnitStateDiff_(), hanya field yang berubah, BUKAN
 *    full row, §22/§23). logTransactionFailure_() sendiri (dipanggil
 *    di 4 titik commit/verify/rollback/exception) sekarang JUGA
 *    menulis ke Audit Log lewat logAuditEvent_() — errorCode existing
 *    (TRANSACTION_ROLLBACK/TRANSACTION_ROLLBACK_FAILED/TRANSACTION_
 *    VERIFY_FAILED) dipakai APA ADANYA sebagai nama event (§29: audit
 *    code harus sama dengan response contract, tidak dipetakan ke kode
 *    generik lain). Satu celah ditemukan & ditutup: titik
 *    TRANSACTION_PREPARE_FAILED (exception tak terduga SEBELUM ada
 *    write) sebelumnya tidak logging apa pun — sekarang dicatat
 *    (errorCode saja, err.message TIDAK ikut ke audit log karena bisa
 *    berisi detail internal).
 *
 *    commitToolUnit_() diperluas mengembalikan afterLokasi/
 *    afterKodeMesin/afterRegrind (field TAMBAHAN untuk audit diff
 *    saja) — verifyToolUnitWrite_() TIDAK diubah, tetap hanya
 *    memeriksa unitId/lastEvent/statusUnit seperti sebelumnya.
 *    [WO-2.1.1] CATATAN INI SUDAH TIDAK BERLAKU: verifyToolUnitWrite_()
 *    sekarang JUGA memeriksa lokasi/kodeMesin/regrindCount — lihat
 *    komentar di fungsinya langsung. Baris di atas dibiarkan sbg
 *    riwayat, jangan dianggap perilaku saat ini.
 *
 *    TIDAK menyimpan payload mentah/full row/secret/token apa pun ke
 *    Audit Log (§20/§21) — hanya field terkurasi (requestId,
 *    transactionId, event, stage, Unit_ID, Kode Alat, actorReported,
 *    errorCode, state diff ringkas, rollbackStatus). Payload aplikasi
 *    ini memang tidak pernah berisi password/token/secret (field:
 *    tanggal, kodeAlat, unitId, activity, qty, mesin, kodeMesin, pic,
 *    remark — semuanya data bisnis operasional).
 *
 *    Retention/growth (§41/§42): TIDAK membuat retention policy baru
 *    pada fase ini (belum ada requirement) — 1 transaksi normal
 *    menghasilkan 2 baris Audit Log (REQUESTED + COMMITTED/REJECTED),
 *    kasus rollback menghasilkan 2 baris (REQUESTED + hasil
 *    rollback). Tidak logging setiap sub-langkah internal (high
 *    signal, low noise sesuai §42).
 *
 *    TIDAK mengubah UI, lifecycle activity, Cycle_ID, Regrind Count,
 *    atau historical data mana pun (§37/§38) — Audit Log adalah
 *    append-only, tidak ada mekanisme update/rewrite event lama di
 *    fase ini.
 *  ============================================================
 *  CHANGELOG v5.7 -> v5.8 (WORK ORDER PHASE 1.8 — CONCURRENCY,
 *  LOCKING & RACE-CONDITION HARDENING)
 *  ============================================================
 *  [WO-1.8] AUDIT (§5/§32 work order) — LockService.getScriptLock()
 *    di addMovementRow() (baris ~1281) sudah menjadi SATU-SATUNYA lock
 *    di seluruh file (diverifikasi: hanya 1 titik getScriptLock/
 *    getUserLock/getDocumentLock di file ini). Tidak diganti jenisnya —
 *    ScriptLock tepat karena "Tool Unit" dan "Movement Log" adalah
 *    shared state lintas SEMUA user web app ini (bound script, satu
 *    spreadsheet), bukan data per-user (UserLock tidak cukup, lihat
 *    §33 work order). Aplikasi ini TIDAK PUNYA Stok_Saldo/Stok_Per_Rak
 *    (dikonfirmasi ulang, sama seperti catatan Phase 1.7) sehingga
 *    skenario §18/§19/§22 (stock race, rack race) work order tidak
 *    applicable di sini — race condition yang applicable adalah Unit
 *    creation race (§20) dan state transition race (§17/§3), keduanya
 *    sudah tercakup lock yang sama karena findToolUnitRow_() (§7) dan
 *    validateUnitTransition_() (§7b) dipanggil DI DALAM lock, SEBELUM
 *    write, dan hasil baca itu tidak pernah di-refresh dari luar lock.
 *
 *    Ditemukan sudah SESUAI (dibangun bertahap sejak Phase 1.1/1.2,
 *    tidak ada perubahan kode fungsional yang diperlukan):
 *      - Lock diperoleh SEBELUM critical read (requestId lookup §4
 *        dan seluruh PHASE A PREPARE ada di dalam try setelah
 *        waitLock() — §7/§14 work order).
 *      - Critical section mencakup: idempotency lookup, referential
 *        integrity, state-transition validation, generate idTransaksi/
 *        Cycle_ID, commit Tool Unit, commit Movement Log, verify,
 *        DAN penyimpanan idempotency record SUCCESS — semuanya
 *        sebelum lock.releaseLock() di blok finally (§8/§29 work
 *        order: verifikasi & idempotency record tidak boleh terjadi
 *        setelah unlock).
 *      - Rollback (Tool Unit dan/atau Movement Log) selalu dieksekusi
 *        SEBELUM lock dilepas — tidak ada return path yang unlock
 *        duluan baru rollback (§28 work order).
 *      - Lock ownership tunggal: HANYA addMovementRow() yang
 *        acquire/release lock; seluruh helper (commitToolUnit_,
 *        commitMovementLog_, rollbackToolUnit_, rollbackMovementLog_,
 *        verifyTransactionConsistency_, verifyToolUnitWrite_,
 *        verifyMovementLogWrite_, resolveCycleInfo_,
 *        generateNextTransactionId_) TIDAK memanggil LockService
 *        sendiri — tidak ada nested lock (§24/§25 work order).
 *      - Lock timeout (waitLock 10 detik) menghasilkan kode
 *        LOCK_TIMEOUT dan return LANGSUNG (tidak pernah lanjut ke
 *        write) — fail closed sesuai §10/§11 work order.
 *      - Idempotency record disimpan via PropertiesService.getScript-
 *        Properties() (persistent, bukan CacheService) dan SELURUH
 *        baca-tulisnya (getIdempotencyRecord_/saveIdempotencyRecord_)
 *        terjadi di dalam lock yang sama — tidak ada CacheService di
 *        file ini sama sekali, jadi §30/§31 work order (cache sebagai
 *        sumber lost update) tidak applicable.
 *      - Frontend (index.html, P1-02) sudah membuat requestId SEKALI
 *        per submission dan TIDAK PERNAH auto-retry POST transaksi
 *        (hanya GET yang retry otomatis) — retry manual memakai
 *        requestId yang sama, konsisten dengan §37/§38 work order;
 *        tidak ada perubahan di index.html untuk phase ini.
 *      - Rollback Tool Unit/Movement Log tetap pakai identity guard
 *        (Unit_ID/ID_TRANSAKSI + posisi baris terakhir) dari Phase
 *        1.2 — tidak diubah, sudah cukup untuk mencegah rollback
 *        salah sasaran waktu ada request lain yang menunggu lock.
 *
 *    TIDAK ADA perubahan kode fungsional pada addMovementRow() atau
 *    helper-nya di fase ini — audit menyimpulkan critical section,
 *    lock scope, dan ownership SUDAH memenuhi seluruh acceptance
 *    criteria §53 yang applicable untuk aplikasi ini. Live concurrency
 *    test (§40-§52 work order: dua+ request nyata bersamaan lewat
 *    deployment Apps Script sungguhan) BELUM/TIDAK BISA dijalankan
 *    dari sandbox audit ini (tidak ada akses ke deployment/spreadsheet
 *    live) — hasil di bawah adalah verifikasi jalur kode (code-path
 *    reasoning), BUKAN hasil eksekusi test nyata; lihat laporan audit
 *    terpisah untuk skenario test manual yang direkomendasikan sebelum
 *    Phase 1.8 dianggap PASS operasional. Tidak ada perubahan UI,
 *    lifecycle activity, Cycle_ID, atau Regrind Count.
 *  ============================================================
 *  CHANGELOG v5.6 -> v5.7 (WORK ORDER PHASE 1.7 — TRANSACTION
 *  CONSISTENCY & DERIVED-STATE SYNCHRONIZATION)
 *  ============================================================
 *  [WO-1.7] AUDIT WRITE TARGET (§4/§5 work order) — seluruh
 *    appendRow/setValue/setValues/deleteRow di file ini ditelusuri
 *    ulang. Hasilnya HANYA ADA 2 write target untuk addMovementRow(),
 *    bukan 4 seperti contoh generik di work order:
 *      Target      | Fungsi Writer         | Primary/Derived | Rollback
 *      Movement Log| commitMovementLog_    | PRIMARY (event) | rollbackMovementLog_
 *      Tool Unit   | commitToolUnit_       | DERIVED (state) | rollbackToolUnit_
 *    "Stok_Saldo" dan "Stok_Per_Rak" (dan konsep rak/gudang bertingkat)
 *    TIDAK ADA di aplikasi ini — tidak dikarang. Sheet lain yang
 *    dibaca aplikasi (Stock Status, Kontrol Asah, Performa Vendor,
 *    Dashboard Summary, Machine Wear Stats, Lead Time) SEMUANYA
 *    read-only: dihitung on-the-fly dari Movement Log + Tool Unit tiap
 *    kali di-query (getStockStatusList/getKontrolAsahList/dst, lihat
 *    daftar getSheet_() call) — tidak pernah ditulis sendiri, jadi
 *    otomatis selalu konsisten dengan Movement Log/Tool Unit terbaru
 *    tanpa perlu synchronization terpisah.
 *
 *    ARSITEKTUR TRANSAKSI SUDAH DIBANGUN Phase 1.2 (WO-1.2) dan
 *    memenuhi sebagian besar tujuan Phase 1.7 by construction:
 *    PREPARE (baca+validasi+hitung idTransaksi/Cycle_ID/newStatus,
 *    TANPA write) -> COMMIT (Tool Unit dulu, lalu Movement Log) ->
 *    VERIFY (baca ulang, cocok identity) -> FINALIZE (idempotency
 *    record HANYA setelah verify lolos). Setiap commit dibungkus
 *    try/catch dengan rollback presisi (guard identity Unit_ID/
 *    ID_TRANSAKSI, tidak pernah clear/hapus baris sembarangan — §13).
 *
 *    ORDER OF WRITE (§10) — TETAP Tool Unit dulu baru Movement Log,
 *    TIDAK diubah jadi "Movement Log dulu" walau work order menyebut
 *    Movement Log sebagai primary event. Alasan (sesuai izin eksplisit
 *    §10: "jika implementation existing menggunakan order berbeda
 *    karena alasan rollback, pertahankan selama integrity terjamin"):
 *    urutan ini membuat SETIAP kegagalan di titik mana pun tidak
 *    pernah meninggalkan derived state tanpa primary atau sebaliknya —
 *      - Tool Unit commit gagal -> Movement Log belum tersentuh sama
 *        sekali (tidak ada apa pun untuk di-rollback di sana).
 *      - Movement Log commit gagal setelah Tool Unit sukses -> Tool
 *        Unit di-rollback ke snapshot; hasil akhir: TIDAK ADA
 *        perubahan tersisa di kedua sheet.
 *      - Verify salah satu/kedua gagal setelah keduanya "sukses" ->
 *        keduanya di-rollback (Movement Log dulu baru Tool Unit).
 *    Integrity end-state SELALU: keduanya committed (SUCCESS) atau
 *    keduanya kembali ke semula (FAILURE/ROLLBACK) — tidak pernah
 *    partial, terlepas dari urutan penulisan. Mengubah urutan tanpa
 *    alasan baru hanya menambah risiko regresi terhadap Phase 1.2 yang
 *    sudah diverifikasi, jadi TIDAK dilakukan.
 *
 *    YANG BARU ditambahkan Phase 1.7 (di atas fondasi Phase 1.2):
 *      1) verifyTransactionConsistency_() (§31/§32) — centralized,
 *         READ-ONLY verification helper. Menggantikan pemanggilan
 *         verifyToolUnitWrite_()/verifyMovementLogWrite_() yang
 *         sebelumnya inline terpisah di addMovementRow() dengan SATU
 *         titik evaluasi "apakah commit ini sesuai harapan" — perilaku
 *         IDENTIK (memanggil fungsi verify yang sama, sama sekali
 *         tidak menulis apa pun), cuma disatukan + melaporkan
 *         failedTargets (['TOOL_UNIT'] dan/atau ['MOVEMENT_LOG']) agar
 *         rollback & logging tahu target mana yang bermasalah.
 *      2) logTransactionFailure_() (§29) — logging minimal (Logger.log
 *         GAS bawaan, bukan infrastruktur baru) HANYA pada jalur
 *         critical transaction failure (commit gagal, verify gagal,
 *         rollback gagal/sukses) — TIDAK PERNAH di jalur reject normal
 *         (schema/qty/reference/state invalid, itu bukan "transaction
 *         failure", itu request yang memang ditolak sebelum ada
 *         write). Berisi timestamp, requestId, idTransaksi (kalau
 *         sudah ada), operation/stage, errorCode, affectedTargets,
 *         rollbackStatus — TIDAK PERNAH payload mentah/field sensitif
 *         (§29 eksplisit larang dump payload penuh).
 *    Error code contract SAMA PERSIS seperti Phase 1.2 (TRANSACTION_
 *    ROLLBACK/TRANSACTION_ROLLBACK_FAILED/TRANSACTION_VERIFY_FAILED/
 *    TRANSACTION_PREPARE_FAILED) — TIDAK diganti nama generik
 *    VERIFY_ERROR/WRITE_ERROR/dst dari template work order, supaya
 *    tidak memutus kontrak err.code yang sudah dipakai index.html
 *    (lihat BUGFIX-02). VERIFY_ERROR/ROLLBACK_FAILED dari template
 *    work order tetap ada sebagai `code` INTERNAL di dalam hasil
 *    verifyTransactionConsistency_(), bukan menggantikan errorCode
 *    yang dikirim ke client.
 *    TIDAK mengubah UI, lifecycle activity, Cycle_ID, Regrind Count,
 *    payload schema (1.4), referential integrity (1.5), state
 *    transition (1.6), qty validation (1.3), idempotency (1.1), atau
 *    urutan commit/rollback Phase 1.2 itu sendiri. Tidak ada
 *    auto-repair, tidak ada historical rewrite, tidak ada recalculate
 *    otomatis (recalculateAllSaldoCore() dkk tidak ada di aplikasi
 *    ini — tidak dibuat pada fase ini, §33/§51 tidak applicable).
 *  ============================================================
 *  CHANGELOG v5.5 -> v5.6 (WORK ORDER PHASE 1.6 — STRICT UNIT
 *  STATE & LIFECYCLE TRANSITION VALIDATION)
 *  ============================================================
 *  [WO-1.6] Sebelum fase ini, addMovementRow() (setelah lolos schema
 *    Phase 1.4 dan referential integrity Phase 1.5) langsung menulis
 *    activity apa pun ke Unit_ID yang sudah ada — TANPA PERNAH
 *    memeriksa apakah activity itu SAH terhadap status Tool Unit saat
 *    ini. Unit "DIASAH" (sedang di vendor) bisa saja menerima
 *    "DIPASANG KE MESIN" langsung, atau unit "GUDANG" menerima
 *    "SELESAI DIASAH" — tidak ada yang mencegah.
 *
 *    CURRENT STATE SOURCE: kolom Status (TUCOL.STATUS_UNIT) di sheet
 *    "Tool Unit" — ini CACHE/derived, ditulis oleh commitToolUnit_()
 *    tiap transaksi lewat tabel STATUS_AFTER_ACTIVITY yang SUDAH ADA
 *    (tidak diubah). Source of truth historis tetap Movement Log;
 *    Tool Unit.Status adalah proyeksi "status setelah Last_Event
 *    terakhir" dari tabel itu — dipakai apa adanya (tidak membuat
 *    field/kolom baru, tidak menghitung ulang dari histori).
 *
 *    ACTUAL TRANSITION RULE (bukan dikarang): index.html sudah punya
 *    STATUS_FILTER_BY_ACTIVITY — dipakai frontend untuk memfilter
 *    dropdown Unit per activity (mis. "DIPASANG KE MESIN" hanya
 *    menampilkan unit berstatus GUDANG). Itulah kontrak lifecycle
 *    yang benar-benar dipakai aplikasi ini; Phase 1.6 memindahkan
 *    kontrak yang SAMA (bukan versi baru) ke backend sebagai
 *    REQUIRED_STATE_BY_ACTIVITY_ supaya tidak bisa dilewati dengan
 *    memanggil endpoint langsung (index.html dan Code.gs adalah 2
 *    file/2 deployment terpisah — GitHub Pages vs Apps Script exec —
 *    jadi tidak bisa share 1 modul JS; REQUIRED_STATE_BY_ACTIVITY_
 *    WAJIB tetap disinkronkan manual kalau STATUS_FILTER_BY_ACTIVITY
 *    di index.html berubah di fase lain). "PEMBELIAN BARU" tidak
 *    masuk map ini (sudah divalidasi terpisah di §7/§7a — hanya untuk
 *    Unit_ID yang belum ada). "SCRAP / RUSAK" dan "KARAT" juga tidak
 *    masuk (index.html men-dokumentasikan keduanya "tanpa filter
 *    (semua unit)") — dipindah apa adanya ke GLOBAL_ALLOWED_ACTIVITIES_,
 *    boleh dari status mana pun SELAMA status itu dikenal (lihat
 *    UNKNOWN_CURRENT_STATE di bawah).
 *
 *    validateUnitTransition_(currentState, requestedActivity) adalah
 *    SATU-SATUNYA tempat aturan ini dievaluasi (one source of truth,
 *    bukan if/else tersebar). Dipanggil di PHASE A — PREPARE,
 *    SETELAH referential integrity Phase 1.5 (unit sudah pasti ada
 *    lewat findToolUnitRow_() yang sudah dibaca DI DALAM lock yang
 *    sama) dan SEBELUM idTransaksi/Cycle_ID dihitung serta SEBELUM
 *    write apa pun ke Tool Unit/Movement Log — jadi transisi ilegal
 *    otomatis NO WRITE, tidak butuh rollback (belum ada commit) dan
 *    tidak membuat idempotency record SUCCESS, konsisten dengan pola
 *    Phase 1.3/1.4/1.5. Read-state dan validate-transition ini terjadi
 *    di dalam ScriptLock (Phase 1.1/1.2) yang sama dengan write-nya —
 *    tidak ada celah unlock-di-tengah — sehingga 2 request konkuren ke
 *    Unit_ID yang sama diproses berurutan; request kedua akan membaca
 *    status yang SUDAH berubah dari request pertama dan otomatis
 *    ditolak kalau activity kedua tidak lagi sah untuk status baru itu.
 *    Kalau status Tool Unit ternyata bukan salah satu dari 5 nilai
 *    yang benar-benar dipakai STATUS_AFTER_ACTIVITY (GUDANG/DIPAKAI/
 *    TUMPUL/DIASAH/SCRAP) -> UNKNOWN_CURRENT_STATE, REJECT (TIDAK
 *    PERNAH dianggap default GUDANG atau status lain). toState pada
 *    hasil validator dihitung dari STATUS_AFTER_ACTIVITY yang sama
 *    persis dipakai commitToolUnit_() (tidak ada logic kedua yang bisa
 *    divergen) — untuk KARAT (tidak ada di tabel itu) toState = state
 *    saat ini apa adanya (efek "Netral", sama seperti commitToolUnit_
 *    sudah berperilaku sebelum fase ini).
 *    TIDAK mengubah UI, lifecycle activity list, Cycle_ID, Regrind
 *    Count, Stock Status, payload schema (Phase 1.4), referential
 *    integrity (Phase 1.5), qty validation (Phase 1.3), idempotency/
 *    rollback architecture (Phase 1.1/1.2), atau STATUS_AFTER_ACTIVITY
 *    itu sendiri. Tidak ada auto-correct/auto-repair transisi ilegal
 *    maupun histori lama — hanya mencegah transisi ilegal BARU.
 *  ============================================================
 *  CHANGELOG v5.4 -> v5.5 (WORK ORDER PHASE 1.5 — STRICT
 *  REFERENTIAL INTEGRITY)
 *  ============================================================
 *  [WO-1.5] Sebelum fase ini, addMovementRow() cuma memeriksa
 *    "Unit_ID ketemu atau tidak" (existence) lewat findToolUnitRow_(),
 *    lalu memakai payload.kodeAlat APA ADANYA — baik untuk menulis
 *    Movement Log maupun (kalau unit baru) untuk membuat baris Tool
 *    Unit — TANPA PERNAH memverifikasi kodeAlat itu benar-benar ada
 *    di Master Tools, TANPA memverifikasi kodeAlat yang dikirim
 *    client cocok dengan Kode_Alat yang sudah tercatat di Tool Unit
 *    untuk Unit_ID yang sama, dan TANPA mendeteksi Unit_ID/Kode Alat
 *    yang punya lebih dari satu baris (data duplikat/corrupt).
 *    Existence ≠ integrity — sekarang boundary referensial ditambah
 *    SETELAH schema validation (Phase 1.4) dan SEBELUM write apa pun,
 *    masih di dalam ScriptLock yang sama (Phase 1.1/1.2):
 *      - findToolUnitRow_() sekarang scan SELURUH baris Tool Unit
 *        (bukan berhenti di match pertama) dan mengembalikan
 *        {status:'not_found'|'found'|'duplicate', ...}. >1 baris
 *        Unit_ID yang sama -> UNIT_ID_DUPLICATE, REJECT, tidak pernah
 *        diam-diam pakai matches[0].
 *      - findMasterToolRow_() (BARU) — helper lookup Master Tools
 *        terpusat by Kode Alat (case-insensitive, konsisten dengan
 *        normalizeKodeAlat_() yang sudah dipakai di BAGIAN 1),
 *        mengembalikan status yang sama: not_found/found/duplicate.
 *        0 baris -> caller yang menentukan kode error (lihat di
 *        bawah); >1 baris -> MASTER_CODE_DUPLICATE.
 *      - PEMBELIAN BARU (unit baru, belum ada di Tool Unit):
 *        payload.kodeAlat WAJIB ada persis satu kali di Master Tools
 *        sebelum Unit baru boleh dibuat -> kalau 0 baris:
 *        INVALID_MASTER_REFERENCE (backend TIDAK PERNAH auto-create
 *        Master Tools baru); kalau >1: MASTER_CODE_DUPLICATE.
 *      - Activity non-PEMBELIAN BARU (unit harus sudah ada): Kode
 *        Alat yang dipakai untuk Movement Log & downstream logic
 *        BUKAN lagi payload.kodeAlat mentah, melainkan Kode_Alat yang
 *        sudah tercatat di baris Tool Unit itu sendiri (source of
 *        truth — lihat hierarki UNIT_ID -> TOOL UNIT -> KODE ALAT ->
 *        MASTER TOOLS). Kalau payload.kodeAlat (setelah normalisasi
 *        case-insensitive yang sama) TIDAK cocok dengan Kode_Alat
 *        tercatat itu -> DATA_INTEGRITY_ERROR, REJECT — payload TIDAK
 *        PERNAH boleh mengubah identity relationship Tool Unit yang
 *        sudah ada. Kode_Alat tercatat itu sendiri lalu divalidasi
 *        lagi ke Master Tools: 0 baris berarti Tool Unit ini sudah
 *        orphan (data lama sudah corrupt) -> DATA_INTEGRITY_ERROR;
 *        >1 baris -> MASTER_CODE_DUPLICATE.
 *      - Kode Alat efektif (dari Tool Unit untuk unit existing, dari
 *        payload yang sudah divalidasi untuk unit baru) itulah yang
 *        dipakai membangun baris Movement Log — bukan lagi
 *        payload.kodeAlat mentah di kedua jalur.
 *    Tidak ada auto-create Master Tools, tidak ada auto-repair Tool
 *    Unit/Master Tools di jalur mana pun — kondisi integrity yang
 *    gagal SELALU REJECT TRANSACTION, tidak pernah "diperbaiki" diam-
 *    diam. Reference validation ini terjadi di PHASE A (PREPARE, di
 *    dalam lock yang sama dengan Phase 1.1/1.2, SEBELUM Phase B
 *    COMMIT) sehingga integrity error otomatis tidak menyentuh
 *    Movement Log/Tool Unit dan tidak membuat idempotency SUCCESS —
 *    konsisten dengan pola Phase 1.3/1.4. TIDAK mengubah UI,
 *    lifecycle activity, Cycle_ID, Regrind Count, Stock Status, qty
 *    validation (Phase 1.3), payload schema (Phase 1.4), idempotency,
 *    atau rollback architecture (Phase 1.1/1.2). DUPLICATE_UNIT_ID
 *    (kontrak lama utk PEMBELIAN BARU ke Unit_ID yang sudah ada)
 *    TETAP DIPERTAHANKAN apa adanya — tidak diganti UNIT_ID_DUPLICATE.
 *  ============================================================
 *  CHANGELOG v5.3 -> v5.4 (WORK ORDER PHASE 1.4 — STRICT PAYLOAD
 *  SCHEMA & FIELD VALIDATION)
 *  ============================================================
 *  [WO-1.4] validateMovementPayload_() sebelumnya cuma memvalidasi
 *    activity/kodeAlat/unitId/pic sebagai "non-empty setelah
 *    String(v)" — object/array di field string (mis. unitId: {})
 *    diam-diam ke-coerce jadi "[object Object]"/"" oleh sanitizeText_()
 *    lalu (kalau lolos required-check) tetap lanjut ke transaction
 *    engine, dan field yang sama sekali tidak dikenal backend (atau
 *    field server-owned seperti idTransaksi/cycleId) tidak pernah
 *    ditolak sama sekali. Sekarang payload diperiksa lewat boundary
 *    schema STRICT sebelum business validation:
 *      1) payload wajib plain object (null/array/string/number/
 *         boolean/function semua REJECT -> INVALID_PAYLOAD, TANPA
 *         menyentuh field apa pun di dalamnya)
 *      2) HANYA field yang benar-benar ada di kontrak addMovementRow
 *         (lihat ALLOWED_MOVEMENT_FIELDS_ — dicocokkan ke payload
 *         asli yang dikirim index.html: requestId, tanggal, kodeAlat,
 *         unitId, spesifikasi, mesin, kodeMesin, activity, qty, pic,
 *         remark) yang diterima; field lain (termasuk field server-
 *         owned macam idTransaksi/cycleId/counter kalau suatu saat
 *         diinject client, atau __proto__/constructor/prototype) ->
 *         UNKNOWN_FIELD, REJECT, tidak pernah dipakai
 *      3) tiap field string divalidasi lewat validateStringField_():
 *         object/array/number/boolean di field string -> REJECT
 *         (INVALID_FIELD_TYPE), TIDAK PERNAH di-String()-koersi;
 *         required field yang undefined/null/kosong/whitespace ->
 *         MISSING_REQUIRED_FIELD; field yang memang boleh kosong
 *         (tanggal/spesifikasi/mesin/kodeMesin/remark) tetap boleh
 *         kosong asal tipenya string
 *      4) Unit_ID lolos type-check lalu tetap dicek format existing
 *         (huruf/angka/"-") -> INVALID_FIELD_VALUE kalau gagal
 *      5) activity lolos type-check lalu dicocokkan ke whitelist
 *         existing (getValidActivities()) -> INVALID_ACTIVITY kalau
 *         tidak dikenal; TIDAK ADA auto-correct ("scrap"->"SCRAP /
 *         RUSAK" dsb) — backend tidak menebak maksud operator
 *      6) qty tetap lewat parseQtyStrict_() (Phase 1.3, TIDAK
 *         DIUBAH) -> kode error tetap INVALID_QTY
 *      7) hasil akhir dibangun eksplisit field-per-field (bukan
 *         Object.assign(raw payload)) supaya transaction engine
 *         (addMovementRow) HANYA pernah membaca validatedPayload,
 *         tidak pernah balik baca payload mentah
 *    requestId TETAP divalidasi terpisah oleh validateRequestId_()
 *    (Phase 1.1, TIDAK DIUBAH) SEBELUM validateMovementPayload_()
 *    dipanggil — kode REQUEST_ID_REQUIRED/INVALID_REQUEST_ID tetap
 *    dipertahankan apa adanya, bukan diganti MISSING_REQUIRED_FIELD.
 *    Semua error sekarang membawa errorCode eksplisit (sebelumnya
 *    sebagian besar jatuh ke default 'VALIDATION' generik di
 *    addMovementRow()); pesan Exception internal tetap tidak pernah
 *    dikirim ke client (tetap pesan aman yang sudah ada). TIDAK
 *    mengubah UI, lifecycle activity, Cycle_ID, Regrind Count, Stock
 *    Status, transaction ID algorithm, idempotency/rollback
 *    architecture, atau qty validation Phase 1.3.
 *  ============================================================
 *  CHANGELOG v5.2 -> v5.3 (WORK ORDER PHASE 1.3 — STRICT BACKEND
 *  QUANTITY VALIDATION)
 *  ============================================================
 *  [WO-1.3] validateMovementPayload_() sebelumnya diam-diam
 *    mengubah qty invalid (0, negatif, desimal, string kosong,
 *    "abc", dll — bahkan lewat Number(payload.qty) yang meng-
 *    hasilkan 0 untuk "" / null) menjadi qty = 1 via fallback
 *    "if (!Number.isFinite(qty) || qty <= 0) qty = 1;". Fallback
 *    itu DIHAPUS TOTAL. qty sekarang divalidasi lewat
 *    parseQtyStrict_() SEBELUM ada write apa pun (masih di dalam
 *    PREPARE Phase 1.2, jadi qty invalid otomatis tidak menyentuh
 *    Movement Log/Tool Unit dan tidak membuat idempotency SUCCESS —
 *    tidak perlu rollback karena belum ada commit). Diterima HANYA
 *    number integer positif (finite, safe integer, <= 100000) atau
 *    string digit murni ("5", " 5 " — untuk kompatibilitas frontend
 *    lama yang masih kirim string); "1.5", "-1", "0", "", "abc",
 *    "1e3", "+1", null, undefined, NaN, Infinity, array/object semua
 *    ditolak dengan kode INVALID_QTY, TIDAK PERNAH dikonversi jadi 1.
 *    Payload hasil validasi selalu berisi qty sebagai number integer.
 *    Tidak mengubah requestId/idempotency mechanism, rollback
 *    architecture, Cycle_ID, Regrind Count, Stock Status, atau UI.
 *  ============================================================
 *  CHANGELOG v5.1 -> v5.2 (WORK ORDER PHASE 1.2 — TRANSACTION
 *  ATOMICITY & ROLLBACK SAFETY)
 *  ============================================================
 *  [WO-1.2] addMovementRow() sebelumnya bisa meninggalkan partial
 *    commit: Movement Log ter-appendRow() sukses tapi Tool Unit gagal
 *    di-update (atau sebaliknya), dan tidak ada mekanisme untuk
 *    mengembalikan state. Sekarang alurnya dipecah jadi PREPARE (baca
 *    + validasi + hitung idTransaksi/Cycle_ID, TANPA write apa pun) ->
 *    COMMIT (tulis Tool Unit dulu, baru Movement Log) -> VERIFY (baca
 *    ulang kedua sheet, cocokkan dengan expected) -> FINALIZE (simpan
 *    idempotency record HANYA setelah commit+verify lolos). Kalau
 *    commit Tool Unit gagal, Movement Log belum tersentuh sama sekali
 *    jadi tidak ada yang perlu di-rollback selain Tool Unit itu
 *    sendiri. Kalau commit Movement Log gagal setelah Tool Unit sukses,
 *    Tool Unit di-rollback ke snapshot semula. Kalau verifikasi gagal
 *    setelah kedua write "sukses", keduanya di-rollback. Snapshot Tool
 *    Unit menyimpan SELURUH row asli (bukan cuma field yang berubah)
 *    supaya restore selalu utuh; rollback Movement Log dan insert baris
 *    Tool Unit baru selalu di-guard identity (Unit_ID / ID_TRANSAKSI +
 *    posisi row terakhir) sebelum deleteRow() supaya tidak pernah salah
 *    hapus baris transaksi lain. Kalau rollback sendiri gagal
 *    dipastikan berhasil, response memakai kode khusus
 *    TRANSACTION_ROLLBACK_FAILED (bukan mengklaim data aman). Lihat
 *    commitToolUnit_/verifyToolUnitWrite_/rollbackToolUnit_/
 *    commitMovementLog_/verifyMovementLogWrite_/rollbackMovementLog_.
 *    LockService tetap dipakai (bukan sebagai rollback mechanism,
 *    cuma mencegah concurrent modification — sama seperti sebelumnya).
 *    TIDAK mengubah UI, lifecycle activity, algoritma Cycle_ID/Regrind
 *    Count/Stock Status, atau kontrak Phase 1.1 (requestId/idempotency
 *    lookup/REQUEST_ID_REUSE_CONFLICT/idempotentReplay tetap identik).
 *  ============================================================
 *  CHANGELOG v5 -> v5.1 (WORK ORDER PHASE 1.1 — TRUE IDEMPOTENCY)
 *  ============================================================
 *  [WO-1.1] addMovementRow() sebelumnya cuma membaca & mengembalikan
 *    requestId (echo field) — tidak ada lookup, jadi kalau response
 *    hilang karena timeout/network lalu frontend retry, bisa lahir 2
 *    baris Movement Log untuk 1 transaksi yang sama. Sekarang requestId
 *    adalah idempotency key sungguhan: divalidasi wajib (format 8-100
 *    karakter aman), disimpan persistent via PropertiesService (bukan
 *    CacheService yang expire, bukan variabel global JS), lookup
 *    terjadi DI DALAM ScriptLock yang sama sebelum transaksi diproses.
 *    Request kedua dengan requestId+payload identik dikembalikan hasil
 *    lama (idempotentReplay:true) TANPA baris baru; requestId sama tapi
 *    payload beda ditolak (REQUEST_ID_REUSE_CONFLICT). Lihat
 *    validateRequestId_/computePayloadFingerprint_/getIdempotencyRecord_/
 *    saveIdempotencyRecord_ + addMovementRow(). Tidak mengubah struktur
 *    Movement Log, lifecycle activity, Cycle_ID, atau generateNextTransactionId_().
 *  ============================================================
 *  CHANGELOG v4 -> v5 (hasil validasi terhadap sheet asli)
 *  ============================================================
 *  [CHANGE-02] KRITIS — Ternyata "Regrind Count" BUKAN cuma istilah:
 *    itu KOLOM ASLI di sheet "Tool Unit" (kolom H / TUCOL.REGRIND_COUNT),
 *    terpisah dari Cycle_ID/Counter di Movement Log. Sebelumnya kolom
 *    ini TIDAK PERNAH ditulis oleh script sama sekali — nilai yang ada
 *    di sheet murni manual/lama. Sekarang di-increment +1 di
 *    upsertToolUnitAfterActivity_() setiap kali activity =
 *    "SELESAI DIASAH", konsisten dengan pola data asli (mis. unit
 *    AKE-SB-01-001: Regrind Count=1 setelah Last Event=SELESAI DIASAH,
 *    tetap 1 di transaksi berikutnya sampai SELESAI DIASAH lagi). Unit
 *    baru (PEMBELIAN BARU) mulai dari 0.
 * ============================================================
 */


/* ================================================================
 * BAGIAN 1 — WEB APP (dulu WebApp_v3.gs)
 * ================================================================ */

// [v5.19.0] Versi backend yang BENAR-BENAR live -- dicek via action
// 'getBackendVersion', supaya deployment lama/basi bisa terdeteksi dari
// console browser (bukan sekadar diasumsikan dari nama file lokal).
const BACKEND_VERSION = 'v5.19.0';

const SHEET_MASTER_TOOLS = 'Master Tools';
const SHEET_TOOL_UNIT = 'Tool Unit';
const SHEET_MAPPING = 'Mapping Alat Mesin';
const SHEET_STOCK_STATUS = 'Stock Status';

const MTCOL = { KODE_ALAT: 1, NAMA_ALAT: 2, SPESIFIKASI: 6 };
const TUCOL = { KODE_ALAT: 1, UNIT_ID: 2, REGRIND_COUNT: 8, LAST_EVENT: 10, STATUS_UNIT: 11, LOKASI: 12, KODE_MESIN: 13 };
const MAPCOL = { KODE_ALAT: 1, KODE_MESIN: 4, MESIN: 5 };

const SHEET_KONTROL_ASAH = 'Kontrol Asah';
const SHEET_PERFORMA_VENDOR = 'Performa Vendor';

/**
 * [FITUR-KONTROL-ASAH] Kolom sheet "Kontrol Asah" — urutan tetap sesuai
 * header asli (A-Y), sama pola dengan MTCOL/TUCOL/MAPCOL (bukan resolver
 * dinamis) karena sheet ini hasil migrasi/generate, bukan diedit manual
 * strukturnya. "Lead Time Tunggu (Hari Kerja)" dan "Lead Time Asah (Hari)"
 * SUDAH berupa angka berjalan (live, dihitung sheet-nya sendiri via
 * formula tanggal-vs-hari-ini) — jadi di sisi Apps Script cukup dibaca
 * apa adanya, TIDAK perlu dihitung ulang dari tanggal.
 */
const KACOL = {
  KODE_ALAT: 1, CYCLE_ID: 2, UNIT_ID: 3, BRAND: 4, CUTTING_TOOL: 5, IDENT_NR: 6, TOOL_ID: 7,
  MATERIAL: 8, SPESIFIKASI: 9, MESIN: 10, KODE_MESIN: 11, TGL_PENGAJUAN_PR: 12, TGL_PENGAJUAN_BC: 13,
  TGL_MASUK_WH: 14, QTY_MASUK: 15, UNIT: 16, BERAT: 17, TGL_KIRIM_ASAH: 18, LEAD_TIME_TUNGGU: 19,
  VENDOR: 20, TGL_TERIMA_ASAH: 21, QTY_TERIMA: 22, COUNTER: 23, LEAD_TIME_ASAH: 24, STATUS_ASAH: 25
};

/**
 * Kolom Stock Status di-resolve dari teks header baris 1 (bukan angka
 * tetap), supaya tidak salah baca kalau kolom disisipkan/geser.
 * Keyword paling spesifik dicoba dulu ke SEMUA kolom sebelum turun ke
 * keyword lebih generik, supaya "Sedang Diasah" tidak ketiban match
 * oleh "Menunggu Diasah".
 */
function resolveStockStatusColumns_(sheet) {
  const lastCol = sheet.getLastColumn();
  const header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  const find = function (keywords) {
    for (let k = 0; k < keywords.length; k++) {
      const kw = normalizeHeader_(keywords[k]);
      for (let i = 0; i < header.length; i++) {
        if (normalizeHeader_(header[i]).indexOf(kw) !== -1) return i + 1; // 1-indexed
      }
    }
    return -1;
  };

  const map = {
    KODE_ALAT: find(['kode alat']),
    NAMA_ALAT: find(['nama alat']),
    SPESIFIKASI: find(['spesifikasi']),
    TOTAL: find(['total']),
    SAFETY: find(['safety']),
    DIPAKAI: find(['sedang dipakai', 'dipakai']),
    TUNGGU_ASAH: find(['tunggu asah', 'menunggu diasah', 'menunggu asah']),
    DIASAH: find(['sedang diasah', 'diasah']),
    SIAP_PAKAI: find(['siap pakai']),
    STATUS: find(['status'])
  };

  const missing = Object.keys(map).filter(function (k) { return map[k] === -1; });
  if (missing.length) {
    throw new Error(
      'Header kolom Stock Status tidak ditemukan: ' + missing.join(', ') +
      '. Cek nama header di baris 1 sheet "' + SHEET_STOCK_STATUS + '".'
    );
  }
  return map;
}

function normalizeHeader_(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}


/* ------------------------------------------------------------
 * [BUGFIX-01] KRITIS — ENTRY POINT WEB APP
 * ------------------------------------------------------------
 * Frontend (index-v7_0-phase3a-settings.html, Phase 3A) sudah
 * dipindah ke arsitektur terpisah: HTML di-host sendiri (mis. GitHub
 * Pages) dan memanggil Web App ini murni sebagai JSON API lewat
 * fetch() — GET ?action=... untuk baca, POST {action, payload} untuk
 * addMovementRow. Lihat komentar di index.html: "manggilnya lewat
 * fetch() ke URL /exec, bukan google.script.run".
 *
 * Code_v5.gs SEBELUM fix ini TIDAK PERNAH mengimplementasikan
 * kontrak itu sama sekali:
 *   - doGet() SELALU me-render index.html via HtmlService, TIDAK
 *     PERNAH membaca e.parameter.action / mengembalikan JSON.
 *   - doPost() TIDAK ADA sama sekali -> setiap request POST dari
 *     apiPost() (submit transaksi) otomatis gagal di level Apps
 *     Script sebelum menyentuh addMovementRow() sama sekali.
 * Akibatnya SELURUH aplikasi (dashboard, riwayat, stok, form input,
 * Uji Koneksi di Pengaturan) tidak bisa berfungsi lewat deployment
 * Web App ini — bukan bug parsial, tapi total outage untuk arsitektur
 * Phase 3A. Ini showstopper #1 yang diperbaiki di bawah.
 * ------------------------------------------------------------ */
/**
 * [WO-2.0.1 — API access control] Web App di-deploy sbg "Anyone" (publik,
 * tanpa login Google), jadi Session.getActiveUser() TIDAK bisa dipakai
 * sbg identitas terpercaya (kosong utk akses anonim). Ini BUKAN autentikasi
 * per-user (tidak menjawab "siapa" -- itu tetap actorReported/PIC, P2
 * terpisah), hanya access-control tingkat aplikasi: menolak siapa pun yang
 * tidak tahu token, supaya endpoint tidak bisa dipanggil bebas oleh
 * siapa saja yang menemukan URL-nya (scanner/bot internet, dsb).
 *
 * Token TIDAK PERNAH hardcode di file ini (kode ini disinkron ke GitHub) --
 * disimpan di Script Properties, di-set manual sekali oleh admin lewat
 * Project Settings > Script Properties, key: API_ACCESS_TOKEN.
 *
 * FAIL-CLOSED BY DESIGN: kalau property belum di-set sama sekali, SEMUA
 * request ditolak (bukan diam-diam dibuka). Karena itu, TOKEN INI WAJIB
 * DI-SET DULU DI SCRIPT PROPERTIES SEBELUM DEPLOY VERSI INI, kalau tidak
 * seluruh aplikasi berhenti berfungsi.
 *
 * Batasan yang harus disadari (bukan diselesaikan di sini): karena
 * frontend adalah static HTML publik (GitHub Pages) dan token dikirim
 * dari sana, token tetap terlihat oleh siapa pun yang membuka View
 * Source / DevTools Network tab di frontend. Ini menaikkan bar dari
 * "siapa saja yang tahu URL" jadi "siapa saja yang secara sengaja
 * inspect frontend", bukan autentikasi sekuat login per-akun.
 */
const API_TOKEN_PROPERTY_KEY = 'API_ACCESS_TOKEN';

function isAuthorized_(providedToken) {
  const expected = PropertiesService.getScriptProperties().getProperty(API_TOKEN_PROPERTY_KEY);
  if (!expected) return false; // fail-closed: belum dikonfigurasi = tolak semua

  // [Audit fix — rate-limit token API] Cek lockout SEBELUM verifikasi token
  // (murah, sebelum constantTimeEquals_ dijalankan) -- kalau sudah terkunci,
  // tidak perlu hitung konstanta waktu sama sekali.
  const failRecord = getApiTokenFailRecord_();
  if (failRecord && failRecord.lockedUntil && Date.now() < failRecord.lockedUntil) {
    logAuditEvent_({
      event: 'API_TOKEN_LOCKED', stage: 'AUTH_API_TOKEN', errorCode: 'API_TOKEN_LOCKED',
      actorReported: 'UNKNOWN'
    });
    return false;
  }

  const ok = constantTimeEquals_(String(providedToken || ''), expected);
  if (!ok) {
    const prev = getApiTokenFailRecord_();
    const count = (prev && typeof prev.count === 'number' ? prev.count : 0) + 1;
    const record = {
      count: count,
      timestamp: (prev && prev.timestamp) || new Date().toISOString(),
      lockedUntil: count >= API_TOKEN_FAIL_MAX_ATTEMPTS ? (Date.now() + API_TOKEN_FAIL_LOCKOUT_MS) : null
    };
    saveApiTokenFailRecord_(record);
    logAuditEvent_({
      event: 'API_TOKEN_FAILED', stage: 'AUTH_API_TOKEN', errorCode: 'INVALID_API_TOKEN',
      actorReported: 'UNKNOWN'
    });
  } else {
    // token benar -> reset counter
    clearApiTokenFailRecord_();
  }
  return ok;
}

/* ------------------------------------------------------------
 * [WO-2.2 — TRUSTED ACTOR IDENTITY] Login username/password
 * ------------------------------------------------------------
 * LAPISAN KEDUA di atas API_ACCESS_TOKEN (WO-2.0.1). Token tetap
 * gerbang pertama tingkat aplikasi (menolak siapa pun yang tidak
 * tahu token app). Login di bawah ini menjawab pertanyaan berbeda:
 * "siapa operator yang benar-benar melakukan transaksi ini", yang
 * sebelumnya hanya dijawab oleh field PIC self-reported.
 *
 * Model: akun dibuat MANUAL oleh admin (bukan self-registration),
 * lewat createUserAccount_() dijalankan sekali dari editor Apps
 * Script per user baru -- pola sama seperti setupIdempotencyCleanup
 * Trigger_() (manual-run, aman dipanggil ulang).
 *
 * Password TIDAK PERNAH disimpan plaintext. Disimpan sebagai
 * PBKDF2-HMAC-SHA256 (single block, 32 byte) + salt acak per user,
 * di sheet "Users" -- pola sama dengan hashing PIN UangKu Pro yang
 * sudah confirmed aman di audit sebelumnya.
 * ------------------------------------------------------------ */
const SHEET_USERS = 'Users';
const ROLE_ADMIN = 'admin';
const ROLE_OPERATOR = 'operator';
const VALID_ROLES_ = [ROLE_ADMIN, ROLE_OPERATOR];
const USERSCOL = { USERNAME: 1, SALT: 2, HASH: 3, ACTOR_NAME: 4, ACTIVE: 5, CREATED_AT: 6, ROLE: 7 };
const USERS_HEADERS = ['Username', 'Salt', 'PasswordHash', 'ActorName', 'Active', 'CreatedAt', 'Role'];
const PBKDF2_ITERATIONS = 10000; // cukup berat utk brute-force offline, cukup ringan utk GAS runtime (~1 detik)
// [Audit fix — timing side-channel] Salt tetap (BUKAN rahasia, cuma perlu
// ADA supaya pbkdf2Hash_() punya sesuatu utk dihitung) dipakai HANYA saat
// username tidak ditemukan di sheet Users -- lihat verifyUserCredentials_().
const DUMMY_SALT_HEX_ = '00112233445566778899aabbccddeeff00112233445566778899aabbccddee';

/**
 * [ADMIN MANUAL RUN — SETUP] Provisioning eksplisit sheet "Users",
 * TERPISAH dari createUserAccount_()/createUserAccountsBatch_().
 * Sebelumnya sheet ini hanya ter-provision SECARA TIDAK LANGSUNG
 * (side-effect getOrCreateUsersSheet_() yang dipanggil dari dalam
 * upsertUserAccount_()) -- artinya untuk sekadar menyiapkan sheet-nya
 * saja (mis. sebelum operator pertama dibuat, atau mengecek header
 * masih benar), admin terpaksa menjalankan createUserAccount_()
 * dengan placeholder USERNAME_/PLAIN_PASSWORD_ dulu, yang membuat
 * akun sampah "ganti_username" kalau lupa diedit/dihapus.
 *
 * Jalankan SEKALI dari editor Apps Script (pilih fungsi ini di
 * dropdown toolbar, klik Run) sebelum createUserAccount_() pertama
 * kali dipakai. Aman dipanggil berulang -- kalau sheet + header
 * sudah benar, tidak melakukan apa-apa (idempotent, sama pola dgn
 * setupIdempotencyCleanupTrigger_()).
 */
function setupUsersSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const existing = ss.getSheetByName(SHEET_USERS);

  if (!existing) {
    const sheet = getOrCreateUsersSheet_();
    Logger.log('setupUsersSheet_: sheet "' + SHEET_USERS + '" dibuat dengan header ' + USERS_HEADERS.join(', ') + '.');
    return sheet;
  }

  // Sheet sudah ada -- pastikan header baris 1 sesuai USERS_HEADERS.
  // TIDAK menghapus/mengubah data akun yang sudah ada di baris di
  // bawahnya, cuma menulis ulang baris header kalau berbeda/kosong.
  const currentHeaderRange = existing.getRange(1, 1, 1, USERS_HEADERS.length);
  const currentHeader = currentHeaderRange.getValues()[0].map(function (v) { return String(v || '').trim(); });
  const headerMatches = USERS_HEADERS.every(function (h, i) { return currentHeader[i] === h; });

  if (headerMatches) {
    Logger.log('setupUsersSheet_: sheet "' + SHEET_USERS + '" sudah ada dan header sudah benar -- tidak ada perubahan.');
  } else {
    currentHeaderRange.setValues([USERS_HEADERS]);
    Logger.log('setupUsersSheet_: sheet "' + SHEET_USERS + '" sudah ada, header baris 1 ditulis ulang ke ' + USERS_HEADERS.join(', ') + '.');
  }
  return existing;
}

/** Ambil/buat sheet "Users" (auto-provision header kalau belum ada). */
function getOrCreateUsersSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_USERS);
  if (sheet) return sheet;
  try {
    sheet = ss.insertSheet(SHEET_USERS);
    sheet.appendRow(USERS_HEADERS);
    return sheet;
  } catch (e) {
    return ss.getSheetByName(SHEET_USERS);
  }
}

/* ================================================================
 * [WO-ROLE] PENGAJUAN TUMPUL — antrian permintaan operator.
 * Operator TIDAK mengeksekusi transaksi "KEMBALI KE GUDANG (TUMPUL)"
 * langsung (lihat gate di addMovementRow) -- operator cuma bikin baris
 * "permintaan" di sini berstatus MENUNGGU_KONFIRMASI_WH. WH/admin yang
 * cek fisik alat lalu confirmPengajuanTumpul_() -- konfirmasi INI yang
 * baru memanggil addMovementRow() sesungguhnya (reuse pipeline lock/
 * idempotency/audit yang sudah ada, tidak duplikat logika).
 * ================================================================ */
const SHEET_PENGAJUAN_TUMPUL = 'Pengajuan Tumpul';
const PTCOL = {
  ID: 1, TIMESTAMP: 2, USERNAME: 3, ACTOR_NAME: 4, KODE_ALAT: 5, UNIT_ID: 6,
  MESIN: 7, KODE_MESIN: 8, STATUS: 9, TIMESTAMP_KONFIRMASI: 10, KONFIRMASI_OLEH: 11, CATATAN_WH: 12,
  // [REVISI] PIC ditambah di KOLOM PALING AKHIR (bukan disisip di tengah)
  // supaya sheet produksi yang sudah ada baris lama tidak perlu migrasi/
  // geser kolom -- baris lama otomatis kosong di kolom ini, aman dibaca.
  PIC: 13
};
const PENGAJUAN_HEADERS = [
  'ID', 'Timestamp', 'Username', 'ActorName', 'KodeAlat', 'UnitID',
  'Mesin', 'KodeMesin', 'Status', 'TimestampKonfirmasi', 'KonfirmasiOleh', 'CatatanWH', 'PIC'
];
const PENGAJUAN_STATUS_MENUNGGU = 'Menunggu Konfirmasi WH';
const PENGAJUAN_STATUS_SELESAI = 'Selesai';
const PENGAJUAN_STATUS_DITOLAK = 'Ditolak';

function getOrCreatePengajuanTumpulSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_PENGAJUAN_TUMPUL);
  if (sheet) return sheet;
  try {
    sheet = ss.insertSheet(SHEET_PENGAJUAN_TUMPUL);
    sheet.appendRow(PENGAJUAN_HEADERS);
    return sheet;
  } catch (e) {
    return ss.getSheetByName(SHEET_PENGAJUAN_TUMPUL);
  }
}

/**
 * [Action POST: submitPengajuanTumpul] Operator (atau admin) ajukan
 * pengembalian tools tumpul. HANYA menulis baris berstatus "Menunggu
 * Konfirmasi WH" -- TIDAK mengubah Tool Unit/Movement Log sama sekali.
 * @return {{success, id}|{success:false, error}}
 */
function submitPengajuanTumpul_(payload) {
  const sessionCheck = validateSession_(payload && payload.sessionToken);
  if (!sessionCheck.ok) {
    return { success: false, error: sessionCheck.error };
  }
  const unitId = String((payload && payload.unitId) || '').trim();
  const kodeAlat = String((payload && payload.kodeAlat) || '').trim();
  // [REVISI] PIC sekarang wajib diisi dari form pengajuan (bukan cuma
  // actorName hasil login) -- device pencatatan bisa dipakai bergantian
  // oleh beberapa operator, jadi actorName sesi login belum tentu sama
  // dengan orang yang benar-benar mengajukan/membawa fisik alatnya.
  const pic = String((payload && payload.pic) || '').trim();
  if (!unitId || !kodeAlat || !pic) {
    return { success: false, error: { code: 'VALIDATION', message: 'unitId, kodeAlat, dan pic wajib diisi.' } };
  }
  const mesin = String((payload && payload.mesin) || '').trim();
  const kodeMesin = String((payload && payload.kodeMesin) || '').trim();

  const sheet = getOrCreatePengajuanTumpulSheet_();
  const id = 'PT-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  sheet.appendRow([
    id, new Date(), sessionCheck.username, sessionCheck.actorName,
    kodeAlat, unitId, mesin, kodeMesin, PENGAJUAN_STATUS_MENUNGGU, '', '', '', pic
  ]);
  logAuditEvent_({
    event: 'PENGAJUAN_TUMPUL_SUBMITTED', stage: 'PENGAJUAN_TUMPUL',
    unitId: unitId, kodeAlat: kodeAlat,
    actorReported: pic, authenticatedActor: sessionCheck.actorName
  });
  return { success: true, id: id };
}

/**
 * [Action GET: getPengajuanTumpulList] Daftar pengajuan (default: yang
 * masih Menunggu Konfirmasi WH) -- dipakai WH untuk lihat antrian, dan
 * dipakai operator untuk lihat riwayat pengajuan MILIK SENDIRI.
 *
 * [BUGFIX v8.14.1 — AKSES KONTROL] Sebelumnya fungsi ini TIDAK memvalidasi
 * sessionToken sama sekali -- satu-satunya gerbang adalah token API level-
 * app (isAuthorized_ di doGet), yang SAMA untuk semua device/user. Efeknya,
 * siapa pun yang tahu token app (semua operator sudah tahu, tersimpan di
 * Pengaturan tiap device) bisa panggil endpoint ini langsung (bypass UI,
 * mis. lewat console) dan melihat SELURUH pengajuan dari SEMUA operator --
 * termasuk antrian yang seharusnya admin/WH-only -- padahal confirmPengajuan
 * Tumpul_/addMovementRow di sisi POST sudah menegakkan role dgn benar.
 * Sekarang: sessionToken WAJIB valid, dan operator HANYA melihat baris
 * miliknya sendiri (dicocokkan ke `username` hasil validasi session --
 * BUKAN actorName yang self-reported dan bisa sama antar dua orang). Admin/
 * WH tetap melihat semua baris sesuai statusFilter seperti sebelumnya.
 */
function getPengajuanTumpulList_(params) {
  const sessionCheck = validateSession_(params && params.sessionToken);
  if (!sessionCheck.ok) {
    return { error: sessionCheck.error.code + ': ' + sessionCheck.error.message };
  }
  const isOperator = sessionCheck.role === ROLE_OPERATOR;

  const sheet = getOrCreatePengajuanTumpulSheet_();
  const data = sheet.getDataRange().getValues();
  const statusFilter = (params && params.status) || PENGAJUAN_STATUS_MENUNGGU;
  const out = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!String(row[PTCOL.ID - 1]).trim()) continue;
    if (statusFilter !== 'ALL' && String(row[PTCOL.STATUS - 1]).trim() !== statusFilter) continue;
    if (isOperator && String(row[PTCOL.USERNAME - 1]).trim() !== sessionCheck.username) continue;
    out.push({
      id: row[PTCOL.ID - 1], timestamp: formatDateCell_(row[PTCOL.TIMESTAMP - 1]),
      username: row[PTCOL.USERNAME - 1], actorName: row[PTCOL.ACTOR_NAME - 1],
      kodeAlat: row[PTCOL.KODE_ALAT - 1], unitId: row[PTCOL.UNIT_ID - 1],
      mesin: row[PTCOL.MESIN - 1], kodeMesin: row[PTCOL.KODE_MESIN - 1],
      status: row[PTCOL.STATUS - 1], pic: row[PTCOL.PIC - 1] || ''
    });
  }
  return out;
}

/**
 * [Action POST: confirmPengajuanTumpul] HANYA admin/WH. Validasi fisik
 * sudah dilakukan WH di luar sistem -- konfirmasi ini yang baru memicu
 * transaksi resmi "KEMBALI KE GUDANG (TUMPUL)" lewat addMovementRow()
 * (requestId baru dibuat di sini, terpisah dari requestId submit awal).
 * Kalau ditolak (mis. alat ternyata tidak ada), pakai approve:false --
 * status jadi Ditolak, TIDAK ada transaksi yang dibuat.
 */
function confirmPengajuanTumpul_(payload) {
  const sessionCheck = validateSession_(payload && payload.sessionToken);
  if (!sessionCheck.ok) {
    return { success: false, error: sessionCheck.error };
  }
  if (sessionCheck.role === ROLE_OPERATOR) {
    return { success: false, error: { code: 'FORBIDDEN_ROLE', message: 'Hanya admin/WH yang bisa konfirmasi pengajuan.' } };
  }
  const id = String((payload && payload.id) || '').trim();
  if (!id) return { success: false, error: { code: 'VALIDATION', message: 'id pengajuan wajib diisi.' } };
  const approve = payload && payload.approve !== false;

  const sheet = getOrCreatePengajuanTumpulSheet_();
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  let rowData = null;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][PTCOL.ID - 1]).trim() === id) { rowIndex = i + 1; rowData = data[i]; break; }
  }
  if (rowIndex < 0) return { success: false, error: { code: 'NOT_FOUND', message: 'Pengajuan tidak ditemukan.' } };
  if (String(rowData[PTCOL.STATUS - 1]).trim() !== PENGAJUAN_STATUS_MENUNGGU) {
    return { success: false, error: { code: 'ALREADY_PROCESSED', message: 'Pengajuan ini sudah diproses sebelumnya.' } };
  }

  if (!approve) {
    sheet.getRange(rowIndex, PTCOL.STATUS).setValue(PENGAJUAN_STATUS_DITOLAK);
    sheet.getRange(rowIndex, PTCOL.TIMESTAMP_KONFIRMASI).setValue(new Date());
    sheet.getRange(rowIndex, PTCOL.KONFIRMASI_OLEH).setValue(sessionCheck.actorName);
    sheet.getRange(rowIndex, PTCOL.CATATAN_WH).setValue((payload && payload.catatan) || '');
    return { success: true, id: id, status: PENGAJUAN_STATUS_DITOLAK };
  }

  const txResult = addMovementRow({
    sessionToken: payload.sessionToken,
    requestId: 'PT-CONFIRM-' + id + '-' + Utilities.getUuid().slice(0, 8),
    // [REVISI] PIC di Movement Log final sekarang diambil dari PIC yang
    // diisi operator SAAT mengajukan (rowData[PTCOL.PIC]) -- itu orang yang
    // benar-benar membawa/mengembalikan alatnya. Sebelumnya di sini dipakai
    // sessionCheck.actorName (= admin/WH yang konfirmasi), padahal admin
    // cuma memvalidasi fisik, bukan pelaku transaksinya. Atribusi admin
    // yang konfirmasi TETAP tercatat terpisah di kolom KonfirmasiOleh di
    // bawah, jadi tidak ada informasi yang hilang.
    // Fallback ke actorName kalau baris lama (pra-fitur PIC) belum punya
    // nilai di kolom ini.
    pic: String(rowData[PTCOL.PIC - 1] || '').trim() || sessionCheck.actorName,
    unitId: rowData[PTCOL.UNIT_ID - 1],
    kodeAlat: rowData[PTCOL.KODE_ALAT - 1],
    mesin: rowData[PTCOL.MESIN - 1],
    kodeMesin: rowData[PTCOL.KODE_MESIN - 1],
    activity: 'KEMBALI KE GUDANG (TUMPUL)',
    qty: 1
  });
  if (!txResult.success) {
    return { success: false, error: txResult.error, pengajuanId: id };
  }

  sheet.getRange(rowIndex, PTCOL.STATUS).setValue(PENGAJUAN_STATUS_SELESAI);
  sheet.getRange(rowIndex, PTCOL.TIMESTAMP_KONFIRMASI).setValue(new Date());
  sheet.getRange(rowIndex, PTCOL.KONFIRMASI_OLEH).setValue(sessionCheck.actorName);
  sheet.getRange(rowIndex, PTCOL.CATATAN_WH).setValue((payload && payload.catatan) || '');
  return { success: true, id: id, status: PENGAJUAN_STATUS_SELESAI, idTransaksi: txResult.idTransaksi };
}

/** Salt acak 32 byte, sumber randomness dari 2x UUID (RFC4122 v4, GAS-native secure random). */
function generateSalt_() {
  const raw = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  return Utilities.newBlob(raw).getBytes().slice(0, 32);
}

function bytesToHex_(bytes) {
  return bytes.map(function (b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

function hexToBytes_(hex) {
  const out = [];
  for (let i = 0; i < hex.length; i += 2) out.push(parseInt(hex.substr(i, 2), 16));
  return out;
}

/**
 * PBKDF2-HMAC-SHA256, satu blok (dkLen=32=panjang HMAC-SHA256, jadi
 * tidak perlu multi-block concat). Standard construction:
 *   U1 = HMAC(password, salt || INT32BE(1))
 *   Ui = HMAC(password, U(i-1))   untuk i=2..iterations
 *   output = U1 XOR U2 XOR ... XOR Uiterations
 */
function pbkdf2Hash_(password, saltBytes, iterations) {
  const passwordBytes = Utilities.newBlob(String(password)).getBytes();
  const block1 = saltBytes.concat([0, 0, 0, 1]); // INT(1) big-endian 4 byte
  let u = Utilities.computeHmacSha256Signature(block1, passwordBytes);
  const t = u.slice();
  for (let i = 1; i < iterations; i++) {
    u = Utilities.computeHmacSha256Signature(u, passwordBytes);
    for (let j = 0; j < t.length; j++) t[j] ^= u[j];
  }
  return t;
}

/** Bandingkan 2 hex string dengan waktu konstan (menghindari timing side-channel sederhana). */
function constantTimeEquals_(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * [ADMIN MANUAL RUN] Buat/reset SATU akun user. Jalankan SEKALI per
 * user baru dari editor Apps Script: ubah USERNAME_/PLAIN_PASSWORD_/
 * ACTOR_NAME_ di bawah lalu klik Run pada createUserAccount_.
 * Password TIDAK PERNAH ditulis ke sheet dalam bentuk plaintext --
 * hanya salt+hash yang tersimpan. Aman dipanggil ulang dgn username
 * sama untuk reset password (akan update row existing, bukan dobel).
 *
 * [WO-2.2.1] Untuk banyak user sekaligus (tidak perlu edit-Run
 * berulang satu-satu), lihat createUserAccountsBatch_() di bawah --
 * fungsi itu memakai logika upsert yang SAMA (upsertUserAccount_),
 * jadi hasil akhirnya identik, cuma beda cara input.
 */
function createUserAccount_() {
  const USERNAME_ = 'ganti_username';
  const PLAIN_PASSWORD_ = 'ganti_password';
  const ACTOR_NAME_ = 'Nama Lengkap Operator';
  const ROLE_ = ROLE_OPERATOR; // ganti ke ROLE_ADMIN untuk akun WH/admin

  const result = upsertUserAccount_(USERNAME_, PLAIN_PASSWORD_, ACTOR_NAME_, ROLE_);
  Logger.log('createUserAccount_: akun "' + USERNAME_ + '" ' +
    (result.created ? 'dibuat baru.' : 'di-UPDATE (row ' + result.row + ').'));
}

/**
 * [WO-2.2.1 — ADMIN MANUAL RUN, BATCH] Buat/reset BANYAK akun
 * sekaligus dalam satu kali Run -- tidak perlu edit 3 baris lalu Run
 * berulang-ulang per operator seperti createUserAccount_() single.
 *
 * CARA PAKAI: isi array USERS_BATCH_ di bawah, satu baris per
 * operator {username, password, actorName}, lalu pilih fungsi
 * createUserAccountsBatch_ di dropdown toolbar editor, klik Run.
 * Aman dipanggil berulang -- username yang sudah ada di-UPDATE
 * (reset password/nama), username baru ditambah sebagai row baru.
 * Kalau ada baris yang username/password-nya kosong, baris itu
 * di-skip (dicatat sebagai error di ringkasan Logger.log), TIDAK
 * menghentikan proses baris lain -- supaya satu typo tidak
 * menggagalkan seluruh batch.
 *
 * Ringkasan hasil (berapa dibuat/di-update/gagal) muncul di Logger.log
 * (Lihat ▸ Log eksekusi / Executions di editor Apps Script setelah Run).
 */
function createUserAccountsBatch_() {
  const USERS_BATCH_ = [
    { username: 'ganti_username_1', password: 'ganti_password_1', actorName: 'Nama Lengkap Operator 1', role: ROLE_OPERATOR },
    { username: 'ganti_username_2', password: 'ganti_password_2', actorName: 'Nama Lengkap Operator 2', role: ROLE_OPERATOR },
    // Tambah baris lagi di sini sesuai kebutuhan, format sama seperti di atas.
    // role boleh ROLE_ADMIN (WH) atau ROLE_OPERATOR (operator mesin).
    // Kalau field role tidak diisi -> otomatis fallback ke operator (fail-safe).
  ];

  let createdCount = 0;
  let updatedCount = 0;
  const skipped = [];

  USERS_BATCH_.forEach(function (u, idx) {
    const username = u && u.username && String(u.username).trim();
    const password = u && u.password;
    const actorName = u && u.actorName && String(u.actorName).trim();

    if (!username || !password || !actorName) {
      skipped.push('baris ke-' + (idx + 1) + ' (username/password/actorName kosong)');
      return;
    }

    const role = u && u.role;
    const result = upsertUserAccount_(username, password, actorName, role);
    if (result.created) createdCount++; else updatedCount++;
  });

  Logger.log(
    'createUserAccountsBatch_: selesai. Dibuat baru: ' + createdCount +
    ', di-update: ' + updatedCount +
    ', di-skip: ' + skipped.length +
    (skipped.length ? (' (' + skipped.join('; ') + ')') : '') + '.'
  );
}

/**
 * Logika inti upsert akun (dipakai BERSAMA oleh createUserAccount_ dan
 * createUserAccountsBatch_, supaya perilaku keduanya selalu identik --
 * tidak ada logika duplikat yang bisa diverge/salah satu lupa di-update).
 * @param {string} role  'admin' atau 'operator' (lihat ROLE_ADMIN/ROLE_OPERATOR).
 *   Nilai tidak dikenal -> fallback ke ROLE_OPERATOR (fail-safe: akun baru/
 *   tidak jelas rolenya TIDAK BOLEH otomatis dapat akses admin).
 * @return {{created:boolean, row:number}}
 */
function upsertUserAccount_(username, plainPassword, actorName, role) {
  const sheet = getOrCreateUsersSheet_();
  const salt = generateSalt_();
  const hash = pbkdf2Hash_(plainPassword, salt, PBKDF2_ITERATIONS);
  const saltHex = bytesToHex_(salt);
  const hashHex = bytesToHex_(hash);
  const safeRole = VALID_ROLES_.indexOf(role) >= 0 ? role : ROLE_OPERATOR;

  const data = sheet.getDataRange().getValues();
  let existingRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][USERSCOL.USERNAME - 1]).trim() === username.trim()) {
      existingRow = i + 1; // 1-indexed sheet row
      break;
    }
  }

  if (existingRow > 0) {
    sheet.getRange(existingRow, USERSCOL.SALT).setValue(saltHex);
    sheet.getRange(existingRow, USERSCOL.HASH).setValue(hashHex);
    sheet.getRange(existingRow, USERSCOL.ACTOR_NAME).setValue(actorName);
    sheet.getRange(existingRow, USERSCOL.ACTIVE).setValue(true);
    sheet.getRange(existingRow, USERSCOL.ROLE).setValue(safeRole);
    return { created: false, row: existingRow };
  }
  sheet.appendRow([username, saltHex, hashHex, actorName, true, new Date(), safeRole]);
  return { created: true, row: sheet.getLastRow() };
}

/**
 * Verifikasi username+password terhadap sheet Users.
 *
 * [Audit fix — timing side-channel] Versi sebelumnya `continue` cepat
 * kalau username tidak cocok, tapi jalankan PBKDF2 (10.000 iterasi, ~1
 * detik) kalau username cocok tapi password salah -- beda waktu respons
 * ini bisa dipakai menebak username mana yang valid lewat percobaan
 * berulang (timing attack). Sekarang PBKDF2 SELALU dijalankan sekali,
 * baik username ditemukan maupun tidak (pakai DUMMY_SALT_HEX_ kalau
 * tidak ditemukan) -- SEMUA jalur gagal (username tidak ada, akun
 * nonaktif, password salah) menempuh biaya komputasi yang sama sebelum
 * return, sehingga waktu respons tidak lagi membocorkan informasi.
 *
 * @return {{ok:true, actorName:string}|{ok:false}}
 */
function verifyUserCredentials_(username, plainPassword) {
  const sheet = getOrCreateUsersSheet_();
  const data = sheet.getDataRange().getValues();
  const uname = String(username || '').trim();
  if (!uname || !plainPassword) return { ok: false };

  let matchedRow = null;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][USERSCOL.USERNAME - 1]).trim() === uname) {
      matchedRow = data[i];
      break;
    }
  }

  const saltHex = matchedRow ? (String(matchedRow[USERSCOL.SALT - 1]).trim() || DUMMY_SALT_HEX_) : DUMMY_SALT_HEX_;
  const salt = hexToBytes_(saltHex);
  // Dijalankan TANPA PEDULI matchedRow ada atau tidak -- inilah inti fix-nya.
  const computedHashHex = bytesToHex_(pbkdf2Hash_(plainPassword, salt, PBKDF2_ITERATIONS));

  if (!matchedRow) return { ok: false }; // username tidak ditemukan

  const active = matchedRow[USERSCOL.ACTIVE - 1];
  if (active === false || String(active).trim().toUpperCase() === 'FALSE') return { ok: false };

  const expectedHashHex = String(matchedRow[USERSCOL.HASH - 1]).trim();
  if (!saltHex || !expectedHashHex) return { ok: false };
  if (!constantTimeEquals_(computedHashHex, expectedHashHex)) return { ok: false };

  // [WO-ROLE] Backward-compat: akun yang dibuat SEBELUM kolom Role ada
  // punya sel Role kosong. Sengaja fallback ke ROLE_ADMIN (bukan operator)
  // supaya akun WH lama yang sudah dipakai tidak tiba-tiba kehilangan akses
  // saat migrasi -- admin WAJIB isi manual kolom Role di sheet Users untuk
  // akun operator baru (createUserAccountsBatch_ sudah otomatis isi ini).
  const rawRole = String(matchedRow[USERSCOL.ROLE - 1] || '').trim();
  const role = VALID_ROLES_.indexOf(rawRole) >= 0 ? rawRole : ROLE_ADMIN;

  return { ok: true, actorName: String(matchedRow[USERSCOL.ACTOR_NAME - 1]).trim() || uname, role: role };
}

/* ------------------------------------------------------------
 * [WO-2.2] SESSION LIFECYCLE — sama pola dgn idempotency (WO-2.1.3):
 * lookup mengecek expiry sendiri (defense-in-depth) + cleanup harian
 * lewat trigger yang SAMA dengan idempotency (lihat
 * cleanupExpiredIdempotencyRecords_, sudah digeneralisasi untuk
 * membersihkan prefix idem_ DAN sess_ -- tidak perlu setup trigger
 * baru kalau setupIdempotencyCleanupTrigger_ sudah pernah dijalankan).
 * ------------------------------------------------------------ */
const SESSION_KEY_PREFIX = 'sess_';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari, sama dgn idempotency

function generateSessionToken_() {
  return Utilities.getUuid() + Utilities.getUuid(); // 72 char, cukup entropy utk session token
}

function createSession_(username, actorName, role) {
  const token = generateSessionToken_();
  const record = { username: username, actorName: actorName, role: role, timestamp: new Date().toISOString() };
  PropertiesService.getScriptProperties().setProperty(SESSION_KEY_PREFIX + token, JSON.stringify(record));
  return token;
}

/** @return {{username,actorName}|null} null kalau token tidak ada/rusak/kadaluarsa (>7 hari). */
function getSessionRecord_(sessionToken) {
  if (!sessionToken) return null;
  const raw = PropertiesService.getScriptProperties().getProperty(SESSION_KEY_PREFIX + String(sessionToken));
  if (!raw) return null;
  try {
    const record = JSON.parse(raw);
    const ts = record && record.timestamp ? Date.parse(record.timestamp) : NaN;
    if (isNaN(ts) || (Date.now() - ts) > SESSION_TTL_MS) return null; // kadaluarsa
    return record;
  } catch (e) {
    return null;
  }
}

/**
 * [Audit fix — logout tidak invalidasi session] Sebelumnya "logout"
 * murni client-side (hapus token dari localStorage) -- token itu
 * sendiri TETAP HIDUP di Script Properties sampai TTL 7 hari habis.
 * Kalau token sempat bocor (device dipinjam, localStorage ke-dump,
 * dll), klik "Logout" tidak menutup akses sama sekali. Dipanggil
 * dari action 'logout' di doPost SEBELUM token benar2 dibuang di
 * client. Silent no-op kalau token sudah tidak ada/invalid -- logout
 * tidak boleh pernah gagal ke user.
 */
function revokeSession_(sessionToken) {
  if (!sessionToken) return;
  try {
    PropertiesService.getScriptProperties().deleteProperty(SESSION_KEY_PREFIX + String(sessionToken));
  } catch (e) {
    // Logout tidak boleh pernah menggagalkan response ke client.
  }
}

/**
 * Validasi sessionToken dari payload transaksi. Dipanggil DI ADDMOVEMENTROW,
 * SEBELUM lock (murah, sama seperti validasi requestId) -- request tanpa
 * sesi valid ditolak secepat mungkin, tidak pernah masuk critical section.
 * @return {{ok:true, actorName, username}|{ok:false, error:{code,message}}}
 */
function validateSession_(sessionToken) {
  const record = getSessionRecord_(sessionToken);
  if (!record) {
    return {
      ok: false,
      error: {
        code: 'UNAUTHORIZED_SESSION',
        message: 'Sesi login tidak valid atau sudah kedaluwarsa. Silakan login kembali.'
      }
    };
  }
  // Fallback ROLE_ADMIN utk session lama (dibuat sebelum field role ada di
  // record) -- konsisten dengan fallback di verifyUserCredentials_.
  const role = VALID_ROLES_.indexOf(record.role) >= 0 ? record.role : ROLE_ADMIN;
  return { ok: true, actorName: record.actorName, username: record.username, role: role };
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.action) {
    if (!isAuthorized_(params.token)) {
      return jsonOutput_({ error: 'UNAUTHORIZED: token API tidak valid atau tidak disertakan.' });
    }
    return handleApiRequest_(params);
  }

  // Fallback: kalau URL dibuka langsung tanpa ?action= (mis. dicek manual
  // di browser), tetap render index.html lama supaya tidak 404 — TIDAK
  // dipakai oleh frontend Phase 3A yang sudah di-host terpisah.
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Monitoring Saw Blade & Cutter')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * [BUGFIX-01] doPost TIDAK ADA sebelumnya. Ini satu-satunya entry
 * point yang dipanggil apiPost('addMovementRow', payload) dari
 * frontend. Body dikirim sbg text/plain (sengaja, biar tidak kena
 * CORS preflight) berisi JSON string {action, payload}.
 */
function doPost(e) {
  let body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return jsonOutput_({ success: false, error: { code: 'PARSE', message: 'Body request tidak valid (bukan JSON).' } });
  }

  // [WO-2.0.1] Gate token — dicek SEBELUM apa pun lain (termasuk sebelum
  // requestId/payload dibaca), konsisten dgn addMovementRow yang menolak
  // secepat mungkin utk request tidak valid.
  if (!isAuthorized_(body.token)) {
    return jsonOutput_({ success: false, error: { code: 'UNAUTHORIZED', message: 'Token API tidak valid atau tidak disertakan.' } });
  }

  const action = body.action;
  const payload = body.payload || {};

  if (action === 'addMovementRow') {
    return jsonOutput_(addMovementRow(payload));
  }

  if (action === 'login') {
    return jsonOutput_(loginUser_(payload));
  }

  if (action === 'logout') {
    return jsonOutput_(logoutUser_(payload));
  }

  if (action === 'submitPengajuanTumpul') {
    return jsonOutput_(submitPengajuanTumpul_(payload));
  }

  if (action === 'confirmPengajuanTumpul') {
    return jsonOutput_(confirmPengajuanTumpul_(payload));
  }

  return jsonOutput_({ success: false, error: { code: 'UNKNOWN_ACTION', message: 'Action POST tidak dikenali: ' + action } });
}

/**
 * [Audit fix — tidak ada rate-limit login] Lockout sementara per
 * username setelah beberapa kali gagal berturut-turut. Dikunci
 * dengan key NORMALISASI SAMA seperti pencarian akun asli (trim
 * saja, case-sensitive) -- SENGAJA diterapkan ke username apa pun
 * yang dicoba, termasuk yang tidak terdaftar, supaya respons
 * "terkunci" tidak jadi oracle baru utk menebak username valid
 * (perilakunya sama persis baik akun itu ada maupun tidak).
 */
const LOGIN_FAIL_KEY_PREFIX = 'loginfail_';
const LOGIN_FAIL_MAX_ATTEMPTS = 5;
const LOGIN_FAIL_LOCKOUT_MS = 15 * 60 * 1000; // 15 menit
const LOGIN_FAIL_RECORD_TTL_MS = 24 * 60 * 60 * 1000; // batas atas cleanup harian, lihat cleanupExpiredIdempotencyRecords_

/**
 * [Audit fix — tidak ada rate-limit token API] Lockout sementara
 * setelah beberapa kali gagal berturut-turut memasukkan token API
 * yang salah. Berbeda dengan login (per-username), ini GLOBAL
 * (per-deployment) karena token app bersifat shared untuk semua
 * device/frontend. Cukup ketat utk mencegah brute-force token
 * tanpa memblokir user yang benar terlalu lama.
 */
const API_TOKEN_FAIL_KEY = 'apitokenfail_'; // global key (bukan per-IP/user)
const API_TOKEN_FAIL_MAX_ATTEMPTS = 10; // lebih longgar dari login (5x) karena token shared
const API_TOKEN_FAIL_LOCKOUT_MS = 15 * 60 * 1000; // 15 menit
const API_TOKEN_FAIL_RECORD_TTL_MS = 24 * 60 * 60 * 1000; // batas atas cleanup harian

function getApiTokenFailRecord_() {
  const raw = PropertiesService.getScriptProperties().getProperty(API_TOKEN_FAIL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveApiTokenFailRecord_(record) {
  PropertiesService.getScriptProperties().setProperty(API_TOKEN_FAIL_KEY, JSON.stringify(record));
}

function clearApiTokenFailRecord_() {
  PropertiesService.getScriptProperties().deleteProperty(API_TOKEN_FAIL_KEY);
}

function getLoginFailRecord_(uname) {
  const raw = PropertiesService.getScriptProperties().getProperty(LOGIN_FAIL_KEY_PREFIX + uname);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveLoginFailRecord_(uname, record) {
  PropertiesService.getScriptProperties().setProperty(LOGIN_FAIL_KEY_PREFIX + uname, JSON.stringify(record));
}

function clearLoginFailRecord_(uname) {
  PropertiesService.getScriptProperties().deleteProperty(LOGIN_FAIL_KEY_PREFIX + uname);
}

/**
 * [WO-2.2] Login username/password -> session token (TTL 7 hari).
 * Pesan error SENGAJA generic ("username atau password salah") baik
 * untuk username tidak ditemukan maupun password salah -- tidak
 * membedakan keduanya supaya tidak membocorkan username mana yang
 * valid ke pihak yang mencoba menebak.
 */
function loginUser_(payload) {
  const username = payload && payload.username;
  const password = payload && payload.password;
  const uname = String(username || '').trim();

  // [Audit fix — rate-limit] Cek lockout SEBELUM verifyUserCredentials_
  // (murah, sebelum PBKDF2 dijalankan) -- kalau sudah terkunci, tidak
  // perlu hitung hash sama sekali.
  if (uname) {
    const failRecord = getLoginFailRecord_(uname);
    if (failRecord && failRecord.lockedUntil && Date.now() < failRecord.lockedUntil) {
      logAuditEvent_({
        event: 'LOGIN_LOCKED', stage: 'AUTH_LOGIN', errorCode: 'ACCOUNT_LOCKED',
        actorReported: uname || 'UNKNOWN'
      });
      return {
        success: false,
        error: { code: 'ACCOUNT_LOCKED', message: 'Terlalu banyak percobaan login gagal. Coba lagi dalam beberapa menit.' }
      };
    }
  }

  const result = verifyUserCredentials_(username, password);
  if (!result.ok) {
    if (uname) {
      const prev = getLoginFailRecord_(uname);
      const count = (prev && typeof prev.count === 'number' ? prev.count : 0) + 1;
      const record = {
        count: count,
        timestamp: (prev && prev.timestamp) || new Date().toISOString(), // dipakai cleanup harian sbg TTL anchor
        lockedUntil: count >= LOGIN_FAIL_MAX_ATTEMPTS ? (Date.now() + LOGIN_FAIL_LOCKOUT_MS) : null
      };
      saveLoginFailRecord_(uname, record);
    }
    logAuditEvent_({
      event: 'LOGIN_FAILED', stage: 'AUTH_LOGIN', errorCode: 'INVALID_CREDENTIALS',
      actorReported: username || 'UNKNOWN'
    });
    return {
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Username atau password salah.' }
    };
  }

  if (uname) clearLoginFailRecord_(uname); // login berhasil -> reset counter

  const sessionToken = createSession_(String(username).trim(), result.actorName, result.role);
  logAuditEvent_({
    event: 'LOGIN_SUCCESS', stage: 'AUTH_LOGIN',
    actorReported: username, authenticatedActor: result.actorName
  });
  return { success: true, sessionToken: sessionToken, actorName: result.actorName, role: result.role };
}

/**
 * [Audit fix — logout tidak invalidasi session] Server-side counterpart
 * dari revokeSession_(). Selalu return success:true (bahkan kalau token
 * sudah tidak valid/expired) -- dari sudut pandang user, logout SELALU
 * "berhasil" karena efek akhirnya (client tidak lagi punya token) sama.
 * Audit event dicatat SEBELUM revoke supaya actorName masih terbaca dari
 * session yang mau dihapus.
 */
function logoutUser_(payload) {
  const sessionToken = payload && payload.sessionToken;
  const record = getSessionRecord_(sessionToken);
  if (record) {
    logAuditEvent_({
      event: 'LOGOUT', stage: 'AUTH_LOGOUT',
      actorReported: record.username, authenticatedActor: record.actorName
    });
  }
  revokeSession_(sessionToken);
  return { success: true };
}

/**
 * [BUGFIX-01] Dispatcher untuk semua action GET (read-only). Setiap
 * action dikembalikan APA ADANYA sebagai JSON (bukan dibungkus
 * {success,data}) karena begitulah kontrak yang sudah diasumsikan
 * frontend, mis. renderDashboard(d) langsung baca d.total, d.kritis, dst.
 */
function handleApiRequest_(params) {
  try {
    let result;
    switch (params.action) {
      case 'getDashboardSummary':
        result = getDashboardSummary();
        break;
      case 'getStockStatusList':
        result = getStockStatusList();
        break;
      case 'getMasterToolsList':
        result = getMasterToolsList();
        break;
      case 'getMesinOptionsForKodeAlat':
        result = getMesinOptionsForKodeAlat(params.kodeAlat);
        break;
      case 'getUnitsByKodeAlat':
        result = getUnitsByKodeAlat(params.kodeAlat, params.statusFilter);
        break;
      case 'getActivityOptions':
        result = getActivityOptions();
        break;
      case 'getRecentTransactions':
        result = getRecentTransactions(Number(params.limit) || 30);
        break;
      case 'getKontrolAsahList':
        result = getKontrolAsahList();
        break;
      case 'getVendorPerformance':
        result = getVendorPerformance();
        break;
      case 'getMachineWearStats':
        result = getMachineWearStats();
        break;
      case 'getPengajuanTumpulList':
        result = getPengajuanTumpulList_(params);
        break;
      case 'getLeadTimeByMachine':
        result = getLeadTimeByMachine();
        break;
      case 'getMachineList':
        result = getMachineList();
        break;
      case 'getUnitsByMesin':
        result = getUnitsByMesin(params.kodeMesin, params.statusFilter);
        break;
      case 'getKodeAlatOptionsForMesin':
        result = getKodeAlatOptionsForMesin(params.kodeMesin);
        break;
      case 'getBackendVersion':
        result = { version: BACKEND_VERSION };
        break;
      default:
        return jsonOutput_({ error: 'Action GET tidak dikenali: ' + params.action });
    }
    return jsonOutput_(result);
  } catch (err) {
    return jsonOutput_({ error: 'Gagal memproses "' + params.action + '": ' + err.message });
  }
}

/** [BUGFIX-01] Output JSON standar utk semua response API (GET & POST). */
function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Helper untuk include file terpisah (CSS/JS) kalau nanti index.html dipecah. */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


/* ------------------------------------------------------------
 * DASHBOARD
 * ------------------------------------------------------------ */
function getDashboardSummary() {
  const sheet = getSheet_(SHEET_STOCK_STATUS);
  const numRows = sheet.getLastRow() - 1;
  if (numRows <= 0) return emptySummary_();

  const col = resolveStockStatusColumns_(sheet);
  const lastCol = sheet.getLastColumn();
  const data = sheet.getRange(2, 1, numRows, lastCol).getValues();
  let total = 0, dipakai = 0, tungguAsah = 0, diasah = 0, siapPakai = 0, kritis = 0;

  data.forEach(function (row) {
    const kodeAlat = String(row[col.KODE_ALAT - 1]).trim();
    if (!kodeAlat) return;

    total += num_(row[col.TOTAL - 1]);
    dipakai += num_(row[col.DIPAKAI - 1]);
    tungguAsah += num_(row[col.TUNGGU_ASAH - 1]);
    diasah += num_(row[col.DIASAH - 1]);
    siapPakai += num_(row[col.SIAP_PAKAI - 1]);

    const status = String(row[col.STATUS - 1]).trim().toUpperCase();
    if (status === 'KRITIS' || status === 'HABIS') kritis++;
  });

  return { total: total, siapPakai: siapPakai, dipakai: dipakai, tungguAsah: tungguAsah, diasah: diasah, kritis: kritis };
}

function emptySummary_() {
  return { total: 0, siapPakai: 0, dipakai: 0, tungguAsah: 0, diasah: 0, kritis: 0 };
}


/** Daftar tool + status stok, untuk tab "Stok". Bisa difilter kata kunci di client. */
function getStockStatusList() {
  const sheet = getSheet_(SHEET_STOCK_STATUS);
  const numRows = sheet.getLastRow() - 1;
  if (numRows <= 0) return [];

  const col = resolveStockStatusColumns_(sheet);
  const lastCol = sheet.getLastColumn();
  const data = sheet.getRange(2, 1, numRows, lastCol).getValues();

  return data
    .filter(function (row) { return String(row[col.KODE_ALAT - 1]).trim(); })
    .map(function (row) {
      return {
        kodeAlat: String(row[col.KODE_ALAT - 1]).trim(),
        namaAlat: String(row[col.NAMA_ALAT - 1]).trim(),
        spesifikasi: String(row[col.SPESIFIKASI - 1]).trim(),
        total: num_(row[col.TOTAL - 1]),
        siapPakai: num_(row[col.SIAP_PAKAI - 1]),
        tungguAsah: num_(row[col.TUNGGU_ASAH - 1]),
        diasah: num_(row[col.DIASAH - 1]),
        status: String(row[col.STATUS - 1]).trim()
      };
    });
}


/* ------------------------------------------------------------
 * DATA UNTUK FORM INPUT
 * ------------------------------------------------------------ */

/** Daftar Kode Alat untuk dropdown — sumbernya Master Tools, BUKAN Movement Log. */
function getMasterToolsList() {
  const sheet = getSheet_(SHEET_MASTER_TOOLS);
  const numRows = sheet.getLastRow() - 1;
  if (numRows <= 0) return [];

  const data = sheet.getRange(2, 1, numRows, MTCOL.SPESIFIKASI).getValues();

  return data
    .filter(function (row) { return String(row[MTCOL.KODE_ALAT - 1]).trim(); })
    .map(function (row) {
      return {
        kodeAlat: String(row[MTCOL.KODE_ALAT - 1]).trim(),
        namaAlat: String(row[MTCOL.NAMA_ALAT - 1]).trim(),
        spesifikasi: String(row[MTCOL.SPESIFIKASI - 1]).trim()
      };
    });
}

/** Daftar mesin valid untuk 1 Kode Alat, sumbernya Mapping Alat Mesin. */
function getMesinOptionsForKodeAlat(kodeAlat) {
  const target = normalizeKodeAlat(kodeAlat);
  const sheet = getSheet_(SHEET_MAPPING);
  const numRows = sheet.getLastRow() - 1;
  if (numRows <= 0) return [];

  const data = sheet.getRange(2, 1, numRows, MAPCOL.MESIN).getValues();

  return data
    .filter(function (row) { return normalizeKodeAlat(row[MAPCOL.KODE_ALAT - 1]) === target; })
    .map(function (row) {
      return { kodeMesin: String(row[MAPCOL.KODE_MESIN - 1]).trim(), mesin: String(row[MAPCOL.MESIN - 1]).trim() };
    })
    .filter(function (m) { return m.kodeMesin && m.kodeMesin !== 'BELUM DISET'; });
}

/**
 * Daftar Unit_ID untuk 1 Kode Alat, difilter status unit sesuai activity
 * yang mau dicatat (mis. hanya unit GUDANG yang muncul saat mau DIPASANG KE MESIN).
 */
function getUnitsByKodeAlat(kodeAlat, statusFilter) {
  const target = normalizeKodeAlat(kodeAlat);
  const sheet = getSheet_(SHEET_TOOL_UNIT);
  const numRows = sheet.getLastRow() - 1;
  if (numRows <= 0) return [];

  const data = sheet.getRange(2, 1, numRows, TUCOL.KODE_MESIN).getValues();

  return data
    .filter(function (row) { return normalizeKodeAlat(row[TUCOL.KODE_ALAT - 1]) === target; })
    .map(function (row) {
      return {
        unitId: String(row[TUCOL.UNIT_ID - 1]).trim(),
        statusUnit: String(row[TUCOL.STATUS_UNIT - 1]).trim(),
        lokasi: String(row[TUCOL.LOKASI - 1]).trim(),
        // [BUGFIX v8.14.1] Sebelumnya kolom ini DIBACA (lihat getRange di atas,
        // sudah sampai TUCOL.KODE_MESIN) tapi TIDAK PERNAH dimasukkan ke object
        // hasil -- akibatnya frontend (onAjukanUnitChange_) selalu dapat
        // u.kodeMesin === undefined, field "Mesin" di panel Ajukan Pengembalian
        // Tumpul tidak pernah auto-terisi, dan setiap pengajuan tersimpan
        // dengan KodeMesin/Mesin kosong di sheet "Pengajuan Tumpul".
        kodeMesin: String(row[TUCOL.KODE_MESIN - 1]).trim()
      };
    })
    .filter(function (u) { return u.unitId; })
    .filter(function (u) { return !statusFilter || u.statusUnit.toUpperCase() === statusFilter.toUpperCase(); });
}

/**
 * [MERGE dari Code_v6-fixed.gs] Daftar Kode Mesin unik dari sheet
 * "Mapping Alat Mesin", dipakai untuk dropdown Mesin saat frontend
 * jalan dalam mode "mesin-dulu" (pilih mesin dulu baru kode alat).
 * Frontend (index-7.html) sudah memanggil apiGet('getMachineList')
 * tapi fungsi ini sebelumnya belum ada di file v5_18_1 ini.
 */
function getMachineList() {
  const sheet = getSheet_(SHEET_MAPPING);
  const numRows = sheet.getLastRow() - 1;
  if (numRows <= 0) return [];

  const data = sheet.getRange(2, 1, numRows, MAPCOL.MESIN).getValues();
  const seen = {};
  const list = [];

  data.forEach(function (row) {
    const kodeMesin = String(row[MAPCOL.KODE_MESIN - 1]).trim();
    const mesin = String(row[MAPCOL.MESIN - 1]).trim();
    if (!kodeMesin || kodeMesin === 'BELUM DISET') return;
    if (seen[kodeMesin]) return;
    seen[kodeMesin] = true;
    list.push({ kodeMesin: kodeMesin, mesin: mesin });
  });

  list.sort(function (a, b) { return a.kodeMesin.localeCompare(b.kodeMesin); });
  return list;
}

/**
 * [MERGE dari Code_v6-fixed.gs] Daftar Unit_ID yang tercatat di 1 Kode
 * Mesin tertentu, dipakai saat activity = "KEMBALI KE GUDANG (TUMPUL)"
 * dalam mode mesin-dulu, supaya Kode Alat & Unit yang muncul dibatasi ke
 * apa yang BENAR-BENAR terpasang di mesin itu sekarang.
 */
function getUnitsByMesin(kodeMesin, statusFilter) {
  const target = normalizeKodeAlat(kodeMesin); // trim+uppercase, generik utk kode apapun
  const sheet = getSheet_(SHEET_TOOL_UNIT);
  const numRows = sheet.getLastRow() - 1;
  if (numRows <= 0) return [];

  const data = sheet.getRange(2, 1, numRows, TUCOL.KODE_MESIN).getValues();

  return data
    .filter(function (row) { return normalizeKodeAlat(row[TUCOL.KODE_MESIN - 1]) === target; })
    .map(function (row) {
      return {
        kodeAlat: String(row[TUCOL.KODE_ALAT - 1]).trim(),
        unitId: String(row[TUCOL.UNIT_ID - 1]).trim(),
        statusUnit: String(row[TUCOL.STATUS_UNIT - 1]).trim(),
        lokasi: String(row[TUCOL.LOKASI - 1]).trim(),
        kodeMesin: String(row[TUCOL.KODE_MESIN - 1]).trim()
      };
    })
    .filter(function (u) { return u.unitId; })
    .filter(function (u) { return !statusFilter || u.statusUnit.toUpperCase() === statusFilter.toUpperCase(); });
}

/**
 * [MERGE dari Code_v6-fixed.gs] Daftar Kode Alat yang valid dipasang di
 * 1 Kode Mesin tertentu, dipakai saat activity = "DIPASANG KE MESIN"
 * dalam mode mesin-dulu. Sumbernya "Mapping Alat Mesin" (kebalikan dari
 * getMesinOptionsForKodeAlat, yang jalan dari arah Kode Alat -> Mesin).
 */
function getKodeAlatOptionsForMesin(kodeMesin) {
  const target = normalizeKodeAlat(kodeMesin);
  const sheet = getSheet_(SHEET_MAPPING);
  const numRows = sheet.getLastRow() - 1;
  if (numRows <= 0) return [];

  const data = sheet.getRange(2, 1, numRows, MAPCOL.MESIN).getValues();
  const seen = {};
  const list = [];

  data.forEach(function (row) {
    const rowKodeMesin = normalizeKodeAlat(row[MAPCOL.KODE_MESIN - 1]);
    if (rowKodeMesin !== target) return;
    const kodeAlat = String(row[MAPCOL.KODE_ALAT - 1]).trim();
    if (!kodeAlat || seen[kodeAlat]) return;
    seen[kodeAlat] = true;
    list.push({ kodeAlat: kodeAlat });
  });

  return list;
}

/** Daftar activity resmi, dipakai untuk dropdown Activity di form. */
function getActivityOptions() {
  return getValidActivities(); // lihat BAGIAN 3 di bawah
}


/* ------------------------------------------------------------
 * RIWAYAT TRANSAKSI
 * ------------------------------------------------------------ */
function getRecentTransactions(limit) {
  limit = limit || 30;
  const sheet = getSheet_(SHEET_MOVEMENT_LOG); // lihat BAGIAN 2 di bawah
  const numRows = sheet.getLastRow() - 1;
  if (numRows <= 0) return [];

  const data = sheet.getRange(2, 1, numRows, COL.REMARK).getValues(); // COL dari BAGIAN 2

  const rows = data
    .filter(function (row) { return String(row[COL.KODE_ALAT - 1]).trim() && String(row[COL.ACTIVITY - 1]).trim(); })
    .map(function (row) {
      return {
        tanggal: formatDateCell_(row[COL.TANGGAL - 1]),
        kodeAlat: String(row[COL.KODE_ALAT - 1]).trim(),
        unitId: String(row[COL.UNIT_ID - 1]).trim(),
        activity: String(row[COL.ACTIVITY - 1]).trim(),
        qty: num_(row[COL.QTY - 1]),
        pic: String(row[COL.PIC - 1]).trim()
      };
    });

  return rows.slice(Math.max(0, rows.length - limit)).reverse();
}

function formatDateCell_(value) {
  if (!value) return '-';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  }
  return String(value);
}


/* ------------------------------------------------------------
 * [FITUR-KONTROL-ASAH] KONTROL ASAH — dipakai panel "Lainnya"
 * ------------------------------------------------------------ */

/**
 * Daftar unit yang SEDANG dalam proses asah (MENUNGGU KIRIM ke vendor
 * atau PROSES ASAH di vendor). Baris berstatus SELESAI/kosong tidak
 * disertakan — itu histori, bukan sesuatu yang perlu "dikontrol".
 * `hariBerjalan` diambil langsung dari kolom yang sudah dihitung sheet
 * (Lead Time Tunggu untuk MENUNGGU KIRIM, Lead Time Asah untuk PROSES
 * ASAH), diurutkan dari yang paling lama berjalan (paling perlu
 * ditindaklanjuti duluan).
 */
function getKontrolAsahList() {
  const sheet = getSheet_(SHEET_KONTROL_ASAH);
  const numRows = sheet.getLastRow() - 1;
  if (numRows <= 0) return [];

  const lastCol = Math.max(sheet.getLastColumn(), KACOL.STATUS_ASAH);
  const data = sheet.getRange(2, 1, numRows, lastCol).getValues();

  return data
    .filter(function (row) {
      const status = String(row[KACOL.STATUS_ASAH - 1]).trim().toUpperCase();
      return status === 'MENUNGGU KIRIM' || status === 'PROSES ASAH';
    })
    .map(function (row) {
      const status = String(row[KACOL.STATUS_ASAH - 1]).trim().toUpperCase();
      const hariBerjalan = status === 'MENUNGGU KIRIM'
        ? num_(row[KACOL.LEAD_TIME_TUNGGU - 1])
        : num_(row[KACOL.LEAD_TIME_ASAH - 1]);
      return {
        kodeAlat: String(row[KACOL.KODE_ALAT - 1]).trim(),
        unitId: String(row[KACOL.UNIT_ID - 1]).trim(),
        spesifikasi: String(row[KACOL.SPESIFIKASI - 1]).trim(),
        mesin: String(row[KACOL.MESIN - 1]).trim(),
        vendor: String(row[KACOL.VENDOR - 1]).trim(),
        statusAsah: status,
        tglMasukWH: formatDateCell_(row[KACOL.TGL_MASUK_WH - 1]),
        tglKirimAsah: formatDateCell_(row[KACOL.TGL_KIRIM_ASAH - 1]),
        hariBerjalan: hariBerjalan,
        counter: num_(row[KACOL.COUNTER - 1])
      };
    })
    .filter(function (r) { return r.kodeAlat && r.unitId; })
    .sort(function (a, b) { return b.hariBerjalan - a.hariBerjalan; });
}

/** Ringkasan performa vendor asah (rata-rata & maksimum lead time), dari sheet "Performa Vendor". */
function getVendorPerformance() {
  const sheet = getSheet_(SHEET_PERFORMA_VENDOR);
  const numRows = sheet.getLastRow() - 1;
  if (numRows <= 0) return [];

  const data = sheet.getRange(2, 1, numRows, 4).getValues();

  return data
    .filter(function (row) { return String(row[0]).trim(); })
    .map(function (row) {
      return {
        vendor: String(row[0]).trim(),
        avgLeadTime: Math.round(num_(row[1]) * 10) / 10,
        maxLeadTime: num_(row[2]),
        selisihTelat: Math.round(num_(row[3]) * 10) / 10
      };
    });
}


/* ------------------------------------------------------------
 * [FITUR-MESIN] ANALITIK PER MESIN
 * ------------------------------------------------------------
 * [BUGFIX-03] Panel "Analitik per Mesin" (index.html) memanggil
 * action 'getMachineWearStats' & 'getLeadTimeByMachine' lewat
 * apiGet(), tapi kedua fungsi ini TIDAK PERNAH ada di Code.gs dan
 * TIDAK PERNAH didaftarkan di switch handleApiRequest_() — jadi
 * setiap request selalu jatuh ke `default: Action GET tidak
 * dikenali`, ditangkap sebagai error generik oleh frontend, dan
 * panel selalu menampilkan "Data belum dapat dimuat". Ini bug
 * "fitur mesin belum bisa berjalan" yang dilaporkan. Fix di bawah
 * mengimplementasikan kedua fungsi dari data yang sudah ada
 * (Movement Log & Kontrol Asah), tanpa perlu sheet baru.
 * ------------------------------------------------------------ */

/**
 * [BUGFIX-03] "Mesin Paling Boros / Cepat Ganti": ranking Kode Mesin
 * berdasarkan jumlah unit yang kembali ke gudang dalam kondisi tumpul
 * (activity = "KEMBALI KE GUDANG (TUMPUL)"), plus rata-rata "usia
 * pakai" (hari dari saat dipasang -> saat kembali tumpul) per mesin,
 * dihitung dengan memasangkan tiap event DIPASANG KE MESIN dengan
 * event KEMBALI KE GUDANG (TUMPUL) berikutnya untuk unit yang sama.
 */
function getMachineWearStats() {
  const sheet = getSheet_(SHEET_MOVEMENT_LOG);
  const numRows = sheet.getLastRow() - 1;
  if (numRows <= 0) return [];

  const data = sheet.getRange(2, 1, numRows, COL.REMARK).getValues()
    .filter(function (row) {
      return String(row[COL.UNIT_ID - 1]).trim() && String(row[COL.ACTIVITY - 1]).trim();
    })
    .map(function (row) {
      return {
        tanggal: row[COL.TANGGAL - 1],
        unitId: String(row[COL.UNIT_ID - 1]).trim(),
        kodeMesin: String(row[COL.KODE_MESIN - 1]).trim(),
        activity: String(row[COL.ACTIVITY - 1]).trim().toUpperCase()
      };
    })
    .sort(function (a, b) { return toDateMs_(a.tanggal) - toDateMs_(b.tanggal); });

  // Kelompokkan per unit supaya event DIPASANG dipasangkan dengan
  // KEMBALI TUMPUL berikutnya untuk unit yang sama (bukan lintas unit).
  const byUnit = {};
  data.forEach(function (r) {
    if (!byUnit[r.unitId]) byUnit[r.unitId] = [];
    byUnit[r.unitId].push(r);
  });

  const statsByMesin = {}; // kodeMesin -> { totalGanti, totalPasang, usiaList: [hari,...] }
  function ensureMesin_(kode) {
    if (!statsByMesin[kode]) statsByMesin[kode] = { totalGanti: 0, totalPasang: 0, usiaList: [] };
    return statsByMesin[kode];
  }

  Object.keys(byUnit).forEach(function (unitId) {
    const events = byUnit[unitId];
    let pendingPasang = null; // { tanggal, kodeMesin }
    events.forEach(function (ev) {
      if (ev.activity === 'DIPASANG KE MESIN') {
        if (ev.kodeMesin) ensureMesin_(ev.kodeMesin).totalPasang++;
        pendingPasang = ev.kodeMesin ? { tanggal: ev.tanggal, kodeMesin: ev.kodeMesin } : null;
      } else if (ev.activity === 'KEMBALI KE GUDANG (TUMPUL)') {
        const kode = ev.kodeMesin || (pendingPasang && pendingPasang.kodeMesin);
        if (kode) {
          const st = ensureMesin_(kode);
          st.totalGanti++;
          if (pendingPasang && pendingPasang.kodeMesin === kode) {
            const days = daysBetween_(pendingPasang.tanggal, ev.tanggal);
            if (days !== null && days >= 0) st.usiaList.push(days);
          }
        }
        pendingPasang = null;
      }
    });
  });

  return Object.keys(statsByMesin)
    .map(function (kode) {
      const st = statsByMesin[kode];
      const avgUsiaHari = st.usiaList.length
        ? Math.round((st.usiaList.reduce(function (a, b) { return a + b; }, 0) / st.usiaList.length) * 10) / 10
        : null;
      return {
        kodeMesin: kode,
        totalGanti: st.totalGanti,
        totalPasang: st.totalPasang,
        avgUsiaHari: avgUsiaHari
      };
    })
    .filter(function (r) { return r.totalGanti > 0; })
    .sort(function (a, b) { return b.totalGanti - a.totalGanti; });
}

/**
 * [BUGFIX-03] "Lead Time Asah per Mesin": rata-rata & maksimum Lead
 * Time Asah (kolom KACOL.LEAD_TIME_ASAH, sudah dihitung sheet
 * "Kontrol Asah") dikelompokkan per Kode Mesin, HANYA untuk siklus
 * berstatus SELESAI (histori), diurutkan dari rata-rata terlama.
 */
function getLeadTimeByMachine() {
  const sheet = getSheet_(SHEET_KONTROL_ASAH);
  const numRows = sheet.getLastRow() - 1;
  if (numRows <= 0) return [];

  const lastCol = Math.max(sheet.getLastColumn(), KACOL.STATUS_ASAH);
  const data = sheet.getRange(2, 1, numRows, lastCol).getValues();

  const statsByMesin = {}; // kodeMesin -> { leadTimes: [...] }
  data.forEach(function (row) {
    const status = String(row[KACOL.STATUS_ASAH - 1]).trim().toUpperCase();
    if (status !== 'SELESAI') return;
    const kode = String(row[KACOL.KODE_MESIN - 1]).trim();
    if (!kode) return;
    const leadTime = num_(row[KACOL.LEAD_TIME_ASAH - 1]);
    if (!statsByMesin[kode]) statsByMesin[kode] = [];
    statsByMesin[kode].push(leadTime);
  });

  return Object.keys(statsByMesin)
    .map(function (kode) {
      const leadTimes = statsByMesin[kode];
      const avgLeadTime = Math.round((leadTimes.reduce(function (a, b) { return a + b; }, 0) / leadTimes.length) * 10) / 10;
      const maxLeadTime = Math.max.apply(null, leadTimes);
      return {
        kodeMesin: kode,
        jumlahSiklus: leadTimes.length,
        avgLeadTime: avgLeadTime,
        maxLeadTime: maxLeadTime
      };
    })
    .sort(function (a, b) { return b.avgLeadTime - a.avgLeadTime; });
}

/** Konversi sel tanggal (Date object atau string) ke epoch ms, untuk sort/selisih hari. */
function toDateMs_(value) {
  if (!value) return 0;
  if (Object.prototype.toString.call(value) === '[object Date]') return value.getTime();
  const d = new Date(value);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

/** Selisih hari (dibulatkan) antara dua sel tanggal; null kalau salah satu tidak valid. */
function daysBetween_(a, b) {
  const msA = toDateMs_(a);
  const msB = toDateMs_(b);
  if (!msA || !msB) return null;
  return Math.round((msB - msA) / 86400000);
}


/* ------------------------------------------------------------
 * UTIL UMUM
 * ------------------------------------------------------------ */
function getSheet_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" tidak ditemukan.');
  return sheet;
}

function num_(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}


/* ================================================================
 * BAGIAN 2 — MOVEMENT LOG / GENERATE ID (dulu GenerateID_v2.gs)
 * ================================================================ */

const SHEET_MOVEMENT_LOG = 'Movement Log';

/**
 * Urutan kolom Movement Log (1-indexed) — sudah dicocokkan ke header
 * asli sheet "Movement Log":
 * Tanggal, Kode Alat, Unit_ID, ID_Transaksi, Spesifikasi Alat, Mesin,
 * Kode Mesin, Activity, Qty, Cycle_ID, Counter, PIC, Remark.
 */
const COL = {
  TANGGAL: 1,
  KODE_ALAT: 2,
  UNIT_ID: 3,
  ID_TRANSAKSI: 4,
  SPESIFIKASI: 5,
  MESIN: 6,
  KODE_MESIN: 7,
  ACTIVITY: 8,
  QTY: 9,
  CYCLE_ID: 10,
  COUNTER: 11,
  PIC: 12,
  REMARK: 13
};

/** Kata kunci header yang diharapkan per posisi kolom, untuk validasi runtime (urutan mengikuti COL di atas). */
const MOVEMENT_LOG_HEADER_KEYWORDS = [
  ['tanggal'],
  ['kode alat'],
  ['unit id', 'unit_id', 'unit'],
  ['id transaksi', 'no transaksi', 'transaksi'],
  ['spesifikasi'],
  ['mesin'],
  ['kode mesin'],
  ['activity', 'jenis transaksi', 'aktivitas'],
  ['qty', 'quantity', 'jumlah'],
  ['cycle id', 'cycle_id', 'cycle', 'siklus'],
  ['counter', 'hitung', 'jumlah siklus'],
  ['pic'],
  ['remark', 'catatan', 'keterangan']
];

/**
 * Status Tool Unit setelah tiap activity. 'KARAT' sengaja TIDAK
 * dimasukkan — efeknya "Netral" (cuma nge-flag kolom Bermasalah, tidak
 * mengubah status lifecycle unit).
 */
const STATUS_AFTER_ACTIVITY = {
  'PEMBELIAN BARU': 'GUDANG',
  'DIPASANG KE MESIN': 'DIPAKAI',
  'KEMBALI KE GUDANG (TUMPUL)': 'TUMPUL',
  'KEMBALI KE GUDANG (SIAP)': 'GUDANG',
  'KIRIM KE VENDOR ASAH': 'DIASAH',
  'SELESAI DIASAH': 'GUDANG',
  'SCRAP / RUSAK': 'SCRAP'
};

/** Karakter pemicu formula injection kalau di-setValue() langsung ke sel Sheets. */
const FORMULA_TRIGGER_CHARS = /^[=+\-@\t\r]/;


/* ------------------------------------------------------------
 * [WO-1.6] STRICT UNIT STATE & LIFECYCLE TRANSITION VALIDATION
 * ------------------------------------------------------------
 * Kontrak ini SALINAN PERSIS dari STATUS_FILTER_BY_ACTIVITY di
 * index.html (dipakai frontend untuk memfilter dropdown Unit per
 * activity) — bukan aturan baru. Kalau STATUS_FILTER_BY_ACTIVITY di
 * index.html berubah di fase lain, map ini WAJIB disinkronkan manual
 * (2 file/2 deployment terpisah, tidak share 1 modul JS).
 *
 * "PEMBELIAN BARU" sengaja tidak ada di sini — hanya berlaku untuk
 * Unit_ID yang BELUM ada, sudah divalidasi terpisah di addMovementRow
 * §7/§7a sebelum validator ini pernah dipanggil.
 * ------------------------------------------------------------ */
const REQUIRED_STATE_BY_ACTIVITY_ = {
  'DIPASANG KE MESIN': 'GUDANG',
  'KEMBALI KE GUDANG (TUMPUL)': 'DIPAKAI',
  'KEMBALI KE GUDANG (SIAP)': 'DIPAKAI',
  'KIRIM KE VENDOR ASAH': 'TUMPUL',
  'SELESAI DIASAH': 'DIASAH'
};

/**
 * Activity yang, sesuai index.html ("tanpa filter (semua unit)"),
 * boleh dikirim dari status Tool Unit apa pun — SELAMA status itu
 * dikenal (lihat KNOWN_UNIT_STATUSES_). Tidak termasuk PEMBELIAN BARU
 * (itu jalur creation unit baru, bukan transisi status unit existing).
 */
const GLOBAL_ALLOWED_ACTIVITIES_ = ['SCRAP / RUSAK', 'KARAT'];

/**
 * Satu-satunya 5 nilai status Tool Unit yang benar-benar dihasilkan
 * STATUS_AFTER_ACTIVITY (dedupe dari values-nya). Status lain di luar
 * ini dianggap tidak dapat ditentukan secara reliable -> REJECT
 * (UNKNOWN_CURRENT_STATE), tidak pernah dianggap default GUDANG.
 */
const KNOWN_UNIT_STATUSES_ = ['GUDANG', 'DIPAKAI', 'TUMPUL', 'DIASAH', 'SCRAP'];

/**
 * SATU-SATUNYA tempat aturan "activity X sah dari status Y saat ini
 * atau tidak" dievaluasi (one state transition engine — tidak ada
 * if (state === ...) tersebar di fungsi lain). Dipanggil di PHASE A —
 * PREPARE, setelah referential integrity (Phase 1.5) dan sebelum
 * idTransaksi/Cycle_ID dihitung atau write apa pun terjadi.
 *
 * @param {string} currentState  Nilai TUCOL.STATUS_UNIT unit saat ini
 *   (dibaca dari row yang sama dengan findToolUnitRow_() di dalam
 *   lock — tidak ada read kedua yang bisa divergen).
 * @param {string} requestedActivity  p.activity (sudah lolos whitelist
 *   getValidActivities() di Phase 1.4).
 * @return {{ok:true, fromState:string, activity:string, toState:string}
 *          |{ok:false, errorCode:string, error:string}}
 */
function validateUnitTransition_(currentState, requestedActivity) {
  const state = String(currentState == null ? '' : currentState).trim().toUpperCase();

  if (KNOWN_UNIT_STATUSES_.indexOf(state) === -1) {
    return {
      ok: false,
      errorCode: 'UNKNOWN_CURRENT_STATE',
      error: 'Status Tool Unit saat ini ("' + (currentState || '(kosong)') + '") tidak dikenali sistem. Transaksi tidak dapat divalidasi sampai data status diperiksa manual.'
    };
  }

  // toState: sama persis logic dipakai commitToolUnit_() supaya tidak
  // ada 2 sumber kebenaran yang bisa divergen. KARAT tidak ada di
  // STATUS_AFTER_ACTIVITY -> efek "Netral", status tetap sama.
  const toState = STATUS_AFTER_ACTIVITY[requestedActivity] || state;

  if (GLOBAL_ALLOWED_ACTIVITIES_.indexOf(requestedActivity) !== -1) {
    return { ok: true, fromState: state, activity: requestedActivity, toState: toState };
  }

  const requiredState = REQUIRED_STATE_BY_ACTIVITY_[requestedActivity];
  if (!requiredState) {
    // Defensif: activity existing-unit yang lolos whitelist Phase 1.4
    // tapi tidak terdaftar transition rule-nya di sini. Tidak boleh
    // diam-diam diloloskan.
    return {
      ok: false,
      errorCode: 'INVALID_STATE_TRANSITION',
      error: 'Jenis transaksi "' + requestedActivity + '" tidak memiliki aturan transisi status yang terdaftar untuk unit existing.'
    };
  }

  if (state !== requiredState) {
    return {
      ok: false,
      errorCode: 'INVALID_STATE_TRANSITION',
      error: 'Transisi "' + requestedActivity + '" tidak diperbolehkan dari status unit saat ini ("' + state + '"). Unit harus berstatus "' + requiredState + '".'
    };
  }

  return { ok: true, fromState: state, activity: requestedActivity, toState: toState };
}


/* ------------------------------------------------------------
 * [WO-1.1] TRUE IDEMPOTENCY — requestId
 * ------------------------------------------------------------
 * requestId sekarang benar-benar dipakai sebagai idempotency key
 * (bukan cuma echo field). Disimpan persistent via PropertiesService
 * (BUKAN CacheService yang bisa expire, BUKAN variabel global JS yang
 * tidak dijamin persist antar-eksekusi Apps Script) supaya lookup-nya
 * tahan terhadap timeout/retry kapan pun.
 *
 * CATATAN (di luar scope WO-1.1, untuk pertimbangan fase berikutnya):
 * setiap requestId sukses menambah 1 Script Property permanen — belum
 * ada TTL/cleanup di sini (sengaja, sesuai batasan WO ini: "jangan
 * mengerjakan Phase 1.2+"). Kalau volume transaksi sangat tinggi dalam
 * jangka panjang, ini bisa mendekati kuota Script Properties Apps
 * Script suatu saat — perlu keputusan manusia (mis. TTL/archive) di
 * fase idempotency berikutnya, bukan diputuskan sepihak di sini.
 * ------------------------------------------------------------ */
const IDEMPOTENCY_KEY_PREFIX = 'idem_';
const REQUEST_ID_MIN_LEN = 8;
const REQUEST_ID_MAX_LEN = 100;
const REQUEST_ID_SAFE_PATTERN = /^[A-Za-z0-9_-]+$/;

/** requestId wajib, string, 8-100 karakter, hanya huruf/angka/dash/underscore. */
function validateRequestId_(requestId) {
  if (requestId === undefined || requestId === null || requestId === '') {
    return { ok: false, error: { code: 'REQUEST_ID_REQUIRED', message: 'requestId wajib diisi.' } };
  }
  if (typeof requestId !== 'string') {
    return { ok: false, error: { code: 'INVALID_REQUEST_ID', message: 'Format requestId tidak valid.' } };
  }
  const trimmed = requestId.trim();
  if (
    trimmed.length < REQUEST_ID_MIN_LEN ||
    trimmed.length > REQUEST_ID_MAX_LEN ||
    !REQUEST_ID_SAFE_PATTERN.test(trimmed)
  ) {
    return { ok: false, error: { code: 'INVALID_REQUEST_ID', message: 'Format requestId tidak valid.' } };
  }
  return { ok: true, requestId: trimmed };
}

/**
 * Fingerprint payload transaksi (bukan hash kriptografis — cukup string
 * gabungan field yang jadi "identitas" transaksi, sesuai daftar di
 * WO-1.1 §12) dipakai untuk membedakan replay yang sah (payload identik)
 * dari REQUEST_ID_REUSE_CONFLICT (requestId sama, payload beda). Dihitung
 * dari payload MENTAH (sebelum validasi/sanitasi) supaya bisa dibandingkan
 * di titik lookup, sebelum tahu payload itu valid atau tidak.
 */
function computePayloadFingerprint_(payload) {
  payload = payload || {};
  const field = function (v) { return String(v == null ? '' : v).trim(); };
  return [
    field(payload.tanggal),
    field(payload.kodeAlat),
    field(payload.unitId),
    field(payload.spesifikasi),
    field(payload.mesin),
    field(payload.kodeMesin),
    field(payload.activity),
    field(payload.qty),
    field(payload.pic),
    field(payload.remark)
  ].join('|');
}

/**
 * [WO-2.1.3 — idempotency lifecycle] Sebelumnya idempotency record
 * disimpan permanen di Script Properties tanpa TTL/cleanup -- Script
 * Properties GAS punya BATAS KERAS 500 entries per project; tanpa
 * cleanup, volume transaksi tinggi bisa mentok batas itu dan membuat
 * setProperty() gagal (idempotency mati sama sekali utk transaksi baru,
 * bukan cuma protection window-nya berkurang). TTL dipilih 7 hari
 * (keputusan bisnis: cukup utk retry manual staf yang lapor telat,
 * tanpa bikin requestId lama "menyandera" retry legit selamanya).
 */
const IDEMPOTENCY_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

/**
 * Ambil record idempotency tersimpan untuk requestId, atau null kalau
 * belum pernah/rusak/SUDAH KADALUARSA (>7 hari). [WO-2.1.3] Expiry
 * dicek DI SINI (bukan cuma di cleanup terjadwal) sbg defense-in-depth
 * -- kalau trigger harian belum di-setup atau sempat gagal jalan,
 * lookup tetap benar (menganggap requestId tua sbg "belum pernah
 * diproses"), bukan diam-diam mempercayai record basi.
 */
function getIdempotencyRecord_(requestId) {
  const raw = PropertiesService.getScriptProperties().getProperty(IDEMPOTENCY_KEY_PREFIX + requestId);
  if (!raw) return null;
  try {
    const record = JSON.parse(raw);
    const ts = record && record.timestamp ? Date.parse(record.timestamp) : NaN;
    if (isNaN(ts) || (Date.now() - ts) > IDEMPOTENCY_TTL_MS) {
      return null; // kadaluarsa -> perlakukan seolah requestId belum pernah dipakai
    }
    return record;
  } catch (e) {
    return null; // record korup -> perlakukan seolah belum pernah diproses
  }
}

/** Simpan hasil SUCCESS untuk requestId (persistent, dipakai lookup replay berikutnya). */
function saveIdempotencyRecord_(requestId, record) {
  PropertiesService.getScriptProperties().setProperty(IDEMPOTENCY_KEY_PREFIX + requestId, JSON.stringify(record));
}

/**
 * [WO-2.1.3, digeneralisasi di WO-2.2] Hapus SEMUA record kadaluarsa
 * berprefix idem_ (idempotency, TTL 7 hari) MAUPUN sess_ (session
 * login, TTL 7 hari, lihat SESSION_TTL_MS) dari Script Properties --
 * keduanya sama-sama kena batas keras 500 entries GAS per project,
 * jadi satu trigger harian yang sama membersihkan dua-duanya. Nama
 * fungsi TETAP dipertahankan (bukan diganti) supaya trigger yang
 * sudah di-install admin lewat setupIdempotencyCleanupTrigger_() TIDAK
 * PERLU di-setup ulang -- otomatis ikut membersihkan session begitu
 * versi ini di-deploy. TIDAK menyentuh property lain (mis.
 * API_ACCESS_TOKEN, ADMIN_ALERT_EMAIL). Return jumlah key yang
 * dihapus (dipakai utk logging manual di eksekusi transcript).
 */
function cleanupExpiredIdempotencyRecords_() {
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  const now = Date.now();
  const keysToDelete = [];
  Object.keys(all).forEach(function (key) {
    let ttl;
    if (key.indexOf(IDEMPOTENCY_KEY_PREFIX) === 0) ttl = IDEMPOTENCY_TTL_MS;
    else if (key.indexOf(SESSION_KEY_PREFIX) === 0) ttl = SESSION_TTL_MS;
    else if (key.indexOf(LOGIN_FAIL_KEY_PREFIX) === 0) ttl = LOGIN_FAIL_RECORD_TTL_MS; // [Audit fix — rate-limit login]
    else if (key.indexOf(API_TOKEN_FAIL_KEY) === 0) ttl = API_TOKEN_FAIL_RECORD_TTL_MS; // [Audit fix — rate-limit token API]
    else return; // bukan idempotency record, session, maupun login-fail record

    try {
      const record = JSON.parse(all[key]);
      const ts = record && record.timestamp ? Date.parse(record.timestamp) : NaN;
      if (isNaN(ts) || (now - ts) > ttl) keysToDelete.push(key);
    } catch (e) {
      keysToDelete.push(key); // record korup -> hapus
    }
  });
  keysToDelete.forEach(function (key) { props.deleteProperty(key); });
  Logger.log('cleanupExpiredIdempotencyRecords_: dihapus ' + keysToDelete.length + ' record (idempotency + session + login-fail + api-token-fail).');
  return keysToDelete.length;
}

/**
 * [WO-2.1.3, cakupan diperluas di WO-2.2] SETUP SEKALI SAJA: jalankan
 * fungsi ini manual dari editor Apps Script (pilih fungsi ini di
 * dropdown toolbar, klik Run) SEKALI setelah deploy versi ini, supaya
 * cleanupExpiredIdempotencyRecords_() jalan otomatis tiap hari --
 * fungsi itu sekarang membersihkan idempotency record DAN session
 * login sekaligus (lihat komentar di definisinya). Kalau trigger ini
 * SUDAH pernah di-install sebelum WO-2.2 (versi idempotency-only),
 * TIDAK PERLU dijalankan ulang -- trigger lama otomatis ikut
 * membersihkan session begitu kode versi ini live, karena nama fungsi
 * handler-nya tidak berubah. Aman dipanggil berulang kapan pun --
 * akan menghapus trigger lama dgn handler yang sama dulu, tidak akan
 * dobel-trigger. TANPA langkah ini (kalau memang belum pernah di-run
 * sama sekali), TTL tetap berlaku secara LOOKUP (lihat
 * getIdempotencyRecord_/getSessionRecord_), tapi record lama TIDAK
 * PERNAH benar-benar terhapus dari Script Properties -> tetap
 * berisiko mentok batas 500.
 */
function setupIdempotencyCleanupTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'cleanupExpiredIdempotencyRecords_') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('cleanupExpiredIdempotencyRecords_')
    .timeBased()
    .everyDays(1)
    .atHour(3) // dini hari, trafik rendah
    .create();
}


/* ------------------------------------------------------------
 * ENTRY POINT — dipanggil dari index.html via google.script.run
 * ------------------------------------------------------------ */
/**
 * [BUGFIX-02] Kontrak response addMovementRow yang diharapkan frontend
 * (lihat validateTransactionResponse_/mapErrorToMessage_ di index.html)
 * adalah {success, requestId, idTransaksi, cycleId, data, error:{code,
 * message}} — error HARUS objek {code, message}, bukan string polos.
 * Frontend secara spesifik butuh err.code === 'DUPLICATE_UNIT_ID' untuk
 * memicu refresh saran nomor unit berikutnya (lihat onSubmitForm .catch
 * di index.html). Sebelum fix ini, addMovementRow selalu balas
 * {success:false, error:'<string>'} sehingga err.code selalu undefined
 * dan mapErrorToMessage_ jatuh ke pesan generik "Transaksi gagal
 * disimpan." untuk SEMUA jenis kegagalan.
 *
 * [WO-1.1] requestId sekarang idempotency key sungguhan: request kedua
 * dengan requestId+payload yang identik TIDAK membuat baris Movement Log
 * baru — dikembalikan hasil transaksi pertama apa adanya (idempotentReplay:
 * true). requestId yang sama dengan payload BERBEDA ditolak
 * (REQUEST_ID_REUSE_CONFLICT). Urutan wajib: validasi requestId DULU
 * (di luar lock, murah) -> acquire lock -> lookup requestId DI DALAM lock
 * yang sama sebelum proses -> simpan hasil SEBELUM unlock, supaya dua
 * request identik yang datang nyaris bersamaan tidak bisa lolos bersamaan
 * (lihat WO-1.1 §9).
 */
function addMovementRow(payload) {
  // 1. Ambil requestId
  const rawRequestId = payload && payload.requestId;

  // 2. Validasi requestId — SEBELUM lock (murah, tidak perlu kunci sheet).
  const ridCheck = validateRequestId_(rawRequestId);
  if (!ridCheck.ok) {
    // [WO-1.9] requestId sendiri tidak valid -> tidak ada ID stabil untuk
    // dikorelasikan, tapi tetap dicatat best-effort (stage REQUEST_PARSE)
    // supaya forensic scenario "kenapa request ini gagal" tetap terjawab.
    logAuditEvent_({
      event: 'TRANSACTION_REJECTED', requestId: rawRequestId || '',
      stage: 'REQUEST_PARSE', errorCode: ridCheck.error && ridCheck.error.code,
      actorReported: payload && payload.pic
    });
    return { success: false, requestId: rawRequestId || '', error: ridCheck.error };
  }
  const requestId = ridCheck.requestId;
  const fingerprint = computePayloadFingerprint_(payload);

  // 2b. [WO-2.2] Validasi session login — SEBELUM lock (murah, sama
  // alasan dgn requestId di atas). Transaksi TIDAK BOLEH diproses
  // tanpa actor yang ter-autentikasi -- ini fix untuk temuan §7
  // "actor identity belum trusted". Field PIC (payload.pic) TETAP
  // wajib diisi sebagai field bisnis (siapa yang dicatat di Movement
  // Log), tapi sekarang ADA identitas kedua yang tervalidasi server
  // (authenticatedActor) sebagai lapisan trust tambahan di Audit Log.
  const sessionCheck = validateSession_(payload && payload.sessionToken);
  if (!sessionCheck.ok) {
    logAuditEvent_({
      event: 'TRANSACTION_REJECTED', requestId: requestId,
      stage: 'AUTH_SESSION', errorCode: sessionCheck.error.code,
      actorReported: payload && payload.pic
    });
    return { success: false, requestId: requestId, error: sessionCheck.error };
  }
  const authenticatedActor = sessionCheck.actorName;

  // [WO-ROLE] Operator TIDAK BOLEH eksekusi transaksi langsung -- cuma
  // boleh lewat submitPengajuanTumpul (masuk antrian "Menunggu Konfirmasi
  // WH"). Dicek di sini (server-side, setelah session tervalidasi) supaya
  // tidak bisa dibypass walau tombol di frontend disembunyikan/di-disable.
  if (sessionCheck.role === ROLE_OPERATOR) {
    logAuditEvent_({
      event: 'TRANSACTION_REJECTED', requestId: requestId,
      stage: 'AUTH_SESSION', errorCode: 'FORBIDDEN_ROLE',
      actorReported: payload && payload.pic, authenticatedActor: authenticatedActor
    });
    return {
      success: false, requestId: requestId,
      error: { code: 'FORBIDDEN_ROLE', message: 'Akun operator tidak bisa memproses transaksi langsung. Gunakan menu "Ajukan Pengembalian Tumpul".' }
    };
  }

  // [WO-1.9] TRANSACTION_REQUESTED — sekali per attempt, DI LUAR lock
  // (murah, tidak memperpanjang critical section §9 Phase 1.8). actor
  // dicatat best-effort dari field PIC payload (belum tervalidasi, cuma
  // untuk traceability — lihat catatan actorReported di atas), PLUS
  // authenticatedActor dari session yang sudah tervalidasi server.
  logAuditEvent_({
    event: 'TRANSACTION_REQUESTED', requestId: requestId,
    stage: 'REQUEST_PARSE', actorReported: payload && payload.pic,
    authenticatedActor: authenticatedActor
  });

  // 3. Acquire Script Lock
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    logAuditEvent_({
      event: 'LOCK_TIMEOUT', requestId: requestId, stage: 'LOCK_ACQUISITION',
      errorCode: 'LOCK_TIMEOUT', actorReported: payload && payload.pic,
      authenticatedActor: authenticatedActor
    });
    return { success: false, requestId: requestId, error: { code: 'LOCK_TIMEOUT', message: 'Sistem sedang memproses transaksi lain, coba lagi sebentar.' } };
  }

  // State transaksi (dipakai untuk rollback kalau meledak di titik mana pun
  // setelah commit dimulai — lihat blok catch paling luar di bawah).
  let logSheet = null;
  let toolUnitSheet = null;
  let p = null;
  let idTransaksi = null;
  let toolUnitSnapshot = null;   // {existed, rowIndex, values} — state SEBELUM commit
  let toolUnitCommit = null;     // {rowIndex, isNew, expected} — hasil commitToolUnit_ kalau sukses
  let movementLogCommit = null;  // {rowIndex, oldLastRow} — hasil commitMovementLog_ kalau sukses

  try {
    // 4. Lookup requestId — DI DALAM lock, sebelum proses apa pun.
    const existing = getIdempotencyRecord_(requestId);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        logAuditEvent_({
          event: 'REQUEST_ID_REUSE_CONFLICT', requestId: requestId,
          stage: 'IDEMPOTENCY_CHECK', errorCode: 'REQUEST_ID_REUSE_CONFLICT',
          transactionId: existing.idTransaksi,
          actorReported: payload && payload.pic, authenticatedActor: authenticatedActor
        });
        return {
          success: false,
          requestId: requestId,
          error: {
            code: 'REQUEST_ID_REUSE_CONFLICT',
            message: 'requestId sudah digunakan untuk transaksi dengan payload berbeda.'
          }
        };
      }
      // 5. SUDAH SUCCESS dengan payload sama -> kembalikan hasil lama, STOP.
      logAuditEvent_({
        event: 'IDEMPOTENT_REPLAY', requestId: requestId,
        transactionId: existing.idTransaksi, stage: 'IDEMPOTENCY_CHECK',
        actorReported: payload && payload.pic, authenticatedActor: authenticatedActor
      });
      return {
        success: true,
        requestId: requestId,
        idTransaksi: existing.idTransaksi,
        cycleId: existing.cycleId,
        idempotentReplay: true
      };
    }

    /* ========================================================
     * PHASE A — PREPARE (baca + validasi + hitung, TANPA WRITE)
     * ======================================================== */

    // 6. Validasi payload (belum pernah diproses -> jalur normal)
    const v = validateMovementPayload_(payload);
    if (!v.ok) {
      const code = v.errorCode || 'VALIDATION';
      logAuditEvent_({
        event: 'TRANSACTION_REJECTED', requestId: requestId,
        stage: mapErrorCodeToStage_(code), errorCode: code,
        actorReported: payload && payload.pic,
        authenticatedActor: authenticatedActor
      });
      return { success: false, requestId: requestId, error: { code: code, message: v.error } };
    }
    p = v.payload;

    logSheet = getSheet_(SHEET_MOVEMENT_LOG);
    assertMovementLogHeaders_(logSheet);

    toolUnitSheet = getSheet_(SHEET_TOOL_UNIT);
    const unitLookup = findToolUnitRow_(toolUnitSheet, p.unitId);

    // 7. Validasi Unit_ID (existence, TIDAK dianggap cukup — lihat §7a/§7b/§7c)
    if (unitLookup.status === 'duplicate') {
      logAuditEvent_({
        event: 'TRANSACTION_REJECTED', requestId: requestId, unitId: p.unitId,
        kodeAlat: p.kodeAlat, actorReported: p.pic,
        authenticatedActor: authenticatedActor,
        stage: 'REFERENCE_VALIDATION', errorCode: 'UNIT_ID_DUPLICATE'
      });
      return {
        success: false,
        requestId: requestId,
        error: {
          code: 'UNIT_ID_DUPLICATE',
          message: 'Unit_ID "' + p.unitId + '" memiliki lebih dari satu record di Tool Unit. Data perlu diperiksa manual sebelum transaksi bisa diproses.'
        }
      };
    }

    const unitInfo = unitLookup.status === 'found' ? unitLookup : null;

    if (p.activity === 'PEMBELIAN BARU') {
      if (unitInfo) {
        logAuditEvent_({
          event: 'TRANSACTION_REJECTED', requestId: requestId, unitId: p.unitId,
          kodeAlat: p.kodeAlat, operation: p.activity, actorReported: p.pic,
          authenticatedActor: authenticatedActor,
          stage: 'REFERENCE_VALIDATION', errorCode: 'DUPLICATE_UNIT_ID'
        });
        return {
          success: false,
          requestId: requestId,
          error: {
            code: 'DUPLICATE_UNIT_ID',
            message: 'Unit_ID "' + p.unitId + '" sudah terdaftar di Tool Unit. ' +
              'Pakai jenis transaksi lain kalau mau update unit yang sudah ada.'
          }
        };
      }
    } else if (!unitInfo) {
      logAuditEvent_({
        event: 'TRANSACTION_REJECTED', requestId: requestId, unitId: p.unitId,
        kodeAlat: p.kodeAlat, operation: p.activity, actorReported: p.pic,
        authenticatedActor: authenticatedActor,
        stage: 'REFERENCE_VALIDATION', errorCode: 'UNIT_NOT_FOUND'
      });
      return {
        success: false,
        requestId: requestId,
        error: { code: 'UNIT_NOT_FOUND', message: 'Unit_ID "' + p.unitId + '" tidak ditemukan di Tool Unit. Pilih ulang dari daftar unit yang tersedia.' }
      };
    }

    // 7a. [WO-1.5] Referential integrity — Kode Alat efektif ditentukan
    // di sini, HIERARKI: Unit baru -> payload.kodeAlat (satu-satunya
    // sumber, wajib ada di Master Tools). Unit existing -> Tool Unit
    // adalah source of truth, payload.kodeAlat cuma boleh dipakai kalau
    // cocok; backend TIDAK PERNAH auto-create atau auto-repair Master
    // Tools / Tool Unit.
    let effectiveKodeAlat;
    if (!unitInfo) {
      // PEMBELIAN BARU, Unit belum ada -> payload.kodeAlat wajib valid di Master Tools.
      const masterLookup = findMasterToolRow_(p.kodeAlat);
      if (masterLookup.status === 'not_found') {
        logAuditEvent_({
          event: 'TRANSACTION_REJECTED', requestId: requestId, unitId: p.unitId,
          kodeAlat: p.kodeAlat, operation: p.activity, actorReported: p.pic,
          authenticatedActor: authenticatedActor,
          stage: 'REFERENCE_VALIDATION', errorCode: 'INVALID_MASTER_REFERENCE'
        });
        return {
          success: false,
          requestId: requestId,
          error: { code: 'INVALID_MASTER_REFERENCE', message: 'Kode Alat "' + p.kodeAlat + '" tidak ditemukan di Master Tools. Transaksi tidak membuat Master Tools baru secara otomatis.' }
        };
      }
      if (masterLookup.status === 'duplicate') {
        logAuditEvent_({
          event: 'TRANSACTION_REJECTED', requestId: requestId, unitId: p.unitId,
          kodeAlat: p.kodeAlat, operation: p.activity, actorReported: p.pic,
          authenticatedActor: authenticatedActor,
          stage: 'REFERENCE_VALIDATION', errorCode: 'MASTER_CODE_DUPLICATE'
        });
        return {
          success: false,
          requestId: requestId,
          error: { code: 'MASTER_CODE_DUPLICATE', message: 'Kode Alat "' + p.kodeAlat + '" memiliki lebih dari satu record di Master Tools. Data perlu diperiksa manual sebelum transaksi bisa diproses.' }
        };
      }
      effectiveKodeAlat = p.kodeAlat;
    } else {
      // Unit sudah ada -> Tool Unit adalah source of truth identity-nya.
      const recordedKodeAlat = String(unitInfo.row[TUCOL.KODE_ALAT - 1]).trim();
      if (normalizeKodeAlat(p.kodeAlat) !== normalizeKodeAlat(recordedKodeAlat)) {
        logAuditEvent_({
          event: 'TRANSACTION_REJECTED', requestId: requestId, unitId: p.unitId,
          kodeAlat: p.kodeAlat, operation: p.activity, actorReported: p.pic,
          authenticatedActor: authenticatedActor,
          stage: 'REFERENCE_VALIDATION', errorCode: 'DATA_INTEGRITY_ERROR'
        });
        return {
          success: false,
          requestId: requestId,
          error: {
            code: 'DATA_INTEGRITY_ERROR',
            message: 'Unit_ID "' + p.unitId + '" tercatat dengan Kode Alat "' + recordedKodeAlat + '" di Tool Unit, bukan "' + p.kodeAlat + '". Payload tidak dapat mengubah relasi identitas unit yang sudah ada.'
          }
        };
      }
      const masterLookup = findMasterToolRow_(recordedKodeAlat);
      if (masterLookup.status === 'not_found') {
        logAuditEvent_({
          event: 'TRANSACTION_REJECTED', requestId: requestId, unitId: p.unitId,
          kodeAlat: recordedKodeAlat, operation: p.activity, actorReported: p.pic,
          authenticatedActor: authenticatedActor,
          stage: 'REFERENCE_VALIDATION', errorCode: 'DATA_INTEGRITY_ERROR'
        });
        return {
          success: false,
          requestId: requestId,
          error: { code: 'DATA_INTEGRITY_ERROR', message: 'Unit_ID "' + p.unitId + '" merujuk Kode Alat "' + recordedKodeAlat + '" yang sudah tidak ada di Master Tools (data orphan). Perlu pemeriksaan manual.' }
        };
      }
      if (masterLookup.status === 'duplicate') {
        logAuditEvent_({
          event: 'TRANSACTION_REJECTED', requestId: requestId, unitId: p.unitId,
          kodeAlat: recordedKodeAlat, operation: p.activity, actorReported: p.pic,
          authenticatedActor: authenticatedActor,
          stage: 'REFERENCE_VALIDATION', errorCode: 'MASTER_CODE_DUPLICATE'
        });
        return {
          success: false,
          requestId: requestId,
          error: { code: 'MASTER_CODE_DUPLICATE', message: 'Kode Alat "' + recordedKodeAlat + '" memiliki lebih dari satu record di Master Tools. Data perlu diperiksa manual sebelum transaksi bisa diproses.' }
        };
      }
      effectiveKodeAlat = recordedKodeAlat;
    }

    // 7b. [WO-1.6] State/lifecycle transition — dijalankan SETELAH unit
    // dipastikan ada (§7) dan referential integrity lolos (§7a), SEBELUM
    // idTransaksi/Cycle_ID dihitung atau write apa pun. Hanya untuk unit
    // existing (PEMBELIAN BARU/unit baru tidak punya status sebelumnya,
    // sudah divalidasi terpisah di §7). unitInfo.row dibaca DI DALAM lock
    // yang sama di §7 — tidak ada read kedua yang bisa divergen kalau ada
    // request lain nyelip di antaranya.
    if (unitInfo) {
      const transitionCheck = validateUnitTransition_(unitInfo.row[TUCOL.STATUS_UNIT - 1], p.activity);
      if (!transitionCheck.ok) {
        logAuditEvent_({
          event: 'TRANSACTION_REJECTED', requestId: requestId, unitId: p.unitId,
          kodeAlat: p.kodeAlat, operation: p.activity, actorReported: p.pic,
          authenticatedActor: authenticatedActor,
          stage: 'STATE_VALIDATION', errorCode: transitionCheck.errorCode,
          stateDiff: { status: { before: String(unitInfo.row[TUCOL.STATUS_UNIT - 1]).trim(), attemptedActivity: p.activity } }
        });
        return {
          success: false,
          requestId: requestId,
          error: { code: transitionCheck.errorCode, message: transitionCheck.error }
        };
      }
    }

    // 8. Generate idTransaksi
    const numRows = logSheet.getLastRow() - 1;
    idTransaksi = generateNextTransactionId_(logSheet, numRows);
    // 9. Resolve Cycle_ID
    const cycleInfo = resolveCycleInfo_(logSheet, numRows, p.unitId, p.activity);

    // 10. Siapkan baris Movement Log (belum ditulis) — pakai effectiveKodeAlat
    // (hasil validasi referensial §7a), bukan p.kodeAlat mentah dari payload.
    const movementRowValues = [
      p.tanggal, effectiveKodeAlat, p.unitId, idTransaksi, p.spesifikasi,
      p.mesin, p.kodeMesin, p.activity, p.qty, cycleInfo.cycleId, cycleInfo.counter,
      p.pic, p.remark
    ];

    // 11. Snapshot Tool Unit SEBELUM diubah (dasar rollback §8/§15/§16)
    toolUnitSnapshot = unitInfo
      ? { existed: true, rowIndex: unitInfo.rowIndex, values: unitInfo.row.slice() }
      : { existed: false };

    /* ========================================================
     * PHASE B — COMMIT (urutan: Tool Unit dulu, lalu Movement Log)
     * ======================================================== */

    // 12. Tulis Tool Unit
    try {
      toolUnitCommit = commitToolUnit_(toolUnitSheet, unitInfo, p);
    } catch (errToolUnit) {
      // Movement Log belum tersentuh sama sekali. Kalau sempat ada
      // perubahan parsial di Tool Unit (mis. setValue LAST_EVENT sukses
      // lalu setValue berikutnya gagal), snapshot masih valid untuk restore.
      const rbOk = rollbackToolUnit_(toolUnitSheet, toolUnitSnapshot, toolUnitCommit, p.unitId);
      logTransactionFailure_({
        requestId: requestId, idTransaksi: idTransaksi, operation: 'COMMIT_TOOL_UNIT',
        errorCode: rbOk ? 'TRANSACTION_ROLLBACK' : 'TRANSACTION_ROLLBACK_FAILED',
        affectedTargets: ['TOOL_UNIT'], rollbackStatus: rbOk ? 'OK' : 'FAILED',
        unitId: p.unitId, kodeAlat: p.kodeAlat, businessOperation: p.activity,
        actorReported: p.pic, authenticatedActor: authenticatedActor
      });
      if (!rbOk) {
        return {
          success: false, requestId: requestId,
          error: { code: 'TRANSACTION_ROLLBACK_FAILED', message: 'Transaksi gagal dan sistem tidak dapat memastikan seluruh perubahan telah dikembalikan. Perlu pemeriksaan manual.' }
        };
      }
      return {
        success: false, requestId: requestId,
        error: { code: 'TRANSACTION_ROLLBACK', message: 'Transaksi gagal dan perubahan berhasil dikembalikan.' }
      };
    }

    // 13. Tulis Movement Log
    try {
      movementLogCommit = commitMovementLog_(logSheet, movementRowValues);
    } catch (errLog) {
      // Tool Unit sudah commit -> HARUS di-rollback supaya tidak orphan.
      const rbOk = rollbackToolUnit_(toolUnitSheet, toolUnitSnapshot, toolUnitCommit, p.unitId);
      logTransactionFailure_({
        requestId: requestId, idTransaksi: idTransaksi, operation: 'COMMIT_MOVEMENT_LOG',
        errorCode: rbOk ? 'TRANSACTION_ROLLBACK' : 'TRANSACTION_ROLLBACK_FAILED',
        affectedTargets: ['TOOL_UNIT'], rollbackStatus: rbOk ? 'OK' : 'FAILED',
        unitId: p.unitId, kodeAlat: p.kodeAlat, businessOperation: p.activity,
        actorReported: p.pic, authenticatedActor: authenticatedActor
      });
      if (!rbOk) {
        return {
          success: false, requestId: requestId,
          error: { code: 'TRANSACTION_ROLLBACK_FAILED', message: 'Transaksi gagal dan sistem tidak dapat memastikan seluruh perubahan telah dikembalikan. Perlu pemeriksaan manual.' }
        };
      }
      return {
        success: false, requestId: requestId,
        error: { code: 'TRANSACTION_ROLLBACK', message: 'Transaksi gagal dan perubahan berhasil dikembalikan.' }
      };
    }

    /* ========================================================
     * VERIFY — jangan percaya setValue()/appendRow() begitu saja
     * ======================================================== */
    const consistency = verifyTransactionConsistency_({
      toolUnitSheet: toolUnitSheet, toolUnitCommit: toolUnitCommit,
      logSheet: logSheet, movementLogCommit: movementLogCommit,
      expectedMovementRow: movementRowValues // [WO-2.1.1] full-row verify
    });

    if (!consistency.ok) {
      const rbLog = rollbackMovementLog_(logSheet, movementLogCommit, idTransaksi);
      const rbUnit = rollbackToolUnit_(toolUnitSheet, toolUnitSnapshot, toolUnitCommit, p.unitId);
      const rbOk = rbLog && rbUnit;
      logTransactionFailure_({
        requestId: requestId, idTransaksi: idTransaksi, operation: 'VERIFY',
        errorCode: rbOk ? 'TRANSACTION_VERIFY_FAILED' : 'TRANSACTION_ROLLBACK_FAILED',
        affectedTargets: consistency.failedTargets, rollbackStatus: rbOk ? 'OK' : 'FAILED',
        unitId: p.unitId, kodeAlat: p.kodeAlat, businessOperation: p.activity,
        actorReported: p.pic, authenticatedActor: authenticatedActor
      });
      if (!rbOk) {
        return {
          success: false, requestId: requestId,
          error: { code: 'TRANSACTION_ROLLBACK_FAILED', message: 'Transaksi gagal dan sistem tidak dapat memastikan seluruh perubahan telah dikembalikan. Perlu pemeriksaan manual.' }
        };
      }
      return {
        success: false, requestId: requestId,
        error: { code: 'TRANSACTION_VERIFY_FAILED', message: 'Verifikasi transaksi gagal, perubahan sudah dikembalikan.' }
      };
    }

    /* ========================================================
     * PHASE C — FINALIZE
     * ======================================================== */

    // 14. Simpan hasil SUCCESS untuk requestId HANYA setelah commit+verify
    //     lolos (sebelum unlock -> §9 Phase 1.1). Kalau ini disimpan lebih
    //     awal lalu commit gagal, request berikutnya akan dapat replay
    //     sukses palsu — dilarang keras (§13/§22).
    saveIdempotencyRecord_(requestId, {
      requestId: requestId,
      status: 'SUCCESS',
      idTransaksi: idTransaksi,
      cycleId: cycleInfo.cycleId,
      fingerprint: fingerprint,
      timestamp: new Date().toISOString()
    });

    // [WO-1.9] TRANSACTION_COMMITTED — satu event, dengan state diff Tool
    // Unit ringkas (§22/§23: hanya field yang berubah, bukan full row).
    // toolUnitSnapshot.values (before) hanya ada kalau unit sudah ada
    // sebelumnya; toolUnitCommit.afterLokasi/afterKodeMesin/afterRegrind
    // ditambahkan di commitToolUnit_() khusus untuk keperluan audit ini.
    logAuditEvent_({
      event: 'TRANSACTION_COMMITTED', requestId: requestId, transactionId: idTransaksi,
      operation: p.activity, unitId: p.unitId, kodeAlat: effectiveKodeAlat,
      actorReported: p.pic,
      authenticatedActor: authenticatedActor,
      stateDiff: buildToolUnitStateDiff_(
        toolUnitSnapshot && toolUnitSnapshot.existed ? toolUnitSnapshot.values : null,
        toolUnitCommit.expected.statusUnit, toolUnitCommit.afterLokasi,
        toolUnitCommit.afterKodeMesin, toolUnitCommit.afterRegrind
      )
    });

    // 15. Return SUCCESS
    return { success: true, requestId: requestId, idTransaksi: idTransaksi, cycleId: cycleInfo.cycleId };
  } catch (err) {
    // Jaring pengaman terakhir: error tak terduga di mana pun dalam alur.
    // Kalau sempat ada commit yang belum ter-rollback (harusnya sudah
    // ditangani di blok try/catch masing-masing di atas, tapi dijaga lagi
    // di sini untuk kasus exception yang lolos dari situ), coba rollback.
    if (movementLogCommit || toolUnitCommit) {
      const rbLog = movementLogCommit ? rollbackMovementLog_(logSheet, movementLogCommit, idTransaksi) : true;
      const rbUnit = toolUnitCommit ? rollbackToolUnit_(toolUnitSheet, toolUnitSnapshot, toolUnitCommit, p ? p.unitId : null) : true;
      const rbOk = rbLog && rbUnit;
      logTransactionFailure_({
        requestId: requestId, idTransaksi: idTransaksi, operation: 'UNEXPECTED_EXCEPTION',
        errorCode: rbOk ? 'TRANSACTION_ROLLBACK' : 'TRANSACTION_ROLLBACK_FAILED',
        affectedTargets: [movementLogCommit ? 'MOVEMENT_LOG' : null, toolUnitCommit ? 'TOOL_UNIT' : null].filter(Boolean),
        rollbackStatus: rbOk ? 'OK' : 'FAILED',
        unitId: p ? p.unitId : null, kodeAlat: p ? p.kodeAlat : null, businessOperation: p ? p.activity : null,
        actorReported: p ? p.pic : (payload && payload.pic), authenticatedActor: authenticatedActor
      });
      if (!rbOk) {
        return {
          success: false, requestId: requestId,
          error: { code: 'TRANSACTION_ROLLBACK_FAILED', message: 'Transaksi gagal dan sistem tidak dapat memastikan seluruh perubahan telah dikembalikan. Perlu pemeriksaan manual.' }
        };
      }
      return {
        success: false, requestId: requestId,
        error: { code: 'TRANSACTION_ROLLBACK', message: 'Transaksi gagal dan perubahan berhasil dikembalikan.' }
      };
    }
    // Belum ada write sama sekali (gagal di PHASE A / hal lain yang tak
    // terduga) -> tidak perlu rollback, state sheet masih utuh.
    // [WO-1.9] Titik ini sebelumnya TIDAK punya audit event sama sekali
    // (satu-satunya celah ditemukan lewat audit §3/§4) — err.message TIDAK
    // dicatat ke Audit Log (bisa berisi detail internal), hanya errorCode.
    logAuditEvent_({
      event: 'TRANSACTION_FAILED', requestId: requestId, transactionId: idTransaksi,
      stage: 'PREPARE', errorCode: 'TRANSACTION_PREPARE_FAILED',
      unitId: p ? p.unitId : null, operation: p ? p.activity : null,
      actorReported: p ? p.pic : (payload && payload.pic), authenticatedActor: authenticatedActor
    });
    return { success: false, requestId: requestId, error: { code: 'TRANSACTION_PREPARE_FAILED', message: 'Gagal menyiapkan transaksi: ' + err.message } };
  } finally {
    lock.releaseLock();
  }
}


/**
 * [WO-1.7] Centralized, READ-ONLY consistency check — SATU-SATUNYA
 * tempat "apakah kedua write (Tool Unit + Movement Log) transaksi ini
 * benar-benar tersimpan sesuai harapan" dievaluasi (§31). Dipanggil
 * SETELAH kedua commit selesai, SEBELUM idempotency record SUCCESS
 * disimpan. Tidak pernah menulis/memperbaiki apa pun (§32) — cuma
 * membungkus verifyToolUnitWrite_()/verifyMovementLogWrite_() yang
 * sudah ada (perilaku verifikasi itu sendiri TIDAK berubah) supaya
 * hasilnya satu objek dengan daftar target yang gagal, dipakai untuk
 * rollback presisi (§13) dan logging (§29).
 *
 * @param {{toolUnitSheet, toolUnitCommit, logSheet, movementLogCommit,
 *          expectedMovementRow:Array}} params
 * @return {{ok:true}|{ok:false, code:'VERIFY_ERROR', failedTargets:string[]}}
 */
function verifyTransactionConsistency_(params) {
  const failedTargets = [];

  if (!verifyToolUnitWrite_(params.toolUnitSheet, params.toolUnitCommit)) {
    failedTargets.push('TOOL_UNIT');
  }
  if (!verifyMovementLogWrite_(params.logSheet, params.movementLogCommit, params.expectedMovementRow)) {
    failedTargets.push('MOVEMENT_LOG');
  }

  if (failedTargets.length > 0) {
    return { ok: false, code: 'VERIFY_ERROR', failedTargets: failedTargets };
  }
  return { ok: true };
}

/**
 * [WO-1.7] Logging minimal untuk critical transaction failure (§29) —
 * HANYA dipanggil di jalur commit/verify/rollback gagal (setelah lock
 * didapat dan write mulai dicoba), TIDAK PERNAH di jalur reject normal
 * (schema/qty/reference/state invalid — itu request ditolak sebelum
 * ada write, bukan "transaction failure"). Pakai Logger.log bawaan GAS
 * (bukan infrastruktur logging baru). TIDAK PERNAH men-dump payload
 * mentah atau field sensitif — hanya identitas transaksi + status
 * recovery. Kegagalan logging itu sendiri tidak boleh menggagalkan
 * response ke client (dibungkus try/catch, silent-fail).
 *
 * @param {{requestId, idTransaksi, operation, errorCode,
 *          affectedTargets, rollbackStatus}} details
 */
function logTransactionFailure_(details) {
  try {
    Logger.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId: details.requestId || null,
      idTransaksi: details.idTransaksi || null,
      operation: details.operation || null,
      errorCode: details.errorCode || null,
      affectedTargets: details.affectedTargets || [],
      rollbackStatus: details.rollbackStatus || null
    }));
  } catch (e) {
    // Logging tidak boleh pernah menggagalkan response ke client.
  }
  // [WO-1.9] Failure/rollback events juga masuk Audit Log persistent —
  // errorCode yang sudah ada (TRANSACTION_ROLLBACK/TRANSACTION_ROLLBACK_FAILED/
  // TRANSACTION_VERIFY_FAILED) dipakai APA ADANYA sebagai event name, TIDAK
  // di-mapping ke nama generik lain (§29 work order: audit code harus sama
  // dengan response contract). operation (COMMIT_TOOL_UNIT/COMMIT_MOVEMENT_LOG/
  // VERIFY/UNEXPECTED_EXCEPTION) dipakai sebagai stage.
  //
  // [Audit fix] actorReported/authenticatedActor SEBELUMNYA tidak pernah
  // dikirim di sini sama sekali -> jatuh ke "UNKNOWN" di logAuditEvent_.
  // Ini justru titik PALING butuh identity forensik (rollback/kegagalan),
  // jadi sekarang caller WAJIB mengirim keduanya (semua call site ada di
  // dalam addMovementRow, di mana p.pic & authenticatedActor selalu ada).
  logAuditEvent_({
    event: details.errorCode || 'TRANSACTION_FAILED',
    requestId: details.requestId,
    transactionId: details.idTransaksi,
    stage: details.operation,
    operation: details.businessOperation,
    unitId: details.unitId,
    kodeAlat: details.kodeAlat,
    actorReported: details.actorReported,
    authenticatedActor: details.authenticatedActor,
    errorCode: details.errorCode,
    rollbackStatus: details.rollbackStatus,
    note: (details.affectedTargets || []).join(',') || null
  });
}


/* ------------------------------------------------------------
 * [WO-1.9] AUDIT TRAIL / FORENSIC LOGGING
 * ------------------------------------------------------------
 * PRINSIP (§2 work order): Audit Log BUKAN source of truth baru.
 * Movement Log tetap satu-satunya transaction source of truth (tidak
 * berubah). Audit Log adalah lapisan traceability/forensic TAMBAHAN,
 * observability-only — kegagalan menulis Audit Log TIDAK PERNAH
 * menggagalkan atau rollback business transaction (§34/§35). Setiap
 * pemanggilan logAuditEvent_() dibungkus try/catch internal, silent-
 * fail, sama seperti logTransactionFailure_() dari Phase 1.7.
 *
 * AUDIT SEBELUM CODING (§3/§4 work order) — mekanisme existing yang
 * ditemukan sebelum menambah apa pun:
 *   Event               | Existing Log        | Existing ID | Timestamp | Actor   | Result
 *   Transaction failure  | logTransactionFailure_ (Logger.log, ephemeral, TIDAK
 *                          queryable jangka panjang/tidak forensic-searchable) | requestId + idTransaksi | server (new Date()) | MISSING | errorCode + rollbackStatus
 *   Semua event lain (REQUESTED/VALIDATED/REJECTED/COMMITTED/
 *   LOCK_TIMEOUT/IDEMPOTENT_REPLAY/REQUEST_ID_REUSE_CONFLICT)         | MISSING (tidak ada sama sekali sebelum Phase 1.9) | — | — | — | —
 *   Actor identity server-side (Session.getActiveUser()/dst)         | MISSING — tidak pernah dipakai di file ini
 * Kesimpulan: Logger.log SUDAH ADA tapi tidak memenuhi §43 (forensic
 * query by requestId/transactionId/Unit_ID/date) karena log eksekusi
 * GAS tidak persistent/queryable dari UI. Sheet baru "Audit Log"
 * dibuat (bukan Sheet lain yang di-reuse) supaya forensic query bisa
 * dilakukan lewat Sheets langsung (filter/search kolom) tanpa
 * menyentuh struktur Movement Log/Tool Unit yang sudah ada.
 *
 * ACTOR IDENTITY (§8 work order): TIDAK ADA mekanisme identity
 * server-side (Session.getActiveUser()) yang dipakai aplikasi ini.
 * Kolom "PIC" di payload adalah field bisnis yang diisi manual lewat
 * form — BUKAN identity yang trusted backend (bisa saja diisi apa pun
 * oleh siapa pun). logAuditEvent_() mencatatnya sebagai
 * "actorReported" (self-reported, bukan authenticated identity) —
 * TIDAK dipakai sebagai actor terverifikasi, TIDAK diberi label
 * seolah-olah trusted. Ini sesuai §8: "jangan mempercayai payload.
 * userEmail sebagai security identity" dan "jika identity server-side
 * tidak tersedia, jangan mengarang — catat UNKNOWN atau gunakan
 * mekanisme existing".
 *
 * Skema kolom Audit Log (append-only, 1 baris = 1 event):
 * Timestamp(server) | Event | RequestId | TransactionId | Stage |
 * Operation | UnitId | KodeAlat | ActorReported | ErrorCode |
 * StateDiff | RollbackStatus | Note
 */
const SHEET_AUDIT_LOG = 'Audit Log';
const AUDITCOL_HEADERS = [
  'Timestamp', 'Event', 'RequestId', 'TransactionId', 'Stage', 'Operation',
  'UnitId', 'KodeAlat', 'ActorReported', 'AuthenticatedActor', 'ErrorCode',
  'StateDiff', 'RollbackStatus', 'Note'
];

/**
 * Ambil Sheet "Audit Log"; buat otomatis (dengan header) kalau belum
 * ada. TIDAK memakai getSheet_() yang throw kalau sheet tidak
 * ditemukan — audit log adalah observability-only (§34/§35), jadi
 * sheet yang belum ada harus di-provision, bukan menggagalkan
 * transaksi. Caller (logAuditEvent_) tetap membungkus semua ini
 * dengan try/catch sebagai lapisan aman terakhir.
 */
/**
 * [WO-1.9 FIX v2 — race-safe TANPA nested lock] Fix pertama (v5.10)
 * memakai LockService.getScriptLock() kedua di dalam fungsi ini untuk
 * menutup race saat cold-start. Itu SALAH: getScriptLock() di GAS
 * adalah satu mutex global per script project (bukan per Lock-object),
 * dan >90% pemanggil logAuditEvent_() ada DI DALAM critical section
 * addMovementRow() yang sudah memegang lock itu. Kalau sheet Audit Log
 * belum sempat terbuat sebelum masuk critical section, waitLock() di
 * sini akan mencoba mengunci lock yang sudah dipegang eksekusi yang
 * sama sendiri -> risiko self-deadlock, jauh lebih parah dari race
 * aslinya. Diperbaiki: TIDAK memakai lock sama sekali. Cukup coba
 * insertSheet(), dan kalau gagal karena nama sudah dipakai (request
 * lain menang race), re-fetch dengan getSheetByName() -- pada titik
 * itu sheet PASTI sudah ada karena insertSheet() lawannya sudah commit
 * sebelum exception ini muncul.
 */
function getOrCreateAuditLogSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_AUDIT_LOG);
  if (sheet) {
    // [WO-2.2] Migrasi header: sheet Audit Log yang sudah ada dari
    // versi sebelum kolom "AuthenticatedActor" ditambahkan cuma punya
    // 13 kolom header lama. Tambahkan HANYA kolom yang kurang di baris
    // header (row 1) -- data lama tetap utuh, cuma kolom baru kosong
    // utk baris lama (wajar, belum ada authenticated actor waktu itu).
    const currentHeaderCount = Math.max(sheet.getLastColumn(), 1);
    if (currentHeaderCount < AUDITCOL_HEADERS.length) {
      sheet.getRange(1, 1, 1, AUDITCOL_HEADERS.length).setValues([AUDITCOL_HEADERS]);
    }
    return sheet;
  }

  try {
    sheet = ss.insertSheet(SHEET_AUDIT_LOG);
    sheet.appendRow(AUDITCOL_HEADERS);
    return sheet;
  } catch (e) {
    // Kemungkinan besar: request lain barusan membuat sheet ini duluan
    // (nama bentrok). Re-fetch, jangan retry insertSheet.
    return ss.getSheetByName(SHEET_AUDIT_LOG);
  }
}

/**
 * [WO-1.9] SATU-SATUNYA titik penulisan Audit Log. TIDAK PERNAH throw
 * (dibungkus try/catch, silent-fail sama seperti logTransactionFailure_)
 * — kegagalan di sini TIDAK PERNAH mengubah hasil business transaction
 * (§34/§35 work order: audit bukan single point of failure). Timestamp
 * SELALU server-side (new Date()), tidak menerima timestamp dari
 * client (§9). Tidak menyimpan full payload/secret/token apa pun —
 * hanya field terkurasi yang eksplisit diberikan caller (§20/§21).
 *
 * @param {{event, requestId, transactionId, stage, operation, unitId,
 *          kodeAlat, actorReported, errorCode, stateDiff, rollbackStatus,
 *          note}} d
 */
function logAuditEvent_(d) {
  try {
    const sheet = getOrCreateAuditLogSheet_();
    sheet.appendRow([
      new Date(),
      d.event || '',
      d.requestId || '',
      d.transactionId || '',
      d.stage || '',
      d.operation || '',
      d.unitId || '',
      d.kodeAlat || '',
      d.actorReported ? String(d.actorReported) : 'UNKNOWN',
      d.authenticatedActor ? String(d.authenticatedActor) : '',
      d.errorCode || '',
      d.stateDiff ? JSON.stringify(d.stateDiff) : '',
      d.rollbackStatus || '',
      d.note || ''
    ]);
  } catch (e) {
    // Audit log TIDAK BOLEH pernah menggagalkan business transaction.
    try { Logger.log('AUDIT_LOG_WRITE_FAILED: ' + e.message); } catch (e2) {}
    // [WO-2.1.3] Logger.log saja ephemeral -- tidak ada yang memantau.
    // Coba beri tahu admin via email, TAPI dibungkus try/catch lagi &
    // rate-limited (lihat notifyAuditLogFailure_) -- kegagalan alert
    // ITU SENDIRI juga tidak boleh melempar apa pun ke pemanggil.
    try { notifyAuditLogFailure_(e); } catch (e3) {}
  }
}

/**
 * [WO-2.1.3 — audit log reliability] Kirim email ke admin kalau Audit
 * Log gagal tulis, RATE-LIMITED maks 1x per 6 jam (ADMIN_ALERT_
 * COOLDOWN_MS) supaya kegagalan berulang beruntun tidak membanjiri
 * inbox admin. Timestamp alert terakhir disimpan di Script Properties
 * (bukan di memory -- harus bertahan lintas eksekusi GAS yang stateless).
 * Kalau ADMIN_ALERT_EMAIL belum di-set di Script Properties, fungsi ini
 * diam saja (tidak throw) -- sama seperti API_ACCESS_TOKEN, ini property
 * yang harus di-set manual sekali oleh admin.
 */
const ADMIN_ALERT_EMAIL_KEY = 'ADMIN_ALERT_EMAIL';
const ADMIN_ALERT_LAST_TS_KEY = 'AUDIT_LOG_LAST_ALERT_TS';
const ADMIN_ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 jam

function notifyAuditLogFailure_(originalError) {
  const props = PropertiesService.getScriptProperties();
  const adminEmail = props.getProperty(ADMIN_ALERT_EMAIL_KEY);
  if (!adminEmail) return; // belum dikonfigurasi -- diam, jangan throw

  const lastTsRaw = props.getProperty(ADMIN_ALERT_LAST_TS_KEY);
  const lastTs = lastTsRaw ? Date.parse(lastTsRaw) : NaN;
  if (!isNaN(lastTs) && (Date.now() - lastTs) < ADMIN_ALERT_COOLDOWN_MS) {
    return; // masih dalam cooldown, skip -- tidak spam
  }

  MailApp.sendEmail({
    to: adminEmail,
    subject: '[Monitoring Saw Blade & Cutter] Audit Log gagal tulis',
    body: 'Audit Log gagal tulis pada ' + new Date().toString() + '.\n\n' +
      'Pesan error: ' + (originalError && originalError.message || String(originalError)) + '\n\n' +
      'Transaksi bisnis TIDAK terpengaruh (Movement Log/Tool Unit tetap ' +
      'ter-commit normal) -- ini hanya lapisan traceability tambahan yang ' +
      'gagal. Cek sheet "Audit Log" dan Executions di editor Apps Script ' +
      'untuk detail. Notifikasi ini rate-limited (maks 1x per 6 jam), ' +
      'jadi kalau kegagalan masih berlanjut, tidak akan ada email baru ' +
      'sampai cooldown berakhir.'
  });
  props.setProperty(ADMIN_ALERT_LAST_TS_KEY, new Date().toISOString());
}

/**
 * [WO-1.9 §13] Pemetaan errorCode (Phase 1.3-1.6 validasi) -> stage
 * yang jelas untuk audit trail. HANYA dipakai untuk pelabelan audit,
 * TIDAK mengubah errorCode yang dikirim ke client (kontrak response
 * existing tidak disentuh).
 */
function mapErrorCodeToStage_(errorCode) {
  const SCHEMA = ['INVALID_PAYLOAD', 'UNKNOWN_FIELD', 'MISSING_REQUIRED_FIELD',
    'INVALID_FIELD_TYPE', 'INVALID_FIELD_VALUE', 'INVALID_ACTIVITY'];
  const QTY = ['INVALID_QTY'];
  const REFERENCE = ['UNIT_ID_DUPLICATE', 'DUPLICATE_UNIT_ID', 'UNIT_NOT_FOUND',
    'INVALID_MASTER_REFERENCE', 'MASTER_CODE_DUPLICATE', 'DATA_INTEGRITY_ERROR'];
  const STATE = ['UNKNOWN_CURRENT_STATE', 'INVALID_STATE_TRANSITION'];
  if (SCHEMA.indexOf(errorCode) !== -1) return 'SCHEMA_VALIDATION';
  if (QTY.indexOf(errorCode) !== -1) return 'QUANTITY_VALIDATION';
  if (REFERENCE.indexOf(errorCode) !== -1) return 'REFERENCE_VALIDATION';
  if (STATE.indexOf(errorCode) !== -1) return 'STATE_VALIDATION';
  return 'VALIDATION';
}

/**
 * [WO-1.9 §22/§23] Bangun state diff Tool Unit yang RINGKAS — hanya
 * field yang benar-benar berubah, bukan full row. beforeValues=null
 * berarti unit baru (PEMBELIAN BARU, tidak ada state "before").
 */
function buildToolUnitStateDiff_(beforeValues, afterStatus, afterLokasi, afterKodeMesin, afterRegrind) {
  if (!beforeValues) {
    return { created: true, status: afterStatus, location: afterLokasi || undefined };
  }
  const diff = {};
  const beforeStatus = String(beforeValues[TUCOL.STATUS_UNIT - 1]).trim();
  const beforeLokasi = String(beforeValues[TUCOL.LOKASI - 1]).trim();
  const beforeKodeMesin = String(beforeValues[TUCOL.KODE_MESIN - 1]).trim();
  const beforeRegrind = Number(beforeValues[TUCOL.REGRIND_COUNT - 1]) || 0;
  if (beforeStatus !== afterStatus) diff.status = { before: beforeStatus, after: afterStatus };
  if (beforeLokasi !== (afterLokasi || '')) diff.location = { before: beforeLokasi, after: afterLokasi || '' };
  if (beforeKodeMesin !== (afterKodeMesin || '')) diff.kodeMesin = { before: beforeKodeMesin, after: afterKodeMesin || '' };
  if (beforeRegrind !== afterRegrind) diff.regrindCount = { before: beforeRegrind, after: afterRegrind };
  return diff;
}


/* ------------------------------------------------------------
 * [WO-1.2] TRANSACTION ATOMICITY & ROLLBACK SAFETY — helper commit/
 * verify/rollback dipakai addMovementRow(). Google Sheets tidak
 * punya database transaction; ini adalah application-level safety:
 * commitXxx_() menulis dan mengembalikan info identitas row yang
 * ditulis, verifyXxx_() membaca ulang untuk memastikan tulisan benar
 * sesuai harapan, rollbackXxx_() mengembalikan state SEBELUM commit —
 * SELALU dengan guard identity (Unit_ID / ID_TRANSAKSI + posisi row)
 * supaya tidak pernah menghapus/menimpa baris milik transaksi lain
 * (§11/§19).
 * ------------------------------------------------------------ */

/**
 * Tulis perubahan Tool Unit (insert baris baru untuk PEMBELIAN BARU, atau
 * update baris existing). Mengembalikan info yang dibutuhkan verify/
 * rollback: rowIndex yang ditulis, apakah row baru (insert) atau existing
 * (update), dan nilai yang DIHARAPKAN ada di sana setelah commit.
 *
 * Logika bisnis (status/lokasi/kode mesin/regrind count per activity)
 * PERSIS SAMA seperti upsertToolUnitAfterActivity_() sebelumnya — tidak
 * ada perubahan lifecycle/Cycle_ID/Regrind Count di sini, cuma dipecah
 * supaya hasil commit bisa diverifikasi & di-rollback.
 */
function commitToolUnit_(sheet, unitInfo, p) {
  const newStatus = STATUS_AFTER_ACTIVITY[p.activity] ||
    (unitInfo ? String(unitInfo.row[TUCOL.STATUS_UNIT - 1]).trim() : 'GUDANG');

  const isPasang = p.activity === 'DIPASANG KE MESIN';
  const isSelesaiDiasah = p.activity === 'SELESAI DIASAH';
  const lokasi = isPasang ? p.mesin : (unitInfo ? String(unitInfo.row[TUCOL.LOKASI - 1]).trim() : '');
  const kodeMesin = isPasang ? p.kodeMesin : (unitInfo ? String(unitInfo.row[TUCOL.KODE_MESIN - 1]).trim() : '');

  if (!unitInfo) {
    const newRow = new Array(TUCOL.KODE_MESIN).fill('');
    newRow[TUCOL.KODE_ALAT - 1] = p.kodeAlat;
    newRow[TUCOL.UNIT_ID - 1] = p.unitId;
    newRow[TUCOL.REGRIND_COUNT - 1] = 0;
    newRow[TUCOL.LAST_EVENT - 1] = p.activity;
    newRow[TUCOL.STATUS_UNIT - 1] = newStatus;
    newRow[TUCOL.LOKASI - 1] = lokasi;
    newRow[TUCOL.KODE_MESIN - 1] = kodeMesin;
    sheet.appendRow(newRow); // atomic: seluruh row ini masuk atau exception (tidak ada row baru)
    const newRowIndex = sheet.getLastRow();
    return {
      rowIndex: newRowIndex,
      isNew: true,
      // [WO-2.1.1] expected sekarang mencakup SEMUA field yang benar-benar
      // ditulis (bukan cuma unitId/lastEvent/statusUnit) -- lokasi/kodeMesin
      // ikut ditulis saat DIPASANG KE MESIN, regrindCount selalu ditulis
      // (0 utk unit baru). Sebelumnya field ini hanya ada di afterLokasi/
      // afterKodeMesin/afterRegrind utk audit-log, TIDAK pernah diverifikasi.
      expected: {
        unitId: p.unitId, lastEvent: p.activity, statusUnit: newStatus,
        lokasi: lokasi, kodeMesin: kodeMesin, regrindCount: 0
      },
      // [WO-1.9] field ini tetap ada (dipakai buildToolUnitStateDiff_ utk
      // audit log) -- sekarang nilainya sama dgn expected di atas, sengaja
      // duplikat supaya tidak mengubah kontrak fungsi pemanggil lain.
      afterLokasi: lokasi, afterKodeMesin: kodeMesin, afterRegrind: 0
    };
  }

  sheet.getRange(unitInfo.rowIndex, TUCOL.LAST_EVENT).setValue(p.activity);
  sheet.getRange(unitInfo.rowIndex, TUCOL.STATUS_UNIT).setValue(newStatus);
  if (isPasang) {
    sheet.getRange(unitInfo.rowIndex, TUCOL.LOKASI).setValue(lokasi);
    sheet.getRange(unitInfo.rowIndex, TUCOL.KODE_MESIN).setValue(kodeMesin);
  }
  let expectedRegrind = Number(unitInfo.row[TUCOL.REGRIND_COUNT - 1]) || 0;
  if (isSelesaiDiasah) {
    expectedRegrind = expectedRegrind + 1;
    sheet.getRange(unitInfo.rowIndex, TUCOL.REGRIND_COUNT).setValue(expectedRegrind);
  }
  return {
    rowIndex: unitInfo.rowIndex,
    isNew: false,
    // [WO-2.1.1] lihat catatan di cabang isNew:true di atas.
    expected: {
      unitId: p.unitId, lastEvent: p.activity, statusUnit: newStatus,
      lokasi: lokasi, kodeMesin: kodeMesin, regrindCount: expectedRegrind
    },
    // [WO-1.9] lihat catatan di cabang isNew:true di atas.
    afterLokasi: lokasi, afterKodeMesin: kodeMesin, afterRegrind: expectedRegrind
  };
}

/**
 * [WO-2.1.1] Baca ulang row Tool Unit yang barusan ditulis, cocokkan
 * dengan expected. Diperluas dari versi sebelumnya (hanya unitId/
 * lastEvent/statusUnit) supaya benar-benar memverifikasi SEMUA field
 * yang commitToolUnit_() bisa tulis: lokasi & kodeMesin (saat DIPASANG
 * KE MESIN) dan regrindCount (saat SELESAI DIASAH, atau tetap sama
 * kalau tidak). Sebelumnya celah ini memungkinkan verifikasi PASS
 * walau salah satu field tsb gagal tersimpan/salah nilai.
 */
function verifyToolUnitWrite_(sheet, commitInfo) {
  if (!commitInfo) return false;
  try {
    const row = sheet.getRange(commitInfo.rowIndex, 1, 1, TUCOL.KODE_MESIN).getValues()[0];
    const actualUnitId = String(row[TUCOL.UNIT_ID - 1]).trim().toUpperCase();
    const actualLastEvent = String(row[TUCOL.LAST_EVENT - 1]).trim();
    const actualStatus = String(row[TUCOL.STATUS_UNIT - 1]).trim();
    const actualLokasi = String(row[TUCOL.LOKASI - 1]).trim();
    const actualKodeMesin = String(row[TUCOL.KODE_MESIN - 1]).trim();
    const actualRegrind = Number(row[TUCOL.REGRIND_COUNT - 1]) || 0;
    if (actualUnitId !== String(commitInfo.expected.unitId).trim().toUpperCase()) return false;
    if (actualLastEvent !== commitInfo.expected.lastEvent) return false;
    if (actualStatus !== commitInfo.expected.statusUnit) return false;
    if (actualLokasi !== String(commitInfo.expected.lokasi || '').trim()) return false;
    if (actualKodeMesin !== String(commitInfo.expected.kodeMesin || '').trim()) return false;
    if (actualRegrind !== Number(commitInfo.expected.regrindCount || 0)) return false;
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Kembalikan Tool Unit ke state SEBELUM transaksi ini. Tiga kasus:
 *  1. commitInfo.isNew -> baris baru dihapus, TAPI hanya kalau identity
 *     (Unit_ID) cocok DAN posisinya masih baris terakhir sheet (guard
 *     §11/§19 — jangan menghapus baris transaksi lain).
 *  2. commitInfo ada & bukan baru (update existing) -> restore SELURUH
 *     row dari snapshot (bukan cuma field yang diubah — §8), dengan
 *     guard identity Unit_ID.
 *  3. commitInfo null (commitToolUnit_ sendiri yang throw) -> kalau unit
 *     sebelumnya sudah ada, tetap restore dari snapshot (kemungkinan ada
 *     setValue() yang sempat sukses sebelum yang berikutnya gagal); kalau
 *     unit baru (insert), appendRow() bersifat atomic jadi exception di
 *     situ berarti TIDAK ADA baris yang sempat masuk -> tidak ada yang
 *     perlu di-rollback.
 * Return true kalau state berhasil dipastikan kembali aman, false kalau
 * rollback tidak bisa dilakukan dengan aman (caller wajib melaporkan
 * TRANSACTION_ROLLBACK_FAILED, bukan mengklaim data aman).
 */
function rollbackToolUnit_(sheet, snapshot, commitInfo, unitId) {
  try {
    const targetUnitId = String(unitId == null ? '' : unitId).trim().toUpperCase();

    if (commitInfo && commitInfo.isNew) {
      const lastRow = sheet.getLastRow();
      if (commitInfo.rowIndex !== lastRow) return false; // posisi bergeser -> jangan tebak, abort
      const actualUnitId = String(sheet.getRange(commitInfo.rowIndex, TUCOL.UNIT_ID).getValue()).trim().toUpperCase();
      if (actualUnitId !== targetUnitId) return false; // identity tidak cocok -> abort rollback
      sheet.deleteRow(commitInfo.rowIndex);
      return true;
    }

    // Update pada row existing (baik commitInfo sukses maupun commitToolUnit_ throw
    // di tengah jalan) -> restore dari snapshot penuh.
    if (snapshot && snapshot.existed) {
      const actualUnitId = String(sheet.getRange(snapshot.rowIndex, TUCOL.UNIT_ID).getValue()).trim().toUpperCase();
      if (actualUnitId !== targetUnitId) return false; // baris sudah berubah identitas -> abort
      sheet.getRange(snapshot.rowIndex, 1, 1, TUCOL.KODE_MESIN).setValues([snapshot.values]);
      return true;
    }

    // !commitInfo && !snapshot.existed -> appendRow() throw sebelum sempat
    // menambah row apa pun (atomic). Tidak ada state untuk dikembalikan.
    return true;
  } catch (e) {
    return false;
  }
}

/** Tulis baris baru ke Movement Log, kembalikan identitas row untuk verify/rollback. */
function commitMovementLog_(sheet, rowValues) {
  const oldLastRow = sheet.getLastRow();
  sheet.appendRow(rowValues); // atomic: seluruh row masuk atau exception, tidak ada partial row
  return { rowIndex: oldLastRow + 1, oldLastRow: oldLastRow };
}

/**
 * [WO-2.1.1] Baca ulang row Movement Log yang barusan ditulis, cocokkan
 * SELURUH 13 kolom dengan expectedRowValues (array persis seperti yang
 * dikirim ke commitMovementLog_/appendRow, urutan sesuai const COL).
 * Diperluas dari versi sebelumnya (hanya ID_TRANSAKSI/Unit_ID/Activity)
 * -- itu tidak menutup kemungkinan qty/kodeMesin/pic/dll salah tersimpan
 * tapi tetap dianggap PASS. Angka (QTY, ID_TRANSAKSI, COUNTER) dibanding
 * sbg Number, sisanya sbg string ter-trim (longgar terhadap perbedaan
 * whitespace yang tidak signifikan, ketat terhadap isi).
 */
function verifyMovementLogWrite_(sheet, commitInfo, expectedRowValues) {
  if (!commitInfo || !expectedRowValues) return false;
  try {
    const row = sheet.getRange(commitInfo.rowIndex, 1, 1, COL.REMARK).getValues()[0];
    const NUMERIC_COLS = [COL.ID_TRANSAKSI, COL.QTY, COL.COUNTER];
    for (let i = 0; i < expectedRowValues.length; i++) {
      const colIndex = i + 1; // COL.* 1-based, sejajar posisi array
      const expectedVal = expectedRowValues[i];
      const actualVal = row[i];
      if (NUMERIC_COLS.indexOf(colIndex) !== -1) {
        if (Number(actualVal) !== Number(expectedVal)) return false;
      } else {
        if (String(actualVal == null ? '' : actualVal).trim() !== String(expectedVal == null ? '' : expectedVal).trim()) return false;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Hapus baris Movement Log yang barusan ditulis transaksi ini — HANYA
 * kalau posisinya masih baris terakhir sheet DAN ID_TRANSAKSI di baris
 * itu cocok dengan transaksi yang sedang di-rollback (§10/§11/§19).
 * Kalau tidak cocok, ABORT dan return false — jangan pernah menghapus
 * baris yang identitasnya tidak bisa dipastikan milik transaksi ini.
 */
function rollbackMovementLog_(sheet, commitInfo, idTransaksi) {
  if (!commitInfo) return true; // belum pernah ditulis -> tidak ada yang di-rollback
  try {
    if (commitInfo.rowIndex !== sheet.getLastRow()) return false;
    const actualId = Number(sheet.getRange(commitInfo.rowIndex, COL.ID_TRANSAKSI).getValue());
    if (actualId !== Number(idTransaksi)) return false;
    sheet.deleteRow(commitInfo.rowIndex);
    return true;
  } catch (e) {
    return false;
  }
}


/* ------------------------------------------------------------
 * [WO-1.3] STRICT QTY VALIDATION
 * ------------------------------------------------------------
 * qty TIDAK PERNAH di-fallback ke 1. Input invalid harus REJECT
 * sebelum ada write apa pun (integrasi ke validateMovementPayload_(),
 * dipanggil sebelum semua write di addMovementRow() — konsisten dengan
 * urutan PREPARE Phase 1.2, jadi qty invalid otomatis tidak menyentuh
 * Movement Log / Tool Unit dan tidak membuat idempotency SUCCESS).
 * ------------------------------------------------------------ */
const MAX_TRANSACTION_QTY = 100000;
const QTY_INVALID_MESSAGE = 'Qty harus berupa bilangan bulat lebih dari 0.';
const QTY_STRICT_STRING_PATTERN = /^[0-9]+$/; // hanya digit murni: tanpa +/-, tanpa titik, tanpa 'e'

/**
 * Terima HANYA: number integer > 0 (finite, safe integer, <= MAX_TRANSACTION_QTY),
 * atau string yang setelah di-trim adalah digit murni ("5", " 5 ") dengan nilai
 * yang sama. Tidak pernah mengembalikan fallback — invalid selalu { ok:false }.
 */
function parseQtyStrict_(value) {
  if (value === null || value === undefined) {
    return { ok: false, error: QTY_INVALID_MESSAGE };
  }

  let numericValue;

  if (typeof value === 'number') {
    numericValue = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || !QTY_STRICT_STRING_PATTERN.test(trimmed)) {
      return { ok: false, error: QTY_INVALID_MESSAGE };
    }
    numericValue = Number(trimmed);
  } else {
    // boolean, array, object, function, dll -> selalu invalid
    return { ok: false, error: QTY_INVALID_MESSAGE };
  }

  if (
    !Number.isFinite(numericValue) ||
    !Number.isInteger(numericValue) ||
    !Number.isSafeInteger(numericValue) ||
    numericValue <= 0
  ) {
    return { ok: false, error: QTY_INVALID_MESSAGE };
  }

  if (numericValue > MAX_TRANSACTION_QTY) {
    return { ok: false, error: 'Qty melebihi batas maksimum transaksi.' };
  }

  return { ok: true, value: numericValue };
}


/* ------------------------------------------------------------
 * [WO-1.4] STRICT PAYLOAD SCHEMA & FIELD VALIDATION
 * ------------------------------------------------------------
 * Kontrak field addMovementRow — SESUAI payload aktual yang dikirim
 * index.html (lihat apiPost('addMovementRow', {...}) di frontend) dan
 * field yang benar-benar dibaca di bawah. requestId ikut di-whitelist
 * di sini (supaya tidak kena UNKNOWN_FIELD) tapi isinya SUDAH
 * divalidasi terpisah oleh validateRequestId_() (Phase 1.1) sebelum
 * fungsi ini dipanggil — tidak divalidasi ulang di sini.
 *
 * FIELD | REQUIRED | TYPE   | NORMALIZATION      | VALIDATION
 * requestId   | YA (di luar fungsi ini, Phase 1.1)
 * tanggal     | tidak | string | trim + formula-guard | fallback formatTodayServer_() kalau kosong
 * kodeAlat    | YA    | string | trim + formula-guard | non-empty
 * unitId      | YA    | string | trim + formula-guard | non-empty, regex [A-Za-z0-9-]+
 * spesifikasi | tidak | string | trim + formula-guard | -
 * mesin       | tidak | string | trim + formula-guard | -
 * kodeMesin   | tidak | string | trim + formula-guard | -
 * activity    | YA    | string | trim + formula-guard | whitelist getValidActivities()
 * qty         | YA    | number/digit-string | - | parseQtyStrict_() (Phase 1.3, TIDAK DIUBAH)
 * pic         | YA    | string | trim + formula-guard | non-empty
 * remark      | tidak | string | trim + formula-guard | -
 */
const ALLOWED_MOVEMENT_FIELDS_ = [
  'requestId', 'tanggal', 'kodeAlat', 'unitId', 'spesifikasi',
  'mesin', 'kodeMesin', 'activity', 'qty', 'pic', 'remark'
];

const REQUIRED_STRING_FIELDS_ = ['kodeAlat', 'unitId', 'activity', 'pic'];
const OPTIONAL_STRING_FIELDS_ = ['tanggal', 'spesifikasi', 'mesin', 'kodeMesin', 'remark'];

const FIELD_LABEL_ = {
  tanggal: 'Tanggal', kodeAlat: 'Kode alat', unitId: 'Unit_ID',
  spesifikasi: 'Spesifikasi', mesin: 'Mesin', kodeMesin: 'Kode mesin',
  activity: 'Jenis transaksi', pic: 'Nama PIC', remark: 'Catatan'
};

/**
 * Validasi 1 field string sesuai kontrak di atas. TIDAK PERNAH
 * melakukan String(value) untuk mengubah object/array/number/boolean
 * jadi string — kalau tipenya bukan string, REJECT (INVALID_FIELD_TYPE).
 * Required + undefined/null/"" (setelah trim) -> MISSING_REQUIRED_FIELD.
 */
function validateStringField_(payload, field, required) {
  const label = FIELD_LABEL_[field] || field;
  const has = Object.prototype.hasOwnProperty.call(payload, field);
  const value = has ? payload[field] : undefined;

  if (value === undefined || value === null) {
    if (required) {
      return { ok: false, errorCode: 'MISSING_REQUIRED_FIELD', error: label + ' wajib diisi.' };
    }
    return { ok: true, value: '' };
  }

  if (typeof value !== 'string') {
    return { ok: false, errorCode: 'INVALID_FIELD_TYPE', error: label + ' harus berupa teks.' };
  }

  const trimmed = value.trim();
  if (required && trimmed === '') {
    return { ok: false, errorCode: 'MISSING_REQUIRED_FIELD', error: label + ' wajib diisi.' };
  }

  return { ok: true, value: applyFormulaGuard_(trimmed) };
}

/** Cegah formula injection: kalau teks diawali =,+,-,@ atau tab/CR, prefix apostrophe. */
function applyFormulaGuard_(s) {
  return FORMULA_TRIGGER_CHARS.test(s) ? ("'" + s) : s;
}

function validateMovementPayload_(payload) {
  // 1. Payload harus plain object — null/array/string/number/boolean/
  //    function semua ditolak SEBELUM field apa pun disentuh.
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, errorCode: 'INVALID_PAYLOAD', error: 'Payload transaksi tidak valid.' };
  }

  // 2. Strict whitelist — field di luar kontrak (termasuk field
  //    server-owned semacam idTransaksi/cycleId/counter, atau
  //    __proto__/constructor/prototype) ditolak, tidak pernah dipakai.
  const payloadKeys = Object.keys(payload);
  for (let i = 0; i < payloadKeys.length; i++) {
    if (ALLOWED_MOVEMENT_FIELDS_.indexOf(payloadKeys[i]) === -1) {
      return {
        ok: false, errorCode: 'UNKNOWN_FIELD',
        error: 'Field "' + payloadKeys[i] + '" tidak dikenali oleh sistem.'
      };
    }
  }

  // 3. Required string fields dulu (kodeAlat, unitId, activity, pic).
  const fields = {};
  for (let i = 0; i < REQUIRED_STRING_FIELDS_.length; i++) {
    const f = REQUIRED_STRING_FIELDS_[i];
    const r = validateStringField_(payload, f, true);
    if (!r.ok) return r;
    fields[f] = r.value;
  }

  // 4. Optional string fields (tanggal, spesifikasi, mesin, kodeMesin, remark).
  for (let i = 0; i < OPTIONAL_STRING_FIELDS_.length; i++) {
    const f = OPTIONAL_STRING_FIELDS_[i];
    const r = validateStringField_(payload, f, false);
    if (!r.ok) return r;
    fields[f] = r.value;
  }

  // 5. Unit_ID format (existing rule, TIDAK DIUBAH) — sudah pasti string di titik ini.
  if (!/^[A-Za-z0-9\-]+$/.test(fields.unitId)) {
    return { ok: false, errorCode: 'INVALID_FIELD_VALUE', error: 'Unit_ID cuma boleh huruf, angka, dan tanda "-".' };
  }

  // 6. Activity whitelist (existing rule via BAGIAN 3, TIDAK DIUBAH) —
  //    tidak ada auto-correct, nilai yang tidak dikenal langsung REJECT.
  const validActivities = getValidActivities();
  if (validActivities && validActivities.length && validActivities.indexOf(fields.activity) === -1) {
    return { ok: false, errorCode: 'INVALID_ACTIVITY', error: 'Jenis transaksi "' + fields.activity + '" tidak dikenali.' };
  }

  // 7. qty STRICT (Phase 1.3, TIDAK DIUBAH) — invalid = REJECT, tidak pernah fallback ke 1.
  const qtyResult = parseQtyStrict_(payload.qty);
  if (!qtyResult.ok) {
    return { ok: false, error: qtyResult.error, errorCode: 'INVALID_QTY' };
  }

  // 8. Hasil akhir dibangun eksplisit field-per-field — transaction
  //    engine hanya boleh membaca validatedPayload ini, bukan raw payload.
  return {
    ok: true,
    payload: {
      // [WO-2.0.2] Tanggal transaksi SEKARANG server-authoritative penuh.
      // Sebelumnya: fields.tanggal || formatTodayServer_() -> client bisa
      // kirim tanggal apa saja (mis. 01/01/2020) dan itu tercatat apa
      // adanya di Movement Log, padahal Movement Log adalah source of
      // truth historical integrity (§Phase 1 rollback/verify). Sekarang
      // nilai client (fields.tanggal, kalau ada) TIDAK DIPAKAI SAMA
      // SEKALI untuk field bisnis ini -- selalu formatTodayServer_().
      // Frontend tidak perlu berubah (sudah kirim "hari ini" dari sisi
      // klien, jadi hasil akhirnya sama utk pemakaian normal); field
      // fields.tanggal tetap divalidasi/di-trim di atas supaya payload
      // lama yang masih mengirimnya tidak menyebabkan error skema.
      tanggal: formatTodayServer_(),
      kodeAlat: fields.kodeAlat,
      unitId: fields.unitId,
      spesifikasi: fields.spesifikasi,
      mesin: fields.mesin,
      kodeMesin: fields.kodeMesin,
      activity: fields.activity,
      qty: qtyResult.value,
      pic: fields.pic,
      remark: fields.remark
    }
  };
}

function formatTodayServer_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
}


/* ------------------------------------------------------------
 * VALIDASI STRUKTUR SHEET (runtime guard)
 * ------------------------------------------------------------ */
function assertMovementLogHeaders_(sheet) {
  const width = MOVEMENT_LOG_HEADER_KEYWORDS.length;
  const header = sheet.getRange(1, 1, 1, width).getValues()[0];
  const problems = [];

  MOVEMENT_LOG_HEADER_KEYWORDS.forEach(function (options, idx) {
    const h = normalizeHeader_(header[idx]);
    const ok = options.some(function (opt) { return h.indexOf(normalizeHeader_(opt)) !== -1; });
    if (!ok) {
      problems.push(
        'Kolom ke-' + (idx + 1) + ': diharapkan header mengandung salah satu dari [' +
        options.join(', ') + '] tapi sheet berisi "' + header[idx] + '"'
      );
    }
  });

  if (problems.length) {
    throw new Error(
      'Struktur header sheet "' + SHEET_MOVEMENT_LOG + '" tidak sesuai asumsi COL.\n' +
      problems.join('\n') +
      '\nCek urutan kolom di baris 1, lalu sesuaikan konstanta COL / MOVEMENT_LOG_HEADER_KEYWORDS.'
    );
  }
}


/* ------------------------------------------------------------
 * GENERATE ID TRANSAKSI & CYCLE ID (Regrind Count)
 * ------------------------------------------------------------ */

/**
 * ID_Transaksi auto-increment. Cari nilai numerik TERBESAR di seluruh
 * kolom (bukan cuma baris terakhir) untuk menangani ID_Transaksi kosong
 * di sebagian baris data lama.
 */
function generateNextTransactionId_(sheet, numRows) {
  if (numRows <= 0) return 1;
  const ids = sheet.getRange(2, COL.ID_TRANSAKSI, numRows, 1).getValues();
  let max = 0;
  ids.forEach(function (row) {
    const n = Number(row[0]);
    if (!isNaN(n) && n > max) max = n;
  });
  if (max === 0) max = numRows; // fallback kalau seluruh kolom ID kosong
  return max + 1;
}

/**
 * Cycle_ID format "<Unit_ID>-<nomor 2 digit>" + Counter (angka polos,
 * sama dengan nomor cycle, tanpa padding) = "Regrind Count".
 *
 * [CHANGE-01] Nomor cycle/Regrind Count naik saat activity =
 * "SELESAI DIASAH" — baris transaksi SELESAI DIASAH itu sendiri yang
 * dapat nomor cycle baru, karena itu momen regrind ke-N benar-benar
 * selesai dikerjakan. Activity lain (PEMBELIAN BARU pertama kali,
 * DIPASANG KE MESIN, KEMBALI KE GUDANG (TUMPUL), KIRIM KE VENDOR ASAH)
 * melanjutkan cycle yang sedang berjalan — tidak menaikkan nomor.
 * Transaksi pertama untuk sebuah unit selalu mulai dari cycle 01.
 */
function resolveCycleInfo_(sheet, numRows, unitId, activity) {
  const target = String(unitId).trim().toUpperCase();
  let lastCycleNum = 0;
  let foundAny = false;

  if (numRows > 0) {
    const data = sheet.getRange(2, 1, numRows, COL.REMARK).getValues();
    for (let i = 0; i < data.length; i++) {
      const rowUnit = String(data[i][COL.UNIT_ID - 1]).trim().toUpperCase();
      if (rowUnit !== target) continue;
      const cyc = String(data[i][COL.CYCLE_ID - 1]).trim();
      const m = /-(\d+)$/.exec(cyc);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n) && n > lastCycleNum) { lastCycleNum = n; foundAny = true; }
      }
    }
  }

  const startsNewCycle = (activity === 'SELESAI DIASAH') || !foundAny;
  const cycleNum = startsNewCycle ? lastCycleNum + 1 : (lastCycleNum || 1);

  return {
    cycleId: unitId + '-' + String(cycleNum).padStart(2, '0'),
    counter: cycleNum
  };
}


/* ------------------------------------------------------------
 * UPDATE SHEET "TOOL UNIT"
 * ------------------------------------------------------------ */
/**
 * [WO-1.5] Scan SELURUH baris Tool Unit (bukan berhenti di match
 * pertama) supaya Unit_ID duplikat (data corrupt) terdeteksi, bukan
 * diam-diam dipilih salah satu. Kembalikan status eksplisit:
 *   - {status:'not_found'}
 *   - {status:'found', rowIndex, row}   -- persis 1 baris
 *   - {status:'duplicate', count}       -- >1 baris, REJECT di caller
 */
function findToolUnitRow_(sheet, unitId) {
  const numRows = sheet.getLastRow() - 1;
  if (numRows <= 0) return { status: 'not_found' };

  const data = sheet.getRange(2, 1, numRows, TUCOL.KODE_MESIN).getValues();
  const target = String(unitId).trim().toUpperCase();

  let match = null;
  let count = 0;
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][TUCOL.UNIT_ID - 1]).trim().toUpperCase() === target) {
      count++;
      if (!match) match = { rowIndex: i + 2, row: data[i] }; // rowIndex = nomor baris asli di sheet
    }
  }
  if (count === 0) return { status: 'not_found' };
  if (count > 1) return { status: 'duplicate', count: count };
  return { status: 'found', rowIndex: match.rowIndex, row: match.row };
}

/**
 * [WO-1.5] Lookup terpusat Master Tools by Kode Alat — satu-satunya
 * tempat yang menentukan "kode alat ini valid di master atau tidak".
 * Case-insensitive, konsisten dengan normalizeKodeAlat() yang sudah
 * dipakai di BAGIAN 1 (getUnitsByKodeAlat/getMesinOptionsForKodeAlat/
 * mapping alat-mesin) — bukan aturan baru, cuma disatukan di sini.
 * Kembalikan status eksplisit, sama pola dengan findToolUnitRow_():
 *   - {status:'not_found'}
 *   - {status:'found', row}        -- persis 1 baris
 *   - {status:'duplicate', count}  -- >1 baris, REJECT di caller
 */
function findMasterToolRow_(kodeAlat) {
  const sheet = getSheet_(SHEET_MASTER_TOOLS);
  const numRows = sheet.getLastRow() - 1;
  if (numRows <= 0) return { status: 'not_found' };

  const data = sheet.getRange(2, 1, numRows, MTCOL.SPESIFIKASI).getValues();
  const target = normalizeKodeAlat(kodeAlat);

  let match = null;
  let count = 0;
  for (let i = 0; i < data.length; i++) {
    if (normalizeKodeAlat(data[i][MTCOL.KODE_ALAT - 1]) === target) {
      count++;
      if (!match) match = data[i];
    }
  }
  if (count === 0) return { status: 'not_found' };
  if (count > 1) return { status: 'duplicate', count: count };
  return { status: 'found', row: match };
}

/* ------------------------------------------------------------
 * NORMALISASI KODE ALAT (dipakai lookup di BAGIAN 1)
 * ------------------------------------------------------------ */
function normalizeKodeAlat(kodeAlat) {
  return String(kodeAlat == null ? '' : kodeAlat).trim().toUpperCase();
}


/* ================================================================
 * BAGIAN 3 — VALIDASI ACTIVITY (dulu ValidateAndCleanup_v2.gs)
 * ================================================================ */

const SHEET_REFERENSI_ACTIVITY = 'Referensi Activity';

/**
 * Fallback kalau sheet "Referensi Activity" tidak ditemukan/kosong —
 * urutan resmi sesuai state machine:
 * PEMBELIAN BARU → DIPASANG KE MESIN → KEMBALI KE GUDANG (TUMPUL)
 *   → KIRIM KE VENDOR ASAH → SELESAI DIASAH → [ulang]
 * KEMBALI KE GUDANG (SIAP), SCRAP / RUSAK, dan KARAT didefinisikan tapi
 * jarang dipakai operasional — tetap disediakan di dropdown.
 */
const FALLBACK_ACTIVITIES = [
  'PEMBELIAN BARU',
  'DIPASANG KE MESIN',
  'KEMBALI KE GUDANG (SIAP)',
  'KEMBALI KE GUDANG (TUMPUL)',
  'KIRIM KE VENDOR ASAH',
  'SELESAI DIASAH',
  'SCRAP / RUSAK',
  'KARAT'
];

/**
 * Pola text activity resmi: diawali huruf kapital, lalu kombinasi
 * huruf kapital/spasi/garis-miring/kurung. Dipakai untuk membedakan
 * baris data activity asli dari baris judul/instruksi/header yang
 * ikut ada di kolom A sheet "Referensi Activity".
 */
const ACTIVITY_CODE_PATTERN = /^[A-Z][A-Z\s/()]*$/;

function getValidActivities() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_REFERENSI_ACTIVITY);
    if (!sheet) return FALLBACK_ACTIVITIES;

    const lastRow = sheet.getLastRow();
    if (lastRow < 1) return FALLBACK_ACTIVITIES;

    // Baca seluruh kolom A (bukan cuma "baris 2 dan seterusnya") — sheet
    // asli punya baris judul/instruksi sebelum header tabel.
    const values = sheet.getRange(1, 1, lastRow, 1).getValues();

    const seen = {};
    const list = [];
    values.forEach(function (r) {
      const v = String(r[0] == null ? '' : r[0]).trim();
      if (!v || !ACTIVITY_CODE_PATTERN.test(v)) return; // buang judul/instruksi/header/angka
      if (seen[v]) return; // dedupe (jaga-jaga kalau ada baris ganda)
      seen[v] = true;
      list.push(v);
    });

    return list.length ? list : FALLBACK_ACTIVITIES;
  } catch (e) {
    return FALLBACK_ACTIVITIES;
  }
}

/* ============================================================
 * [Audit fix — fungsi admin tidak muncul di dropdown Run]
 * ============================================================
 * SEMUA fungsi di atas yang namanya diakhiri "_" (setupUsersSheet_,
 * createUserAccount_, createUserAccountsBatch_, setupIdempotencyClean
 * upTrigger_) SENGAJA diberi akhiran itu -- konvensi "function privat"
 * supaya TIDAK ke-expose sebagai endpoint publik (doPost/doGet cuma
 * mengizinkan action yang eksplisit disebut namanya di switch/if,
 * jadi akhiran "_" di sini murni penanda "bukan API publik").
 *
 * Efek samping yang BARU DISADARI (bukan bug baru, tapi gap dokumentasi/
 * DX): editor Apps Script juga otomatis MENYEMBUNYIKAN semua fungsi
 * berakhiran "_" dari dropdown toolbar "Select function to run" --
 * jadi admin tidak bisa pilih & klik Run dari situ, harus cari ikon
 * ▷ kecil di gutter nomor baris tiap fungsi (gampang kelewat).
 *
 * Wrapper TIPIS di bawah ini (TANPA akhiran "_", isinya cuma manggil
 * fungsi aslinya) SATU-SATUNYA tujuannya supaya fungsi admin manual-
 * run muncul di dropdown biasa. Tidak mengubah logika apa pun.
 * ------------------------------------------------------------ */

/** Muncul di dropdown sbg "runSetupUsersSheet" -> jalankan setupUsersSheet_(). */
function runSetupUsersSheet() {
  setupUsersSheet_();
}

/** Muncul di dropdown sbg "runCreateUserAccount" -> jalankan createUserAccount_().
 *  Ingat: edit USERNAME_/PLAIN_PASSWORD_/ACTOR_NAME_ di dalam createUserAccount_()
 *  dulu SEBELUM Run, lihat komentar di definisi aslinya. */
function runCreateUserAccount() {
  createUserAccount_();
}

/** Muncul di dropdown sbg "runCreateUserAccountsBatch" -> jalankan createUserAccountsBatch_().
 *  Ingat: isi array USERS_BATCH_ di dalam createUserAccountsBatch_() dulu
 *  SEBELUM Run, lihat komentar di definisi aslinya. */
function runCreateUserAccountsBatch() {
  createUserAccountsBatch_();
}

/** Muncul di dropdown sbg "runSetupIdempotencyCleanupTrigger" -> jalankan setupIdempotencyCleanupTrigger_(). */
function runSetupIdempotencyCleanupTrigger() {
  setupIdempotencyCleanupTrigger_();
}
function runFullDataAudit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const report = [];

  // 1) Cek ID_Transaksi duplikat di Movement Log
  const logSheet = ss.getSheetByName('Movement Log');
  const logData = logSheet.getRange(2, 1, logSheet.getLastRow() - 1, 13).getValues();
  const idSeen = {};
  logData.forEach(function (row, i) {
    const id = row[3]; // kolom D = ID_Transaksi
    if (id === '' || id === null) return;
    if (idSeen[id]) {
      report.push(['DUPLICATE_ID_TRANSAKSI', 'Movement Log', 'row ' + (i + 2), 'ID=' + id + ' bentrok dgn row ' + idSeen[id]]);
    } else {
      idSeen[id] = i + 2;
    }
  });

  // 2) Cek baris kosong/orphan di semua sheet utama
  ['Movement Log', 'Tool Unit', 'Kontrol Asah', 'Master Tools'].forEach(function (name) {
    const sh = ss.getSheetByName(name);
    const data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const filled = data[i].filter(function (c) { return c !== '' && c !== null; }).length;
      if (filled > 0 && filled <= 2) {
        report.push(['ORPHAN_ROW', name, 'row ' + (i + 1), 'hanya ' + filled + ' kolom terisi']);
      }
    }
  });

  // 3) Rekonstruksi status Tool Unit dari Movement Log, bandingkan ke kolom Status Unit
  const tuSheet = ss.getSheetByName('Tool Unit');
  const tuData = tuSheet.getRange(2, 1, tuSheet.getLastRow() - 1, 13).getValues();
  const lastEventByUnit = {};
  logData.forEach(function (row) {
    const unitId = String(row[2]).trim().toUpperCase();
    const activity = String(row[7]).trim();
    if (!unitId || !activity) return;
    lastEventByUnit[unitId] = activity; // Movement Log diasumsikan urut kronologis
  });
  const STATUS_MAP = {
    'PEMBELIAN BARU': 'GUDANG', 'DIPASANG KE MESIN': 'DIPAKAI',
    'KEMBALI KE GUDANG (TUMPUL)': 'TUMPUL', 'KEMBALI KE GUDANG (SIAP)': 'GUDANG',
    'KIRIM KE VENDOR ASAH': 'DIASAH', 'SELESAI DIASAH': 'GUDANG', 'SCRAP / RUSAK': 'SCRAP'
  };
  tuData.forEach(function (row, i) {
    const unitId = String(row[1]).trim().toUpperCase();
    if (!unitId) return;
    const recordedStatus = String(row[10]).trim().toUpperCase();
    const expectedStatus = STATUS_MAP[lastEventByUnit[unitId]];
    if (expectedStatus && recordedStatus && expectedStatus !== recordedStatus) {
      report.push(['STATUS_MISMATCH', 'Tool Unit', 'row ' + (i + 2),
        unitId + ': tercatat=' + recordedStatus + ' vs rekonstruksi Movement Log=' + expectedStatus]);
    }
  });

  // 4) Cek Stock Status: Total harus >= jumlah semua bucket status
  const ssSheet = ss.getSheetByName('Stock Status');
  const ssData = ssSheet.getRange(2, 1, ssSheet.getLastRow() - 1, 16).getValues();
  ssData.forEach(function (row, i) {
    const kodeAlat = row[0];
    if (!kodeAlat) return;
    const total = Number(row[8]) || 0;       // kolom I
    const dipakai = Number(row[10]) || 0;    // kolom K
    const tunggu = Number(row[11]) || 0;     // kolom L
    const diasah = Number(row[12]) || 0;     // kolom M
    const rusak = Number(row[13]) || 0;      // kolom N
    const siapPakai = Number(row[15]) || 0;  // kolom P
    const sum = dipakai + tunggu + diasah + rusak + siapPakai;
    if (sum !== total) {
      report.push(['STOCK_SUM_MISMATCH', 'Stock Status', 'row ' + (i + 2),
        kodeAlat + ': Total=' + total + ' tapi jumlah bucket=' + sum]);
    }
  });

  // Tulis hasil ke sheet baru
  let outSheet = ss.getSheetByName('Audit Data Report');
  if (outSheet) ss.deleteSheet(outSheet);
  outSheet = ss.insertSheet('Audit Data Report');
  outSheet.appendRow(['Jenis Masalah', 'Sheet', 'Lokasi', 'Detail']);
  report.forEach(function (r) { outSheet.appendRow(r); });
  Logger.log('Audit selesai: ' + report.length + ' masalah ditemukan. Lihat sheet "Audit Data Report".');
}
