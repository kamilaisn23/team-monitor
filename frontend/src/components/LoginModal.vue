<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import Icon from "./Icon.vue";
import { workspace } from "../state";
import { startDevLogin } from "../auth";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; "open-full": [] }>();
const loading = ref(false);
const error = ref("");
const devLogin = ref("");
const dialog = ref<HTMLElement | null>(null);

function close() {
  if (!loading.value) emit("close");
}

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
          <div class="login-modal-sso">
            <p v-if="error" class="login-modal-error" role="alert">{{ error }}</p>
            <form
              v-if="workspace.config.devLoginEnabled"
              class="login-modal-dev"
              @submit.prevent="devSignIn"
            >
              <label for="login-modal-dev-login">Username anggota</label>
              <div>
                <input
                  id="login-modal-dev-login"
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
                Username diverifikasi ke data anggota. Akun baru berstatus
                UNASSIGNED dan menunggu review admin.
              </small>
            </form>
            <p v-else class="login-modal-warning">
              <Icon name="alert" :size="15" />Login sementara belum diaktifkan
              pada environment ini.
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
.login-modal-sso { display: grid; gap: 9px; }
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
.login-modal-dev {
  display: grid;
  gap: 7px;
  margin-top: 4px;
  padding: 11px 12px;
  border: 1px dashed #c7d5e9;
  border-radius: 10px;
  background: #f7faff;
}
.login-modal-dev label {
  color: #35506f;
  font-size: 10px;
  font-weight: 700;
}
.login-modal-dev > div { display: flex; gap: 7px; }
.login-modal-dev input {
  flex: 1;
  min-width: 0;
  min-height: 34px;
  padding: 7px 10px;
  border: 1px solid #cbd9ec;
  border-radius: 8px;
  background: #fff;
  color: var(--ink);
  font-size: 11px;
}
.login-modal-dev input:focus {
  outline: none;
  border-color: #6f8ffd;
  box-shadow: 0 0 0 3px #6f8ffd1f;
}
.login-modal-dev button {
  padding: 0 14px;
  border-radius: 8px;
  background: #375ee3;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}
.login-modal-dev button:disabled { opacity: 0.55; }
.login-modal-dev small { color: #6a7f9c; font-size: 9px; line-height: 1.55; }
@media (max-width: 460px) {
  .login-modal-foot { align-items: flex-start; flex-direction: column; }
}
</style>
