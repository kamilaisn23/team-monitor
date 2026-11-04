<script setup lang="ts">
import Icon from "./Icon.vue";
import Modal from "./Modal.vue";

const emit = defineEmits<{
  close: [];
  attention: [];
  rebalance: [];
  reports: [];
}>();

const features = [
  {
    icon: "target",
    tone: "blue",
    title: "Pusat perhatian & tindak lanjut",
    body: "Saring tiket mengendap atau tanpa penanggung jawab, lalu tetapkan owner tindak lanjut dan catatan evaluasi.",
  },
  {
    icon: "scale",
    tone: "purple",
    title: "Redistribusi beban kerja",
    body: "Pindahkan tiket dari anggota overload ke rekan dengan kapasitas siap. Perubahan bersifat internal dan tercatat di histori tindak lanjut.",
  },
  {
    icon: "note",
    tone: "green",
    title: "Profil anggota & catatan 1-on-1",
    body: "Tinjau heatmap kontribusi, rasio penyelesaian per repositori, serta simpan catatan sesi 1-on-1 dan rencana tindak lanjut.",
  },
  {
    icon: "chart",
    tone: "amber",
    title: "Laporan & ekspor CSV",
    body: "Bandingkan pencapaian antar tim, tinjau durasi penyelesaian, dan unduh CSV untuk kebutuhan pelaporan manajemen.",
  },
];
</script>

<template>
  <Modal
    title="Panduan peran engineering manager"
    description="Cara memakai Team Monitor untuk memimpin, menyeimbangkan tim, dan melaporkan kinerja."
    @close="emit('close')"
  >
    <div class="playbook">
      <div class="playbook-mission">
        <Icon name="sparkles" :size="20" />
        <p>
          <strong>Misi utama:</strong> memastikan tim tidak overload,
          menghilangkan hambatan, menjaga pengiriman tepat waktu, dan
          memfasilitasi pertumbuhan tiap anggota.
        </p>
      </div>
      <div class="playbook-routine">
        <article>
          <div class="playbook-routine-head daily">
            <Icon name="clock" :size="16" />Harian · standup
          </div>
          <p>
            Cek isu mengendap dan tiket tanpa penanggung jawab di pusat
            perhatian, lalu tunjuk PIC.
          </p>
          <button class="text-button" @click="emit('attention')">
            Buka pusat perhatian<Icon name="right" :size="14" />
          </button>
        </article>
        <article>
          <div class="playbook-routine-head weekly">
            <Icon name="scale" :size="16" />Mingguan · sprint health
          </div>
          <p>
            Deteksi anggota dengan beban tinggi dan redistribusikan tiket ke
            rekan yang masih lapang.
          </p>
          <button class="text-button" @click="emit('rebalance')">
            Redistribusi beban<Icon name="right" :size="14" />
          </button>
        </article>
        <article>
          <div class="playbook-routine-head monthly">
            <Icon name="chart" :size="16" />Bulanan · eksekutif
          </div>
          <p>
            Evaluasi rasio penyelesaian per tim di halaman laporan dan ekspor
            CSV untuk manajemen.
          </p>
          <button class="text-button" @click="emit('reports')">
            Buka laporan<Icon name="right" :size="14" />
          </button>
        </article>
      </div>
      <div class="playbook-features">
        <h3>Fitur utama dan kegunaannya</h3>
        <div class="playbook-feature-grid">
          <article v-for="feature in features" :key="feature.title">
            <span class="playbook-feature-icon" :class="feature.tone">
              <Icon :name="feature.icon" :size="17" />
            </span>
            <div>
              <strong>{{ feature.title }}</strong>
              <p>{{ feature.body }}</p>
            </div>
          </article>
        </div>
      </div>
    </div>
    <div class="follow-up-actions">
      <button class="button primary" @click="emit('close')">
        Mengerti, mulai kelola
      </button>
    </div>
  </Modal>
</template>
