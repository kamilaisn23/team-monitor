<script setup lang="ts">
import Icon from "./Icon.vue";

defineProps<{
  highWorkload: number;
  staleIssues: number;
  resolvedLast7Days: number;
}>();
const emit = defineEmits<{
  rebalance: [];
  attention: [];
  reports: [];
  playbook: [];
}>();
</script>

<template>
  <section class="manager-cockpit surface" aria-label="Pusat kendali manajer">
    <div class="cockpit-heading">
      <div class="cockpit-title">
        <span class="cockpit-symbol"><Icon name="shield" :size="19" /></span>
        <div>
          <div class="cockpit-title-row">
            <h2>Pusat kendali tindakan manajer</h2>
            <span class="cockpit-chip">Prioritas hari ini</span>
          </div>
          <p>
            Tiga langkah utama untuk menjaga kapasitas tim dan kelancaran
            pengiriman.
          </p>
        </div>
      </div>
      <button class="button secondary compact" @click="emit('playbook')">
        <Icon name="book" :size="16" />Panduan peran
      </button>
    </div>
    <div class="cockpit-grid">
      <button class="cockpit-action rebalance" @click="emit('rebalance')">
        <div class="cockpit-action-head">
          <span>1. Keseimbangan beban</span>
          <span class="cockpit-dot purple"></span>
        </div>
        <h3>{{ highWorkload }} anggota mendekati overload</h3>
        <p>
          Pindahkan sebagian tiket dari anggota dengan beban tinggi ke rekan
          yang masih memiliki kapasitas.
        </p>
        <span class="cockpit-cta purple"
          ><Icon name="scale" :size="15" />Redistribusi tugas<Icon
            name="right"
            :size="15"
        /></span>
      </button>
      <button class="cockpit-action attention" @click="emit('attention')">
        <div class="cockpit-action-head">
          <span>2. Mitigasi tiket mangkrak</span>
          <span class="cockpit-dot rose"></span>
        </div>
        <h3>{{ staleIssues }} isu mengendap</h3>
        <p>
          Tinjau isu berusia lebih dari batas pemantauan dan pekerjaan tanpa
          penanggung jawab.
        </p>
        <span class="cockpit-cta rose"
          ><Icon name="alert" :size="15" />Buka pusat perhatian<Icon
            name="right"
            :size="15"
        /></span>
      </button>
      <button class="cockpit-action reports" @click="emit('reports')">
        <div class="cockpit-action-head">
          <span>3. Deliverables & laporan</span>
          <span class="cockpit-dot green"></span>
        </div>
        <h3>{{ resolvedLast7Days }} isu selesai minggu ini</h3>
        <p>
          Tinjau hasil kerja tiap tim, lalu ekspor CSV untuk kebutuhan
          pelaporan.
        </p>
        <span class="cockpit-cta green"
          ><Icon name="chart" :size="15" />Buka laporan & CSV<Icon
            name="right"
            :size="15"
        /></span>
      </button>
    </div>
  </section>
</template>
