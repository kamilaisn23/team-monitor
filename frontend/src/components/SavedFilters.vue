<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Icon from "./Icon.vue";
import Modal from "./Modal.vue";
import { workspace, notify } from "../state";
import { validSavedFilters, type DashboardFilters, type SavedDashboardFilter } from "../dashboard-filters";
const props = defineProps<{ filters: DashboardFilters }>();
const emit = defineEmits<{ apply: [filters: DashboardFilters] }>();
const saved = ref<SavedDashboardFilter[]>([]), showSave = ref(false), label = ref(""), error = ref("");
const storageKey = computed(() => `team-monitor:dashboard-filters:v1:${workspace.preview ? 'preview' : 'live:' + (workspace.session?.user.githubLogin || workspace.session?.user.id || workspace.session?.user.email || workspace.session?.user.name || 'anonymous')}`);
watch(storageKey, (key) => {
  error.value = ""; saved.value = [];
  try {
    const data: unknown = JSON.parse(window.localStorage.getItem(key) || "[]");
    if (validSavedFilters(data)) saved.value = data;
    else error.value = "Filter tersimpan tidak dapat dibaca. Simpan ulang filter Anda.";
  } catch { error.value = "Penyimpanan browser tidak tersedia. Filter tetap bisa digunakan sementara."; }
}, { immediate: true });
const matches = (filter: DashboardFilters) => Object.keys(props.filters).every((key) => props.filters[key as keyof DashboardFilters] === filter[key as keyof DashboardFilters]);
function persist(next: SavedDashboardFilter[]) {
  try { window.localStorage.setItem(storageKey.value, JSON.stringify(next)); saved.value = next; error.value = ""; return true; }
  catch { error.value = "Filter gagal disimpan. Izinkan penyimpanan browser lalu coba kembali."; return false; }
}
function save() {
  const text = label.value.trim();
  if (!text) { error.value = "Beri nama untuk filter ini."; return; }
  const previous = saved.value.find((item) => item.label.toLowerCase() === text.toLowerCase());
  if (!previous && saved.value.length >= 12) { error.value = "Maksimal 12 filter. Hapus salah satu untuk menambahkan filter baru."; return; }
  const item = { id: previous?.id || crypto.randomUUID(), label: text, filters: { ...props.filters } };
  if (!validSavedFilters([item])) { error.value = "Filter belum dapat disimpan. Gunakan pencarian maksimal 200 karakter."; return; }
  const next = previous ? saved.value.map((entry) => entry.id === previous.id ? item : entry) : [...saved.value, item];
  if (persist(next)) { showSave.value = false; label.value = ""; notify("Filter dashboard berhasil disimpan."); }
}
function apply(item: SavedDashboardFilter) {
  if (item.filters.teamId && !workspace.teams.some((team) => team.id === item.filters.teamId) ||
      item.filters.repositoryId && !workspace.repositories.some((repo) => repo.id === item.filters.repositoryId && !repo.ignored)) {
    error.value = "Tim atau repositori pada filter ini sudah tidak tersedia. Hapus dan simpan ulang filter."; return;
  }
  error.value = ""; emit("apply", { ...item.filters });
}
</script>
<template>
  <section class="saved-filters" aria-label="Filter dashboard tersimpan">
    <div class="saved-filters-label"><Icon name="bookmark" :size="17" /><div><strong>Filter favorit</strong><small>Tersimpan di browser ini</small></div></div>
    <div class="saved-filter-chips">
      <span v-if="!saved.length" class="saved-filter-hint">Simpan cakupan yang sering Anda pantau.</span>
      <div v-for="item in saved" :key="item.id" class="saved-filter-chip" :class="{ active: matches(item.filters) }">
        <button :aria-pressed="matches(item.filters)" :aria-label="'Terapkan filter ' + item.label" @click="apply(item)">{{ item.label }}</button>
        <button :aria-label="'Hapus filter ' + item.label" @click="persist(saved.filter((entry) => entry.id !== item.id))"><Icon name="close" :size="13" /></button>
      </div>
    </div>
    <button class="button secondary" aria-label="Simpan filter dashboard" @click="showSave = true"><Icon name="plus" :size="15" />Simpan filter</button>
    <p v-if="error && !showSave" class="saved-filter-error" role="alert">{{ error }}</p>
    <Modal v-if="showSave" title="Simpan filter favorit" description="Simpan tim, pencarian, platform, repositori, status, beban, urutan, dan tampilan dashboard saat ini." @close="showSave = false">
      <form class="follow-up-form" @submit.prevent="save">
        <label>Nama filter<input v-model="label" maxlength="60" placeholder="Misalnya: Backend · Beban tinggi" required autofocus /></label>
        <p class="muted">Nama yang sama akan memperbarui filter sebelumnya. Maksimal 12 filter per akun di browser ini.</p>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <div class="follow-up-actions"><button type="button" class="button secondary" @click="showSave = false">Batal</button><button class="button primary" type="submit">Simpan</button></div>
      </form>
    </Modal>
  </section>
</template>
