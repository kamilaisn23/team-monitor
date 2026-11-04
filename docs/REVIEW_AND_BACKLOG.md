# Review dan backlog Team Monitor

Tanggal: 14 Oktober 2026 (Asia/Jakarta).

Dokumen ini berisi **11 issue perbaikan dan 7 ide pengembangan**, yang sudah dibuat sebagai 18 tiket di `kamilaisn23/team-monitor`. ID TM-* merupakan ID backlog; nomor dan tautan tiket GitHub tersedia di [GITHUB_ISSUES.md](GITHUB_ISSUES.md). Temuan bersumber dari kode, tes otomatis, dan pemeriksaan deployment. Temuan yang membutuhkan akun live belum direproduksi di produksi; review ini bukan audit keamanan lengkap.

## Link dan status

- Preview: https://web-production-dc87cc.up.railway.app/preview
- Login: https://web-production-dc87cc.up.railway.app/login
- Deployment `224de894-6f5e-4528-82d3-1e51c51d9fa0`: **SUCCESS**.
- Preview, login, endpoint sesi, UI config, dan aset JS/CSS: HTTP 200. API dashboard/pusat perhatian tanpa sesi: HTTP 401.
- Aset publik sudah memuat tren mingguan, pusat perhatian, filter favorit, dan empat kartu statistik satu baris.
- Preview memakai data fiktif; catatan dan filter contoh hanya disimpan di browser masing-masing.
- OAuth GitHub belum dikonfigurasi di Railway. Login dan integrasi data nyata belum diuji.
- Deployment mengunggah snapshot workspace terbaru, termasuk perubahan belum di-commit. Upload tidak membuat commit atau push GitHub.

## Fitur yang sudah tersedia

Dashboard kapasitas, ringkasan manager, tren empat periode mingguan, pusat perhatian isu tua/tanpa assignee, catatan serta owner tindak lanjut dengan pemeriksaan konflik edit, filter favorit, profil anggota/heatmap, laporan bulanan/rentang tanggal, CSV, pengelolaan anggota/tim/repositori, integrasi GitHub/GitLab/Kerjabaik, dan sidebar yang bisa diringkas.

## Prioritas pengerjaan

P1 = sebelum penggunaan live yang lebih luas. P2 = pembaruan berikutnya. P3 = pengembangan lanjutan. Ukuran S/M/L bersifat relatif, bukan janji durasi.

| Tahap | Fokus | Issue |
| --- | --- | --- |
| 1 | Kesiapan live dan kebijakan akses | TM-01, TM-02, TM-03 |
| 2 | Akurasi/keamanan laporan | TM-04, TM-05, TM-06 |
| 3 | Operasional dan pemeliharaan | TM-07 sampai TM-11; TM-07 memiliki tenggat |
| 4 | Pengembangan produk | F-01 sampai F-07 |

## Issue perbaikan yang sudah dibuat di GitHub

### TM-01 — [P1 / S] Batasi izin pemicu sinkronisasi di server dan UI

**Bukti:** POST `src/app/api/sync/route.ts` hanya memeriksa sesi, tanpa role. Tombol di `frontend/src/App.vue` tersedia bagi pengguna live secara umum. README menyebut pemicu manual untuk superadmin.

**Dampak dan verifikasi:** akun developer/manager/unassigned dapat meminta job menggunakan kredensial integrasi server. Cooldown bukan pembatasan izin. Verifikasi dengan fixture/session tiap role dan worker dimock, tanpa integrasi asli.

**Kriteria selesai:** tetapkan role yang diizinkan; 401 tanpa sesi dan 403 untuk role lain tanpa membuat job; UI mengikuti kebijakan yang sama; evaluasi akses pembacaan event/status job; tambahkan tes matriks role.

### TM-02 — [P1 / S] Konfigurasikan GitHub OAuth untuk akses live Railway

**Bukti:** variabel `AUTH_GITHUB_ID` dan `AUTH_GITHUB_SECRET` belum tersedia di layanan web Railway. Rahasia tidak dicetak atau dimasukkan dalam dokumen.

**Dampak:** preview bisa direview, tetapi login/data nyata belum dapat diuji. Memerlukan kredensial OAuth App dari pemilik akun.

**Kriteria selesai:** callback memakai `https://web-production-dc87cc.up.railway.app/api/auth/callback/github`; kredensial disimpan di Railway variables; URL auth konsisten; uji superadmin, anggota dan unassigned; preview tetap memakai data fiktif.

### TM-03 — [P1 / M] Selaraskan kebijakan cakupan akses developer

**Bukti:** endpoint dashboard, daftar anggota dan laporan menerima DEVELOPER tanpa pembatasan ke `session.user.id`. README menyebut profil sendiri, sedangkan dokumentasi modul menyebut akses dashboard/laporan.

**Dampak:** kebijakan akses tidak konsisten. Jika developer hanya boleh melihat dirinya, agregat/laporan membuka data anggota lain. Jika transparansi diinginkan, dokumentasi harus menyatakannya secara jelas.

**Kriteria selesai:** putuskan kebijakan produk; terapkan di server, CSV dan navigasi; query ID/nama/tim tidak dapat memperluas izin sesi; tes developer A terhadap data developer B. Ini membutuhkan keputusan produk, bukan asumsi bahwa semua akses lintas anggota selalu salah.

### TM-04 — [P1 / M] Terapkan filter tim pada laporan live dan CSV

**Bukti:** `frontend/src/pages/Reports.vue` tidak mengirim `workspace.teamId`; `src/app/api/reports/monthly/route.ts` dan `export/route.ts` juga belum menyaring anggota berdasarkan tim. Preview menyaring tim sehingga berbeda dengan live.

**Verifikasi:** fixture dua tim dengan jumlah isu berbeda; pilih satu tim di sidebar, buka laporan lalu ekspor CSV.

**Kriteria selesai:** tabel, grup, total dan CSV menggunakan cakupan yang sama; pergantian tim mereset halaman; tes anggota lintas tim, tim kosong, dan tim yang tidak tersedia.

### TM-05 — [P1 / S-M] Lindungi CSV server dari interpretasi formula

**Bukti:** `src/app/api/reports/export/route.ts` hanya mengutip field dan menggandakan kutip. Helper `frontend/src/api.ts` memiliki perlakuan awalan formula tertentu, sehingga kedua jalur tidak konsisten.

**Dampak:** nama anggota yang diawali karakter formula dapat ditafsirkan sebagai formula oleh spreadsheet; kutip CSV saja tidak mencegahnya. [Referensi OWASP](https://community.owasp.org/attacks/CSV_Injection).

**Kriteria selesai:** serializer bersama dengan kebijakan teks yang jelas; tes formula, karakter kontrol, kutip, koma dan baris baru; verifikasi pada spreadsheet sasaran; dokumentasikan kompromi spreadsheet versus impor data. Jangan mengklaim satu metode aman universal.

### TM-06 — [P2 / M] Validasi parameter laporan dan payload CRUD

**Bukti:** tanggal laporan diteruskan tanpa validasi format/calendar ketat; pagination monthly dapat menghasilkan NaN; platform dicasting tanpa whitelist. Beberapa CRUD menggunakan `req.json()`/type assertion tanpa pemeriksaan bentuk runtime.

**Dampak:** input invalid berpotensi menjadi error Prisma/500 atau normalisasi tanggal yang tidak diharapkan. Respons produksi tiap input masih perlu diuji setelah OAuth tersedia.

**Kriteria selesai:** tanggal tidak ada, bulan invalid, rentang terbalik, pagination tidak finite, enum asing dan malformed JSON menghasilkan 400 terstruktur; batasi ukuran input; jangan bocorkan error database; mutasi tidak berjalan setelah validasi gagal.

### TM-07 — [P1 / M] Migrasikan konfigurasi Railway sebelum 1 Desember 2026

**Bukti:** proyek menggunakan `railway.json`; CLI menampilkan deprecation. Dokumentasi resmi menyebut batas dukungan format lama pada 1 Desember 2026. [Sumber Railway](https://docs.railway.com/config-as-code).

**Kriteria selesai:** pindahkan Dockerfile, healthcheck dan restart policy ke Infrastructure as Code; tinjau rencana perubahan; identitas layanan/database/volume/domain tetap dipertahankan; redeploy sehat dan rollback terdokumentasi. Jangan membuat resource pengganti tanpa sengaja.

### TM-08 — [P2 / M-L] Jalankan scheduler dan tampilkan kesehatan tiap sumber

**Bukti:** Railway saat review hanya memiliki web dan Postgres. Command web menjalankan `server.js`; scheduler berada di `scripts/sync-cron.ts` dan image `sync-runner` yang terpisah.

**Dampak:** menjalankan aplikasi tidak mengaktifkan jadwal sinkronisasi. Timestamp maksimum `issue.syncedAt` belum menjelaskan hasil per sumber.

**Kriteria selesai:** pilih worker scheduler atau Railway cron dengan entry point yang sesuai; berbagi database/config dengan aman; cegah job tumpang tindih lintas proses; tampilkan hasil terakhir per sumber dan jadwal berikutnya. Aktifkan setelah konfigurasi integrasi valid.

### TM-09 — [P2 / M] Buat baseline migrasi dan prosedur backup/restore

**Bukti:** Dockerfile menjalankan `prisma db push --skip-generate`; riwayat migrasi belum memiliki baseline schema lengkap. Keterbatasan ini sudah dicatat di `docs/RAILWAY.md`.

**Kriteria selesai:** baseline mendukung database existing dan instalasi kosong; beralih ke migration deployment setelah baseline benar; uji upgrade pada salinan data; dokumentasikan backup/restore/rollback. Jangan memakai reset atau `--accept-data-loss` pada produksi. Tidak ditemukan kehilangan data dalam review ini.

### TM-10 — [P2 / L] Pisahkan tindak lanjut dari settings dan simpan histori

**Bukti:** record JSON `attention:issue:<id>` disimpan di settings; kandidat/status dimuat sebelum pagination; hanya versi terakhir tersedia. Owner nonaktif/di luar scope menggunakan fallback generik.

**Dampak:** cukup untuk awal, tetapi belum ada relasi/audit lengkap dan berpotensi berat saat data tumbuh. Belum ada load test: ini risiko skalabilitas, bukan klaim bahwa halaman sudah lambat.

**Kriteria selesai:** model khusus dengan relasi isu/owner/actor, revision dan histori; migrasi mempertahankan record; filter status/pagination di database; konflik tetap ditolak; identitas owner terdahulu tetap jelas; uji data besar dengan target latency yang disepakati.

### TM-11 — [P2 / M] Tambahkan CI dan perbarui dokumentasi

**Bukti:** belum ada workflow `.github` pada workspace. `docs/DEVELOPMENT_PLAN.md` masih menyebut belum ada tes, command lint yang tidak tersedia dan CI Node 20. Dokumen modul masih merujuk komponen React lama, sementara UI sekarang Vue.

**Kriteria selesai:** CI menjalankan install terkunci, typecheck, tes dan build pada Node yang didukung; deployment mengikuti hasil checks; dokumentasi memakai arsitektur/command/role aktual; tambahkan browser QA untuk ukuran layar dan keyboard.

## Ide pengembangan berikutnya

| ID | Ide | Perilaku dan kebutuhan | Prioritas / ukuran |
| --- | --- | --- | --- |
| F-01 | Aktivitas terakhir dan tenggat | Bedakan isu lama, tidak aktif dan terlambat. Sinkronkan updatedAt sumber/due date; syncedAt bukan aktivitas manusia. | P2 / M |
| F-02 | Beban berbobot | Label/estimasi ringan-sedang-berat memengaruhi kapasitas; dasar bobot dan fallback ditampilkan. | P2 / M |
| F-03 | Konteks ketersediaan | Cuti, alokasi paruh waktu dan fokus proyek dengan tanggal berakhir; hindari penilaian produktivitas dari jumlah isu saja. | P2 / M |
| F-04 | Ringkasan rapat mingguan | Salin pekerjaan selesai, perhatian terbuka dan tindak lanjut sebelumnya untuk periode terpilih; narasi bisa disunting dan ditautkan ke isu. | P2 / M |
| F-05 | Pencarian cepat Ctrl+K | Cari anggota, tim, repositori, isu dan halaman dari satu dialog, sesuai izin pengguna. | P2 / M |
| F-06 | Pengingat tindak lanjut | Tanggal pengingat, status jatuh tempo dan notifikasi dalam aplikasi; email/Slack opsional setelah konfigurasi dan preferensi tersedia. | P3 / M-L |
| F-07 | Simulasi pembagian pekerjaan | Coba perubahan penugasan dan dampak kapasitas sebelum penerapan; bergantung pada bobot, keahlian dan ketersediaan; perubahan sumber harus eksplisit. | P3 / L |

## Prompt untuk AI lain

```text
Review Team Monitor di https://web-production-dc87cc.up.railway.app/preview

Ini aplikasi monitoring tim engineering. Preview menggunakan data fiktif dan enam halaman: dashboard, anggota, tim, repositori, laporan dan pengaturan. Coba filter favorit, tren mingguan, pusat perhatian, catatan tindak lanjut, pergantian tim, pagination dan sidebar. OAuth Railway belum dikonfigurasi dan catatan preview hanya disimpan di browser. Preview bukan bukti bahwa integrasi live telah diuji.

Nilai alur manager, kejelasan metrik, konsistensi antarhalaman, navigasi, aksesibilitas dan tampilan desktop/tablet/mobile. Berikan langkah reproduksi untuk masalah yang benar-benar terlihat. Pisahkan bug teramati, risiko yang memerlukan akses kode/live, dan ide fitur. Jangan menilai performa individu hanya dari jumlah isu.

Jika tersedia, baca docs/REVIEW_AND_BACKLOG.md sebagai konteks kode. Pilih lima prioritas paling bernilai dan buat issue dengan judul, masalah, dampak, langkah reproduksi, kriteria selesai, kebutuhan data serta ukuran S/M/L. Jangan memasukkan token, kredensial atau data internal nyata.
```

## Pemeriksaan dan batasnya

Typecheck, seluruh smoke test dan build berhasil. Railway melaporkan SUCCESS, database sudah sesuai schema, dan endpoint/aset publik terverifikasi via HTTP. Browser otomatis tidak tersedia pada sesi ini, sehingga pemeriksaan visual per piksel belum dilakukan. Akun live dan integrasi eksternal belum diuji karena OAuth Railway belum tersedia. Daftar ini tidak mencakup semua kemungkinan masalah proyek.
