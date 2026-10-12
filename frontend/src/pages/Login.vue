<script setup lang="ts">
import { ref, onMounted } from "vue";
import Icon from "../components/Icon.vue";
import { workspace, bootstrap } from "../state";
import { api } from "../api";
const loading = ref(false),
  error = ref("");
onMounted(async () => {
  try {
    await bootstrap();
  } catch {
    error.value =
      "Koneksi server belum tersedia. Anda tetap dapat membuka pratinjau.";
  }
});
async function login() {
  if (!workspace.config.githubConfigured || loading.value) return;
  loading.value = true;
  error.value = "";
  try {
    const { csrfToken } = await api<{ csrfToken: string }>("/api/auth/csrf");
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/auth/signin/github";
    for (const [name, value] of Object.entries({
      csrfToken,
      callbackUrl: window.location.origin + "/dashboard",
    })) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.append(input);
    }
    document.body.append(form);
    form.submit();
  } catch (e) {
    error.value = (e as Error).message;
    loading.value = false;
  }
}
</script>
<template>
  <div class="login-page">
    <section class="login-story">
      <RouterLink to="/preview" class="brand"
        ><span class="brand-symbol"><Icon name="chart" :size="26" /></span
        ><span class="brand-copy"
          ><strong>team<span>monitor</span></strong
          ><small>PEOPLE. WORK. CLARITY.</small></span
        ></RouterLink
      >
      <div class="login-story-copy">
        <div class="eyebrow">ONE WORKSPACE. EVERY TEAM.</div>
        <h1>
          Kejelasan untuk<br />kerja yang<br /><span>lebih bermakna.</span>
        </h1>
        <p>
          Seluruh tim, kapasitas, dan progres pekerjaan. Terhubung dalam satu
          pandangan yang mudah dipahami.
        </p>
        <div class="login-capability">
          <span><Icon name="users" :size="19" />Tim terhubung</span
          ><span><Icon name="chart" :size="19" />Beban terpantau</span
          ><span><Icon name="shield" :size="19" />Akses terkendali</span>
        </div>
      </div>
      <div class="login-visual" aria-hidden="true">
        <div class="orbital-ring one"></div>
        <div class="orbital-ring two"></div>
        <div class="orbital-ring three"></div>
        <div class="login-floating-card">
          <span class="floating-icon"><Icon name="teams" :size="25" /></span>
          <div>
            <strong>People. Work. Clarity.</strong
            ><small>Ruang untuk kolaborasi yang lebih baik</small>
          </div>
          <Icon name="arrow" :size="24" />
        </div>
      </div>
      <div class="login-story-footer">
        TEAM INTELLIGENCE WORKSPACE<span>BUILT FOR CLARITY</span>
      </div>
    </section>
    <section class="login-form-side">
      <div class="login-form">
        <div class="login-greeting"><Icon name="shield" :size="25" /></div>
        <div class="eyebrow">WELCOME TO YOUR WORKSPACE</div>
        <h2>Siap melihat gambaran besar?</h2>
        <p>Masuk dengan akun GitHub untuk melanjutkan ke ruang kerja tim.</p>
        <div v-if="error" class="error-banner" role="alert">{{ error }}</div>
        <button
          class="button login-submit"
          :disabled="!workspace.config.githubConfigured || loading"
          @click="login"
        >
          <Icon name="github" :size="21" />{{
            loading ? "Menghubungkan…" : "Lanjutkan dengan GitHub"
          }}<Icon name="right" :size="19" />
        </button>
        <p v-if="!workspace.config.githubConfigured" class="login-config-note">
          <Icon name="alert" :size="16" />Login GitHub menunggu konfigurasi
          OAuth.
        </p>
        <div class="login-divider">
          <span>atau jelajahi terlebih dahulu</span>
        </div>
        <RouterLink to="/preview" class="preview-login-link"
          ><span><Icon name="eye" :size="23" /></span>
          <div>
            <strong>Lihat pratinjau desain</strong
            ><small>Jelajahi workspace dengan data contoh</small>
          </div>
          <Icon name="arrow" :size="20"
        /></RouterLink>
        <div class="login-security">
          <Icon name="shield" :size="15" />Akses workspace sesuai dengan peran
          akun Anda.
        </div>
      </div>
      <footer>Team Monitor<span>People. Work. Clarity.</span></footer>
    </section>
  </div>
</template>
