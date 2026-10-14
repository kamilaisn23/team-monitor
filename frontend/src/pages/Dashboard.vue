<script setup lang="ts">
import { computed, ref, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import PageHeading from "../components/PageHeading.vue";
import MetricCard from "../components/MetricCard.vue";
import Icon from "../components/Icon.vue";
import Avatar from "../components/Avatar.vue";
import Pager from "../components/Pager.vue";
import Modal from "../components/Modal.vue";
import MemberDialog from "../components/MemberDialog.vue";
import ManagerBrief from "../components/ManagerBrief.vue";
import WeeklyTrends from "../components/WeeklyTrends.vue";
import SavedFilters from "../components/SavedFilters.vue";
import AttentionCenter from "../components/AttentionCenter.vue";
import type { DashboardFilters } from "../dashboard-filters";
import { api, query } from "../api";
import { workspace } from "../state";
import { sectionHref } from "../router";
import {
  levelLabels,
  roleLabels,
  type DashboardResponse,
  type DashboardMember,
  type WorkloadLevel,
  type DashboardIssue,
  type DashboardIssueResponse,
} from "../types";
import {
  getPreviewDashboard,
  getPreviewDashboardIssues,
} from "../../../src/lib/preview-data";

const router = useRouter();
const response = ref<DashboardResponse>();
const loading = ref(false),
  error = ref("");
const name = ref(""),
  active = ref("true"),
  workload = ref("all"),
  platform = ref("all"),
  repositoryId = ref("");
const view = ref(window.innerWidth < 850 ? "grid" : "list");
const page = ref(1),
  sortCol = ref("currentLoad"),
  sortDir = ref("desc");
const filtersOpen = ref(false),
  memberId = ref(""),
  details = ref("");
const directory = ref<HTMLElement>();
const searchInput = ref<HTMLInputElement>();
const issueResponse = ref<DashboardIssueResponse>();
const issuePage = ref(1), issueLoading = ref(false), issueError = ref("");
const attentionOpen = ref(false);
const canReview = computed(() => workspace.preview || workspace.session?.user.isSuperadmin || ['ADMIN', 'MANAGER'].includes(workspace.session?.user.role || ''));
const currentFilters = computed<DashboardFilters>(() => ({
  teamId: workspace.teamId, name: name.value, active: active.value, workload: workload.value,
  platform: platform.value, repositoryId: repositoryId.value, sortCol: sortCol.value, sortDir: sortDir.value, view: view.value,
}));
function applyFilters(filters: DashboardFilters) {
  workspace.teamId = filters.teamId; name.value = filters.name; active.value = filters.active;
  workload.value = filters.workload; platform.value = filters.platform; repositoryId.value = filters.repositoryId;
  sortCol.value = filters.sortCol; sortDir.value = filters.sortDir; view.value = filters.view; page.value = 1;
}
let issueRequestId = 0;
const levels: WorkloadLevel[] = ["low", "medium", "high"];
const params = computed(() =>
  query({
    teamId: workspace.teamId,
    repositoryId: repositoryId.value,
    platform: platform.value,
    active: active.value,
    name: name.value,
    workload: workload.value,
    page: page.value,
    limit: 10,
    sortCol: sortCol.value,
    sortDir: sortDir.value,
  }),
);
const summary = computed(() => response.value?.summary);
const donutStyle = computed(() => {
  const total = summary.value?.memberCount || 1;
  const low = ((summary.value?.distribution.low || 0) / total) * 100;
  const medium =
    low + ((summary.value?.distribution.medium || 0) / total) * 100;
  return {
    background: summary.value?.memberCount
      ? `conic-gradient(#779bff 0 ${low}%, #ffc77a ${low}% ${medium}%, #fa91a2 ${medium}% 100%)`
      : "#354569",
  };
});
let requestId = 0;
async function load() {
  const id = ++requestId;
  loading.value = true;
  error.value = "";
  try {
    const data = workspace.preview
      ? getPreviewDashboard(params.value)
      : await api<DashboardResponse>("/api/dashboard?" + params.value);
    if (id === requestId) response.value = data;
  } catch (e) {
    if (id === requestId) error.value = (e as Error).message;
  } finally {
    if (id === requestId) loading.value = false;
  }
}
watch(
  [name, active, workload, platform, repositoryId, () => workspace.teamId],
  () => {
    page.value = 1;
  },
);
watch([params, () => workspace.refreshKey], load, { immediate: true });
async function focusDirectory(tier = "all") {
  workload.value = tier;
  await nextTick();
  directory.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  searchInput.value?.focus({ preventScroll: true });
}
function sort(column: string) {
  sortDir.value =
    sortCol.value === column && sortDir.value === "desc" ? "asc" : "desc";
  sortCol.value = column;
  page.value = 1;
}
function profile(member: DashboardMember) {
  if (workspace.preview) memberId.value = member.memberId;
  else router.push("/members/" + member.memberId);
}
function issueMetric(type: string) {
  issuePage.value = 1;
  details.value = type;
}
async function loadDetailIssues() {
  const id = ++issueRequestId;
  if (!['open', 'stale'].includes(details.value)) return;
  issueLoading.value = true;
  issueError.value = "";
  issueResponse.value = undefined;
  const issueParams = new URLSearchParams(params.value);
  issueParams.set('issueView', details.value);
  issueParams.set('issuePage', String(issuePage.value));
  issueParams.set('issueLimit', '20');
  try {
    const data = workspace.preview
      ? getPreviewDashboardIssues(issueParams)
      : await api<DashboardIssueResponse>('/api/dashboard?' + issueParams);
    if (id === issueRequestId) issueResponse.value = data;
  } catch (e) {
    if (id === issueRequestId) issueError.value = (e as Error).message;
  } finally {
    if (id === issueRequestId) issueLoading.value = false;
  }
}
watch(params, () => { issuePage.value = 1; });
watch([details, params, issuePage, () => workspace.refreshKey], loadDetailIssues);
function previewIssue(issue: DashboardIssue) {
  if (!workspace.preview) return;
  details.value = '';
  memberId.value = issue.assignees[0]?.memberId || '';
}
function clearFilters() {
  name.value = "";
  workload.value = "all";
  active.value = "true";
  platform.value = "all";
  repositoryId.value = "";
  workspace.teamId = "";
}
const scopeName = computed(
  () =>
    workspace.teams.find((team) => team.id === workspace.teamId)?.name ||
    "Seluruh tim",
);
</script>
<template>
  <div class="page-content">
    <PageHeading
      title="Tim hebat, kerja terarah"
      description="Lihat kapasitas tim, pahami beban kerja, dan tentukan prioritas berikutnya."
      ><span class="scope-tag"
        ><Icon name="teams" :size="16" />{{ scopeName }}</span
      ><button
        class="button primary"
        @click="router.push(sectionHref('reports'))"
      >
        <Icon name="chart" :size="17" />Lihat laporan<Icon
          name="arrow"
          :size="16"
        /></button
    ></PageHeading>
    <SavedFilters :filters="currentFilters" @apply="applyFilters" />
    <div v-if="error" class="error-banner" role="alert">
      <Icon name="alert" />{{ error }}<button @click="load">Coba lagi</button>
    </div>
    <div class="metric-grid dashboard-metrics" :aria-busy="loading">
      <MetricCard
        label="Anggota tim"
        :value="summary?.memberCount ?? '—'"
        detail="Dalam cakupan pemantauan"
        icon="users"
        @click="focusDirectory()"
      /><MetricCard
        label="Isu terbuka"
        :value="summary?.totalOpenIssues ?? '—'"
        detail="Pekerjaan yang masih berjalan"
        icon="branch"
        @click="issueMetric('open')"
      /><MetricCard
        label="Beban tinggi"
        :value="summary?.highWorkload ?? '—'"
        detail="Anggota yang butuh perhatian"
        icon="zap"
        tone="violet"
        :active="workload === 'high'"
        @click="focusDirectory('high')"
      /><MetricCard
        label="Isu mengendap"
        :value="summary?.staleIssues ?? '—'"
        :detail="
          'Usia lebih dari ' + (response?.thresholds.staleDays ?? 30) + ' hari'
        "
        icon="clock"
        tone="rose"
        @click="issueMetric('stale')"
      />
    </div>
    <ManagerBrief
      :response="error ? undefined : response"
      :loading="loading"
      :scope="scopeName"
      @review="issueMetric('stale')"
      @workload="focusDirectory('high')"
      @issue="previewIssue"
      :can-review="canReview"
      @attention="attentionOpen = true"
    />
    <WeeklyTrends :trends="error ? undefined : response?.trends" :loading="loading" />
    <div class="insight-grid">
      <section class="capacity-panel">
        <div class="panel-title">
          <div>
            <div class="eyebrow">A HEALTHIER WAY TO WORK</div>
            <h2>Ruang untuk bertumbuh</h2>
            <p>Distribusi kapasitas anggota dalam cakupan saat ini.</p>
          </div>
          <button
            class="dark-icon-button"
            aria-label="Lihat detail kapasitas tim"
            @click="details = 'capacity'"
          >
            <Icon name="arrow" />
          </button>
        </div>
        <div class="capacity-content">
          <button
            class="donut"
            :style="donutStyle"
            aria-label="Lihat distribusi beban kerja"
            @click="details = 'capacity'"
          >
            <span
              ><strong>{{ summary?.memberCount ?? "—" }}</strong
              ><small>ANGGOTA</small></span
            >
          </button>
          <div class="capacity-legend">
            <button
              v-for="level in levels"
              :key="level"
              @click="focusDirectory(level)"
            >
              <span class="level-dot" :class="level"></span>
              <div>
                <strong>{{ levelLabels[level] }}</strong
                ><small
                  >{{
                    level === "low"
                      ? "≤ " + (response?.thresholds.lowMax ?? 3)
                      : level === "medium"
                        ? (response?.thresholds.lowMax ?? 3) +
                          1 +
                          "–" +
                          (response?.thresholds.mediumMax ?? 7)
                        : "> " + (response?.thresholds.mediumMax ?? 7)
                  }}
                  isu terbuka</small
                >
              </div>
              <b>{{ summary?.distribution[level] ?? 0 }}</b
              ><Icon name="next" :size="15" />
            </button>
          </div>
        </div>
        <div class="capacity-bottom">
          <Icon name="shield" :size="16" /><span
            >Beban yang seimbang memberi ruang untuk kualitas.</span
          >
        </div>
      </section>
      <section class="surface team-insight">
        <div class="panel-title">
          <div>
            <div class="eyebrow">ACROSS YOUR TEAMS</div>
            <h2>Setiap tim, satu pandangan</h2>
            <p>Pantau alokasi pekerjaan antar tim.</p>
          </div>
          <button
            class="icon-button"
            aria-label="Buka direktori tim"
            @click="router.push(sectionHref('teams'))"
            v-if="
              workspace.preview ||
              workspace.session?.user.isSuperadmin ||
              workspace.session?.user.role === 'ADMIN'
            "
          >
            <Icon name="arrow" />
          </button>
        </div>
        <div class="team-insight-list">
          <button
            v-for="(team, index) in response?.teamOverview"
            :key="team.id"
            class="team-insight-row"
            @click="workspace.teamId = team.id"
          >
            <span class="team-symbol" :class="'team-tone-' + (index % 3)"
              ><Icon name="teams" :size="20"
            /></span>
            <div>
              <strong>{{ team.name }}</strong
              ><small
                >{{ team.memberCount }} anggota ·
                {{ team.assignments }} penugasan terbuka</small
              >
            </div>
            <span class="team-risk" :class="{ risk: team.highWorkload > 0 }">{{
              team.highWorkload
                ? team.highWorkload + " beban tinggi"
                : "Terpantau"
            }}</span
            ><Icon name="next" :size="16" />
          </button>
          <div
            v-if="!response?.teamOverview.length && !loading"
            class="compact-empty"
          >
            Belum ada tim dalam cakupan ini.
          </div>
        </div>
        <div class="panel-footnote">
          <Icon name="link" :size="14" />Anggota lintas tim dapat dihitung di
          lebih dari satu tim.
        </div>
      </section>
    </div>
    <section ref="directory" class="surface directory-panel">
      <div class="directory-heading">
        <div>
          <h2>
            Orang di balik progres<span class="count-chip">{{
              response?.total ?? 0
            }}</span>
          </h2>
          <p>
            Kenali beban kerja setiap anggota. Klik anggota untuk membuka
            profil.
          </p>
        </div>
        <div class="view-switch" aria-label="Pilihan tampilan">
          <button
            :class="{ active: view === 'list' }"
            aria-label="Tampilan tabel"
            :aria-pressed="view === 'list'"
            @click="view = 'list'"
          >
            <Icon name="list" :size="19" /></button
          ><button
            :class="{ active: view === 'grid' }"
            aria-label="Tampilan kartu"
            :aria-pressed="view === 'grid'"
            @click="view = 'grid'"
          >
            <Icon name="grid" :size="18" />
          </button>
        </div>
      </div>
      <div class="toolbar">
        <label class="search-control"
          ><Icon name="search" :size="19" /><input
            ref="searchInput"
            v-model="name"
            type="search"
            aria-label="Cari anggota"
            placeholder="Cari nama anggota…"
        /></label>
        <div class="level-tabs">
          <button
            v-for="level in ['all', ...levels]"
            :key="level"
            :class="{ active: workload === level }"
            @click="workload = level"
          >
            {{
              level === "all" ? "Semua" : levelLabels[level as WorkloadLevel]
            }}
          </button>
        </div>
        <button
          class="button secondary filter-toggle"
          :class="{ selected: filtersOpen }"
          :aria-expanded="filtersOpen"
          @click="filtersOpen = !filtersOpen"
        >
          <Icon name="filter" :size="17" />Filter
        </button>
      </div>
      <div v-if="filtersOpen" class="filter-row">
        <label
          >Status<select v-model="active">
            <option value="true">Anggota aktif</option>
            <option value="false">Nonaktif</option>
            <option value="">Semua status</option>
          </select></label
        ><label
          >Platform<select v-model="platform">
            <option value="all">Semua platform</option>
            <option value="github">GitHub</option>
            <option value="gitlab">GitLab</option>
          </select></label
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
        ><button class="text-button" @click="clearFilters">Reset filter</button>
      </div>
      <div v-if="loading && !response" class="loading-state">
        <Icon name="refresh" class="spinning" />Memuat kapasitas tim…
      </div>
      <template v-else-if="response?.data.length"
        ><div v-if="view === 'list'" class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>
                  <button @click="sort('name')">
                    Anggota<Icon name="down" :size="13" />
                  </button>
                </th>
                <th>
                  <button @click="sort('role')">
                    Peran<Icon name="down" :size="13" />
                  </button>
                </th>
                <th>Tim</th>
                <th>
                  <button @click="sort('currentLoad')">
                    Isu terbuka<Icon name="down" :size="13" />
                  </button>
                </th>
                <th>
                  <button @click="sort('workloadLevel')">
                    Kapasitas<Icon name="down" :size="13" />
                  </button>
                </th>
                <th><span class="sr-only">Profil</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="member in response.data" :key="member.memberId">
                <td>
                  <button class="person-link" @click="profile(member)">
                    <Avatar
                      :name="member.name"
                      :image="member.avatarUrl"
                    /><span
                      ><strong>{{ member.name }}</strong
                      ><small
                        ><span
                          class="status-dot"
                          :class="{ inactive: !member.isActive }"
                        ></span
                        >{{ member.isActive ? "Aktif" : "Nonaktif" }}</small
                      ></span
                    >
                  </button>
                </td>
                <td>
                  <span class="badge neutral">{{
                    roleLabels[member.role] || member.role
                  }}</span>
                </td>
                <td>
                  <div class="team-pills">
                    <button
                      v-for="team in member.teams"
                      :key="team.id"
                      @click="workspace.teamId = team.id"
                    >
                      {{ team.name }}</button
                    ><span v-if="!member.teams.length" class="muted"
                      >Belum ada tim</span
                    >
                  </div>
                </td>
                <td>
                  <div class="load-display">
                    <strong>{{ member.currentLoad }}</strong
                    ><span
                      ><i
                        :class="member.workloadLevel"
                        :style="{
                          width:
                            Math.min(
                              100,
                              (member.currentLoad /
                                ((response.thresholds.mediumMax || 7) + 1)) *
                                100,
                            ) + '%',
                        }"
                      ></i
                    ></span>
                  </div>
                </td>
                <td>
                  <span class="badge" :class="member.workloadLevel"
                    ><span
                      class="level-dot"
                      :class="member.workloadLevel"
                    ></span
                    >{{ levelLabels[member.workloadLevel] }}</span
                  >
                </td>
                <td>
                  <button
                    class="icon-button row-arrow"
                    :aria-label="'Lihat profil ' + member.name"
                    @click="profile(member)"
                  >
                    <Icon name="arrow" :size="18" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="member-grid">
          <button
            v-for="member in response.data"
            :key="member.memberId"
            class="member-card"
            @click="profile(member)"
          >
            <div class="member-card-top">
              <Avatar :name="member.name" :image="member.avatarUrl" /><span
                class="badge"
                :class="member.workloadLevel"
                >{{ levelLabels[member.workloadLevel] }}</span
              >
            </div>
            <h3>{{ member.name }}</h3>
            <p>
              {{ roleLabels[member.role] }} ·
              {{ member.isActive ? "Aktif" : "Nonaktif" }}
            </p>
            <div class="member-card-teams">
              {{
                member.teams.map((team) => team.name).join(" · ") ||
                "Belum ada tim"
              }}
            </div>
            <div class="member-card-bottom">
              <span
                ><strong>{{ member.currentLoad }}</strong> isu terbuka</span
              ><Icon name="arrow" :size="19" />
            </div>
          </button></div
      ></template>
      <div v-else class="empty-state">
        <Icon name="search" :size="30" />
        <h3>Belum ada anggota yang cocok</h3>
        <p>Coba kata kunci atau cakupan tim yang berbeda.</p>
        <button class="button secondary" @click="clearFilters">
          Reset filter
        </button>
      </div>
      <Pager
        :page="page"
        :total="response?.total ?? 0"
        @change="page = $event"
      />
    </section>
    <Modal
      v-if="details"
      :title="
        details === 'capacity'
          ? 'Distribusi kapasitas tim'
          : details === 'stale'
            ? 'Isu mengendap'
            : 'Isu terbuka'
      "
      :description="
        workspace.preview
          ? 'Data contoh dalam cakupan ' + scopeName
          : (details === 'capacity' ? 'Distribusi anggota' : 'Isu terbuka') + ' dalam cakupan ' + scopeName
      "
      @close="details = ''"
      ><div v-if="details === 'capacity'" class="detail-list">
        <button
          v-for="level in levels"
          :key="level"
          class="detail-row"
          @click="
            details = '';
            focusDirectory(level);
          "
        >
          <span class="level-dot" :class="level"></span>
          <div>
            <strong>Beban {{ levelLabels[level].toLowerCase() }}</strong
            ><small>Klik untuk melihat anggota kategori ini</small>
          </div>
          <b>{{ summary?.distribution[level] ?? 0 }} anggota</b
          ><Icon name="arrow" :size="18" />
        </button>
      </div>
      <template v-else>
      <p v-if="details === 'stale'" class="dashboard-issue-note">Isu terbuka berusia lebih dari {{ response?.thresholds.staleDays ?? 30 }} hari sejak dibuat. Usia tidak menunjukkan aktivitas terakhir.</p>
      <div v-if="issueLoading" class="loading-state" role="status"><Icon name="refresh" class="spinning" />Memuat daftar isu…</div>
      <div v-else-if="issueError" class="error-banner" role="alert"><Icon name="alert" />{{ issueError }}<button @click="loadDetailIssues">Coba lagi</button></div>
      <div v-else class="issue-list">
        <component
          :is="workspace.preview ? 'button' : 'a'"
          v-for="issue in issueResponse?.data"
          :key="issue.id"
          class="issue-row"
          :href="workspace.preview ? undefined : issue.url"
          :target="workspace.preview ? undefined : '_blank'"
          :rel="workspace.preview ? undefined : 'noopener noreferrer'"
          @click="previewIssue(issue)"
        >
          <span class="issue-symbol"><Icon name="dot" :size="18" /></span>
          <div>
            <strong>{{ issue.title }}</strong
            ><small
              >{{ issue.repository.name }} ·
              {{
                issue.assignees.map((member) => member.name).join(', ')
              }}</small
            >
          </div>
          <span class="badge" :class="details === 'stale' ? 'rose' : 'neutral'"
            >{{ issue.ageDays }} hari</span
          >
          <Icon v-if="!workspace.preview" name="external" :size="15" />
        </component>
        <div v-if="!issueResponse?.data.length" class="compact-empty">
          Tidak ada isu dalam cakupan ini.
        </div>
      </div>
      <Pager v-if="!issueLoading && !issueError && issueResponse" :page="issueResponse.page" :total="issueResponse.total" :limit="issueResponse.limit" @change="issuePage = $event" />
      </template></Modal
    >
    <MemberDialog
      v-if="memberId"
      :member-id="memberId"
      @close="memberId = ''"
    />
    <AttentionCenter v-if="attentionOpen && canReview" :params="params" :scope="scopeName" @close="attentionOpen = false" />
  </div>
</template>
