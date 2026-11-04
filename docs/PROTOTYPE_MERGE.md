# Merge prototipe ke Team Monitor

Dokumen ini menjelaskan bagaimana prototipe React di
`https://github.com/kamilaisn23/prototype-user` disatukan ke aplikasi
`internal-team-monitor`. Tujuannya bukan mengganti stack, melainkan memindahkan
alur dan tampilan yang sudah tervalidasi ke frontend Vue yang sudah dipakai
produksi, lalu menghubungkannya ke API Next.js dan database Prisma.

## Keputusan integrasi

- Frontend tetap **Vue 3 + Vite** (`frontend/`). Prototipe React tidak
  ditambahkan sebagai dependensi atau aplikasi kedua.
- Data contoh prototipe **tidak** dipakai di mode live. Mode pratinjau tetap
  memakai fixture yang sudah ada di `src/lib/preview-data.ts`; data live selalu
  berasal dari API.
- Setiap fitur baru memakai primitif yang sudah ada: `Modal.vue`, `Icon.vue`,
  kelas `surface`, `button`, dan `badge` pada `frontend/src/style.css`.
- Fitur manajerial hanya tampil untuk manager/admin (atau mode pratinjau),
  mengikuti `canReview` di dashboard dan pemeriksaan izin di sisi API.

## Pemetaan komponen prototipe

| Prototipe React | Status di Team Monitor | Lokasi |
| --- | --- | --- |
| `LandingPageView` | Baru, halaman publik di `/` | `frontend/src/pages/Landing.vue` |
| `LoginView` | Diperbarui mengikuti layout prototipe; tetap memakai GitHub OAuth asli | `frontend/src/pages/Login.vue` |
| `LoginModal` | Baru, modal login dari landing page | `frontend/src/components/LoginModal.vue` |
| `AdminPreviewModal` | Baru, placeholder panel admin dari landing page | `frontend/src/components/AdminPreviewModal.vue` |
| `PendingApprovalView` | Sudah ada di alur akses | `frontend/src/pages/Pending.vue` |
| `ManagerCockpit` | Baru | `frontend/src/components/ManagerCockpit.vue` |
| `ManagerPlaybookModal` | Baru | `frontend/src/components/ManagerPlaybook.vue` |
| `RebalanceWorkloadModal` | Baru, terhubung API internal | `frontend/src/components/RebalanceModal.vue` |
| `AttentionCenterModal`, `IssuesModal` | Sudah ada | `frontend/src/components/AttentionCenter.vue` |
| `MemberProfileView` (catatan 1-on-1) | Baru | `frontend/src/components/OneOnOneNotes.vue` |
| `InsightGrid` (kapasitas, tim, tren) | Sudah ada | `ManagerBrief.vue`, `WeeklyTrends.vue`, kartu di `Dashboard.vue` |
| `TeamDirectory` | Sudah ada | `frontend/src/pages/Teams.vue` dan direktori anggota |
| `SavedFiltersBar`, `SaveFilterModal`, `CustomDropdown` | Sudah ada | `frontend/src/components/SavedFilters.vue` |
| `Header`, `Sidebar` | Sudah ada | `frontend/src/components/AppHeader.vue`, `AppSidebar.vue` |
| `ReportsView` | Sudah ada | `frontend/src/pages/Reports.vue` |
| `mockData.ts` | Tidak diporting | diganti API/fixture pratinjau |

## Landing page, login, dan akses

- `/` menampilkan landing page publik. Pengguna yang sudah memiliki sesi
  diarahkan otomatis ke `/dashboard`, sedangkan pengguna anonim dapat membuka
  `/login`, `/preview`, atau modal login dari landing page.
- Tombol demo Manager/Developer mengarah ke `/preview` dan tidak membuat sesi
  palsu. Data contoh tetap terisolasi dan tidak menulis ke API.
- Login live hanya memakai GitHub OAuth melalui `/api/auth/signin/github`.
  Tab email/kata sandi dan GitLab ditampilkan sebagai belum tersedia agar tidak
  menyesatkan; tidak ada kredensial palsu yang diterima.
- `AdminPreviewModal` hanya menjelaskan cakupan area admin. Halaman admin nyata
  tetap dilindungi RBAC di router dan API.

## Endpoint yang mendukung fitur gabungan

| Endpoint | Metode | Izin | Keterangan |
| --- | --- | --- | --- |
| `/api/members/:id/notes` | GET | Manager/admin; developer hanya profil sendiri | Daftar catatan 1-on-1 |
| `/api/members/:id/notes` | POST | Manager/admin; developer hanya profil sendiri | Membuat catatan |
| `/api/members/:id/notes` | PATCH | Manager/admin; developer hanya profil sendiri | Mengubah catatan (`id` wajib) |
| `/api/members/:id/notes?noteId=` | DELETE | Manager/admin; developer hanya profil sendiri | Menghapus catatan |
| `/api/issues/rebalance` | POST | Manager/admin (developer 403) | Redistribusi tiket internal |
| `/api/dashboard?issueView=open&assigneeId=` | GET | Mengikuti scope dashboard | Daftar tiket terbuka milik satu anggota |

Sentimen catatan 1-on-1 memakai enum `POSITIVE`, `NEUTRAL`, dan
`NEEDS_SUPPORT`. Label Indonesia dipetakan di frontend melalui
`sentimentLabels`.

## Redistribusi beban kerja: batasan penting

Redistribusi **hanya mengubah penugasan di database internal** Team Monitor.
Endpoint ini tidak memanggil GitHub atau GitLab dan tidak mengubah assignee di
platform. Saat sinkronisasi berikutnya berjalan, assignee dari platform dapat
merekonsiliasi ulang data internal. Perilaku ini ditampilkan sebagai peringatan
di modal dan wajib dipertahankan pada perubahan berikutnya.

Perubahan tetap dicatat pada `FollowUpHistory` dengan `origin="rebalance"` agar
jejak audit tindakan manager tidak hilang.

## Mode pratinjau

- Catatan 1-on-1 disimpan di `localStorage` dengan kunci
  `team-monitor:preview-one-on-one:v1:<memberId>` dan diawali satu catatan
  contoh.
- Redistribusi dapat disimulasikan, tetapi tombol eksekusi dinonaktifkan karena
  tidak ada database yang boleh diubah.
- Semua data dashboard tetap berasal dari `src/lib/preview-data.ts`.

## Verifikasi

Perintah yang relevan setelah perubahan:

```bash
npm run typecheck
npm test
npm run test:migrations
```

`npm test` mencakup `scripts/prototype-merge-smoke.mjs` yang memeriksa izin dan
validasi endpoint catatan 1-on-1 serta redistribusi, dan
`scripts/vue-smoke.mjs` yang memeriksa landing page publik, gate login, serta
mode pratinjau. `npm run test:migrations` juga lulus dengan PostgreSQL lokal
(Docker) pada port `5434`.
