# Monitoring Saw Blade & Cutter

PWA untuk monitoring stok & sirkulasi saw blade dan cutter — gudang, mesin, vendor asah.

## Arsitektur

Aplikasi ini adalah PWA statis (HTML/CSS/vanilla JS, tanpa framework) yang berkomunikasi dengan backend Google Apps Script lewat `fetch()`.

- **Frontend**: `index.html` + `src/` (modular)
- **Backend**: Google Apps Script (deploy sebagai Web App) — **tidak ada di repo ini**
- **Data**: Google Sheets (terkelola oleh Apps Script)

## Struktur Source of Truth

### File yang DIEDIT LANGSUNG (source of truth)
- `src/js/app.js` — logika aplikasi utama
- `src/partials/head.html` — konten `<head>` (meta, link, font, dll)
- `src/partials/body.html` — konten `<body>` (markup UI)
- `src/css/main.css` — stylesheet
- `manifest.json` — PWA manifest
- `sw.js` — Service Worker
- `package.json`, `biome.json` — konfigurasi tooling

### `index.html` — status khusus, WAJIB dibaca sebelum edit
> ⚠️ **Update (lihat CHANGELOG v8.23.5 di `src/js/app.js`):** secara teori
> `index.html` "digenerate dari partials" (lihat bagian Build Script di
> bawah), TAPI **build script itu tidak bisa dijalankan ulang saat ini**
> (butuh `original_index.html` yang tidak ada di working tree — lihat
> bagian Build Script). Akibatnya, **`index.html` di root repo saat ini
> adalah file yang di-edit LANGSUNG** (sinkron manual dengan
> `src/js/app.js`/`src/partials/body.html`), bukan file yang otomatis
> ter-generate ulang tiap kali `src/` diubah.
>
> **Konsekuensi penting:** kalau Anda mengedit `src/js/app.js` atau
> `src/partials/body.html`, perubahan itu **TIDAK otomatis muncul** di
> `index.html` — Anda harus menerapkan perubahan yang sama secara manual
> ke `index.html` juga (atau, kalau `original_index.html` berhasil
> dipulihkan dari histori git, jalankan ulang `node build.cjs` — tapi
> lihat catatan bug di bagian Build Script sebelum melakukan itu).
>
> **Insiden yang pernah terjadi karena ini:** `index.html` sempat memuat
> `app.js` DUA KALI (salinan inline `<script>` classic yang tidak sengaja
> ikut ter-generate + `<script type="module" src="src/js/app.js">`),
> menyebabkan bug dropdown "Jenis Transaksi"/"Mesin" tampil dobel dan
> risiko form ter-submit dua kali. Sudah diperbaiki di v8.23.5 — salinan
> inline dihapus, `index.html` sekarang cuma satu sumber JS. Root cause-nya
> ada di `build.cjs` sendiri (lihat bagian Build Script) — sudah ikut
> diperbaiki juga supaya tidak terulang kalau build script pernah dijalankan
> lagi di masa depan.

### File yang (SEHARUSNYA) DIGENERATE OLEH BUILD (lihat catatan di atas)
- `index.html` — entry point. **Saat ini di-maintain manual**, bukan hasil
  build otomatis (lihat catatan ⚠️ di atas).

### Build Script (`build.cjs`)
Script ini **hanya untuk migrasi sekali jalan** dari `original_index.html` (file monolitik lama, encoding UTF-16 LE) ke struktur modular saat ini.
- **Input**: `original_index.html` (harus diambil dari git history, tidak ada di working tree)
- **Output**: `src/css/main.css`, `src/js/app.js`, `src/partials/head.html`, `src/partials/body.html`, `index.html`

> ⚠️ **Jangan jalankan `npm run build` kecuali Anda tahu apa yang Anda lakukan.**
> File `original_index.html` tidak ada di repo. Build script ini adalah artefak migrasi, bukan pipeline build berulang.
> Workflow normal: edit file di `src/` langsung, **lalu terapkan juga perubahan yang sama ke `index.html` secara manual** (lihat catatan di bagian "Struktur Source of Truth" di atas), lalu `npm run format` + `npm run lint`.

> 🐛 **Bug yang pernah ditemukan & sudah diperbaiki (v8.23.5):** ekstraksi
> `bodyContent` di `build.cjs` dulu TIDAK men-strip tag `<script>` dari body
> (beda dengan ekstraksi `headContent` yang sudah benar men-strip
> `<style>`/`<script>`). Karena `original_index.html` (versi pre-migrasi)
> sudah punya `<script>` aplikasi di dalam `<body>`-nya, script lama itu ikut
> terbawa apa adanya ke `src/partials/body.html` DAN ke `index.html` baru
> yang di-generate — yang mana template `index.html` barunya JUGA menambah
> `<script type="module" src="src/js/app.js">` sendiri. Hasilnya: app
> dimuat dua kali, jadi salah satu penyebab bug dropdown "Jenis
> Transaksi"/"Mesin" tampil dobel. Sudah diperbaiki: `bodyContent` sekarang
> ikut di-strip `<script>` sebelum ditulis, `src/partials/body.html` sudah
> dibersihkan dari script vestigial-nya juga. Kalau suatu saat
> `original_index.html` dipulihkan dan build script ini dijalankan ulang,
> bug ini seharusnya tidak muncul lagi.

## Development

```bash
# Install dependencies
npm install

# Development server (serve static files)
npm run dev

# Format code (Biome)
npm run format

# Lint code (Biome)
npm run lint

# Format + lint + fix
npm run check
```

## Deployment

Deploy ke GitHub Pages (atau static hosting lain):
1. Pastikan `index.html` dan `src/` sudah update
2. Push ke branch `main`
3. GitHub Pages serve dari root repo

## Konfigurasi Runtime

Aplikasi **tidak menyimpan URL/token API di kode**. Semua dikonfigurasi runtime via localStorage:
- **Google Apps Script URL**: `https://script.google.com/macros/s/<SCRIPT_ID>/exec`
- **API Token**: dari admin
- **Session Token**: setelah login (TTL 7 hari)

Pengaturan dilakukan di panel **Pengaturan → Koneksi** (admin) atau **Pengaturan → Akun** (operator).

## Role-based Access

| Role | Akses |
|------|-------|
| **Admin/WH** | Semua panel: Dashboard, Stok, Input, Riwayat, Mesin, Kontrol Asah, Konfirmasi Tumpul, Pengaturan |
| **Operator** | Dashboard, Stok (view), Ajukan Tumpul |

Enforcement role dilakukan **di backend** (`addMovementRow` di Apps Script). UI hanya menyembunyikan tab/panel (kosmetik).

## Versi

- `APP_VERSION` di `src/js/app.js` — versi lengkap untuk log developer
- `APP_VERSION_SHORT` — versi ringkas untuk badge UI
- `package.json` version — untuk npm

> ⚠️ **Jangan lupa:** `CACHE_NAME` di `sw.js` **harus ikut dibarui** setiap
> kali `APP_VERSION`/`APP_VERSION_SHORT` naik (mis. `saw-blade-monitor-v8.23.5`).
> Kalau tidak, service worker PWA tidak akan invalidate cache lama, dan
> pengguna yang sudah install PWA-nya **tidak akan menerima update apa pun**
> sampai cache lama expire sendiri. Ini pernah kelewatan (`sw.js` tertinggal
> beberapa versi) — sudah dibarui di v8.23.5, tapi mudah kelewatan lagi
> kalau tidak dicek manual tiap rilis.

## Lisensi

ISC