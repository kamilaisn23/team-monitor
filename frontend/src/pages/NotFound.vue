<script setup lang="ts">
import Icon from "../components/Icon.vue";
</script>
<template>
  <main class="status-page">
    <section class="surface status-card">
      <span class="status-symbol"><Icon name="search" :size="32" /></span>
      <div class="eyebrow">404 · PAGE NOT FOUND</div>
      <h1>Halaman belum ditemukan</h1>
      <p>Alamat ini tidak tersedia. Kembali ke workspace untuk melanjutkan.</p>
      <RouterLink to="/preview" class="button primary"
        ><Icon name="left" :size="17" />Kembali ke pratinjau</RouterLink
      >
    </section>
  </main>
</template>
