<script setup lang="ts">
import { computed, ref, watch } from "vue";
import PageHeading from "../components/PageHeading.vue";
import MetricCard from "../components/MetricCard.vue";
import Icon from "../components/Icon.vue";
import Modal from "../components/Modal.vue";
import Pager from "../components/Pager.vue";
import { workspace, isAdmin, notify } from "../state";
import { api } from "../api";
import { sectionHref } from "../router";
import { useRouter } from "vue-router";
import type { Repository } from "../types";
const router = useRouter();
const search = ref(""),
  platform = ref("all"),
  ignored = ref("all"),
  page = ref(1),
  editing = ref<Repository>(),
  selectedTeams = ref<string[]>([]),
  selectedIgnored = ref(false),
  saving = ref(false),
  error = ref("");
const filtered = computed(() =>
  workspace.repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(search.value.toLowerCase()) &&
      (platform.value === "all" ||
        repo.platform.toLowerCase() === platform.value) &&
      (ignored.value === "all" ||
        repo.ignored === (ignored.value === "true")) &&
      (!workspace.teamId ||
        repo.teams.some((team) => team.id === workspace.teamId)),
  ),
);
const visible = computed(() =>
  filtered.value.slice((page.value - 1) * 10, page.value * 10),
);
watch([search, platform, ignored, () => workspace.teamId], () => {
  page.value = 1;
});
function filter(value: string) {
  platform.value = value;
  page.value = 1;
  document.getElementById("repo-search")?.focus();
}
function edit(repo: Repository) {
  editing.value = repo;
  selectedTeams.value = repo.teams.map((team) => team.id);
  selectedIgnored.value = repo.ignored;
  error.value = "";
}
async function save() {
  if (!editing.value) return;
  saving.value = true;
  try {
    await api("/api/repositories/" + editing.value.id, {
      method: "PATCH",
      body: JSON.stringify({
        teamIds: selectedTeams.value,
        ignored: selectedIgnored.value,
      }),
    });
    workspace.repositories = await api<Repository[]>("/api/repositories");
    editing.value = undefined;
    workspace.refreshKey++;
    notify("Pengaturan repositori berhasil disimpan.");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    saving.value = false;
  }
}
function openTeam(id: string) {
  workspace.teamId = id;
  router.push(sectionHref("dashboard"));
}
</script>
<template>
  <div class="page-content">
    <PageHeading
      title="Repositori"
      description="Sumber isu GitHub dan GitLab."
      ><span class="scope-tag"
        ><Icon name="branch" :size="17" />Repositori tim</span
      ></PageHeading
    >
    <div class="metric-grid three">
      <MetricCard
        label="Seluruh repositori"
        :value="workspace.repositories.length"
        detail="Semua sumber pekerjaan"
        icon="branch"
        :active="platform === 'all'"
        @click="filter('all')"
      /><MetricCard
        label="GitHub"
        :value="
          workspace.repositories.filter(
            (repo) => repo.platform.toLowerCase() === 'github',
          ).length
        "
        detail="Repositori pada GitHub"
        icon="github"
        :active="platform === 'github'"
        @click="filter('github')"
      /><MetricCard
        label="GitLab"
        :value="
          workspace.repositories.filter(
            (repo) => repo.platform.toLowerCase() === 'gitlab',
          ).length
        "
        detail="Repositori pada GitLab"
        icon="file"
        tone="violet"
        :active="platform === 'gitlab'"
        @click="filter('gitlab')"
      />
    </div>
    <section class="surface">
      <div class="directory-heading">
        <div>
          <h2>
            Repositori<span class="count-chip">{{ filtered.length }}</span>
          </h2>
        </div>
      </div>
      <div class="toolbar">
        <label class="search-control"
          ><Icon name="search" :size="19" /><input
            id="repo-search"
            v-model="search"
            type="search"
            aria-label="Cari repositori"
            placeholder="Cari repositori…"
            @input="page = 1" /></label
        ><select
          v-model="platform"
          aria-label="Platform repositori"
          @change="page = 1"
        >
          <option value="all">Semua platform</option>
          <option value="github">GitHub</option>
          <option value="gitlab">GitLab</option></select
        ><select
          v-model="ignored"
          aria-label="Status pemantauan"
          @change="page = 1"
        >
          <option value="all">Semua status</option>
          <option value="false">Dipantau</option>
          <option value="true">Diabaikan</option>
        </select>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Repositori</th>
              <th>Platform</th>
              <th>Tim terhubung</th>
              <th>Pemantauan</th>
              <th v-if="!workspace.preview">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="repo in visible" :key="repo.id">
              <td>
                <a
                  v-if="repo.url"
                  class="repository-link"
                  :href="repo.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  ><span class="team-symbol"
                    ><Icon name="branch" :size="19" /></span
                  ><strong>{{ repo.name }}</strong
                  ><Icon name="external" :size="14"
                /></a>
                <div v-else class="repository-link">
                  <span class="team-symbol"
                    ><Icon name="branch" :size="19" /></span
                  ><strong>{{ repo.name }}</strong>
                </div>
              </td>
              <td>
                <span class="badge neutral">{{
                  repo.platform.toLowerCase() === "github" ? "GitHub" : "GitLab"
                }}</span>
              </td>
              <td>
                <div class="team-pills">
                  <button
                    v-for="team in repo.teams"
                    :key="team.id"
                    @click="openTeam(team.id)"
                  >
                    {{ team.name }}</button
                  ><span v-if="!repo.teams.length" class="muted"
                    >Belum ada tim</span
                  >
                </div>
              </td>
              <td>
                <span class="badge" :class="repo.ignored ? 'neutral' : 'blue'"
                  ><Icon
                    :name="repo.ignored ? 'close' : 'check'"
                    :size="13"
                  />{{ repo.ignored ? "Diabaikan" : "Dipantau" }}</span
                >
              </td>
              <td v-if="!workspace.preview">
                <button
                  v-if="isAdmin"
                  class="button secondary compact"
                  :aria-label="'Atur repositori ' + repo.name"
                  @click="edit(repo)"
                >
                  <Icon name="settings" :size="16" />Atur
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!visible.length" class="empty-state">
        <Icon name="branch" :size="32" />
        <h3>Tidak ada repositori</h3>
        <p>Coba filter lain.</p>
      </div>
      <Pager :page="page" :total="filtered.length" @change="page = $event" />
    </section>
    <Modal
      v-if="editing"
      title="Atur repositori"
      :description="editing.name"
      @close="editing = undefined"
      ><form class="edit-form" @submit.prevent="save">
        <div v-if="error" class="error-banner" role="alert">{{ error }}</div>
        <label class="checkbox-field"
          ><input v-model="selectedIgnored" type="checkbox" />Abaikan repositori
          dari perhitungan beban kerja</label
        >
        <fieldset>
          <legend>Tim yang terhubung</legend>
          <div class="checkbox-list">
            <label v-for="team in workspace.teams" :key="team.id"
              ><input
                v-model="selectedTeams"
                type="checkbox"
                :value="team.id"
              />{{ team.name }}</label
            >
          </div>
        </fieldset>
        <div class="modal-actions">
          <button
            type="button"
            class="button secondary"
            @click="editing = undefined"
          >
            Batal</button
          ><button class="button primary" :disabled="saving">
            {{ saving ? "Menyimpan…" : "Simpan pengaturan" }}
          </button>
        </div>
      </form></Modal
    >
  </div>
</template>
