<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import Icon from "../components/Icon.vue";
import LoginModal from "../components/LoginModal.vue";

const router = useRouter();
const loginOpen = ref(false);
const activePreviewTab = ref<"rebalance" | "attention" | "reports">("rebalance");
const simulatedOverload = ref(2);

function openFullLogin() {
  loginOpen.value = false;
  router.push("/login");
}
</script>

<template>
  <div class="landing-page">
    <header class="lp-nav">
      <div class="lp-container lp-nav-inner">
        <RouterLink to="/" class="lp-brand" aria-label="Team Monitor beranda">
          <span class="lp-brand-mark"><Icon name="chart" :size="21" /></span>
          <span class="lp-brand-copy">
            <strong>Team Monitor</strong>
            <small>Engineering workspace · RBAC system</small>
          </span>
        </RouterLink>

        <nav class="lp-nav-links" aria-label="Navigasi halaman">
          <a href="#fitur">Fitur</a>
          <a href="#cockpit">Simulator Beban</a>
          <a href="#perbandingan">Perbandingan</a>
        </nav>

        <div class="lp-nav-actions">
          <button class="lp-btn small primary" @click="loginOpen = true">
            <Icon name="github" :size="14" /> Masuk dengan GitHub
          </button>
        </div>
      </div>
    </header>

    <main>
      <section class="lp-hero">
        <div class="lp-hero-grid" aria-hidden="true"></div>
        <div class="lp-hero-glow blue" aria-hidden="true"></div>
        <div class="lp-hero-glow green" aria-hidden="true"></div>
        <div class="lp-hero-glow indigo" aria-hidden="true"></div>

        <svg class="lp-git-map" viewBox="0 0 1200 540" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="lpBlue" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#4368ed" stop-opacity=".05" />
              <stop offset=".5" stop-color="#4368ed" stop-opacity=".7" />
              <stop offset="1" stop-color="#4368ed" stop-opacity=".05" />
            </linearGradient>
            <linearGradient id="lpGreen" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#10b981" stop-opacity=".05" />
              <stop offset=".5" stop-color="#10b981" stop-opacity=".65" />
              <stop offset="1" stop-color="#10b981" stop-opacity=".05" />
            </linearGradient>
          </defs>
          <line x1="100" y1="90" x2="1100" y2="90" stroke="#cbd5e1" stroke-dasharray="4 8" opacity=".5" />
          <line x1="100" y1="330" x2="1100" y2="330" stroke="#cbd5e1" stroke-dasharray="4 8" opacity=".5" />
          <path d="M60 210H320q60 0 100-60h80q40 0 80 60h240q40 0 80 60h80q40 0 80-60h60" stroke="url(#lpBlue)" stroke-width="2.5" />
          <path d="M220 210q40 0 80-100h160q40 0 80 40h20" stroke="url(#lpGreen)" stroke-width="2" stroke-dasharray="6 4" />
          <circle cx="160" cy="210" r="5" fill="#4368ed" />
          <circle cx="580" cy="210" r="6" fill="#2563eb" />
          <circle cx="1060" cy="210" r="6" fill="#10b981" />
          <circle cx="380" cy="110" r="5" fill="#10b981" />
          <text x="110" y="70" fill="#94a3b8" font-size="9" font-family="monospace" letter-spacing="1.5">GIT_REMOTE: GITHUB.COM/ORG/CORE</text>
          <text x="900" y="70" fill="#94a3b8" font-size="9" font-family="monospace" letter-spacing="1.5">WEBHOOK: GITLAB_V4/PUSH_EVENT</text>
          <text x="110" y="420" fill="#94a3b8" font-size="9" font-family="monospace" letter-spacing="1.5">RBAC_AUTH: TOKEN_BEARER_VALID</text>
          <text x="930" y="420" fill="#94a3b8" font-size="9" font-family="monospace" letter-spacing="1.5">STATUS: SYNC_HEALTHY (100%)</text>
        </svg>

        <div class="lp-container lp-hero-inner">
          <h1>
            Sistem pemantauan terintegrasi
            <span>GitHub &amp; GitLab</span>
          </h1>
          <p class="lp-hero-lead">
            Platform monitoring rekayasa perangkat lunak dengan peran
            terstruktur untuk <strong>Engineering Manager</strong> dan
            <strong>Developer</strong>. Deteksi beban berlebih (&gt;7 isu),
            mitigasi isu mengendap (&gt;30 hari), dan dokumentasikan catatan
            evaluasi secara terpusat.
          </p>

          <div class="lp-hero-actions">
            <button class="lp-btn primary large" @click="loginOpen = true">
              <Icon name="github" :size="16" /> Masuk dengan GitHub
            </button>
            <a class="lp-btn outline large" href="#fitur">
              Pelajari fitur <Icon name="right" :size="16" />
            </a>
          </div>

          <div class="lp-hero-stats">
            <span><Icon name="checkcircle" :size="15" /> <strong>12 rekayasawan</strong> aktif terintegrasi</span>
            <span><Icon name="checkcircle" :size="15" /> <strong>51 isu</strong> terpantau real-time</span>
            <span><Icon name="checkcircle" :size="15" /> <strong>3 divisi</strong> Product, Infra, QA</span>
          </div>

          <div class="lp-showcase" id="cockpit">
            <div class="lp-showcase-top">
              <div class="lp-window-dots" aria-hidden="true"><i></i><i></i><i></i></div>
              <span>team-monitor.workspace/dashboard · simulator manajer</span>
              <div class="lp-showcase-tabs">
                <button
                  :class="{ active: activePreviewTab === 'rebalance' }"
                  @click="activePreviewTab = 'rebalance'"
                >
                  Keseimbangan Beban
                </button>
                <button
                  :class="{ active: activePreviewTab === 'attention' }"
                  @click="activePreviewTab = 'attention'"
                >
                  Isu Mengendap
                </button>
                <button
                  :class="{ active: activePreviewTab === 'reports' }"
                  @click="activePreviewTab = 'reports'"
                >
                  Ekspor Laporan
                </button>
              </div>
            </div>

            <div class="lp-showcase-body">
              <template v-if="activePreviewTab === 'rebalance'">
                <div class="lp-showcase-head">
                  <div>
                    <h3>Simulator penyeimbangan kapasitas anggota</h3>
                    <p>
                      Beban kerja diklasifikasikan ke dalam tiga tier: rendah
                      (≤3 isu), sedang (4–7 isu), tinggi (&gt;7 isu).
                    </p>
                  </div>
                  <button
                    class="lp-sim-button"
                    @click="simulatedOverload = simulatedOverload > 0 ? simulatedOverload - 1 : 2"
                  >
                    <Icon name="scale" :size="14" />
                    {{
                      simulatedOverload > 0
                        ? "Simulasikan redistribusi"
                        : "Reset ulang beban"
                    }}
                  </button>
                </div>
                <div class="lp-sim-grid">
                  <article class="lp-sim-card danger">
                    <div>
                      <span>Dimas Saputra · overload</span>
                      <strong>
                        {{
                          simulatedOverload > 1
                            ? "9 isu terbuka"
                            : simulatedOverload === 1
                              ? "7 isu terbuka"
                              : "5 isu terbuka"
                        }}
                      </strong>
                    </div>
                    <p>
                      {{
                        simulatedOverload > 0
                          ? "Butuh pembagian beban sprint segera"
                          : "Kapasitas seimbang"
                      }}
                    </p>
                    <div class="lp-meter"><i :style="{ width: simulatedOverload > 1 ? '90%' : simulatedOverload === 1 ? '70%' : '50%' }"></i></div>
                  </article>
                  <article class="lp-sim-card success">
                    <div>
                      <span>Gilang Ramadan · kapasitas luang</span>
                      <strong>
                        {{ simulatedOverload < 2 ? "4 isu terbuka" : "3 isu terbuka" }}
                      </strong>
                    </div>
                    <p>Siap menerima delegasi isu checkout refactoring</p>
                    <div class="lp-meter"><i :style="{ width: simulatedOverload < 2 ? '40%' : '30%' }"></i></div>
                  </article>
                  <article class="lp-sim-card summary">
                    <div>
                      <span>Status keseluruhan</span>
                      <strong>
                        {{
                          simulatedOverload > 0
                            ? simulatedOverload + " anggota beban tinggi"
                            : "Semua anggota optimal"
                        }}
                      </strong>
                    </div>
                    <button @click="loginOpen = true">
                      Masuk ke dashboard <Icon name="right" :size="14" />
                    </button>
                  </article>
                </div>
              </template>

              <template v-else-if="activePreviewTab === 'attention'">
                <div class="lp-showcase-head">
                  <div>
                    <h3>Pusat perhatian isu mengendap</h3>
                    <p>
                      Melacak tiket &gt;30 hari, menunjuk penanggung jawab
                      evaluasi, dan mencatat histori catatan.
                    </p>
                  </div>
                </div>
                <div class="lp-attention">
                  <div class="lp-attention-head">
                    <span><Icon name="alert" :size="15" /> ISS-104: WebSocket reconnection memory leak on Safari mobile</span>
                    <strong>47 hari terbuka</strong>
                  </div>
                  <div class="lp-attention-body">
                    <p>
                      <span>Status review</span>
                      <b>Sedang ditindaklanjuti</b>
                      <span>Follow-up owner</span>
                      <strong>Budi Santoso · Backend</strong>
                    </p>
                    <blockquote>
                      “Diprioritaskan pada sprint ini setelah koordinasi dengan
                      tim mobile. Lead engineer ditugaskan untuk audit heap
                      memory.”
                    </blockquote>
                  </div>
                </div>
              </template>

              <template v-else>
                <div class="lp-showcase-head">
                  <div>
                    <h3>Laporan produktivitas &amp; ekspor CSV</h3>
                    <p>
                      Perbandingan throughput bulanan, rasio resolusi tiket,
                      dan lead time penutupan.
                    </p>
                  </div>
                  <button class="lp-sim-button blue" @click="loginOpen = true">
                    <Icon name="download" :size="14" /> Masuk untuk laporan
                  </button>
                </div>
                <div class="lp-report-stats">
                  <div><span>Total isu ditutup</span><strong class="green">138</strong></div>
                  <div><span>Rata-rata durasi</span><strong>3.8 hari</strong></div>
                  <div><span>Rasio selesai</span><strong class="blue">82%</strong></div>
                  <div><span>Ekspor CSV</span><strong class="small">1-klik siap kirim</strong></div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </section>

      <section v-if="false" id="arsitektur-rbac" class="lp-section white">
        <div class="lp-container">
          <div class="lp-section-heading">
            <span>Arsitektur &amp; hak akses sistem</span>
            <h2>Arsitektur 4 tingkat hak akses (RBAC)</h2>
            <p>
              Wewenang dibagi ke dalam empat peran dengan batas akses yang jelas
              untuk menjamin tata kelola operasional dan privasi evaluasi tim.
            </p>
          </div>

          <div class="lp-role-grid">
            <article class="lp-role-card admin">
              <div class="lp-role-top">
                <span class="lp-role-icon"><Icon name="shield" :size="20" /></span>
                <small>Role: admin</small>
              </div>
              <h3>Superadmin &amp; Admin</h3>
              <p class="lp-role-desc">Pengelola sistem dan organisasi melalui environment variable dan database.</p>
              <ul>
                <li><Icon name="check" :size="13" /><span><strong>/admin/members:</strong> tambah anggota, tautkan akun Git, ubah status dan role.</span></li>
                <li><Icon name="check" :size="13" /><span><strong>/admin/teams:</strong> kelola divisi tim dan keanggotaan.</span></li>
                <li><Icon name="check" :size="13" /><span><strong>/admin/repositories:</strong> tag repo GitHub/GitLab ke tim atau abaikan.</span></li>
                <li><Icon name="check" :size="13" /><span><strong>POST /api/sync:</strong> picu sinkronisasi manual data isu.</span></li>
              </ul>
              <button class="lp-role-action blue" @click="loginOpen = true">
                Masuk sebagai admin <Icon name="right" :size="14" />
              </button>
            </article>

            <article class="lp-role-card manager">
              <span class="lp-role-flag">Fokus utama sistem</span>
              <div class="lp-role-top">
                <span class="lp-role-icon"><Icon name="users" :size="20" /></span>
                <small>Role: manager</small>
              </div>
              <h3>Engineering Manager</h3>
              <p class="lp-role-desc">Pemantau kapasitas, beban kerja, dan tindak lanjut evaluasi seluruh tim.</p>
              <ul>
                <li><Icon name="check" :size="13" /><span><strong>/dashboard:</strong> pemantauan beban rendah, sedang, tinggi seluruh tim.</span></li>
                <li><Icon name="check" :size="13" /><span><strong>Pusat perhatian:</strong> evaluasi isu &gt;30 hari dan unassigned dengan audit trail.</span></li>
                <li><Icon name="check" :size="13" /><span><strong>Rebalance:</strong> pindahkan tiket dari rekayasawan overload.</span></li>
                <li><Icon name="check" :size="13" /><span><strong>/members/:id:</strong> profil lengkap, heatmap, dan catatan 1-on-1 privat.</span></li>
              </ul>
              <button class="lp-role-action primary" @click="loginOpen = true">
                Masuk sebagai Manager <Icon name="right" :size="14" />
              </button>
            </article>

            <article class="lp-role-card developer">
              <div class="lp-role-top">
                <span class="lp-role-icon"><Icon name="usercheck" :size="20" /></span>
                <small>Role: developer</small>
              </div>
              <h3>Developer</h3>
              <p class="lp-role-desc">Akses mandiri ke profil kerja, tiket penugasan, dan kontribusi pribadi.</p>
              <ul>
                <li><Icon name="check" :size="13" /><span><strong>Dashboard mandiri:</strong> status beban dan tiket aktif pribadi.</span></li>
                <li><Icon name="check" :size="13" /><span><strong>Profil pribadi:</strong> terkunci ke akun sendiri dengan heatmap kontribusi.</span></li>
                <li><Icon name="check" :size="13" /><span><strong>Laporan personal:</strong> unduh rekap CSV produktivitas mandiri.</span></li>
                <li><Icon name="check" :size="13" /><span><strong>Proteksi privasi:</strong> tidak dapat melihat catatan 1-on-1 manajer.</span></li>
              </ul>
              <button class="lp-role-action emerald" @click="loginOpen = true">
                Masuk sebagai Developer <Icon name="right" :size="14" />
              </button>
            </article>

            <article class="lp-role-card unassigned">
              <div class="lp-role-top">
                <span class="lp-role-icon"><Icon name="clock" :size="20" /></span>
                <small>Role: unassigned</small>
              </div>
              <h3>Unassigned</h3>
              <p class="lp-role-desc">Pengguna baru via OAuth yang menunggu persetujuan admin.</p>
              <ul>
                <li><Icon name="check" :size="13" /><span><strong>Layar /pending:</strong> terkunci pada antrean verifikasi organisasi.</span></li>
                <li><Icon name="check" :size="13" /><span><strong>Menunggu admin:</strong> penetapan divisi dan tingkat akses RBAC.</span></li>
                <li><Icon name="check" :size="13" /><span><strong>Zero leakage:</strong> tidak memiliki akses data tim sebelum disetujui.</span></li>
              </ul>
              <button class="lp-role-action amber" @click="openFullLogin">
                Masuk untuk verifikasi <Icon name="right" :size="14" />
              </button>
            </article>
          </div>
        </div>
      </section>

      <section id="fitur" class="lp-section alt">
        <div class="lp-container">
          <div class="lp-section-heading">
            <span>Fitur utama sistem</span>
            <h2>Dirancang untuk ritme rekayasa yang sehat</h2>
            <p>
              Bukan sekadar pencatat jam kerja, melainkan instrumen pemerataan
              beban dan mitigasi risiko teknis.
            </p>
          </div>
          <div class="lp-feature-grid">
            <article>
              <span class="purple"><Icon name="scale" :size="20" /></span>
              <h3>Pencegahan burnout dini</h3>
              <p>
                Klasifikasi beban kerja otomatis. Saat rekayasawan memiliki
                &gt;7 tiket terbuka, sistem memberi peringatan visual untuk
                segera diredistribusikan.
              </p>
            </article>
            <article>
              <span class="rose"><Icon name="alert" :size="20" /></span>
              <h3>Mitigasi isu mengendap</h3>
              <p>
                Pusat perhatian memfilter tiket mangkrak yang berisiko menahan
                rilis staging atau production. Manager mencatat penanggung
                jawab dan evaluasi.
              </p>
            </article>
            <article>
              <span class="emerald"><Icon name="branch" :size="20" /></span>
              <h3>Sinkronisasi multi-platform</h3>
              <p>
                Menghubungkan repositori GitHub dan GitLab ke dalam satu
                tampilan terpadu tanpa membuka puluhan tab yang terpisah.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="perbandingan" class="lp-section white">
        <div class="lp-container narrow">
          <div class="lp-section-heading">
            <span>Efisiensi waktu manajemen</span>
            <h2>Mengapa spreadsheet &amp; standup manual menghabiskan waktu?</h2>
          </div>
          <div class="lp-compare-wrap">
            <table class="lp-compare">
              <thead>
                <tr>
                  <th>Aspek manajemen</th>
                  <th>Cara lama · manual / spreadsheet</th>
                  <th>Team Monitor</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Deteksi overload / burnout</td>
                  <td>Baru ketahuan saat engineer mengeluh atau deadline terlewat</td>
                  <td>Otomatis terdeteksi saat tiket &gt;7 isu dengan alert visual</td>
                </tr>
                <tr>
                  <td>Pelacakan isu mengendap</td>
                  <td>Tenggelam di bawah ratusan issue backlog</td>
                  <td>Muncul di pusat perhatian (&gt;30 hari) dengan audit status</td>
                </tr>
                <tr>
                  <td>Redistribusi beban sprint</td>
                  <td>Buka puluhan tab browser satu per satu</td>
                  <td>Pilih isu, pilih penerima, selesai dalam hitungan detik</td>
                </tr>
                <tr>
                  <td>Laporan mingguan</td>
                  <td>Butuh 2–3 jam menyalin angka ke spreadsheet</td>
                  <td>Unduh CSV siap kirim lengkap dengan throughput</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>

    <footer class="lp-footer">
      <div class="lp-container lp-footer-inner">
        <div>
          <strong><Icon name="chart" :size="17" /> Team Monitor · Engineering Activity Intelligence</strong>
          <p>
            Dashboard monitoring aktivitas tim pengembang berbasis web dengan
            integrasi GitHub dan GitLab. Visibilitas beban kerja objektif dan
            manajemen sprint seimbang.
          </p>
        </div>
        <div class="lp-footer-actions">
          <button @click="loginOpen = true">Masuk ke workspace</button>
          <button @click="openFullLogin">Halaman login</button>
        </div>
      </div>
    </footer>

    <LoginModal
      :open="loginOpen"
      @close="loginOpen = false"
      @open-full="openFullLogin"
    />
  </div>
</template>

<style scoped>
.landing-page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #edf2fa;
  color: var(--ink);
}
.lp-container {
  width: min(1180px, calc(100% - 40px));
  margin-inline: auto;
}
.lp-container.narrow { width: min(980px, calc(100% - 40px)); }
.lp-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid var(--line);
  background: #fffffff0;
  backdrop-filter: blur(12px);
}
.lp-nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 66px;
}
.lp-brand { display: flex; align-items: center; gap: 10px; flex: 0 0 auto; }
.lp-brand-mark {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(135deg, #111d38, #1e3466 55%, #4368ed);
  box-shadow: 0 7px 18px #4368ed30;
}
.lp-brand-copy { display: grid; gap: 2px; }
.lp-brand-copy strong { font-size: 15px; letter-spacing: -0.3px; color: #111d38; }
.lp-brand-copy small {
  color: #4368ed;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.9px;
  text-transform: uppercase;
}
.lp-nav-links {
  display: flex;
  align-items: center;
  gap: 22px;
  margin-left: auto;
  color: var(--muted);
  font-size: 11px;
  font-weight: 650;
}
.lp-nav-links a { white-space: nowrap; }
.lp-nav-links a:hover { color: #4368ed; }
.lp-nav-actions { display: flex; align-items: center; gap: 7px; }
.lp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid transparent;
  font-size: 11px;
  font-weight: 750;
  white-space: nowrap;
  transition: 0.18s ease;
}
.lp-btn.small { min-height: 34px; padding: 6px 10px; font-size: 10px; }
.lp-btn.large { min-height: 45px; padding: 11px 18px; font-size: 12px; border-radius: 12px; }
.lp-btn.primary { background: #4368ed; color: #fff; box-shadow: 0 7px 18px #4368ed2e; }
.lp-btn.primary:hover { background: #3557ba; box-shadow: 0 10px 24px #4368ed3b; }
.lp-btn.ghost-emerald { background: #eaf8f2; border-color: #b8e4d5; color: #23765c; }
.lp-btn.ghost-emerald:hover { background: #dcf3ea; }
.lp-btn.outline { background: #fff; border-color: var(--line); color: #1c2d49; }
.lp-btn.outline:hover { border-color: #a9bce0; background: #f7faff; }
.lp-btn.ghost { background: #fff; border-color: var(--line); color: #1c2d49; }
.lp-btn.ghost:hover { color: #4368ed; background: #f7faff; }
.lp-btn.muted { background: #e9eef7; border-color: #d8e1ef; color: #5a6d88; }
.lp-btn.muted:hover { background: #dfe7f3; color: #1c2d49; }
.lp-hero {
  position: relative;
  overflow: hidden;
  padding: 62px 0 74px;
  border-bottom: 1px solid var(--line);
  background: linear-gradient(#fff, #f6f9fe 55%, #edf2fa);
}
.lp-hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, #dce6f2 1px, transparent 1px),
    linear-gradient(to bottom, #dce6f2 1px, transparent 1px);
  background-size: 48px 48px;
  opacity: 0.36;
  mask-image: radial-gradient(ellipse 70% 62% at 50% 24%, #000 62%, transparent 100%);
  pointer-events: none;
}
.lp-hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  pointer-events: none;
}
.lp-hero-glow.blue {
  top: 54px;
  left: 50%;
  width: 630px;
  height: 330px;
  transform: translateX(-50%);
  background: #4368ed26;
}
.lp-hero-glow.green { top: 110px; left: 2%; width: 300px; height: 240px; background: #10b98117; }
.lp-hero-glow.indigo { top: 90px; right: 1%; width: 320px; height: 260px; background: #6366f117; }
.lp-git-map {
  position: absolute;
  top: 10px;
  left: 50%;
  width: min(1200px, 100%);
  height: 540px;
  transform: translateX(-50%);
  opacity: 0.36;
  pointer-events: none;
  mask-image: radial-gradient(ellipse 78% 62% at 50% 32%, #000 55%, transparent 100%);
}
.lp-hero-inner { position: relative; text-align: center; }
.lp-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 13px;
  border: 1px solid #bcd0f4;
  border-radius: 999px;
  background: #fffb;
  color: #4368ed;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  box-shadow: 0 3px 12px #4368ed0f;
}
.lp-kicker i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4368ed;
  box-shadow: 0 0 0 4px #4368ed1a;
  animation: lp-pulse 1.8s infinite;
}
@keyframes lp-pulse { 50% { box-shadow: 0 0 0 7px #4368ed00; } }
.lp-hero h1 {
  max-width: 880px;
  margin: 20px auto 0;
  color: #111d38;
  font-size: clamp(34px, 5vw, 62px);
  line-height: 1.1;
  letter-spacing: -2.2px;
  font-weight: 850;
}
.lp-hero h1 span {
  display: block;
  margin-top: 4px;
  background: linear-gradient(110deg, #2563eb, #4368ed 55%, #6366f1);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: #4368ed;
}
.lp-hero-lead {
  max-width: 800px;
  margin: 20px auto 0;
  color: #475b7a;
  font-size: 14px;
  line-height: 1.8;
}
.lp-hero-lead strong { color: #1c2d49; }
.lp-hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 26px;
}
.lp-hero-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 9px 25px;
  max-width: 820px;
  margin: 32px auto 0;
  padding-top: 20px;
  border-top: 1px solid #d1ddeecc;
  color: #586d8c;
  font-size: 10px;
}
.lp-hero-stats span { display: flex; align-items: center; gap: 6px; }
.lp-hero-stats svg { color: #3b9b7d; }
.lp-hero-stats strong { color: #1c2d49; }
.lp-showcase {
  margin-top: 38px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 17px;
  background: #fff;
  text-align: left;
  box-shadow: 0 20px 55px #14294d17;
}
.lp-showcase-top {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 16px;
  background: #111d38;
  color: #c5d0e2;
  font-family: ui-monospace, "Cascadia Code", monospace;
  font-size: 9px;
}
.lp-window-dots { display: flex; gap: 5px; }
.lp-window-dots i { width: 9px; height: 9px; border-radius: 50%; background: #ef6b7d; }
.lp-window-dots i:nth-child(2) { background: #f1b84b; }
.lp-window-dots i:nth-child(3) { background: #4dbb8b; }
.lp-showcase-tabs {
  display: flex;
  gap: 3px;
  margin-left: auto;
  padding: 3px;
  border-radius: 7px;
  background: #ffffff14;
}
.lp-showcase-tabs button {
  padding: 5px 9px;
  border-radius: 5px;
  color: #c3cfdf;
  font-family: Inter, sans-serif;
  font-size: 9px;
  font-weight: 700;
}
.lp-showcase-tabs button.active { background: #4368ed; color: #fff; }
.lp-showcase-body { min-height: 242px; padding: 22px; background: #f8fbff; }
.lp-showcase-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 15px;
}
.lp-showcase-head h3 { font-size: 13px; color: #1c2d49; }
.lp-showcase-head p { margin-top: 4px; color: var(--muted); font-size: 10px; line-height: 1.65; }
.lp-sim-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  padding: 7px 10px;
  border: 1px solid #d7c4f4;
  border-radius: 8px;
  background: #f5eeff;
  color: #7040b4;
  font-size: 9px;
  font-weight: 750;
}
.lp-sim-button:hover { background: #eee1ff; }
.lp-sim-button.blue { border-color: #bcd0f4; background: #edf3ff; color: #4368ed; }
.lp-sim-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.lp-sim-card {
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #fff;
}
.lp-sim-card.danger { border-color: #efcbd2; }
.lp-sim-card.success { border-color: #bfe5d7; }
.lp-sim-card.summary { display: flex; flex-direction: column; justify-content: space-between; border-color: #d8c8f2; background: #f5f0ffcc; }
.lp-sim-card > div:first-child { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.lp-sim-card span {
  color: #a1475b;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.35px;
  text-transform: uppercase;
}
.lp-sim-card.success span { color: #26765c; }
.lp-sim-card.summary span { color: #7040b4; }
.lp-sim-card strong {
  color: #a1475b;
  font-family: ui-monospace, monospace;
  font-size: 10px;
  white-space: nowrap;
}
.lp-sim-card.success strong { color: #26765c; }
.lp-sim-card > p { margin-top: 8px; color: #34496a; font-size: 10px; }
.lp-meter { height: 7px; margin-top: 10px; overflow: hidden; border-radius: 999px; background: #eef2f8; }
.lp-meter i { display: block; height: 100%; border-radius: inherit; background: #e55a72; transition: width 0.3s; }
.lp-sim-card.success .lp-meter i { background: #43a781; }
.lp-sim-card.summary strong { display: block; margin-top: 4px; color: #3b2270; font-family: Inter, sans-serif; font-size: 14px; white-space: normal; }
.lp-sim-card.summary button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  align-self: flex-start;
  margin-top: 12px;
  color: #7040b4;
  font-size: 10px;
  font-weight: 750;
}
.lp-attention { overflow: hidden; border: 1px solid var(--line); border-radius: 11px; background: #fff; }
.lp-attention-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 15px;
  border-bottom: 1px solid #f0cad1;
  background: #fff4f6;
}
.lp-attention-head span { display: flex; align-items: center; gap: 7px; color: #972f46; font-size: 10px; font-weight: 700; }
.lp-attention-head strong { padding: 3px 7px; border-radius: 5px; background: #f8dce2; color: #972f46; font-family: ui-monospace, monospace; font-size: 8px; white-space: nowrap; }
.lp-attention-body { padding: 15px; color: #1c2d49; font-size: 10px; }
.lp-attention-body > p { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
.lp-attention-body > p span { color: var(--muted); }
.lp-attention-body b { padding: 3px 7px; border-radius: 4px; background: #e5edff; color: #4368ed; font-size: 8px; }
.lp-attention-body blockquote { margin: 10px 0 0; color: #5a6f8e; font-style: italic; line-height: 1.7; }
.lp-report-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #fff;
  text-align: center;
}
.lp-report-stats span { display: block; color: var(--muted); font-size: 8px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; }
.lp-report-stats strong { display: block; margin-top: 5px; color: #1c2d49; font-size: 19px; letter-spacing: -0.4px; }
.lp-report-stats strong.green { color: #319273; }
.lp-report-stats strong.blue { color: #4368ed; }
.lp-report-stats strong.small { font-size: 10px; }
.lp-section { padding: 72px 0; border-bottom: 1px solid var(--line); }
.lp-section.white { background: #fff; }
.lp-section.alt { background: #edf2fa; }
.lp-section-heading { max-width: 720px; margin: 0 auto 42px; text-align: center; }
.lp-section-heading > span {
  display: block;
  margin-bottom: 7px;
  color: #4368ed;
  font-family: ui-monospace, monospace;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}
.lp-section-heading h2 { color: #111d38; font-size: clamp(24px, 3vw, 36px); letter-spacing: -1px; line-height: 1.2; }
.lp-section-heading p { margin-top: 11px; color: var(--muted); font-size: 12px; line-height: 1.75; }
.lp-role-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
.lp-role-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #f8fbff;
  transition: 0.18s ease;
}
.lp-role-card:hover { border-color: #a8bde2; box-shadow: 0 10px 28px #1c2d4910; }
.lp-role-card.manager { background: #fff; border: 2px solid #4368ed; box-shadow: 0 12px 30px #4368ed17; }
.lp-role-flag {
  position: absolute;
  top: -10px;
  left: 19px;
  padding: 3px 9px;
  border-radius: 999px;
  background: #4368ed;
  color: #fff;
  font-size: 8px;
  font-weight: 850;
  letter-spacing: 0.45px;
  text-transform: uppercase;
}
.lp-role-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.lp-role-card.manager .lp-role-top { margin-top: 5px; }
.lp-role-icon {
  width: 39px;
  height: 39px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: #e6edff;
  color: #4368ed;
}
.lp-role-card.manager .lp-role-icon { background: #4368ed; color: #fff; }
.lp-role-card.developer .lp-role-icon { background: #e5f6ef; color: #2c8468; }
.lp-role-card.unassigned .lp-role-icon { background: #fdf2df; color: #9b6a20; }
.lp-role-top small {
  padding: 2px 7px;
  border-radius: 5px;
  background: #e6edff;
  color: #4368ed;
  font-family: ui-monospace, monospace;
  font-size: 7px;
  font-weight: 800;
  text-transform: uppercase;
  white-space: nowrap;
}
.lp-role-card.developer .lp-role-top small { background: #e5f6ef; color: #2c8468; }
.lp-role-card.unassigned .lp-role-top small { background: #fdf2df; color: #9b6a20; }
.lp-role-card h3 { color: #111d38; font-size: 14px; }
.lp-role-desc { min-height: 45px; margin-top: 5px; color: var(--muted); font-size: 10px; line-height: 1.65; }
.lp-role-card ul { display: grid; gap: 8px; margin: 14px 0 0; padding: 0; list-style: none; }
.lp-role-card li { display: flex; align-items: flex-start; gap: 6px; color: #1c2d49; font-size: 9.5px; line-height: 1.6; }
.lp-role-card li svg { margin-top: 2px; color: #4368ed; flex: 0 0 auto; }
.lp-role-card.manager li svg, .lp-role-card.developer li svg { color: #2f9a7c; }
.lp-role-card.unassigned li svg { color: #b07b25; }
.lp-role-card li strong { color: #1c2d49; }
.lp-role-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  min-height: 34px;
  margin-top: auto;
  padding: 7px 9px;
  border-radius: 9px;
  font-size: 9.5px;
  font-weight: 750;
}
.lp-role-card .lp-role-action { margin-top: 18px; }
.lp-role-action.blue { border: 1px solid #bcd0f4; background: #eaf1ff; color: #4368ed; }
.lp-role-action.blue:hover { background: #dde9ff; }
.lp-role-action.primary { background: #4368ed; color: #fff; box-shadow: 0 6px 15px #4368ed28; }
.lp-role-action.primary:hover { background: #3557ba; }
.lp-role-action.emerald { background: #dff5ec; color: #26765c; }
.lp-role-action.emerald:hover { background: #d1eee2; }
.lp-role-action.amber { background: #fdf0da; color: #93621b; }
.lp-role-action.amber:hover { background: #fbe7c4; }
.lp-feature-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.lp-feature-grid article {
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 3px 10px #1c2d4908;
}
.lp-feature-grid article > span {
  width: 39px;
  height: 39px;
  display: grid;
  place-items: center;
  border-radius: 11px;
}
.lp-feature-grid .purple { background: #f2ebff; color: #7040b4; }
.lp-feature-grid .rose { background: #fff0f2; color: #b54d61; }
.lp-feature-grid .emerald { background: #e8f7f1; color: #2f8f72; }
.lp-feature-grid h3 { margin-top: 12px; color: #1c2d49; font-size: 14px; }
.lp-feature-grid p { margin-top: 7px; color: var(--muted); font-size: 10.5px; line-height: 1.75; }
.lp-compare-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 16px; background: #fff; box-shadow: 0 5px 18px #1c2d4908; }
.lp-compare { width: 100%; min-width: 620px; border-collapse: collapse; text-align: left; }
.lp-compare th {
  padding: 15px 20px;
  border-bottom: 1px solid var(--line);
  background: #f8fbff;
  color: #586d8c;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.55px;
  text-transform: uppercase;
}
.lp-compare th:last-child { background: #edf3ff; color: #4368ed; }
.lp-compare td {
  padding: 15px 20px;
  border-bottom: 1px solid var(--line);
  color: #1c2d49;
  font-size: 10.5px;
  line-height: 1.6;
}
.lp-compare tr:last-child td { border-bottom: 0; }
.lp-compare td:first-child { font-weight: 750; }
.lp-compare td:nth-child(2) { color: #6b7e98; }
.lp-compare td:last-child { background: #f8fbff; color: #26765c; font-weight: 650; }
.lp-footer { margin-top: auto; padding: 30px 0; background: #0d162b; color: #93a4bc; }
.lp-footer-inner { display: flex; align-items: center; justify-content: space-between; gap: 25px; }
.lp-footer strong { display: flex; align-items: center; gap: 7px; color: #fff; font-size: 12px; }
.lp-footer strong svg { color: #4368ed; }
.lp-footer p { max-width: 620px; margin-top: 5px; color: #8497b2; font-size: 9.5px; line-height: 1.6; }
.lp-footer-actions { display: flex; gap: 7px; flex: 0 0 auto; }
.lp-footer-actions button {
  padding: 6px 10px;
  border-radius: 7px;
  background: #ffffff12;
  color: #c4d1e3;
  font-size: 9.5px;
  font-weight: 700;
}
.lp-footer-actions button:first-child { background: #3b62e030; color: #a9bdff; }
.lp-footer-actions button:nth-child(2) { background: #2e9d7b2c; color: #9fe5ce; }
.lp-footer-actions button:hover { background: #ffffff22; }
@media (max-width: 1040px) {
  .lp-nav-links { display: none; }
  .lp-role-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .lp-container, .lp-container.narrow { width: min(100% - 28px, 1180px); }
  .lp-nav-inner { min-height: 59px; }
  .lp-brand-copy small { display: none; }
  .lp-nav-actions .lp-btn { padding-inline: 10px; }
  .lp-hero { padding: 40px 0 52px; }
  .lp-hero h1 { letter-spacing: -1.2px; }
  .lp-hero-lead { font-size: 12px; }
  .lp-hero-actions { display: grid; grid-template-columns: 1fr; }
  .lp-hero-actions .lp-btn { width: 100%; }
  .lp-showcase-top { flex-wrap: wrap; }
  .lp-showcase-tabs { width: 100%; margin-left: 0; overflow-x: auto; }
  .lp-showcase-tabs button { flex: 1; white-space: nowrap; }
  .lp-showcase-body { padding: 15px; }
  .lp-showcase-head { flex-direction: column; }
  .lp-sim-grid, .lp-feature-grid, .lp-report-stats { grid-template-columns: 1fr; }
  .lp-section { padding: 50px 0; }
  .lp-section-heading { margin-bottom: 30px; }
  .lp-role-grid { grid-template-columns: 1fr; }
  .lp-role-desc { min-height: 0; }
  .lp-footer-inner { align-items: flex-start; flex-direction: column; }
  .lp-footer-actions { flex-wrap: wrap; }
  .lp-attention-head { align-items: flex-start; flex-direction: column; }
  .lp-hero-stats { flex-direction: column; align-items: center; gap: 7px; }
}
</style>
