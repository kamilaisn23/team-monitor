<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import Icon from "./components/Icon.vue";
import Avatar from "./components/Avatar.vue";
import TeamScopeSelect from "./components/TeamScopeSelect.vue";
import { workspace, isAdmin, canSettings, notify, signOut } from "./state";
import { api } from "./api";
import { sectionHref } from "./router";

const route = useRoute();
const router = useRouter();
const sidebarOpen = ref(false);
const sidebarCollapsed = ref(false);
const accountOpen = ref(false);
const standalone = computed(
  () => route.meta.public || route.path === "/pending",
);
const section = computed(() =>
  route.path === "/preview"
    ? String(route.query.section || "dashboard")
    : route.path.split("/").filter(Boolean).at(-1) || "dashboard",
);
const nav = computed(() =>
  [
    { id: "dashboard", title: "Ringkasan", icon: "dashboard", visible: true },
    { id: "reports", title: "Laporan", icon: "chart", visible: true },
    {
      id: "members",
      title: "Anggota",
      icon: "users",
      visible: workspace.preview || isAdmin.value,
    },
    {
      id: "teams",
      title: "Tim",
      icon: "teams",
      visible: workspace.preview || isAdmin.value,
    },
    {
      id: "repositories",
      title: "Repositori",
      icon: "branch",
      visible: workspace.preview || isAdmin.value,
    },
    {
      id: "settings",
      title: "Pengaturan",
      icon: "settings",
      visible: canSettings.value,
    },
  ].filter((item) => item.visible),
);
const activeTitle = computed(() =>
  route.path.startsWith("/members/")
    ? "Profil anggota"
    : nav.value.find((item) => item.id === section.value)?.title || "Workspace",
);
const selectedTeam = computed(() =>
  workspace.teams.find((team) => team.id === workspace.teamId),
);
const dateLabel = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  year: "numeric",
}).format(new Date());
watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false;
    accountOpen.value = false;
    document.querySelector(".workspace-main")?.scrollTo({ top: 0 });
  },
);
let events: EventSource | undefined;
async function sync() {
  if (workspace.preview || workspace.syncing || !isAdmin.value) return;
  workspace.syncing = true;
  try {
    const job = await api<{ jobId: string }>("/api/sync?source=all", {
      method: "POST",
    });
    events = new EventSource(
      "/api/sync?jobId=" + encodeURIComponent(job.jobId),
    );
    events.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "done" || data.type === "error") {
          events?.close();
          workspace.syncing = false;
          workspace.refreshKey++;
          notify(
            data.type === "done"
              ? "Sinkronisasi selesai. Data terbaru siap ditinjau."
              : "Sinkronisasi gagal. Periksa konfigurasi sumber data.",
            data.type === "done" ? "success" : "error",
          );
          if (data.type === "done")
            workspace.lastSyncedAt = new Date().toISOString();
        }
      } catch {
        /* Ignore malformed event frames. */
      }
    };
    events.onerror = () => {
      events?.close();
      workspace.syncing = false;
      notify(
        "Koneksi sinkronisasi terputus. Muat ulang untuk memeriksa status.",
        "error",
      );
    };
  } catch (error) {
    workspace.syncing = false;
    notify((error as Error).message, "error");
  }
}
function selectTeam() {
  if (section.value !== "dashboard") router.push(sectionHref("dashboard"));
}
async function logout() {
  try {
    await signOut();
  } catch (error) {
    notify((error as Error).message, "error");
  }
}
onBeforeUnmount(() => events?.close());
</script>
<template>
  <RouterView v-if="standalone" />
  <div
    v-else
    class="workspace-shell"
    :class="{ 'nav-collapsed': sidebarCollapsed }"
  >
    <button
      v-if="sidebarOpen"
      class="sidebar-backdrop"
      aria-label="Tutup navigasi"
      @click="sidebarOpen = false"
    ></button>
    <aside
      class="workspace-sidebar"
      :class="{ open: sidebarOpen }"
      aria-label="Navigasi utama"
    >
      <RouterLink :to="sectionHref('dashboard')" class="brand"
        ><span class="brand-symbol"><Icon name="chart" :size="25" /></span
        ><span class="brand-copy"
          ><strong>team<span>monitor</span></strong
          ><small>PEOPLE. WORK. CLARITY.</small></span
        ></RouterLink
      >
      <div class="sidebar-workspace">
        <span class="workspace-symbol"><Icon name="teams" :size="20" /></span>
        <div>
          <strong>Ruang kerja tim</strong
          ><small>{{
            workspace.preview ? "Pratinjau desain" : "Internal workspace"
          }}</small>
        </div>
        <span class="workspace-status"></span>
      </div>
      <div class="nav-caption">WORKSPACE</div>
      <nav>
        <RouterLink
          v-for="item in nav"
          :key="item.id"
          :to="sectionHref(item.id)"
          :class="['nav-item', { active: item.id === section }]"
          :title="item.title"
          ><Icon :name="item.icon" :size="21" /><span>{{ item.title }}</span
          ><span
            v-if="item.id === 'teams' && workspace.teams.length"
            class="nav-count"
            >{{ workspace.teams.length }}</span
          ><span v-if="item.id === section" class="nav-active-dot"></span
        ></RouterLink>
      </nav>
      <div class="scope-control">
        <label for="scope-team">CAKUPAN PEMANTAUAN</label>
        <TeamScopeSelect
          v-model="workspace.teamId"
          :teams="workspace.teams"
          @change="selectTeam"
        />
        <p>
          {{
            selectedTeam
              ? "Fokus pada tim yang dipilih."
              : "Satu pandangan untuk semua tim."
          }}
        </p>
      </div>
      <div class="sidebar-bottom">
        <div class="sidebar-sync">
          <div class="sync-heading">
            <span><Icon name="refresh" :size="15" /> Sinkronisasi</span
            ><span class="mini-dot"></span>
          </div>
          <p>
            {{
              workspace.preview
                ? "Jelajahi dengan data contoh"
                : workspace.lastSyncedAt
                  ? "Terakhir " +
                    new Date(workspace.lastSyncedAt).toLocaleString("id-ID", {
                      timeZone: "Asia/Jakarta",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) +
                    " WIB"
                  : "Belum ada sinkronisasi"
            }}
          </p>
          <button
            v-if="workspace.preview || isAdmin"
            class="sync-button"
            :disabled="workspace.preview || workspace.syncing"
            @click="sync"
          >
            <Icon
              name="refresh"
              :size="16"
              :class="{ spinning: workspace.syncing }"
            />{{ workspace.syncing ? "Menyinkronkan…" : "Sinkronkan data" }}
          </button>
        </div>
        <button
          class="sidebar-collapse"
          @click="sidebarCollapsed = !sidebarCollapsed"
          :aria-label="sidebarCollapsed ? 'Perluas sidebar' : 'Ringkas sidebar'"
          :title="sidebarCollapsed ? 'Perluas sidebar' : 'Ringkas sidebar'"
          :aria-expanded="!sidebarCollapsed"
        >
          <Icon :name="sidebarCollapsed ? 'expand' : 'collapse'" :size="18" />
        </button>
        <div class="sidebar-footnote">
          <span class="tiny-logo">TM</span
          ><span>Team intelligence workspace</span>
        </div>
      </div>
    </aside>
    <div class="workspace-content">
      <header class="workspace-header">
        <div class="breadcrumb">
          <button
            class="icon-button mobile-menu"
            aria-label="Buka navigasi"
            @click="sidebarOpen = true"
          >
            <Icon name="menu" /></button
          ><span class="breadcrumb-root">Workspace</span
          ><Icon name="next" :size="14" /><strong>{{ activeTitle }}</strong>
        </div>
        <div class="header-right">
          <span class="header-date"
            ><Icon name="calendar" :size="16" />{{ dateLabel }}</span
          ><span v-if="workspace.preview" class="preview-chip"
            ><span></span>Data contoh</span
          >
          <div v-else class="account">
            <button
              class="account-button"
              aria-label="Menu akun"
              :aria-expanded="accountOpen"
              @click="accountOpen = !accountOpen"
            >
              <Avatar
                :name="workspace.session?.user.name || 'Anggota'"
                :image="workspace.session?.user.image"
                size="small"
              /><span
                >{{ workspace.session?.user.name || "Anggota"
                }}<small>{{ workspace.session?.user.role }}</small></span
              ><Icon name="down" :size="14" />
            </button>
            <div v-if="accountOpen" class="account-menu">
              <RouterLink
                v-if="workspace.session?.user.id"
                :to="'/members/' + workspace.session.user.id"
                ><Icon name="users" :size="17" />Profil saya</RouterLink
              ><button @click="logout">
                <Icon name="logout" :size="17" />Keluar
              </button>
            </div>
          </div>
        </div>
      </header>
      <main class="workspace-main" id="main-content">
        <div v-if="workspace.preview" class="preview-banner">
          <span
            ><Icon name="eye" :size="16" /><strong>Mode pratinjau</strong
            ><span class="banner-detail">
              · Semua nama dan angka adalah data contoh.</span
            ></span
          ><RouterLink to="/login"
            >Masuk ke workspace <Icon name="arrow" :size="15"
          /></RouterLink>
        </div>
        <RouterView v-slot="{ Component }"
          ><Transition name="page" mode="out-in"
            ><component
              :is="Component"
              :key="
                route.path + ':' + (route.query.section || '')
              " /></Transition
        ></RouterView>
        <footer class="workspace-footer">
          <span><span class="footer-dot"></span>Team Monitor</span
          ><span
            >{{
              workspace.preview
                ? "Pratinjau · Data contoh"
                : "Ruang kerja internal"
            }}<span class="footer-separator">/</span>Waktu Indonesia Barat</span
          >
        </footer>
      </main>
    </div>
  </div>
  <div
    v-if="workspace.notice"
    class="toast"
    :class="workspace.noticeType"
    role="status"
  >
    <Icon
      :name="workspace.noticeType === 'error' ? 'alert' : 'check'"
    /><span>{{ workspace.notice }}</span
    ><button
      class="icon-button"
      aria-label="Tutup notifikasi"
      @click="workspace.notice = ''"
    >
      <Icon name="close" :size="17" />
    </button>
  </div>
</template>
