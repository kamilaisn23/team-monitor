# Status penyelesaian issue

Repository: https://github.com/kamilaisn23/team-monitor/issues

Issue dikerjakan berurutan dan ditutup setelah kode dipublikasikan, pemeriksaan lulus, serta deployment yang relevan diverifikasi.

| Issue | Status | Catatan |
| --- | --- | --- |
| #1 | Selesai dan ditutup | Admin/superadmin saja untuk pemicu sync dan status/SSE. Commit 6b0e939; Railway deployment 17dd8a6d-6e46-4a4f-bd7e-02b204379aba SUCCESS. |
| #2 | Ditunda oleh pengguna | OAuth GitHub belum diisi; lanjut issue lain sesuai instruksi. |
| #3 | Selesai dan ditutup | Data developer dibatasi ke ID sesi; commit 91cb21c; Railway 629fb28d-0c9d-4fa2-903f-944c08190833 SUCCESS. |
| #4 | Sedang dikerjakan | Konsistensi filter tim pada laporan dan CSV. |
| #5–#18 | Menunggu giliran | Daftar dan tautan lengkap: GITHUB_ISSUES.md. |

Perbaikan #1 sudah diuji dengan matriks role, pencegahan side effect sebelum worker dimuat, status/SSE, visibilitas tombol, cooldown, dan JSON 401/403. Preview publik tetap tersedia. Login live belum diuji karena #2 ditunda.
