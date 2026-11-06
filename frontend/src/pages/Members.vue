<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import PageHeading from "../components/PageHeading.vue";
import Icon from "../components/Icon.vue";
import Avatar from "../components/Avatar.vue";
import Pager from "../components/Pager.vue";
import MemberDialog from "../components/MemberDialog.vue";
import Modal from "../components/Modal.vue";
import { workspace, canManage, sampleMembers, notify } from "../state";
import { api } from "../api";
import { roleLabels, type Member } from "../types";
const router = useRouter();
const members = ref<Member[]>([]),
  search = ref(""),
  status = ref("all"),
  role = ref(""),
  view = ref("grid"),
  page = ref(1);
const loading = ref(false),
  error = ref(""),
  selected = ref(""),
  removing = ref<Member>();
const deleting = ref(false);
async function load() {
  loading.value = true;
  error.value = "";
  try {
    members.value = workspace.preview
      ? sampleMembers()
      : await api<Member[]>("/api/members");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
watch(() => workspace.refreshKey, load, { immediate: true });
const filtered = computed(() =>
  members.value.filter(
    (member) =>
      (!workspace.teamId ||
        member.teams.some((team) => team.id === workspace.teamId)) &&
      member.name.toLowerCase().includes(search.value.toLowerCase()) &&
      (status.value === "all" ||
        member.isActive === (status.value === "true")) &&
      (!role.value || member.role === role.value),
  ),
);
const unassignedMembers = computed(() =>
  members.value.filter((member) => member.role === "UNASSIGNED"),
);
const firstUnassignedId = computed(() => unassignedMembers.value[0]?.id || "");
const visible = computed(() =>
  filtered.value.slice((page.value - 1) * 12, page.value * 12),
);
watch([search, status, role, () => workspace.teamId], () => {
  page.value = 1;
});
function roleTone(role: string) {
  if (role === "ADMIN" || role === "SUPERADMIN") return "role-admin";
  if (role === "MANAGER") return "role-manager";
  if (role === "DEVELOPER") return "role-developer";
  return "role-unassigned";
}
function open(member: Member) {
  if (workspace.preview) selected.value = member.id;
  else router.push("/members/" + member.id);
}
async function remove() {
  if (!removing.value) return;
  deleting.value = true;
  try {
    await api("/api/members/" + removing.value.id, { method: "DELETE" });
    notify("Anggota berhasil dihapus.");
    removing.value = undefined;
    await load();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    deleting.value = false;
  }
}
</script>
<template>
  <div class="page-content">
    <PageHeading
      :title="canManage ? 'Anggota' : 'Anggota tim'"
      :description="
        canManage
          ? 'Kelola akses, peran, dan tim.'
          : 'Daftar anggota dan tim.'
      "
      ><RouterLink
        v-if="canManage"
        class="button primary"
        to="/admin/members/new"
        ><Icon name="plus" :size="18" />Tambah anggota</RouterLink
      ><span v-else class="scope-tag"
        ><Icon name="users" :size="17" />{{ members.length }} anggota</span
      ></PageHeading
    >
    <section
      v-if="unassignedMembers.length"
      class="pending-approval-banner"
      aria-label="Akun menunggu akses"
    >
      <span class="pending-approval-icon"><Icon name="clock" :size="20" /></span>
      <div class="pending-approval-copy">
        <h2>{{ unassignedMembers.length }} akun menunggu akses</h2>
        <p>Atur peran dan tim untuk mengaktifkan akses.</p>
      </div>
      <RouterLink
        v-if="canManage && firstUnassignedId"
        class="button pending-approval-action"
        :to="'/admin/members/' + firstUnassignedId + '/edit'"
      >
        <Icon name="usercheck" :size="16" />Tinjau akun
      </RouterLink>
      <span v-else-if="!workspace.preview" class="pending-approval-locked">
        Data anggota dikelola melalui Kerjabaik.
      </span>
    </section>
    <div v-if="error" class="error-banner" role="alert">
      <Icon name="alert" />{{ error }}<button @click="load">Coba lagi</button>
    </div>
    <div
      v-if="!workspace.preview && workspace.config.kerjabaikEnabled"
      class="info-banner"
    >
      <Icon name="shield" :size="18" />Data anggota dan keanggotaan tim dikelola
      melalui Kerjabaik.
    </div>
    <section class="surface">
      <div class="directory-heading">
        <div>
          <h2>
            Direktori anggota<span class="count-chip">{{
              filtered.length
            }}</span>
          </h2>

        </div>
        <div class="view-switch">
          <button
            :class="{ active: view === 'grid' }"
            aria-label="Tampilan kartu"
            @click="view = 'grid'"
          >
            <Icon name="grid" :size="18" /></button
          ><button
            :class="{ active: view === 'list' }"
            aria-label="Tampilan tabel"
            @click="view = 'list'"
          >
            <Icon name="list" :size="18" />
          </button>
        </div>
      </div>
      <div class="toolbar">
        <label class="search-control"
          ><Icon name="search" :size="19" /><input
            v-model="search"
            type="search"
            placeholder="Cari anggota…"
            aria-label="Cari anggota" /></label
        ><select v-model="status" aria-label="Status anggota">
          <option value="all">Semua status</option>
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option></select
        ><select v-model="role" aria-label="Peran anggota">
          <option value="">Semua peran</option>
          <option
            v-for="item in ['ADMIN', 'MANAGER', 'DEVELOPER', 'UNASSIGNED']"
            :key="item"
            :value="item"
          >
            {{ roleLabels[item] }}
          </option>
        </select>
      </div>
      <div v-if="loading" class="loading-state">
        <Icon name="refresh" class="spinning" />Memuat anggota…
      </div>
      <template v-else
        ><div v-if="view === 'grid' && visible.length" class="member-grid">
          <article
            v-for="member in visible"
            :key="member.id"
            class="member-card member-card-managed"
            :class="{ 'pending-member-card': member.role === 'UNASSIGNED' }"
          >
            <button
              class="card-content-button"
              :aria-label="'Lihat profil ' + member.name"
              @click="open(member)"
            >
              <div class="member-card-top">
                <Avatar :name="member.name" :image="member.avatarUrl" /><span
                  class="badge"
                  :class="member.isActive ? 'blue' : 'neutral'"
                  >{{ member.isActive ? "Aktif" : "Nonaktif" }}</span
                >
              </div>
              <h3>{{ member.name }}</h3>
              <p>
                <span class="badge" :class="roleTone(member.role)">{{
                  roleLabels[member.role]
                }}</span>
              </p>
              <div class="member-card-teams">
                {{
                  member.teams.map((team) => team.name).join(" · ") ||
                  "Belum bergabung dengan tim"
                }}
              </div>
              <div
                v-if="member.usernameGithub || member.usernameGitlab"
                class="member-accounts"
              >
                <span v-if="member.usernameGithub"
                  ><Icon name="github" :size="13" />@{{ member.usernameGithub }}</span
                >
                <span v-if="member.usernameGitlab"
                  ><Icon name="file" :size="13" />@{{ member.usernameGitlab }}</span
                >
              </div>
              <div class="member-card-bottom">
                <Icon name="arrow" :size="19" />
              </div>
            </button>
            <div v-if="canManage" class="card-management">
              <RouterLink
                :to="'/admin/members/' + member.id + '/edit'"
                class="text-button"
                :class="{ 'pending-role-action': member.role === 'UNASSIGNED' }"
                ><Icon
                  :name="member.role === 'UNASSIGNED' ? 'usercheck' : 'edit'"
                  :size="15"
                />{{
                  member.role === 'UNASSIGNED' ? 'Beri role & tim' : 'Edit'
                }}</RouterLink
              ><button
                class="text-button danger-text"
                :aria-label="'Hapus ' + member.name"
                @click="removing = member"
              >
                <Icon name="trash" :size="15" />Hapus
              </button>
            </div>
          </article>
        </div>
        <div v-else-if="visible.length" class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Anggota</th>
                <th>Peran</th>
                <th>Tim</th>
                <th>GitHub</th>
                <th>GitLab</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="member in visible" :key="member.id">
                <td>
                  <button class="person-link" @click="open(member)">
                    <Avatar
                      :name="member.name"
                      :image="member.avatarUrl"
                    /><strong>{{ member.name }}</strong>
                  </button>
                </td>
                <td>
                  <span class="badge" :class="roleTone(member.role)">{{
                    roleLabels[member.role]
                  }}</span>
                </td>
                <td>
                  {{ member.teams.map((team) => team.name).join(" · ") || "—" }}
                </td>
                <td>
                  <span v-if="member.usernameGithub" class="account-cell"
                    ><Icon name="github" :size="13" />@{{
                      member.usernameGithub
                    }}</span
                  ><span v-else class="account-cell muted">—</span>
                </td>
                <td>
                  <span v-if="member.usernameGitlab" class="account-cell"
                    ><Icon name="file" :size="13" />@{{
                      member.usernameGitlab
                    }}</span
                  ><span v-else class="account-cell muted">—</span>
                </td>
                <td>
                  <span
                    class="badge"
                    :class="member.isActive ? 'blue' : 'neutral'"
                    >{{ member.isActive ? "Aktif" : "Nonaktif" }}</span
                  >
                </td>
                <td>
                  <div class="inline-actions">
                    <button
                      class="icon-button"
                      :aria-label="'Profil ' + member.name"
                      @click="open(member)"
                    >
                      <Icon name="arrow" :size="18" /></button
                    ><RouterLink
                      v-if="canManage"
                      :to="'/admin/members/' + member.id + '/edit'"
                      class="icon-button"
                      :aria-label="'Edit ' + member.name"
                      ><Icon name="edit" :size="17" /></RouterLink
                    ><button
                      v-if="canManage"
                      class="icon-button danger-text"
                      :aria-label="'Hapus ' + member.name"
                      @click="removing = member"
                    >
                      <Icon name="trash" :size="17" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">
          <Icon name="users" :size="32" />
          <h3>Tidak ada anggota</h3>
          <p>Ubah pencarian atau filter.</p>
        </div></template
      ><Pager
        :page="page"
        :total="filtered.length"
        :limit="12"
        @change="page = $event"
      />
    </section>
    <MemberDialog
      v-if="selected"
      :member-id="selected"
      @close="selected = ''"
    /><Modal
      v-if="removing"
      title="Hapus anggota?"
      :description="
        removing.name + ' akan dihapus dari direktori dan keanggotaan tim.'
      "
      @close="removing = undefined"
      ><p class="modal-copy">
        Tindakan ini menghapus data anggota yang dipilih.
      </p>
      <div class="modal-actions">
        <button class="button secondary" @click="removing = undefined">
          Batal</button
        ><button class="button danger" :disabled="deleting" @click="remove">
          {{ deleting ? "Menghapus…" : "Hapus anggota" }}
        </button>
      </div></Modal
    >
  </div>
</template>
<style scoped>
.pending-approval-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 15px 18px;
  border: 1px solid #ead59e;
  border-radius: 13px;
  background: linear-gradient(110deg, #fff9e8, #fffdf7);
}
.pending-approval-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border: 1px solid #f0dfa9;
  border-radius: 11px;
  background: #fff1c7;
  color: #a56b14;
}
.pending-approval-copy {
  flex: 1;
  min-width: 0;
}
.pending-approval-copy h2 {
  color: #73500f;
  font-size: 13px;
  font-weight: 750;
}
.pending-approval-copy p {
  margin-top: 3px;
  color: #84682d;
  font-size: 11px;
  line-height: 1.55;
}
.pending-approval-banner .pending-approval-action {
  flex: 0 0 auto;
  border-color: #a96b12;
  background: #b97818;
  color: #fff;
}
.pending-approval-banner .pending-approval-action:hover {
  background: #9e6410;
}
.pending-approval-locked {
  color: #826b3d;
  font-size: 11px;
  font-weight: 650;
}
.pending-member-card {
  border-color: #ead59e;
  background: #fffdf8;
}
.pending-role-action {
  color: #8d610e;
  font-weight: 750;
}
@media (max-width: 600px) {
  .pending-approval-banner {
    flex-wrap: wrap;
    align-items: flex-start;
  }
  .pending-approval-banner .pending-approval-action {
    margin-left: 56px;
  }
}
</style>
