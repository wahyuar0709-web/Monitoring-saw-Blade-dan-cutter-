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

### File yang DIGENERATE OLEH BUILD (jangan diedit manual)
- `index.html` — entry point, digenerate dari partials

### Build Script (`build.cjs`)
Script ini **hanya untuk migrasi sekali jalan** dari `original_index.html` (file monolitik lama, encoding UTF-16 LE) ke struktur modular saat ini.
- **Input**: `original_index.html` (harus diambil dari git history, tidak ada di working tree)
- **Output**: `src/css/main.css`, `src/js/app.js`, `src/partials/head.html`, `src/partials/body.html`, `index.html`

> ⚠️ **Jangan jalankan `npm run build` kecuali Anda tahu apa yang Anda lakukan.**
> File `original_index.html` tidak ada di repo. Build script ini adalah artefak migrasi, bukan pipeline build berulang.
> Workflow normal: edit file di `src/` langsung, lalu `npm run format` + `npm run lint`.

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

## Lisensi

ISC