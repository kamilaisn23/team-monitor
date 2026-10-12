<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";
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
  <main class="status-page">
    <section class="surface status-card">
      <span class="status-symbol"><Icon name="shield" :size="32" /></span>
      <div class="eyebrow">YOUR WORKSPACE IS ALMOST READY</div>
      <h1>Menunggu akses tim</h1>
      <p>
        Halo {{ workspace.session?.user.name || "anggota" }}, akun Anda sudah
        terhubung. Administrator perlu menetapkan peran sebelum Anda dapat
        membuka workspace.
      </p>
      <p v-if="error" class="validation-error" role="alert">{{ error }}</p>
      <button class="button primary" @click="refresh">
        <Icon name="refresh" :size="17" />Periksa akses</button
      ><button class="text-button" @click="logout">Keluar dari akun</button>
    </section>
  </main>
</template>
