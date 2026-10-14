<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import PageHeading from "../components/PageHeading.vue";
import MetricCard from "../components/MetricCard.vue";
import Avatar from "../components/Avatar.vue";
import Icon from "../components/Icon.vue";
import Pager from "../components/Pager.vue";
import MemberDialog from "../components/MemberDialog.vue";
import { workspace, isDeveloper } from "../state";
import { api, query, exportCsv } from "../api";
import {
  roleLabels,
  type ReportRow,
  type ReportTotals,
  type TeamGroup,
} from "../types";
import { previewMembers } from "../../../src/lib/preview-data";
const router = useRouter();
const name = ref(""),
  platform = ref("all"),
  repositoryId = ref(""),
  mode = ref("monthly");
const month = ref(
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7),
);
const start = ref(""),
  end = ref(""),
  view = ref("member"),
  page = ref(1),
  sortColumn = ref("issuesResolved"),
  sortDir = ref("desc");
const rows = ref<ReportRow[]>([]),
  groups = ref<TeamGroup[]>([]),
  total = ref(0),
  totals = ref<ReportTotals>({
    issuesCreated: 0,
    issuesAssigned: 0,
    issuesResolved: 0,
    issuesStillOpen: 0,
  });
const loading = ref(false),
  error = ref(""),
  memberId = ref("");
const params = computed(() =>
  query({
    ...(mode.value === "monthly"
      ? { month: month.value }
      : { start: start.value, end: end.value }),
    name: name.value,
    platform: platform.value,
    repositoryId: repositoryId.value,
    page: page.value,
    limit: 10,
    sort: sortColumn.value,
    sortDir: sortDir.value,
    ...(view.value === "team" ? { groupBy: "team" } : {}),
  }),
);
const samples = computed(() =>
  previewMembers
    .filter(
      (member) =>
        member.name.toLowerCase().includes(name.value.toLowerCase()) &&
        (!workspace.teamId ||
          member.teams.some((team) => team.id === workspace.teamId)),
    )
    .sort((a, b) =>
      sortColumn.value === "name"
        ? a.name.localeCompare(b.name) * (sortDir.value === "asc" ? 1 : -1)
        : (a.currentLoad - b.currentLoad) * (sortDir.value === "asc" ? 1 : -1),
    ),
);
let requestId = 0;
async function load() {
  if (workspace.preview) return;
  if (
    mode.value === "custom" &&
    (!start.value || !end.value || start.value > end.value)
  ) {
    error.value =
      "Pilih rentang tanggal yang valid. Tanggal awal harus sebelum tanggal akhir.";
    return;
  }
  const id = ++requestId;
  loading.value = true;
  error.value = "";
  try {
    const data = await api<{
      data?: ReportRow[];
      total?: number;
      totals?: ReportTotals;
      groups?: TeamGroup[];
    }>("/api/reports/monthly?" + params.value);
    if (id !== requestId) return;
    rows.value = data.data || [];
    total.value = data.total || 0;
    groups.value = data.groups || [];
    if (data.totals) totals.value = data.totals;
  } catch (e) {
    if (id === requestId) error.value = (e as Error).message;
  } finally {
    if (id === requestId) loading.value = false;
  }
}
watch(
  [
    name,
    platform,
    repositoryId,
    mode,
    month,
    start,
    end,
    view,
    () => workspace.teamId,
  ],
  () => {
    page.value = 1;
  },
);
watch([params, () => workspace.refreshKey], load, { immediate: true });
function sort(column: string) {
  sortDir.value =
    sortColumn.value === column && sortDir.value === "desc" ? "asc" : "desc";
  sortColumn.value = column;
  page.value = 1;
}
function open(id: string) {
  if (workspace.preview) memberId.value = id;
  else router.push("/members/" + id);
}
function focusTable(column: string) {
  sort(column);
  document.getElementById("report-search")?.focus();
  document
    .getElementById("report-table")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function download() {
  if (workspace.preview)
    exportCsv("team-monitor-snapshot-contoh.csv", [
      ["Nama", "Peran", "Tim", "Isu terbuka"],
      ...samples.value.map((member) => [
        member.name,
        member.role,
        member.teams.map((team) => team.name).join(" / "),
        member.currentLoad,
      ]),
    ]);
  else if (!error.value) {
    const exportParams = new URLSearchParams(params.value);
    exportParams.delete("page");
    exportParams.delete("limit");
    exportParams.delete("groupBy");
    window.location.assign("/api/reports/export?" + exportParams);
  }
}
</script>
<template>
  <div class="page-content">
    <PageHeading
      eyebrow="TURN WORK INTO INSIGHT"
      :title="
        workspace.preview
          ? 'Beban kerja, lebih jelas'
          : 'Progres yang bisa dipahami'
      "
      :description="
        workspace.preview
          ? 'Snapshot beban saat ini untuk menjelajahi desain laporan.'
          : isDeveloper ? 'Tinjau aktivitas pribadi per periode dan ekspor laporan Anda.' : 'Tinjau aktivitas anggota per periode, bandingkan tim, dan ekspor laporan.'
      "
      ><button
        class="button primary"
        :disabled="loading || !!error"
        @click="download"
      >
        <Icon name="download" :size="17" />Ekspor CSV
      </button></PageHeading
    >
    <div v-if="workspace.preview" class="info-banner">
      <Icon name="eye" :size="18" />Pratinjau menampilkan snapshot data contoh.
      Riwayat bulanan tersedia setelah data asli terhubung.
    </div>
    <div v-if="error" class="error-banner" role="alert">
      <Icon name="alert" />{{ error }}<button @click="load">Coba lagi</button>
    </div>
    <div v-if="workspace.preview" class="metric-grid three">
      <MetricCard
        label="Anggota dalam laporan"
        :value="samples.length"
        detail="Dalam cakupan snapshot"
        icon="users"
        @click="focusTable('name')"
      /><MetricCard
        label="Penugasan terbuka"
        :value="samples.reduce((sum, member) => sum + member.currentLoad, 0)"
        detail="Total beban anggota contoh"
        icon="branch"
        @click="focusTable('issuesStillOpen')"
      /><MetricCard
        label="Tim terhubung"
        :value="
          new Set(
            samples.flatMap((member) => member.teams.map((team) => team.id)),
          ).size
        "
        detail="Kolaborasi lintas tim"
        icon="teams"
        @click="view = 'team'"
      />
    </div>
    <div v-else-if="view === 'member'" class="metric-grid">
      <MetricCard
        label="Isu dibuat"
        :value="totals.issuesCreated"
        detail="Dalam periode yang dipilih"
        icon="plus"
        @click="focusTable('issuesCreated')"
      /><MetricCard
        label="Isu ditugaskan"
        :value="totals.issuesAssigned"
        detail="Isu dibuat dalam periode"
        icon="target"
        @click="focusTable('issuesAssigned')"
      /><MetricCard
        label="Isu diselesaikan"
        :value="totals.issuesResolved"
        detail="Ditutup dalam periode"
        icon="done"
        @click="focusTable('issuesResolved')"
      /><MetricCard
        label="Masih terbuka"
        :value="totals.issuesStillOpen"
        detail="Beban saat ini, seluruh periode"
        icon="clock"
        @click="focusTable('issuesStillOpen')"
      />
    </div>
    <section id="report-table" class="surface">
      <div class="directory-heading">
        <div>
          <h2>
            {{ workspace.preview ? "Snapshot anggota" : "Laporan aktivitas" }}
          </h2>
          <p>
            {{
              view === "team"
                ? "Anggota lintas tim dapat dihitung pada beberapa kelompok."
                : "Klik nama anggota untuk meninjau detail pekerjaan."
            }}
          </p>
        </div>
        <div class="level-tabs">
          <button
            :class="{ active: view === 'member' }"
            @click="view = 'member'"
          >
            Per anggota</button
          ><button :class="{ active: view === 'team' }" @click="view = 'team'">
            Per tim
          </button>
        </div>
      </div>
      <div class="toolbar">
        <label class="search-control"
          ><Icon name="search" :size="19" /><input
            id="report-search"
            v-model="name"
            type="search"
            placeholder="Cari nama anggota…"
            aria-label="Cari nama dalam laporan" /></label
        ><template v-if="!workspace.preview"
          ><select v-model="platform" aria-label="Platform laporan">
            <option value="all">Semua platform</option>
            <option value="github">GitHub</option>
            <option value="gitlab">GitLab</option></select
          ><select v-model="mode" aria-label="Jenis periode">
            <option value="monthly">Bulanan</option>
            <option value="custom">Rentang tanggal</option>
          </select></template
        >
      </div>
      <div v-if="!workspace.preview" class="filter-row">
        <label v-if="mode === 'monthly'"
          >Bulan laporan<input v-model="month" type="month" /></label
        ><template v-else
          ><label>Dari tanggal<input v-model="start" type="date" /></label
          ><label
            >Sampai tanggal<input v-model="end" type="date" /></label></template
        ><label
          >Repositori<select v-model="repositoryId">
            <option value="">Semua repositori</option>
            <option
              v-for="repo in workspace.repositories.filter(
                (repo) => !repo.ignored,
              )"
              :key="repo.id"
              :value="repo.id"
            >
              {{ repo.name }}
            </option>
          </select></label
        ><span class="filter-note">Periode menggunakan WIB</span>
      </div>
      <div v-if="loading" class="loading-state">
        <Icon name="refresh" class="spinning" />Menghitung laporan…
      </div>
      <template v-else-if="workspace.preview"
        ><div v-if="view === 'member'" class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>
                  <button @click="sort('name')">
                    Anggota<Icon name="down" :size="13" />
                  </button>
                </th>
                <th>Peran</th>
                <th>Tim</th>
                <th>
                  <button @click="sort('issuesStillOpen')">
                    Isu terbuka<Icon name="down" :size="13" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="member in samples.slice((page - 1) * 10, page * 10)"
                :key="member.memberId"
              >
                <td>
                  <button class="person-link" @click="open(member.memberId)">
                    <Avatar :name="member.name" /><strong>{{
                      member.name
                    }}</strong>
                  </button>
                </td>
                <td>
                  <span class="badge neutral">{{
                    roleLabels[member.role]
                  }}</span>
                </td>
                <td>{{ member.teams.map((team) => team.name).join(" · ") }}</td>
                <td>
                  <strong class="number-cell">{{ member.currentLoad }}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="report-groups">
          <details v-for="team in workspace.teams" :key="team.id" open>
            <summary>
              <span
                ><Icon name="teams" :size="20" /><strong>{{
                  team.name
                }}</strong></span
              ><span class="badge blue"
                >{{
                  samples.filter((member) =>
                    member.teams.some((item) => item.id === team.id),
                  ).length
                }}
                anggota</span
              >
            </summary>
            <button
              v-for="member in samples.filter((member) =>
                member.teams.some((item) => item.id === team.id),
              )"
              :key="member.memberId"
              class="detail-row"
              @click="open(member.memberId)"
            >
              <Avatar :name="member.name" size="small" />
              <div>
                <strong>{{ member.name }}</strong
                ><small>{{ roleLabels[member.role] }}</small>
              </div>
              <b>{{ member.currentLoad }} isu terbuka</b
              ><Icon name="arrow" :size="17" />
            </button>
          </details>
        </div>
        <Pager
          v-if="view === 'member'"
          :page="page"
          :total="samples.length"
          @change="page = $event" /></template
      ><template v-else-if="view === 'member'"
        ><div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>
                  <button @click="sort('name')">
                    Anggota<Icon name="down" :size="13" />
                  </button>
                </th>
                <th>Tim</th>
                <th
                  v-for="column in [
                    { id: 'issuesCreated', label: 'Dibuat' },
                    { id: 'issuesAssigned', label: 'Ditugaskan' },
                    { id: 'issuesResolved', label: 'Selesai' },
                    { id: 'issuesStillOpen', label: 'Terbuka saat ini' },
                  ]"
                  :key="column.id"
                >
                  <button @click="sort(column.id)">
                    {{ column.label }}<Icon name="down" :size="13" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.memberId">
                <td>
                  <button class="person-link" @click="open(row.memberId)">
                    <Avatar :name="row.name" /><span
                      ><strong>{{ row.name }}</strong
                      ><small>{{ roleLabels[row.role] }}</small></span
                    >
                  </button>
                </td>
                <td>{{ row.teamNames?.join(" · ") || "—" }}</td>
                <td>{{ row.issuesCreated }}</td>
                <td>{{ row.issuesAssigned }}</td>
                <td>
                  <strong class="resolved-number">{{
                    row.issuesResolved
                  }}</strong>
                </td>
                <td>{{ row.issuesStillOpen }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!rows.length" class="empty-state">
          <Icon name="file" :size="32" />
          <h3>Belum ada aktivitas pada periode ini</h3>
          <p>Ubah periode atau filter laporan.</p>
        </div>
        <Pager :page="page" :total="total" @change="page = $event"
      /></template>
      <div v-else class="report-groups">
        <details v-for="group in groups" :key="group.teamId" open>
          <summary>
            <span
              ><Icon name="teams" :size="20" /><strong>{{
                group.teamName
              }}</strong></span
            ><span class="badge blue"
              >{{ group.members.length }} anggota ·
              {{ group.totals.issuesResolved }} selesai</span
            >
          </summary>
          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Anggota</th>
                  <th>Dibuat</th>
                  <th>Ditugaskan</th>
                  <th>Selesai</th>
                  <th>Terbuka saat ini</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in group.members" :key="row.memberId">
                  <td>
                    <button class="person-link" @click="open(row.memberId)">
                      <Avatar :name="row.name" size="small" /><strong>{{
                        row.name
                      }}</strong>
                    </button>
                  </td>
                  <td>{{ row.issuesCreated }}</td>
                  <td>{{ row.issuesAssigned }}</td>
                  <td>{{ row.issuesResolved }}</td>
                  <td>{{ row.issuesStillOpen }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
        <div v-if="!groups.length" class="compact-empty">
          Belum ada laporan tim untuk periode ini.
        </div>
      </div>
    </section>
    <MemberDialog
      v-if="memberId"
      :member-id="memberId"
      @close="memberId = ''"
    />
  </div>
</template>
