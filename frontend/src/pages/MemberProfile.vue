<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import PageHeading from "../components/PageHeading.vue";
import Avatar from "../components/Avatar.vue";
import MetricCard from "../components/MetricCard.vue";
import Icon from "../components/Icon.vue";
import Pager from "../components/Pager.vue";
import OneOnOneNotes from "../components/OneOnOneNotes.vue";
import { api, query } from "../api";
import { workspace, canManage } from "../state";
import { roleLabels, type Member } from "../types";

interface Stats {
  currentLoad: number;
  issuesCreated: number;
  issuesAssigned: number;
  issuesResolved: number;
  staleIssues: number;
  staleDays: number;
}
interface MemberIssue {
  id: string;
  title: string;
  url: string;
  state: string;
  platform: string;
  repository: { id: string; name: string };
  createdAt: string;
  closedAt: string | null;
  isCreator: boolean;
  isAssignee: boolean;
  daysOpen: number | null;
  isStale: boolean;
}
interface RepoContribution {
  repositoryId: string;
  name: string;
  platform: string;
  url: string;
  issuesCreated: number;
  issuesAssigned: number;
  issuesResolved: number;
}
const route = useRoute();
const id = computed(() => String(route.params.id));
const member = ref<Member>(),
  stats = ref<Stats>(),
  repos = ref<RepoContribution[]>([]),
  records = ref<{ date: string; hour: number; count: number }[]>([]);
const loading = ref(false),
  issueLoading = ref(false),
  error = ref(""),
  issueError = ref(""),
  days = ref(90),
  platform = ref("all"),
  tab = ref("open"),
  page = ref(1),
  search = ref("");
const issues = ref<MemberIssue[]>([]),
  total = ref(0),
  issueSection = ref<HTMLElement>();
let profileRequest = 0,
  issueRequest = 0;
async function load() {
  const request = ++profileRequest;
  loading.value = true;
  error.value = "";
  try {
    const suffix = "?" + query({ days: days.value, platform: platform.value });
    const [profile, summary, repositories, activity] = await Promise.all([
      api<Member>("/api/members/" + id.value),
      api<Stats>("/api/members/" + id.value + "/stats" + suffix),
      api<RepoContribution[]>(
        "/api/members/" + id.value + "/repositories" + suffix,
      ),
      api<{ records: typeof records.value }>(
        "/api/members/" + id.value + "/timeline" + suffix,
      ),
    ]);
    if (request === profileRequest) {
      member.value = profile;
      stats.value = summary;
      repos.value = repositories;
      records.value = activity.records;
    }
  } catch (e) {
    if (request === profileRequest) error.value = (e as Error).message;
  } finally {
    if (request === profileRequest) loading.value = false;
  }
}
const issueParams = computed(() =>
  query({
    page: page.value,
    limit: 20,
    platform: platform.value,
    state:
      tab.value === "open" || tab.value === "stale"
        ? "open"
        : tab.value === "resolved"
          ? "closed"
          : "all",
    type:
      tab.value === "created"
        ? "created"
        : tab.value === "all"
          ? "all"
          : "assigned",
    ...(tab.value === "stale" ? { stale: true } : {}),
    ...(!["open", "stale"].includes(tab.value) ? { days: days.value } : {}),
  }),
);
async function loadIssues() {
  const request = ++issueRequest;
  issueLoading.value = true;
  issueError.value = "";
  try {
    const data = await api<{ data: MemberIssue[]; total: number }>(
      "/api/members/" + id.value + "/issues?" + issueParams.value,
    );
    if (request === issueRequest) {
      issues.value = data.data;
      total.value = data.total;
    }
  } catch (e) {
    if (request === issueRequest) issueError.value = (e as Error).message;
  } finally {
    if (request === issueRequest) issueLoading.value = false;
  }
}
watch([id, days, platform, () => workspace.refreshKey], load, {
  immediate: true,
});
watch([id, tab, days, platform], () => {
  page.value = 1;
  search.value = "";
});
watch([id, issueParams, () => workspace.refreshKey], loadIssues, {
  immediate: true,
});
const visibleIssues = computed(() =>
  issues.value.filter((issue) =>
    issue.title.toLowerCase().includes(search.value.toLowerCase()),
  ),
);
const activityDays = computed(() => {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const base = new Date(today + "T00:00:00Z");
  const counts = new Map<string, number>();
  records.value.forEach((record) =>
    counts.set(record.date, (counts.get(record.date) || 0) + record.count),
  );
  return Array.from({ length: days.value }, (_, index) => {
    const date = new Date(base.getTime() - (days.value - index - 1) * 86400000)
      .toISOString()
      .slice(0, 10);
    return { date, count: counts.get(date) || 0 };
  });
});
function metric(type: string) {
  tab.value = type;
  issueSection.value?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function date(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
const tabs = [
  { id: "open", label: "Terbuka" },
  { id: "created", label: "Dibuat" },
  { id: "assigned", label: "Ditugaskan" },
  { id: "resolved", label: "Selesai" },
  { id: "stale", label: "Mengendap" },
  { id: "all", label: "Semua aktivitas" },
];
</script>
<template>
  <div class="page-content">
    <PageHeading
      title="Profil anggota"
      description="Kontribusi dan kapasitas."
      ><RouterLink to="/dashboard" class="button secondary"
        ><Icon name="left" :size="17" />Kembali</RouterLink
      ><RouterLink
        v-if="member && canManage"
        :to="'/admin/members/' + member.id + '/edit'"
        class="button primary"
        ><Icon name="edit" :size="17" />Edit anggota</RouterLink
      ></PageHeading
    >
    <div v-if="error" class="error-banner" role="alert">
      <Icon name="alert" />{{ error }}<button @click="load">Coba lagi</button>
    </div>
    <div v-if="loading && !member" class="loading-state">
      <Icon name="refresh" class="spinning" />Memuat profil…
    </div>
    <template v-if="member"
      ><section class="surface profile-header">
        <Avatar :name="member.name" :image="member.avatarUrl" size="large" />
        <div class="profile-identity">
          <h2>
            {{ member.name
            }}<span
              class="badge"
              :class="member.isActive ? 'blue' : 'neutral'"
              >{{ member.isActive ? "Aktif" : "Nonaktif" }}</span
            >
          </h2>
          <p>{{ roleLabels[member.role] }}</p>
          <div class="team-pills">
            <span v-for="team in member.teams" :key="team.id">{{
              team.name
            }}</span>
          </div>
        </div>
        <div class="profile-controls">
          <label
            >Periode<select v-model.number="days">
              <option :value="30">30 hari terakhir</option>
              <option :value="90">90 hari terakhir</option>
              <option :value="180">180 hari terakhir</option>
              <option :value="365">365 hari terakhir</option>
            </select></label
          ><label
            >Platform<select v-model="platform">
              <option value="all">Semua platform</option>
              <option value="github">GitHub</option>
              <option value="gitlab">GitLab</option>
            </select></label
          >
        </div>
      </section>
      <div class="metric-grid profile-metrics">
        <MetricCard
          label="Isu terbuka"
          :value="stats?.currentLoad ?? '—'"
          detail="Seluruh beban saat ini"
          icon="branch"
          :active="tab === 'open'"
          @click="metric('open')"
        /><MetricCard
          label="Dibuat"
          :value="stats?.issuesCreated ?? '—'"
          :detail="days + ' hari terakhir'"
          icon="plus"
          :active="tab === 'created'"
          @click="metric('created')"
        /><MetricCard
          label="Ditugaskan"
          :value="stats?.issuesAssigned ?? '—'"
          :detail="days + ' hari terakhir'"
          icon="target"
          :active="tab === 'assigned'"
          @click="metric('assigned')"
        /><MetricCard
          label="Selesai"
          :value="stats?.issuesResolved ?? '—'"
          :detail="days + ' hari terakhir'"
          icon="done"
          :active="tab === 'resolved'"
          @click="metric('resolved')"
        /><MetricCard
          label="Mengendap"
          :value="stats?.staleIssues ?? '—'"
          :detail="'> ' + (stats?.staleDays ?? 30) + ' hari, seluruh periode'"
          icon="clock"
          tone="rose"
          :active="tab === 'stale'"
          @click="metric('stale')"
        />
      </div>
      <section class="surface activity-panel">
        <div class="panel-title">
          <div>
            <div class="eyebrow">CONSISTENCY OVER TIME</div>
            <h2>Jejak penyelesaian pekerjaan</h2>
            <p>Jumlah isu selesai per hari · {{ days }} hari terakhir · WIB</p>
          </div>
          <button class="button secondary compact" @click="metric('resolved')">
            Lihat isu selesai<Icon name="arrow" :size="16" />
          </button>
        </div>
        <div class="heatmap-scroll">
          <div
            class="heatmap"
            :style="{
              gridTemplateColumns: 'repeat(' + Math.ceil(days / 7) + ', 13px)',
            }"
          >
            <span
              v-for="day in activityDays"
              :key="day.date"
              :class="[
                'heat-cell',
                'heat-' +
                  (day.count === 0
                    ? 0
                    : day.count < 3
                      ? 1
                      : day.count < 6
                        ? 2
                        : 3),
              ]"
              :title="day.date + ' · ' + day.count + ' isu selesai (WIB)'"
            ></span>
          </div>
        </div>
        <div class="heatmap-caption">
          <span
            >{{
              records.reduce((count, record) => count + record.count, 0)
            }}
            isu diselesaikan pada periode ini</span
          ><span
            >Lebih sedikit<i class="heat-cell heat-0"></i
            ><i class="heat-cell heat-1"></i><i class="heat-cell heat-2"></i
            ><i class="heat-cell heat-3"></i>Lebih banyak</span
          >
        </div>
      </section>
      <section class="surface">
        <div class="directory-heading">
          <div>
            <h2>
              Kontribusi per repositori<span class="count-chip">{{
                repos.length
              }}</span>
            </h2>
            <p>Aktivitas anggota pada {{ days }} hari terakhir.</p>
          </div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Repositori</th>
                <th>Platform</th>
                <th>Dibuat</th>
                <th>Ditugaskan</th>
                <th>Selesai</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="repo in repos" :key="repo.repositoryId">
                <td>
                  <a
                    :href="repo.url"
                    class="repository-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    ><Icon name="branch" :size="18" /><strong>{{
                      repo.name
                    }}</strong
                    ><Icon name="external" :size="14"
                  /></a>
                </td>
                <td>
                  <span class="badge neutral">{{ repo.platform }}</span>
                </td>
                <td>{{ repo.issuesCreated }}</td>
                <td>{{ repo.issuesAssigned }}</td>
                <td>
                  <strong class="resolved-number">{{
                    repo.issuesResolved
                  }}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!repos.length" class="compact-empty">
          Belum ada kontribusi repositori dalam periode ini.
        </div>
      </section>
      <section ref="issueSection" class="surface">
        <div class="directory-heading">
          <div>
            <h2>
              Detail pekerjaan<span class="count-chip">{{ total }}</span>
            </h2>
            <p>
              {{
                ["open", "stale"].includes(tab)
                  ? "Isu terbuka menggunakan seluruh periode."
                  : "Aktivitas dalam " + days + " hari terakhir."
              }}
            </p>
          </div>
        </div>
        <div class="issue-tabs">
          <button
            v-for="item in tabs"
            :key="item.id"
            :class="{ active: tab === item.id }"
            @click="tab = item.id"
          >
            {{ item.label }}
          </button>
        </div>
        <div class="toolbar">
          <label class="search-control"
            ><Icon name="search" :size="18" /><input
              v-model="search"
              placeholder="Cari judul pada halaman ini…"
              aria-label="Cari isu pada halaman ini"
          /></label>
        </div>
        <div v-if="issueError" class="error-banner" role="alert">
          {{ issueError }}<button @click="loadIssues">Coba lagi</button>
        </div>
        <div v-if="issueLoading" class="loading-state">
          <Icon name="refresh" class="spinning" />Memuat pekerjaan…
        </div>
        <div v-else class="table-scroll">
          <table class="data-table issue-table">
            <thead>
              <tr>
                <th>Isu</th>
                <th>Repositori</th>
                <th>Status</th>
                <th>Dibuat (WIB)</th>
                <th>Usia</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="issue in visibleIssues" :key="issue.id">
                <td>
                  <a
                    :href="issue.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="issue-title"
                    ><strong>{{ issue.title }}</strong
                    ><Icon name="external" :size="13" /></a
                  ><span v-if="issue.isStale" class="badge rose"
                    >Mengendap</span
                  >
                </td>
                <td>
                  <strong>{{ issue.repository.name }}</strong
                  ><small class="cell-subtitle">{{ issue.platform }}</small>
                </td>
                <td>
                  <span
                    class="badge"
                    :class="issue.state === 'OPEN' ? 'blue' : 'violet'"
                    >{{ issue.state === "OPEN" ? "Terbuka" : "Selesai" }}</span
                  >
                </td>
                <td>{{ date(issue.createdAt) }}</td>
                <td>
                  {{ issue.daysOpen === null ? "—" : issue.daysOpen + " hari" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-if="!issueLoading && !visibleIssues.length && !issueError"
          class="empty-state"
        >
          <Icon name="done" :size="32" />
          <h3>Tidak ada isu pada tampilan ini</h3>
          <p>
            Ubah kategori, platform, atau periode untuk meninjau aktivitas lain.
          </p>
        </div>
        <Pager
          :page="page"
          :total="total"
          :limit="20"
          @change="page = $event"
        /></section
    ><OneOnOneNotes :member-id="id" /></template>
  </div>
</template>
