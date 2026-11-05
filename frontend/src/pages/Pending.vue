<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";
import Avatar from "../components/Avatar.vue";
import Icon from "../components/Icon.vue";
import { workspace, signOut } from "../state";
import { api } from "../api";
import type { Session } from "../types";
const router = useRouter(),
  error = ref("");
let timer: ReturnType<typeof setInterval> | undefined;
async function refresh() {
  try {
    const { csrfToken } = await api<{ csrfToken: string }>("/api/auth/csrf");
    const session = await api<Session | null>("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ csrfToken, data: {} }),
    });
    workspace.session = session;
    if (!session) router.push("/login");
    else if (session.user.role !== "UNASSIGNED" || session.user.isSuperadmin)
      router.push("/dashboard");
  } catch (e) {
    error.value = (e as Error).message;
  }
}
onMounted(() => {
  timer = setInterval(refresh, 15000);
});
onBeforeUnmount(() => clearInterval(timer));
async function logout() {
  try {
    await signOut();
  } catch (e) {
    error.value = (e as Error).message;
  }
}
</script>
<template>
  <main class="status-page pending-page">
    <section class="surface status-card pending-card" aria-labelledby="pending-title">
      <span class="pending-access-badge"><i></i>STATUS: UNASSIGNED</span>
      <span class="status-symbol pending-status-symbol">
        <Icon name="clock" :size="32" />
      </span>
      <div class="pending-copy">
        <h1 id="pending-title">Akun menunggu persetujuan</h1>
        <p>
          Akun GitHub Anda sudah terhubung. Administrator perlu menetapkan role
          dan tim sebelum Anda dapat membuka workspace.
        </p>
      </div>
      <div class="pending-user-card">
        <div class="pending-user-summary">
          <Avatar
            :name="workspace.session?.user.name || 'Anggota'"
            :image="workspace.session?.user.image"
          />
          <div class="pending-user-copy">
            <strong>{{ workspace.session?.user.name || "Anggota" }}</strong>
            <span v-if="workspace.session?.user.email">{{ workspace.session.user.email }}</span>
            <span v-if="workspace.session?.user.githubLogin" class="pending-github-handle">
              <Icon name="github" :size="14" />@{{ workspace.session.user.githubLogin }}
            </span>
          </div>
        </div>
        <div class="pending-review-status">
          <span>Pemberitahuan</span>
          <strong>Menunggu review Admin</strong>
        </div>
      </div>
      <p v-if="error" class="validation-error" role="alert">{{ error }}</p>
      <div class="pending-actions">
        <button class="button primary" @click="refresh">
          <Icon name="refresh" :size="17" />Periksa akses
        </button>
        <button class="text-button" @click="logout">Keluar dari akun</button>
      </div>
    </section>
  </main>
</template>
<style scoped>
.pending-page {
  background:
    radial-gradient(ellipse at 50% 18%, #e2ebff, transparent 58%), #f0f5fd;
}
.pending-card {
  max-width: 510px;
  gap: 18px;
  padding: 32px;
}
.pending-access-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  align-self: center;
  padding: 6px 11px;
  border: 1px solid #ead59e;
  border-radius: 999px;
  background: #fff7e4;
  color: #8f651b;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.45px;
}
.pending-access-badge i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #c58b25;
  box-shadow: 0 0 0 3px #c58b251c;
}
.pending-status-symbol {
  align-self: center;
  background: #fff6e2;
  border-color: #f0dda9;
  color: #b97818;
}
.pending-copy {
  width: 100%;
  text-align: center;
}
.pending-copy h1 {
  color: #1c2d49;
  font-size: 26px;
}
.pending-copy p {
  margin-top: 9px;
  color: #60718b;
  font-size: 12px;
  line-height: 1.75;
}
.pending-user-card {
  width: 100%;
  padding: 14px;
  border: 1px solid #e1e8f1;
  border-radius: 14px;
  background: #f8fafc;
  text-align: left;
}
.pending-user-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.pending-user-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
  color: #718096;
  font-size: 11px;
  overflow-wrap: anywhere;
}
.pending-user-copy strong {
  color: #1c2d49;
  font-size: 13px;
}
.pending-github-handle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #43536b;
  font-family: ui-monospace, monospace;
}
.pending-review-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding-top: 11px;
  border-top: 1px solid #e1e8f1;
  color: #718096;
  font-size: 10px;
}
.pending-review-status strong {
  color: #93691e;
  font-size: 10px;
}
.pending-actions {
  display: grid;
  gap: 9px;
  width: 100%;
}
.pending-actions .button {
  width: 100%;
}
.pending-actions .text-button {
  justify-content: center;
}
@media (max-width: 600px) {
  .pending-card {
    padding: 24px 18px;
  }
  .pending-copy h1 {
    font-size: 23px;
  }
  .pending-review-status {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
}
</style>
