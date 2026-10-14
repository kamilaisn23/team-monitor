# Status penyelesaian issue

Repository: https://github.com/kamilaisn23/team-monitor/issues

Issue dikerjakan berurutan dan ditutup setelah kode dipublikasikan, pemeriksaan lulus, serta deployment yang relevan diverifikasi.

| Issue | Status | Catatan |
| --- | --- | --- |
| #1 | Selesai dan ditutup | Admin/superadmin saja untuk pemicu sync dan status/SSE. Commit 6b0e939; Railway deployment 17dd8a6d-6e46-4a4f-bd7e-02b204379aba SUCCESS. |
| #2 | Ditunda oleh pengguna | OAuth GitHub belum diisi; lanjut issue lain sesuai instruksi. |
| #3 | Selesai dan ditutup | Data developer dibatasi ke ID sesi; commit 91cb21c; Railway 629fb28d-0c9d-4fa2-903f-944c08190833 SUCCESS. |
| #4 | Selesai dan ditutup | Filter tim laporan/CSV konsisten; commit e1ef827; Railway 96f5b27e-3398-4193-9cf4-960635348b46 SUCCESS. |
| #5 | Selesai dan ditutup | Serializer CSV bersama; commit 785210f; Railway 87410f84-f62a-4926-af8c-25c6466d2613 SUCCESS. |
| #6 | Sedang dikerjakan | Validasi parameter laporan, ukuran JSON dan payload CRUD. |
| #7–#18 | Menunggu giliran | Daftar dan tautan lengkap: GITHUB_ISSUES.md. |

Perbaikan #1 sudah diuji dengan matriks role, pencegahan side effect sebelum worker dimuat, status/SSE, visibilitas tombol, cooldown, dan JSON 401/403. Preview publik tetap tersedia. Login live belum diuji karena #2 ditunda.
