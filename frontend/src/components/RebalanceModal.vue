<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Icon from "./Icon.vue";
import Modal from "./Modal.vue";
import { api, query } from "../api";
import { workspace, notify } from "../state";
import type {
  DashboardIssue,
  DashboardMember,
  DashboardResponse,
  RebalanceResult,
} from "../types";
import { getPreviewDashboard, getPreviewDashboardIssues } from "../../../src/lib/preview-data";

const emit = defineEmits<{ close: []; done: [] }>();

const members = ref<DashboardMember[]>([]);
const issues = ref<DashboardIssue[]>([]);
const fromMemberId = ref("");
const toMemberId = ref("");
const selected = ref<string[]>([]);
const loading = ref(false);
const issueLoading = ref(false);
const saving = ref(false);
const error = ref("");
const success = ref("");

const activeMembers = computed(() => members.value.filter((member) => member.isActive));
const fromMember = computed(() =>
  activeMembers.value.find((member) => member.memberId === fromMemberId.value),
);
const targets = computed(() =>
  activeMembers.value
    .filter((member) => member.memberId !== fromMemberId.value)
    .sort((a, b) => a.currentLoad - b.currentLoad),
);
const toMember = computed(() =>
  activeMembers.value.find((member) => member.memberId === toMemberId.value),
);
const allSelected = computed(
  () => issues.value.length > 0 && selected.value.length === issues.value.length,
);
const canApply = computed(
  () =>
    !workspace.preview &&
    !!fromMemberId.value &&
    !!toMemberId.value &&
    selected.value.length > 0 &&
    !saving.value,
);

function selectDefaults() {
  const source =
    [...activeMembers.value]
      .filter((member) => member.workloadLevel === "high")
      .sort((a, b) => b.currentLoad - a.currentLoad)[0] ||
    [...activeMembers.value].sort((a, b) => b.currentLoad - a.currentLoad)[0];
  fromMemberId.value = source?.memberId || "";
  const target = targets.value.find((member) => member.workloadLevel === "low") || targets.value[0];
  toMemberId.value = target?.memberId || "";
}

async function loadMembers() {
  loading.value = true;
  error.value = "";
  try {
    const params = new URLSearchParams({
      limit: "100",
      active: "true",
      sortCol: "currentLoad",
      sortDir: "desc",
    });
    const data = workspace.preview
      ? getPreviewDashboard(params)
      : await api<DashboardResponse>("/api/dashboard?" + params);
    members.value = data.data;
    selectDefaults();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

async function loadIssues() {
  selected.value = [];
  issues.value = [];
  if (!fromMemberId.value) return;
  issueLoading.value = true;
  error.value = "";
  try {
    const params = query({
      issueView: "open",
      issuePage: 1,
      issueLimit: 100,
      ...(workspace.preview ? {} : { assigneeId: fromMemberId.value }),
    });
    const data = workspace.preview
      ? getPreviewDashboardIssues(params)
      : await api<{ data: DashboardIssue[] }>("/api/dashboard?" + params);
    issues.value = data.data.filter((issue) =>
      issue.assignees.some((assignee) => assignee.memberId === fromMemberId.value),
    );
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    issueLoading.value = false;
  }
}

function toggle(issueId: string) {
  selected.value = selected.value.includes(issueId)
    ? selected.value.filter((id) => id !== issueId)
    : [...selected.value, issueId];
}
function toggleAll() {
  selected.value = allSelected.value ? [] : issues.value.map((issue) => issue.id);
}

async function submit() {
  if (!canApply.value) return;
  if (selected.value.length > 50) {
    error.value = "Maksimal 50 tiket per redistribusi.";
    return;
  }
  saving.value = true;
  error.value = "";
  try {
    const result = await api<RebalanceResult>("/api/issues/rebalance", {
      method: "POST",
      body: JSON.stringify({
        fromMemberId: fromMemberId.value,
        toMemberId: toMemberId.value,
        issueIds: selected.value,
      }),
    });
    success.value = `${result.movedIssueIds.length} tiket dipindahkan dari ${result.fromMember.name} ke ${result.toMember.name}.`;
    notify(success.value);
    emit("done");
    window.setTimeout(() => emit("close"), 900);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    saving.value = false;
  }
}

watch(fromMemberId, loadIssues);
watch(
  () => [fromMemberId.value, toMemberId.value],
  () => {
    if (toMemberId.value === fromMemberId.value)
      toMemberId.value = targets.value[0]?.memberId || "";
  },
);
loadMembers();
</script>

<template>
  <Modal
    title="Redistribusi beban kerja tim"
    description="Pindahkan tiket dari anggota yang overload ke rekan dengan kapasitas siap."
    @close="!saving && emit('close')"
  >
    <div class="rebalance-modal">
      <p class="rebalance-internal-note">
        <Icon name="info" :size="16" />Perubahan ini hanya mengubah penugasan
        internal di Team Monitor. Assignee di GitHub/GitLab tidak diubah dan
        dapat disinkronkan ulang pada sinkronisasi berikutnya.
      </p>
      <div v-if="loading" class="loading-state" role="status">
        <Icon name="refresh" class="spinning" />Memuat anggota…
      </div>
      <template v-else>
        <div v-if="error" class="error-banner" role="alert">
          {{ error }}<button @click="loadMembers">Coba lagi</button>
        </div>
        <div class="rebalance-pickers">
          <div class="rebalance-picker source">
            <label for="rebalance-source">1. Dari anggota overload</label>
            <select id="rebalance-source" v-model="fromMemberId" :disabled="saving">
              <option
                v-for="member in activeMembers"
                :key="member.memberId"
                :value="member.memberId"
              >
                {{ member.name }} · {{ member.currentLoad }} isu
              </option>
            </select>
            <small v-if="fromMember">
              Beban saat ini <strong>{{ fromMember.currentLoad }} isu</strong>
              ({{ fromMember.workloadLevel === "high" ? "kapasitas penuh" : "normal" }})
            </small>
          </div>
          <div class="rebalance-picker target">
            <label for="rebalance-target">2. Delegasikan kepada</label>
            <select id="rebalance-target" v-model="toMemberId" :disabled="saving">
              <option
                v-for="member in targets"
                :key="member.memberId"
                :value="member.memberId"
              >
                {{ member.name }} · {{ member.currentLoad }} isu
              </option>
            </select>
            <small v-if="toMember">
              Kapasitas saat ini <strong>{{ toMember.currentLoad }} isu</strong>
              ({{ toMember.workloadLevel === "low" ? "siap menerima" : "perlu dipantau" }})
            </small>
          </div>
        </div>
        <div class="rebalance-issues">
          <div class="rebalance-issues-heading">
            <h3>
              Pilih tiket dari {{ fromMember?.name || "anggota" }}
              <span>({{ selected.length }} dipilih)</span>
            </h3>
            <button
              v-if="issues.length"
              type="button"
              class="text-button"
              :disabled="saving"
              @click="toggleAll"
            >
              {{ allSelected ? "Batal pilih semua" : "Pilih semua" }}
            </button>
          </div>
          <div v-if="issueLoading" class="loading-state" role="status">
            <Icon name="refresh" class="spinning" />Memuat tiket…
          </div>
          <div v-else-if="!issues.length" class="compact-empty">
            Tidak ada tiket terbuka untuk anggota ini.
          </div>
          <div v-else class="rebalance-issue-list">
            <label
              v-for="issue in issues"
              :key="issue.id"
              class="rebalance-issue"
              :class="{ selected: selected.includes(issue.id) }"
            >
              <input
                type="checkbox"
                :checked="selected.includes(issue.id)"
                :disabled="saving"
                @change="toggle(issue.id)"
              />
              <span class="rebalance-issue-copy">
                <strong>{{ issue.title }}</strong>
                <small
                  >{{ issue.repository.name }} · {{ issue.ageDays }} hari
                  terbuka</small
                >
              </span>
              <span v-if="issue.ageDays > 30" class="badge rose"
                >Mengendap</span
              >
            </label>
          </div>
        </div>
        <div
          v-if="selected.length && fromMember && toMember"
          class="rebalance-impact"
        >
          <Icon name="sparkles" :size="17" />
          <span>
            Simulasi: beban {{ fromMember.name }} menjadi
            <strong>{{ Math.max(0, fromMember.currentLoad - selected.length) }}</strong>
            tiket, {{ toMember.name }} menjadi
            <strong>{{ toMember.currentLoad + selected.length }}</strong> tiket.
          </span>
        </div>
        <p v-if="success" class="rebalance-success" role="status">
          <Icon name="check" :size="16" />{{ success }}
        </p>
        <p v-if="workspace.preview" class="rebalance-preview-note">
          <Icon name="eye" :size="16" />Mode pratinjau: redistribusi tidak dapat
          disimpan. Masuk ke workspace untuk menerapkan perubahan.
        </p>
      </template>
    </div>
    <div class="follow-up-actions">
      <button class="button secondary" :disabled="saving" @click="emit('close')">
        Batal
      </button>
      <button
        class="button primary"
        :disabled="!canApply"
        :title="workspace.preview ? 'Tidak tersedia dalam mode pratinjau' : undefined"
        @click="submit"
      >
        <Icon v-if="saving" name="refresh" class="spinning" :size="16" />
        <Icon v-else name="scale" :size="16" />
        {{ saving ? "Memindahkan…" : `Eksekusi redistribusi (${selected.length})` }}
      </button>
    </div>
  </Modal>
</template>
