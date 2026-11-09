<script setup lang="ts">
import { onMounted, ref } from "vue";
import Icon from "../components/Icon.vue";
import { workspace, bootstrap } from "../state";
import { startDevLogin } from "../auth";

const loading = ref(false);
const error = ref("");
const devLogin = ref("");

onMounted(async () => {
  try {
    await bootstrap();
  } catch {
    error.value = "Koneksi server belum tersedia. Silakan muat ulang halaman.";
  }
});

async function devSignIn() {
  const login = devLogin.value.trim();
  if (!workspace.config.devLoginEnabled || loading.value || !login) return;
  loading.value = true;
  error.value = "";
  try {
    await startDevLogin(login, "/dashboard");
  } catch (e) {
    error.value = (e as Error).message;
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <header class="auth-topbar">
      <div class="auth-topbar-inner">
        <RouterLink to="/" class="auth-back">
          <Icon name="left" :size="16" /> Kembali ke beranda
        </RouterLink>
        <span class="auth-secure">
          <Icon name="shield" :size="15" /> OAuth 2.0 &amp; RBAC security
        </span>
      </div>
    </header>

    <main class="auth-main">
      <div class="auth-card">
        <aside class="auth-story">
          <div class="auth-story-grid" aria-hidden="true"></div>
          <div class="auth-story-content">
            <div class="auth-brand">
              <span class="auth-brand-mark"><Icon name="chart" :size="20" /></span>
              <span>
                <strong>Team Monitor</strong>
                <small>Engineering workspace</small>
              </span>
            </div>

            <div class="auth-story-copy">
              <h1>
                Dashboard monitoring aktivitas tim pengembang dengan integrasi
                GitHub dan GitLab
              </h1>
              <p>
                Platform visibilitas performa rekayasa perangkat lunak untuk
                menjaga beban kerja seimbang dan mengidentifikasi isu
                mengendap.
              </p>
            </div>

            <div class="auth-integration">
              <strong>Koneksi repositori terdaftar</strong>
              <div>
                <span><Icon name="github" :size="14" /> GitHub organization</span>
                <em><Icon name="checkcircle" :size="13" /> Terhubung · 28 repo</em>
              </div>
              <div>
                <span><Icon name="branch" :size="14" /> GitLab self-hosted</span>
                <em><Icon name="checkcircle" :size="13" /> Terhubung · 14 repo</em>
              </div>
            </div>
          </div>
          <footer>
            <span>Sistem monitoring internal</span>
            <span>Versi 2.4</span>
          </footer>
        </aside>

        <section class="auth-form-side">
          <div class="auth-form-head">
            <span class="auth-symbol"><Icon name="shield" :size="23" /></span>
            <h2>Masuk ke Team Monitor</h2>
            <p>
              Sementara ini masuk menggunakan username anggota. Peran Manager
              atau Developer ditetapkan dari data anggota tim.
            </p>
          </div>

          <div class="auth-sso">
            <p v-if="error" class="auth-error" role="alert">{{ error }}</p>
            <form
              v-if="workspace.config.devLoginEnabled"
              class="auth-dev"
              @submit.prevent="devSignIn"
            >
              <label for="auth-dev-login">Username anggota</label>
              <div>
                <input
                  id="auth-dev-login"
                  v-model="devLogin"
                  type="text"
                  placeholder="contoh: budi-santoso"
                  autocomplete="username"
                  :disabled="loading"
                />
                <button type="submit" :disabled="loading || !devLogin.trim()">
                  {{ loading ? "Memproses..." : "Masuk" }}
                </button>
              </div>
              <small>
                Username diverifikasi ke data anggota tim. Akun baru berstatus
                UNASSIGNED dan menunggu review admin. Ingin sekadar mencoba?
                <RouterLink to="/preview">Buka mode demo</RouterLink>.
              </small>
            </form>
            <p v-else class="auth-warning">
              <Icon name="alert" :size="15" />Login sementara belum diaktifkan
              pada environment ini.
            </p>
          </div>
        </section>
      </div>
    </main>

    <footer class="auth-footer">
      <span>Team Monitor · People. Work. Clarity.</span>
      <span>Integrasi GitHub API &amp; GitLab API</span>
    </footer>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #edf2fa;
  color: var(--ink);
}
.auth-topbar {
  border-bottom: 1px solid var(--line);
  background: #fff;
}
.auth-topbar-inner {
  width: min(1120px, calc(100% - 32px));
  min-height: 54px;
  margin-inline: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.auth-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #586d8c;
  font-size: 10px;
  font-weight: 700;
}
.auth-back:hover { color: #1c2d49; }
.auth-secure {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #3c8b71;
  font-family: ui-monospace, monospace;
  font-size: 9px;
}
.auth-main {
  flex: 1;
  display: grid;
  place-items: center;
  width: 100%;
  padding: 32px 16px;
}
.auth-card {
  display: grid;
  grid-template-columns: minmax(280px, 0.88fr) minmax(0, 1.25fr);
  width: min(1010px, 100%);
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 24px 65px #162d5218;
}
.auth-story {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 34px;
  overflow: hidden;
  background: linear-gradient(145deg, #111d38, #1a2d54 54%, #253f75);
  color: #fff;
}
.auth-story-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, #ffffff0a 1px, transparent 1px),
    linear-gradient(to bottom, #ffffff0a 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
}
.auth-story-content { position: relative; display: grid; gap: 27px; }
.auth-brand { display: flex; align-items: center; gap: 10px; }
.auth-brand-mark {
  width: 39px;
  height: 39px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(135deg, #6f8ffd, #375ee3);
  box-shadow: 0 7px 18px #204be54d;
}
.auth-brand strong { display: block; font-size: 14px; letter-spacing: -0.3px; }
.auth-brand small {
  display: block;
  margin-top: 3px;
  color: #9db8e9;
  font-family: ui-monospace, monospace;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1.3px;
  text-transform: uppercase;
}
.auth-story-copy h1 { color: #fff; font-size: 19px; line-height: 1.45; letter-spacing: -0.4px; }
.auth-story-copy p { margin-top: 12px; color: #c4d1e6; font-size: 10.5px; line-height: 1.75; }
.auth-integration {
  display: grid;
  gap: 9px;
  padding: 14px;
  border: 1px solid #ffffff17;
  border-radius: 13px;
  background: #ffffff09;
}
.auth-integration > strong {
  color: #dce6f7;
  font-size: 8px;
  letter-spacing: 0.7px;
  text-transform: uppercase;
}
.auth-integration > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #c4d1e6;
  font-size: 9.5px;
}
.auth-integration > div > span { display: flex; align-items: center; gap: 6px; }
.auth-integration em {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #63d4a7;
  font-size: 8.5px;
  font-style: normal;
  font-weight: 700;
  white-space: nowrap;
}
.auth-story > footer {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 26px;
  padding-top: 16px;
  border-top: 1px solid #ffffff17;
  color: #8ea4c8;
  font-size: 9px;
}
.auth-form-side {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 18px;
  padding: 34px;
}
.auth-form-head { display: grid; gap: 5px; }
.auth-symbol {
  width: 37px;
  height: 37px;
  display: grid;
  place-items: center;
  margin-bottom: 5px;
  border-radius: 11px;
  background: #edf3ff;
  color: #4368ed;
}
.auth-form-head h2 { color: #111d38; font-size: 21px; letter-spacing: -0.6px; }
.auth-form-head p { color: var(--muted); font-size: 10.5px; }
.auth-sso { display: grid; gap: 8px; }
.auth-provider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 9px 13px;
  border-radius: 10px;
  color: #fff;
  font-size: 10px;
  font-weight: 750;
}
.auth-provider.github { background: #24292e; }
.auth-provider.github:hover:not(:disabled) { background: #1b1f23; }
.auth-note {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 9px 10px;
  border: 1px solid #dbe4f1;
  border-radius: 9px;
  background: #f8faff;
  color: #5b7195;
  font-size: 9.5px;
  line-height: 1.6;
}
.auth-note svg { margin-top: 1px; color: #4368ed; }
.auth-warning { display: flex; align-items: center; gap: 6px; color: #986138; font-size: 9px; }
.auth-error {
  padding: 9px 11px;
  border: 1px solid #ecc8d0;
  border-radius: 9px;
  background: #fff3f5;
  color: #9c3f54;
  font-size: 9.5px;
}
.auth-dev {
  display: grid;
  gap: 7px;
  margin-top: 3px;
  padding: 11px 12px;
  border: 1px dashed #c7d5e9;
  border-radius: 10px;
  background: #f7faff;
}
.auth-dev label {
  color: #35506f;
  font-size: 9.5px;
  font-weight: 700;
}
.auth-dev > div { display: flex; gap: 7px; }
.auth-dev input {
  flex: 1;
  min-width: 0;
  min-height: 34px;
  padding: 7px 10px;
  border: 1px solid #cbd9ec;
  border-radius: 8px;
  background: #fff;
  color: var(--ink);
  font-size: 10.5px;
}
.auth-dev input:focus {
  outline: none;
  border-color: #6f8ffd;
  box-shadow: 0 0 0 3px #6f8ffd1f;
}
.auth-dev button {
  padding: 0 14px;
  border-radius: 8px;
  background: #375ee3;
  color: #fff;
  font-size: 9.5px;
  font-weight: 700;
}
.auth-dev button:disabled { opacity: 0.55; }
.auth-dev small { color: #6a7f9c; font-size: 8.5px; line-height: 1.55; }
.auth-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: min(1010px, calc(100% - 32px));
  margin-inline: auto;
  padding: 0 0 20px;
  color: #7b8ba3;
  font-size: 9px;
}
@media (max-width: 860px) {
  .auth-card { grid-template-columns: 1fr; }
  .auth-story { padding: 26px; }
  .auth-story-copy h1 { font-size: 17px; }
  .auth-integration { display: none; }
  .auth-story > footer { margin-top: 20px; }
  .auth-form-side { padding: 26px; }
}
@media (max-width: 520px) {
  .auth-main { padding: 18px 12px; }
  .auth-topbar-inner { width: calc(100% - 24px); }
  .auth-secure { display: none; }
  .auth-form-side { padding: 20px; }
  .auth-footer { flex-direction: column; align-items: flex-start; }
}
</style>
