<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { api } from "../api";
import { workspace, isAdmin } from "../state";

interface SourceHealth {
  source: string; configured: boolean; schedulerEnabled: boolean; nextScheduledAt: string | null;
  last: { status: string; startedAt: string; finishedAt: string | null; issues: number; errors: number } | null;
}
const sources = ref<SourceHealth[]>([]), error = ref(""), loading = ref(false);
const labels: Record<string, string> = { kerjabaik: "Kerjabaik", github: "GitHub", gitlab: "GitLab" };
const statuses: Record<string, string> = { running: "Berjalan", done: "Berhasil", error: "Gagal / terhenti" };
function date(value?: string | null) {
  return value ? new Date(value).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB" : "—";
}
async function load() {
  if (!workspace.preview && !isAdmin.value) return;
  if (workspace.preview) {
    sources.value = ["kerjabaik", "github", "gitlab"].map(source => ({ source, configured: true, schedulerEnabled: true,
      nextScheduledAt: new Date(Date.now() + 3600_000).toISOString(), last: { status: source === "gitlab" ? "error" : "done",
        startedAt: new Date(Date.now() - 3600_000).toISOString(), finishedAt: new Date(Date.now() - 3500_000).toISOString(), issues: source === "github" ? 21 : 0, errors: source === "gitlab" ? 1 : 0 } }));
    return;
  }
  loading.value = true;
  try { sources.value = (await api<{ sources: SourceHealth[] }>("/api/sync/health")).sources; error.value = ""; }
  catch (e) { error.value = (e as Error).message; }
  finally { loading.value = false; }
}
let timer: ReturnType<typeof setInterval>;
onMounted(() => { void load(); timer = setInterval(() => void load(), 30_000); });
onUnmounted(() => clearInterval(timer));
</script>
<template>
  <section v-if="workspace.preview || isAdmin" class="surface sync-health">
    <div class="sync-health-heading"><div><h2>Kesehatan sinkronisasi</h2><p>{{ workspace.preview ? 'Contoh data fiktif.' : 'Hasil tiap sumber diperbarui setiap 30 detik.' }} Semua waktu dalam WIB.</p></div>
      <button class="button secondary" :disabled="loading" @click="load">{{ loading ? 'Memuat…' : 'Perbarui' }}</button></div>
    <p v-if="error" role="alert" class="error-banner">{{ error }}</p>
    <div class="sync-source-grid">
      <article v-for="source in sources" :key="source.source" class="sync-source">
        <h3>{{ labels[source.source] }}</h3>
        <span class="scope-tag">{{ !source.configured ? 'Belum dikonfigurasi' : source.last ? statuses[source.last.status] : 'Belum pernah sync' }}</span>
        <dl><dt>Hasil terakhir</dt><dd>{{ date(source.last?.finishedAt || source.last?.startedAt) }}</dd>
          <dt>Isu diproses / error</dt><dd>{{ source.last ? `${source.last.issues} / ${source.last.errors}` : '—' }}</dd>
          <dt>Jadwal berikutnya</dt><dd>{{ !source.schedulerEnabled ? 'Scheduler dijeda' : date(source.nextScheduledAt) }}</dd></dl>
        <small v-if="!source.configured">Jadwal aktif setelah konfigurasi integrasi tersedia.</small>
      </article>
    </div>
    <p class="panel-footnote">Jadwal dapat tertunda saat sync lain berjalan atau selama jeda lima menit. Hasil sync tidak menunjukkan aktivitas manusia pada isu.</p>
  </section>
</template>
<style scoped>
.sync-health { padding: 24px; margin-top: 24px; }
.sync-health-heading { display: flex; align-items: start; justify-content: space-between; gap: 16px; }
.sync-health-heading h2 { margin: 0 0 8px; }
.sync-health-heading p, .sync-source small { color: var(--text-muted, #64748b); }
.sync-source-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.sync-source { border: 1px solid var(--border, #dbe4ef); border-radius: 12px; padding: 16px; }
.sync-source h3 { margin: 0 0 12px; }
.sync-source dt { font-size: 12px; color: var(--text-muted, #64748b); margin-top: 12px; }
.sync-source dd { margin: 4px 0 0; font-size: 13px; overflow-wrap: anywhere; }
@media (max-width: 800px) { .sync-source-grid { grid-template-columns: 1fr; } .sync-health-heading { flex-wrap: wrap; } }
</style>
