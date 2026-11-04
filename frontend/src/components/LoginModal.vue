<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";
import Icon from "./Icon.vue";
import { workspace } from "../state";
import { startGithubLogin } from "../auth";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; "open-full": [] }>();
const router = useRouter();
const tab = ref<"sso" | "credential">("sso");
const loading = ref(false);
const error = ref("");
const dialog = ref<HTMLElement | null>(null);

function close() {
  if (!loading.value) emit("close");
}

function preview() {
  emit("close");
  router.push("/preview");
}

async function login() {
  if (!workspace.config.githubConfigured || loading.value) return;
  loading.value = true;
  error.value = "";
  try {
    await startGithubLogin("/dashboard");
  } catch (e) {
    error.value = (e as Error).message;
    loading.value = false;
  }
}

function onKey(event: KeyboardEvent) {
  if (event.key === "Escape") close();
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
      await nextTick();
      dialog.value?.focus();
    } else {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    }
  },
);
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKey);
  document.body.style.overflow = "";
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="login-modal-backdrop"
      role="presentation"
      @click.self="close"
    >
      <section
        ref="dialog"
        class="login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        tabindex="-1"
      >
        <header class="login-modal-head">
          <div class="login-modal-brand">
            <span class="login-modal-mark"><Icon name="chart" :size="20" /></span>
            <div>
              <h2 id="login-modal-title">Masuk ke Team Monitor</h2>
              <p>Dashboard aktivitas tim dengan integrasi GitHub &amp; GitLab</p>
            </div>
          </div>
          <button class="login-modal-close" aria-label="Tutup" @click="close">
            <Icon name="close" :size="18" />
          </button>
        </header>

        <div class="login-modal-body">
          <div class="login-modal-demo">
            <div class="login-modal-demo-head">
              <span><Icon name="sparkles" :size="15" /> Akses cepat pratinjau</span>
              <small>Tanpa akun</small>
            </div>
            <div class="login-modal-personas">
              <button type="button" class="persona manager" @click="preview">
                <span class="persona-icon"><Icon name="users" :size="18" /></span>
                <span>
                  <strong>Rian Pratama</strong>
                  <small>Role manager · pantau beban tim</small>
                </span>
                <Icon name="right" :size="15" />
              </button>
              <button type="button" class="persona developer" @click="preview">
                <span class="persona-icon"><Icon name="usercheck" :size="18" /></span>
                <span>
                  <strong>Dimas Saputra</strong>
                  <small>Role developer · tugas pribadi</small>
                </span>
                <Icon name="right" :size="15" />
              </button>
            </div>
            <p class="login-modal-demo-note">
              Mode pratinjau memakai data contoh dan tidak mengubah data asli.
            </p>
          </div>

          <div class="login-modal-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              :aria-selected="tab === 'sso'"
              :class="{ active: tab === 'sso' }"
              @click="tab = 'sso'"
            >
              <Icon name="branch" :size="15" /> Single Sign-On
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="tab === 'credential'"
              :class="{ active: tab === 'credential' }"
              @click="tab = 'credential'"
            >
              <Icon name="file" :size="15" /> Email &amp; sandi
            </button>
          </div>

          <div v-if="tab === 'sso'" class="login-modal-sso">
            <p v-if="error" class="login-modal-error" role="alert">{{ error }}</p>
            <button
              type="button"
              class="login-modal-provider github"
              :disabled="!workspace.config.githubConfigured || loading"
              @click="login"
            >
              <Icon name="github" :size="19" />
              {{
                loading
                  ? "Menghubungkan ke GitHub..."
                  : "Masuk dengan GitHub Enterprise"
              }}
            </button>
            <button type="button" class="login-modal-provider gitlab" disabled>
              <Icon name="branch" :size="19" />
              GitLab instance belum dikonfigurasi
            </button>
            <p class="login-modal-info">
              <Icon name="info" :size="16" />
              OAuth memverifikasi akun Git Anda dengan data anggota tim, lalu
              mengarahkan ke dashboard sesuai peran.
            </p>
            <p v-if="!workspace.config.githubConfigured" class="login-modal-warning">
              <Icon name="alert" :size="15" />Layanan GitHub OAuth belum
              dikonfigurasi pada lingkungan ini.
            </p>
          </div>

          <div v-else class="login-modal-credential">
            <label>
              Email perusahaan
              <input type="email" value="rian.pratama@company.id" disabled />
            </label>
            <label>
              Kata sandi
              <input type="password" value="manager2026!" disabled />
            </label>
            <p class="login-modal-info">
              <Icon name="info" :size="16" />
              Login email &amp; sandi belum diaktifkan pada build ini. Gunakan
              GitHub SSO atau mode pratinjau.
            </p>
          </div>
        </div>

        <footer class="login-modal-foot">
          <span>Integrasi GitHub API &amp; GitLab API</span>
          <button type="button" @click="emit('open-full')">
            Buka halaman login penuh <Icon name="right" :size="14" />
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.login-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 18px;
  background: #111d38b8;
  backdrop-filter: blur(4px);
}
.login-modal {
  width: min(520px, 100%);
  max-height: calc(100dvh - 36px);
  overflow: auto;
  background: #fff;
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: 0 26px 80px #0b17305c;
}
.login-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 16px;
  background: linear-gradient(#f8fbff, #fff);
  border-bottom: 1px solid var(--line);
}
.login-modal-brand { display: flex; gap: 11px; align-items: center; }
.login-modal-mark {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(135deg, #6f8ffd, #375ee3);
}
.login-modal-head h2 { font-size: 15px; letter-spacing: -0.2px; }
.login-modal-head p { margin-top: 3px; color: var(--muted); font-size: 11px; }
.login-modal-close {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 9px;
  color: var(--muted);
  background: #fff;
}
.login-modal-close:hover { color: var(--ink); background: #f5f8fd; }
.login-modal-body { display: grid; gap: 18px; padding: 20px; }
.login-modal-demo {
  padding: 14px;
  border: 1px solid #bfd3f6;
  border-radius: 14px;
  background: #f0f5ff;
}
.login-modal-demo-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.login-modal-demo-head span {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #4368ed;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}
.login-modal-demo-head small {
  padding: 3px 8px;
  border-radius: 999px;
  background: #d8f4e9;
  color: #20775d;
  font-size: 9px;
  font-weight: 800;
}
.login-modal-personas { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.persona {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  padding: 10px;
  border: 1px solid #c5d5f2;
  border-radius: 11px;
  background: #fff;
  text-align: left;
}
.persona:hover { border-color: #4368ed; box-shadow: 0 4px 14px #3454b014; }
.persona.developer:hover { border-color: #3c9a7c; }
.persona-icon {
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 9px;
  color: #4368ed;
  background: #eaf0ff;
}
.persona.developer .persona-icon { color: #2f8368; background: #e7f6ef; }
.persona > span:nth-child(2) { min-width: 0; flex: 1; display: grid; gap: 2px; }
.persona strong { font-size: 11px; color: var(--ink); }
.persona small { font-size: 9px; color: var(--muted); overflow-wrap: anywhere; }
.persona > svg { color: #a4b4cc; flex: 0 0 auto; }
.login-modal-demo-note { margin-top: 9px; color: #587099; font-size: 10px; }
.login-modal-tabs { display: flex; border-bottom: 1px solid var(--line); }
.login-modal-tabs button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 6px;
  border-bottom: 2px solid transparent;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
}
.login-modal-tabs button.active { color: #4368ed; border-color: #4368ed; }
.login-modal-sso, .login-modal-credential { display: grid; gap: 9px; }
.login-modal-provider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 42px;
  padding: 10px 14px;
  border-radius: 10px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}
.login-modal-provider.github { background: #24292e; }
.login-modal-provider.github:hover:not(:disabled) { background: #1b1f23; }
.login-modal-provider.gitlab { background: #b6432e; opacity: 0.72; }
.login-modal-info {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 9px 10px;
  border: 1px solid #dbe4f1;
  border-radius: 9px;
  background: #f8faff;
  color: #5b7195;
  font-size: 10px;
  line-height: 1.6;
}
.login-modal-info svg { margin-top: 1px; color: #4368ed; }
.login-modal-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #986138;
  font-size: 10px;
}
.login-modal-error {
  padding: 9px 11px;
  border: 1px solid #ecc8d0;
  border-radius: 9px;
  background: #fff3f5;
  color: #9c3f54;
  font-size: 10px;
}
.login-modal-credential label {
  display: grid;
  gap: 5px;
  color: var(--ink);
  font-size: 10px;
  font-weight: 700;
}
.login-modal-credential input {
  width: 100%;
  min-height: 38px;
  padding: 9px 11px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: #f4f7fb;
  color: #8293aa;
  font-size: 11px;
}
.login-modal-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 20px;
  border-top: 1px solid var(--line);
  background: #f8fbff;
  color: var(--muted);
  font-size: 10px;
}
.login-modal-foot button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #4368ed;
  font-size: 10px;
  font-weight: 700;
}
.login-modal-foot button:hover { text-decoration: underline; }
@media (max-width: 460px) {
  .login-modal-personas { grid-template-columns: 1fr; }
  .login-modal-foot { align-items: flex-start; flex-direction: column; }
}
</style>
