<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import Icon from "./Icon.vue";
import Modal from "./Modal.vue";
import Pager from "./Pager.vue";
import { api } from "../api";
import { workspace, notify } from "../state";
import { getPreviewAttention } from "../../../src/lib/preview-attention";
import { followUpLabels, followUpStatuses, parseFollowUp, type AttentionIssue, type AttentionResponse, type FollowUp, type FollowUpStatus } from "../../../src/types/attention";
const props = defineProps<{ params: URLSearchParams; scope: string }>();
defineEmits<{ close: [] }>();
const response = ref<AttentionResponse>(), loading = ref(false), error = ref(""), saving = ref(false), saveError = ref("");
const status = ref("unreviewed"), reason = ref("all"), page = ref(1), editing = ref<AttentionIssue>();
const draft = reactive({ note: "", ownerId: "", status: "unreviewed" as FollowUpStatus });
const previewKey = "team-monitor:preview-attention:v1";
let requestId = 0;
const queryParams = computed(() => {
  const params = new URLSearchParams(props.params);
  params.set("status", status.value); params.set("reason", reason.value); params.set("attentionPage", String(page.value));
  return params;
});
function previewRecords(): Record<string, FollowUp> {
  const raw = JSON.parse(window.localStorage.getItem(previewKey) || "{}");
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).map(([id, value]) => [id, parseFollowUp(JSON.stringify(value))]));
}
async function load() {
  const id = ++requestId;
  loading.value = true; error.value = ""; response.value = undefined;
  try {
    const data = workspace.preview ? getPreviewAttention(queryParams.value, previewRecords()) : await api<AttentionResponse>("/api/dashboard/attention?" + queryParams.value);
    if (id !== requestId) return;
    const lastPage = Math.max(1, Math.ceil(data.total / data.limit));
    if (page.value > lastPage) { page.value = lastPage; return; }
    response.value = data;
  } catch (e) { if (id === requestId) error.value = (e as Error).message; }
  finally { if (id === requestId) loading.value = false; }
}
watch([() => props.params.toString(), status, reason], () => { page.value = 1; editing.value = undefined; saveError.value = ""; });
watch([queryParams, () => workspace.refreshKey], load, { immediate: true });
function edit(issue: AttentionIssue) {
  editing.value = issue; saveError.value = "";
  Object.assign(draft, { note: issue.followUp.note, ownerId: issue.followUp.ownerId || "", status: issue.followUp.status });
}
async function save() {
  const issue = editing.value;
  if (!issue || saving.value) return;
  saving.value = true; saveError.value = "";
  try {
    const payload = { ...draft, ownerId: draft.ownerId || null, expectedRevision: issue.followUp.revision };
    if (workspace.preview) {
      const records = previewRecords();
      if ((records[issue.id]?.revision ?? null) !== payload.expectedRevision) throw new Error("Tindak lanjut contoh berubah di tab lain. Muat ulang daftar sebelum menyimpan kembali.");
      records[issue.id] = { ...draft, note: draft.note.trim(), ownerId: payload.ownerId, revision: crypto.randomUUID(), updatedAt: new Date().toISOString(), updatedBy: "Anda (preview)" };
      window.localStorage.setItem(previewKey, JSON.stringify(records));
    } else await api<FollowUp>("/api/dashboard/attention/" + encodeURIComponent(issue.id), { method: "PATCH", body: JSON.stringify(payload) });
    editing.value = undefined;
    notify(workspace.preview ? "Tindak lanjut contoh disimpan di browser." : "Tindak lanjut berhasil disimpan.");
    await load();
  } catch (e) { saveError.value = (e as Error).message; }
  finally { saving.value = false; }
}
const ownerName = (id: string | null) => response.value?.owners.find((owner) => owner.id === id)?.name || (id ? "Anggota di luar cakupan / nonaktif" : "Belum ditentukan");
const date = (value: string) => new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
</script>
<template>
  <Modal title="Pusat perhatian tim" :description="'Tinjau dan catat tindak lanjut pekerjaan dalam cakupan ' + scope + '.'" @close="!saving && $emit('close')">
    <div class="attention-center">
      <p class="attention-scope-note"><Icon name="info" :size="16" />Isu tanpa assignee mengikuti tim repositori; pencarian anggota mengikuti pembuat isu. Usia dihitung sejak pembuatan. Penanggung jawab tindak lanjut tidak mengubah assignee di GitHub/GitLab.</p>
      <p v-if="workspace.preview" class="attention-preview-note">Mode preview · Catatan contoh hanya disimpan di browser ini.</p>
      <div class="attention-toolbar">
        <div class="attention-status-tabs" aria-label="Status tinjauan">
          <button v-for="value in ['all', ...followUpStatuses]" :key="value" :aria-pressed="status === value" :class="{ active: status === value }" :disabled="saving" @click="status = value">
            {{ value === 'all' ? 'Semua' : followUpLabels[value as FollowUpStatus] }}<span v-if="response">{{ value === 'all' ? Object.values(response.counts).reduce((sum, count) => sum + count, 0) : response.counts[value as FollowUpStatus] }}</span>
          </button>
        </div>
        <label class="attention-reason">Alasan<select v-model="reason" :disabled="saving"><option value="all">Semua alasan</option><option value="stale">Melewati batas usia</option><option value="unassigned">Tanpa assignee</option></select></label>
      </div>
      <div v-if="loading" class="loading-state" role="status"><Icon name="refresh" class="spinning" />Memuat pusat perhatian…</div>
      <div v-else-if="error" class="error-banner" role="alert">{{ error }}<button @click="load">Coba lagi</button></div>
      <template v-else-if="response">
        <div class="attention-list">
          <article v-for="issue in response.data" :key="issue.id" class="attention-card">
            <div class="attention-card-heading">
              <span class="attention-card-icon"><Icon :name="issue.reasons.includes('unassigned') ? 'users' : 'clock'" :size="18" /></span>
              <div><a v-if="issue.url" :href="issue.url" target="_blank" rel="noopener noreferrer" class="attention-issue-title">{{ issue.title }}<Icon name="external" :size="13" /></a><strong v-else class="attention-issue-title">{{ issue.title }}</strong><p>{{ issue.repository.name }} · {{ issue.ageDays }} hari</p></div>
              <span class="badge" :class="issue.followUp.status === 'reviewed' ? 'low' : 'neutral'">{{ followUpLabels[issue.followUp.status] }}</span>
            </div>
            <div class="attention-reasons"><span v-if="issue.reasons.includes('stale')">Melewati {{ response.staleDays }} hari</span><span v-if="issue.reasons.includes('unassigned')">Tanpa assignee</span></div>
            <div class="attention-follow-up-summary"><span><Icon name="users" :size="14" />Tindak lanjut: {{ ownerName(issue.followUp.ownerId) }}</span><button class="text-button" :aria-label="'Catat tindak lanjut ' + issue.title" :disabled="saving" @click="edit(issue)"><Icon name="edit" :size="14" />{{ issue.followUp.revision ? 'Ubah tindak lanjut' : 'Catat tindak lanjut' }}</button></div>
            <p v-if="issue.followUp.note && editing?.id !== issue.id" class="attention-note">{{ issue.followUp.note }}</p>
            <small v-if="issue.followUp.updatedAt" class="attention-updated">{{ issue.followUp.updatedBy }} · {{ date(issue.followUp.updatedAt) }}</small>
            <form v-if="editing?.id === issue.id" class="follow-up-form attention-editor" @submit.prevent="save">
              <div class="follow-up-fields"><label>Status tinjauan<select v-model="draft.status" :disabled="saving"><option v-for="value in followUpStatuses" :key="value" :value="value">{{ followUpLabels[value] }}</option></select></label><label>Penanggung jawab tindak lanjut<select v-model="draft.ownerId" :disabled="saving"><option value="">Belum ditentukan</option><option v-if="draft.ownerId && !response.owners.some((owner) => owner.id === draft.ownerId)" :value="draft.ownerId">Anggota di luar cakupan / nonaktif</option><option v-for="owner in response.owners" :key="owner.id" :value="owner.id">{{ owner.name }}</option></select></label></div>
              <label>Catatan tindak lanjut<textarea v-model="draft.note" rows="3" maxlength="2000" placeholder="Apa yang perlu dilakukan berikutnya?" :disabled="saving"></textarea><small>{{ draft.note.length }}/2.000 karakter</small></label>
              <p v-if="saveError" class="form-error" role="alert">{{ saveError }}<button type="button" class="text-button" @click="editing = undefined; load()">Muat ulang daftar</button></p>
              <div class="follow-up-actions"><button type="button" class="button secondary" :disabled="saving" @click="editing = undefined">Batal</button><button type="submit" class="button primary" :disabled="saving"><Icon v-if="saving" name="refresh" class="spinning" :size="15" />{{ saving ? 'Menyimpan…' : 'Simpan tindak lanjut' }}</button></div>
            </form>
          </article>
        </div>
        <div v-if="!response.data.length" class="attention-empty"><Icon name="check" :size="28" /><h3>Tidak ada isu dalam pilihan ini</h3><p>Coba status atau alasan lain. Isu yang ditutup akan keluar dari pusat perhatian.</p></div>
        <Pager :page="response.page" :total="response.total" :limit="response.limit" @change="!saving && (page = $event)" />
      </template>
    </div>
  </Modal>
</template>
