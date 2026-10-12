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
const visible = computed(() =>
  filtered.value.slice((page.value - 1) * 12, page.value * 12),
);
watch([search, status, role, () => workspace.teamId], () => {
  page.value = 1;
});
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
      eyebrow="THE PEOPLE BEHIND THE WORK"
      title="Kenali tim Anda"
      description="Seluruh anggota, peran, dan keanggotaan tim dalam satu direktori."
      ><RouterLink
        v-if="canManage"
        class="button primary"
        to="/admin/members/new"
        ><Icon name="plus" :size="18" />Tambah anggota</RouterLink
      ><span v-else class="scope-tag"
        ><Icon name="users" :size="17" />{{ members.length }} anggota</span
      ></PageHeading
    >
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
          <p>Temukan orang yang tepat untuk pekerjaan berikutnya.</p>
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
              <p>{{ roleLabels[member.role] }}</p>
              <div class="member-card-teams">
                {{
                  member.teams.map((team) => team.name).join(" · ") ||
                  "Belum bergabung dengan tim"
                }}
              </div>
              <div class="member-card-bottom">
                <span>Lihat profil anggota</span
                ><Icon name="arrow" :size="19" />
              </div>
            </button>
            <div v-if="canManage" class="card-management">
              <RouterLink
                :to="'/admin/members/' + member.id + '/edit'"
                class="text-button"
                ><Icon name="edit" :size="15" />Edit</RouterLink
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
                  <span class="badge neutral">{{
                    roleLabels[member.role]
                  }}</span>
                </td>
                <td>
                  {{ member.teams.map((team) => team.name).join(" · ") || "—" }}
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
          <h3>Tidak ada anggota yang cocok</h3>
          <p>Sesuaikan pencarian atau filter status.</p>
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
