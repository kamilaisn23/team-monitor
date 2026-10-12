<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import PageHeading from "../components/PageHeading.vue";
import Icon from "../components/Icon.vue";
import { workspace, canManage, notify } from "../state";
import { api } from "../api";
import { roleLabels, type Member } from "../types";
const route = useRoute(),
  router = useRouter();
const id = computed(() => String(route.params.id || ""));
const form = reactive({
  name: "",
  usernameGithub: "",
  usernameGitlab: "",
  role: "DEVELOPER",
  isActive: true,
});
const selectedTeams = ref<string[]>([]),
  originalTeams = ref<string[]>([]),
  saving = ref(false),
  loading = ref(false),
  error = ref("");
onMounted(async () => {
  if (!id.value) return;
  loading.value = true;
  try {
    const member = await api<Member>("/api/members/" + id.value);
    Object.assign(form, {
      name: member.name,
      usernameGithub: member.usernameGithub || "",
      usernameGitlab: member.usernameGitlab || "",
      role: member.role,
      isActive: member.isActive,
    });
    originalTeams.value = member.teams.map((team) => team.id);
    selectedTeams.value = [...originalTeams.value];
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
});
async function save() {
  if (!canManage.value || !form.name.trim()) return;
  saving.value = true;
  error.value = "";
  try {
    const member = await api<Member>(
      id.value ? "/api/members/" + id.value : "/api/members",
      {
        method: id.value ? "PATCH" : "POST",
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          usernameGithub: form.usernameGithub.trim(),
          usernameGitlab: form.usernameGitlab.trim(),
        }),
      },
    );
    for (const teamId of selectedTeams.value.filter(
      (teamId) => !originalTeams.value.includes(teamId),
    ))
      await api("/api/teams/" + teamId + "/members", {
        method: "POST",
        body: JSON.stringify({ memberId: member.id }),
      });
    for (const teamId of originalTeams.value.filter(
      (teamId) => !selectedTeams.value.includes(teamId),
    ))
      await api("/api/teams/" + teamId + "/members/" + member.id, {
        method: "DELETE",
      });
    notify("Anggota dan keanggotaan tim berhasil disimpan.");
    router.push("/admin/members");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    saving.value = false;
  }
}
</script>
<template>
  <div class="page-content">
    <PageHeading
      eyebrow="BUILD YOUR TEAM"
      :title="id ? 'Perbarui anggota' : 'Sambut anggota baru'"
      description="Lengkapi identitas, akun sumber, dan keanggotaan tim."
      ><RouterLink to="/admin/members" class="button secondary"
        ><Icon name="left" :size="17" />Kembali</RouterLink
      ></PageHeading
    >
    <div v-if="!canManage" class="info-banner">
      <Icon name="shield" />Perubahan anggota dikelola melalui Kerjabaik.
    </div>
    <section class="surface editor-panel">
      <form class="edit-form" @submit.prevent="save">
        <div v-if="error" class="error-banner" role="alert">{{ error }}</div>
        <div v-if="loading" class="loading-state">Memuat anggota…</div>
        <fieldset :disabled="!canManage || loading || saving">
          <div class="form-grid">
            <label class="span-two"
              >Nama lengkap<input
                v-model="form.name"
                required
                maxlength="200"
                placeholder="Nama anggota" /></label
            ><label
              >Username GitHub<input
                v-model="form.usernameGithub"
                placeholder="username-github" /></label
            ><label
              >Username GitLab<input
                v-model="form.usernameGitlab"
                placeholder="username-gitlab" /></label
            ><label
              >Peran<select v-model="form.role">
                <option
                  v-for="role in [
                    'ADMIN',
                    'MANAGER',
                    'DEVELOPER',
                    'UNASSIGNED',
                  ]"
                  :key="role"
                  :value="role"
                >
                  {{ roleLabels[role] }}
                </option>
              </select></label
            ><label v-if="id" class="checkbox-field"
              ><input v-model="form.isActive" type="checkbox" />Anggota
              aktif</label
            >
          </div>
          <div class="form-section-title">
            <h3>Keanggotaan tim</h3>
            <p>Anggota dapat bergabung dengan lebih dari satu tim.</p>
          </div>
          <div class="checkbox-list">
            <label v-for="team in workspace.teams" :key="team.id"
              ><input
                v-model="selectedTeams"
                type="checkbox"
                :value="team.id"
              /><Icon name="teams" :size="18" />{{ team.name }}</label
            >
          </div>
        </fieldset>
        <div class="form-footer">
          <RouterLink to="/admin/members" class="button secondary"
            >Batal</RouterLink
          ><button
            class="button primary"
            :disabled="saving || !canManage || loading"
          >
            <Icon name="check" :size="17" />{{
              saving ? "Menyimpan…" : "Simpan anggota"
            }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>
