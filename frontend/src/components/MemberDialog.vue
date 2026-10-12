<script setup lang="ts">
import { computed } from "vue";
import Modal from "./Modal.vue";
import Avatar from "./Avatar.vue";
import Icon from "./Icon.vue";
import { roleLabels } from "../types";
import { previewMembers, previewIssues } from "../../../src/lib/preview-data";
const props = defineProps<{ memberId: string }>();
defineEmits<{ close: [] }>();
const member = computed(() =>
  previewMembers.find((member) => member.memberId === props.memberId),
);
const issues = computed(() =>
  previewIssues.filter((issue) => issue.memberId === props.memberId),
);
</script>
<template>
  <Modal
    v-if="member"
    :title="member.name"
    description="Profil anggota · Seluruh informasi adalah data contoh."
    @close="$emit('close')"
    ><div class="profile-summary">
      <Avatar :name="member.name" size="large" />
      <div>
        <strong>{{ roleLabels[member.role] }}</strong>
        <p>{{ member.teams.map((team) => team.name).join(" · ") }}</p>
        <span class="badge" :class="member.isActive ? 'blue' : 'neutral'">{{
          member.isActive ? "Aktif" : "Nonaktif"
        }}</span>
      </div>
    </div>
    <div class="profile-total">
      <span>Isu terbuka anggota</span><strong>{{ issues.length }}</strong>
    </div>
    <div class="issue-list">
      <div v-for="issue in issues" :key="issue.id" class="issue-row">
        <span class="issue-symbol"><Icon name="dot" :size="18" /></span>
        <div>
          <strong>{{ issue.title }}</strong
          ><small
            >{{ issue.repository.name }} ·
            {{ issue.repository.platform }}</small
          >
        </div>
        <span class="badge" :class="issue.ageDays > 30 ? 'rose' : 'neutral'"
          >{{ issue.ageDays }} hari</span
        >
      </div>
      <div v-if="!issues.length" class="empty-state">
        <Icon name="done" :size="30" />
        <h3>Belum ada isu terbuka</h3>
        <p>Anggota ini memiliki kapasitas untuk tugas berikutnya.</p>
      </div>
    </div></Modal
  >
</template>
