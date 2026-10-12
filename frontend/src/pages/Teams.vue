<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import PageHeading from "../components/PageHeading.vue";
import MetricCard from "../components/MetricCard.vue";
import Avatar from "../components/Avatar.vue";
import Icon from "../components/Icon.vue";
import Modal from "../components/Modal.vue";
import { workspace, canManage, sampleMembers, notify } from "../state";
import { api } from "../api";
import { sectionHref } from "../router";
import type { Team, Member } from "../types";
const router = useRouter();
const search = ref(""),
  members = ref<Member[]>([]),
  error = ref(""),
  loading = ref(false),
  saving = ref(false);
const editTeam = ref<Team | null | undefined>(),
  teamName = ref(""),
  selectedMembers = ref<string[]>([]),
  originalMembers = ref<string[]>([]),
  removing = ref<Team>();
async function load() {
  loading.value = true;
  try {
    members.value = workspace.preview
      ? sampleMembers()
      : await api<Member[]>("/api/members");
    if (!workspace.preview) workspace.teams = await api<Team[]>("/api/teams");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
watch(() => workspace.refreshKey, load, { immediate: true });
const filtered = computed(() =>
  workspace.teams.filter((team) =>
    team.name.toLowerCase().includes(search.value.toLowerCase()),
  ),
);
function teamMembers(id: string) {
  return members.value.filter((member) =>
    member.teams.some((team) => team.id === id),
  );
}
function openTeam(team: Team) {
  workspace.teamId = team.id;
  router.push(sectionHref("dashboard"));
}
function edit(team?: Team) {
  editTeam.value = team || null;
  teamName.value = team?.name || "";
  selectedMembers.value = team
    ? teamMembers(team.id).map((member) => member.id)
    : [];
  originalMembers.value = [...selectedMembers.value];
  error.value = "";
}
async function save() {
  if (!teamName.value.trim() || saving.value) return;
  saving.value = true;
  try {
    const editing = editTeam.value;
    const saved = await api<Team>(
      editing ? "/api/teams/" + editing.id : "/api/teams",
      {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({ name: teamName.value.trim() }),
      },
    );
    for (const id of selectedMembers.value.filter(
      (id) => !originalMembers.value.includes(id),
    ))
      await api("/api/teams/" + saved.id + "/members", {
        method: "POST",
        body: JSON.stringify({ memberId: id }),
      });
    for (const id of originalMembers.value.filter(
      (id) => !selectedMembers.value.includes(id),
    ))
      await api("/api/teams/" + saved.id + "/members/" + id, {
        method: "DELETE",
      });
    editTeam.value = undefined;
    notify("Tim dan keanggotaan berhasil disimpan.");
    await load();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    saving.value = false;
  }
}
async function remove() {
  if (!removing.value) return;
  saving.value = true;
  try {
    await api("/api/teams/" + removing.value.id, { method: "DELETE" });
    if (workspace.teamId === removing.value.id) workspace.teamId = "";
    removing.value = undefined;
    notify("Tim berhasil dihapus.");
    await load();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    saving.value = false;
  }
}
function focusTeams() {
  document.getElementById("team-search")?.focus();
}
</script>
<template>
  <div class="page-content">
    <PageHeading
      eyebrow="BETTER TOGETHER"
      title="Tim yang saling terhubung"
      description="Satukan anggota, repositori, dan fokus kerja setiap tim."
      ><button v-if="canManage" class="button primary" @click="edit()">
        <Icon name="plus" :size="18" />Buat tim</button
      ><span v-else class="scope-tag"
        ><Icon name="teams" :size="16" />{{ workspace.teams.length }} tim</span
      ></PageHeading
    >
    <div class="metric-grid three">
      <MetricCard
        label="Tim terdaftar"
        :value="workspace.teams.length"
        detail="Jelajahi setiap tim"
        icon="teams"
        @click="focusTeams"
      /><MetricCard
        label="Seluruh anggota"
        :value="members.length"
        detail="Orang di balik pekerjaan"
        icon="users"
        @click="router.push(sectionHref('members'))"
      /><MetricCard
        label="Repositori terhubung"
        :value="workspace.repositories.length"
        detail="Sumber pekerjaan tim"
        icon="branch"
        @click="router.push(sectionHref('repositories'))"
      />
    </div>
    <div v-if="error" class="error-banner" role="alert">
      <Icon name="alert" />{{ error }}
    </div>
    <div
      v-if="!workspace.preview && workspace.config.kerjabaikEnabled"
      class="info-banner"
    >
      <Icon name="shield" :size="18" />Tim dan anggota dikelola melalui
      Kerjabaik.
    </div>
    <div class="section-toolbar">
      <div>
        <h2>Semua tim</h2>
        <p>Anggota lintas tim dapat muncul dalam beberapa tim.</p>
      </div>
      <label class="search-control"
        ><Icon name="search" :size="19" /><input
          id="team-search"
          v-model="search"
          type="search"
          placeholder="Cari tim…"
          aria-label="Cari tim"
      /></label>
    </div>
    <div v-if="loading" class="loading-state">
      <Icon name="refresh" class="spinning" />Memuat tim…
    </div>
    <div v-else class="team-grid">
      <article
        v-for="(team, index) in filtered"
        :key="team.id"
        class="surface team-card"
      >
        <button
          class="team-card-main"
          :aria-label="'Buka dasbor ' + team.name"
          @click="openTeam(team)"
        >
          <div class="team-card-top">
            <span class="team-symbol large" :class="'team-tone-' + (index % 3)"
              ><Icon name="teams" :size="26" /></span
            ><span
              class="badge"
              :class="team.isArchived ? 'neutral' : 'blue'"
              >{{ team.isArchived ? "Arsip" : "Aktif" }}</span
            >
          </div>
          <h2>{{ team.name }}</h2>
          <p>
            {{ team.memberCount ?? teamMembers(team.id).length }} anggota dalam
            tim
          </p>
          <div class="avatar-stack">
            <Avatar
              v-for="member in teamMembers(team.id).slice(0, 4)"
              :key="member.id"
              :name="member.name"
              :image="member.avatarUrl"
              size="small"
            /><span v-if="teamMembers(team.id).length > 4" class="avatar small"
              >+{{ teamMembers(team.id).length - 4 }}</span
            ><span v-if="!teamMembers(team.id).length" class="muted"
              >Belum ada anggota</span
            >
          </div>
          <div class="team-card-action">
            Lihat kapasitas tim<Icon name="arrow" :size="20" />
          </div>
        </button>
        <div v-if="canManage" class="card-management">
          <button class="text-button" @click="edit(team)">
            <Icon name="edit" :size="15" />Edit & anggota</button
          ><button class="text-button danger-text" @click="removing = team">
            <Icon name="trash" :size="15" />Hapus
          </button>
        </div>
      </article>
      <div v-if="!filtered.length" class="surface empty-state">
        <Icon name="teams" :size="32" />
        <h3>Belum ada tim yang cocok</h3>
        <p>Gunakan kata kunci lain untuk mencari tim.</p>
      </div>
    </div>
    <Modal
      v-if="editTeam !== undefined"
      :title="editTeam ? 'Edit tim' : 'Buat tim baru'"
      description="Atur nama dan pilih anggota tim."
      @close="editTeam = undefined"
      ><form class="edit-form" @submit.prevent="save">
        <div v-if="error" class="error-banner" role="alert">{{ error }}</div>
        <label
          >Nama tim<input
            v-model="teamName"
            required
            maxlength="150"
            placeholder="Contoh: Product Engineering"
        /></label>
        <fieldset>
          <legend>Keanggotaan tim</legend>
          <div class="checkbox-list">
            <label v-for="member in members" :key="member.id"
              ><input
                v-model="selectedMembers"
                type="checkbox"
                :value="member.id"
              /><Avatar
                :name="member.name"
                :image="member.avatarUrl"
                size="small"
              /><span>{{ member.name }}</span></label
            >
          </div>
        </fieldset>
        <div class="modal-actions">
          <button
            type="button"
            class="button secondary"
            @click="editTeam = undefined"
          >
            Batal</button
          ><button
            class="button primary"
            :disabled="saving || !teamName.trim()"
          >
            {{ saving ? "Menyimpan…" : "Simpan tim" }}
          </button>
        </div>
      </form></Modal
    ><Modal
      v-if="removing"
      title="Hapus tim?"
      :description="
        removing.name + ' akan dihapus. Anggota tetap berada dalam direktori.'
      "
      @close="removing = undefined"
      ><div v-if="error" class="error-banner">{{ error }}</div>
      <div class="modal-actions">
        <button class="button secondary" @click="removing = undefined">
          Batal</button
        ><button class="button danger" :disabled="saving" @click="remove">
          {{ saving ? "Menghapus…" : "Hapus tim" }}
        </button>
      </div></Modal
    >
  </div>
</template>
