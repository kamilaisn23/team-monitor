<script setup lang="ts">
import { computed } from "vue";
import Icon from "./Icon.vue";
import type { DashboardResponse, DashboardIssue } from "../types";

const props = defineProps<{
  response?: DashboardResponse;
  loading: boolean;
  scope: string;
  canReview?: boolean;
}>();
const emit = defineEmits<{
  review: [];
  workload: [];
  issue: [issue: DashboardIssue];
  attention: [];
}>();
const summary = computed(() => props.response?.summary);
const headline = computed(() => {
  if (!summary.value?.memberCount) return "Belum ada anggota dalam cakupan ini";
  return summary.value.staleIssues || summary.value.highWorkload
    ? "Ada pekerjaan yang perlu ditinjau"
    : "Tidak ada peringatan dalam cakupan ini";
});
</script>

<template>
  <section class="manager-brief surface" aria-label="Ringkasan manager" :aria-busy="loading">
    <div class="manager-brief-overview">
      <div class="manager-brief-eyebrow"><Icon name="target" :size="16" />RINGKASAN MANAGER</div>
      <span class="manager-brief-scope">{{ scope }}</span>
      <div v-if="loading" class="brief-loading" role="status">
        <Icon name="refresh" class="spinning" :size="18" />Memuat ringkasan terbaru…
      </div>
      <template v-else-if="summary">
        <h2>{{ headline }}</h2>
        <p v-if="summary.memberCount" class="manager-brief-description">
          <strong>{{ summary.staleIssues }} isu</strong> melewati batas usia
          {{ response!.thresholds.staleDays }} hari.
          <strong>{{ summary.highWorkload }} anggota</strong> memiliki beban tinggi.
          Tinjau prioritas dan kebutuhan bantuan bersama tim.
        </p>
        <p v-else class="manager-brief-description">Pilih cakupan lain atau sesuaikan filter untuk melihat ringkasan pekerjaan.</p>
        <div class="manager-brief-completed">
          <span class="brief-completed-icon"><Icon name="done" :size="18" /></span>
          <div><strong>{{ summary.resolvedLast7Days }} isu selesai</strong><small>Dalam 7 hari terakhir · berdasarkan waktu penutupan</small></div>
        </div>
        <div class="manager-brief-actions">
          <button class="button primary" :disabled="!summary.staleIssues" aria-label="Tinjau semua isu mengendap" @click="emit('review')">
            Tinjau isu<Icon name="right" :size="16" />
          </button>
          <button class="brief-workload-button" :disabled="!summary.highWorkload" aria-label="Tinjau anggota dengan beban tinggi" @click="emit('workload')">Tinjau beban tim<Icon name="next" :size="15" /></button>
        </div>
      </template>
      <p v-else class="manager-brief-description">Ringkasan belum tersedia. Muat ulang data untuk mencoba kembali.</p>
      <p class="manager-brief-filter-note">Mengikuti cakupan tim dan filter anggota, platform, serta repositori.</p>
    </div>
    <div class="manager-brief-attention">
      <div class="brief-attention-heading"><h3><Icon name="clock" :size="18" />Perlu ditinjau</h3><span v-if="!loading && summary" class="brief-attention-count">{{ summary.staleIssues }} isu</span></div>
      <p class="brief-attention-description">Isu terbuka paling lama dalam cakupan saat ini.</p>
      <div v-if="loading" class="brief-loading" role="status">Memuat daftar isu…</div>
      <div v-else-if="!response" class="brief-attention-empty"><Icon name="alert" :size="22" /><p>Daftar isu belum tersedia.</p></div>
      <div v-else-if="!response.attentionIssues.length" class="brief-attention-empty">
        <Icon name="check" :size="24" /><div><strong>Tidak ada isu melewati batas usia</strong><p>{{ summary?.memberCount ? 'Pekerjaan terbuka dalam cakupan ini belum melewati batas pemantauan.' : 'Belum ada pekerjaan anggota yang dapat ditinjau.' }}</p></div>
      </div>
      <div v-else class="brief-attention-list">
        <component
          :is="issue.url ? 'a' : 'button'"
          v-for="issue in response.attentionIssues"
          :key="issue.id"
          class="brief-attention-item"
          :href="issue.url || undefined"
          :target="issue.url ? '_blank' : undefined"
          :rel="issue.url ? 'noopener noreferrer' : undefined"
          :aria-label="'Tinjau isu ' + issue.title"
          @click="!issue.url && emit('issue', issue)"
        >
          <span class="brief-attention-icon"><Icon name="clock" :size="17" /></span>
          <span class="brief-attention-copy"><strong>{{ issue.title }}</strong><small>{{ issue.repository.name }} · {{ issue.assignees.map((member) => member.name).join(', ') }}</small></span>
          <span class="brief-attention-age">{{ issue.ageDays }} hari<Icon :name="issue.url ? 'external' : 'next'" :size="13" /></span>
        </component>
      </div>
      <p class="brief-attention-note"><Icon name="alert" :size="14" />Usia dihitung sejak isu dibuat, bukan sejak aktivitas terakhir.</p>
      <button v-if="canReview" class="button secondary attention-open-button" aria-label="Buka pusat perhatian tim" @click="emit('attention')"><Icon name="target" :size="16" />Buka pusat perhatian<Icon name="right" :size="16" /></button>
    </div>
  </section>
</template>
