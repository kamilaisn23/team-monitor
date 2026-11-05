<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import Icon from "./Icon.vue";
import { api } from "../api";
import { notify, workspace, isAdmin, effectiveRole } from "../state";
import {
  oneOnOneSentiments,
  sentimentLabels,
  type OneOnOneNote,
  type OneOnOneSentiment,
} from "../types";

const props = defineProps<{ memberId: string }>();

const notes = ref<OneOnOneNote[]>([]);
const loading = ref(false);
const saving = ref(false);
const deleting = ref("");
const error = ref("");
const formOpen = ref(false);
const editingId = ref("");
const draft = reactive({
  date: today(),
  focusArea: "",
  actionItems: "",
  sentiment: "NEUTRAL" as OneOnOneSentiment,
});

const isManager = computed(
  () =>
    workspace.preview ||
    isAdmin.value ||
    effectiveRole.value === "MANAGER",
);
const canWrite = computed(
  () =>
    isManager.value ||
    (!!workspace.session?.user.id && workspace.session.user.id === props.memberId),
);
const storageKey = computed(
  () => `team-monitor:preview-one-on-one:v1:${props.memberId}`,
);
const heading = computed(() =>
  isManager.value
    ? "Catatan 1-on-1 & evaluasi pertumbuhan"
    : "Catatan 1-on-1 Anda",
);
const sentimentOrder: Record<OneOnOneSentiment, string> = {
  POSITIVE: "low",
  NEUTRAL: "neutral",
  NEEDS_SUPPORT: "rose",
};

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function sampleNote(): OneOnOneNote {
  return {
    id: "preview-note",
    memberId: props.memberId,
    authorId: null,
    authorName: "Manager (contoh)",
    date: "2026-10-28",
    focusArea: "Kapasitas sprint & dependensi arsitektur",
    actionItems:
      "Bantu koordinasi unblocking PR gateway API bersama tim Platform Infra.",
    sentiment: "POSITIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function readPreview(): OneOnOneNote[] {
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(storageKey.value) || "null",
    );
    if (Array.isArray(raw)) return raw as OneOnOneNote[];
    const seeded = [sampleNote()];
    window.localStorage.setItem(storageKey.value, JSON.stringify(seeded));
    return seeded;
  } catch {
    return [sampleNote()];
  }
}

function savePreview(next: OneOnOneNote[]) {
  try {
    window.localStorage.setItem(storageKey.value, JSON.stringify(next));
  } catch {
    error.value = "Penyimpanan browser tidak tersedia untuk catatan contoh.";
  }
  notes.value = next;
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    notes.value = workspace.preview
      ? readPreview()
      : await api<OneOnOneNote[]>(
          "/api/members/" + encodeURIComponent(props.memberId) + "/notes",
        );
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

function resetDraft() {
  editingId.value = "";
  draft.date = today();
  draft.focusArea = "";
  draft.actionItems = "";
  draft.sentiment = "NEUTRAL";
}

function startEdit(note: OneOnOneNote) {
  editingId.value = note.id;
  formOpen.value = true;
  draft.date = note.date.slice(0, 10);
  draft.focusArea = note.focusArea;
  draft.actionItems = note.actionItems;
  draft.sentiment = note.sentiment;
}

async function save() {
  if (saving.value) return;
  if (!draft.focusArea.trim()) {
    error.value = "Topik atau fokus 1-on-1 wajib diisi.";
    return;
  }
  saving.value = true;
  error.value = "";
  const payload = {
    date: draft.date,
    focusArea: draft.focusArea.trim(),
    actionItems: draft.actionItems.trim(),
    sentiment: draft.sentiment,
  };
  try {
    if (workspace.preview) {
      const now = new Date().toISOString();
      if (editingId.value) {
        savePreview(
          notes.value.map((note) =>
            note.id === editingId.value
              ? { ...note, ...payload, updatedAt: now }
              : note,
          ),
        );
      } else {
        savePreview([
          {
            id: `preview-${Date.now()}`,
            memberId: props.memberId,
            authorId: null,
            authorName: "Manager (contoh)",
            createdAt: now,
            updatedAt: now,
            ...payload,
          },
          ...notes.value,
        ]);
      }
      notify("Catatan 1-on-1 contoh disimpan di browser.");
    } else {
      const suffix = encodeURIComponent(props.memberId) + "/notes";
      if (editingId.value) {
        await api<OneOnOneNote>("/api/members/" + suffix, {
          method: "PATCH",
          body: JSON.stringify({ ...payload, id: editingId.value }),
        });
      } else {
        await api<OneOnOneNote>("/api/members/" + suffix, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      notify(
        editingId.value
          ? "Catatan 1-on-1 diperbarui."
          : "Catatan 1-on-1 disimpan.",
      );
      await load();
    }
    formOpen.value = false;
    resetDraft();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    saving.value = false;
  }
}

async function remove(note: OneOnOneNote) {
  if (deleting.value) return;
  if (!window.confirm("Hapus catatan 1-on-1 ini?")) return;
  deleting.value = note.id;
  error.value = "";
  try {
    if (workspace.preview) {
      savePreview(notes.value.filter((entry) => entry.id !== note.id));
      notify("Catatan 1-on-1 contoh dihapus.");
    } else {
      await api<void>(
        "/api/members/" +
          encodeURIComponent(props.memberId) +
          "/notes?noteId=" +
          encodeURIComponent(note.id),
        { method: "DELETE" },
      );
      notify("Catatan 1-on-1 dihapus.");
      await load();
    }
    if (editingId.value === note.id) {
      formOpen.value = false;
      resetDraft();
    }
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    deleting.value = "";
  }
}

function dateLabel(value: string) {
  return new Date(value + "T00:00:00Z").toLocaleDateString("id-ID", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

watch(() => props.memberId, load, { immediate: true });
</script>

<template>
  <section class="surface one-on-one" :aria-busy="loading">
    <div class="one-on-one-heading">
      <div>
        <div class="one-on-one-title">
          <h2><Icon name="note" :size="19" />{{ heading }}</h2>
          <span class="badge" :class="isManager ? 'blue' : 'neutral'">{{
            isManager ? "Catatan manager" : "Terbatas"
          }}</span>
        </div>
        <p>
          {{
            isManager
              ? "Ruang pribadi untuk mencatat komitmen sprint, umpan balik karier, dan rencana dukungan anggota."
              : "Catatan ini hanya dapat dilihat oleh Anda dan manager."
          }}
        </p>
      </div>
      <button
        v-if="canWrite"
        class="button primary compact"
        @click="formOpen = !formOpen"
      >
        <Icon :name="formOpen ? 'close' : 'plus'" :size="16" />{{
          formOpen ? "Tutup form" : "Tambah catatan 1-on-1"
        }}
      </button>
    </div>
    <div v-if="error" class="error-banner" role="alert">
      <Icon name="alert" />{{ error }}<button @click="load">Muat ulang</button>
    </div>
    <form
      v-if="formOpen && canWrite"
      class="one-on-one-form"
      @submit.prevent="save"
    >
      <div class="one-on-one-fields">
        <label
          >Tanggal sesi<input v-model="draft.date" type="date" required
        /></label>
        <label
          >Sentimen & kondisi<select v-model="draft.sentiment">
            <option
              v-for="sentiment in oneOnOneSentiments"
              :key="sentiment"
              :value="sentiment"
            >
              {{ sentimentLabels[sentiment] }}
            </option>
          </select></label
        >
      </div>
      <label
        >Topik / fokus 1-on-1<input
          v-model="draft.focusArea"
          maxlength="500"
          required
          placeholder="Contoh: karier arsitektur, delegasi tugas, hambatan staging…"
      /></label>
      <label
        >Rencana tindak lanjut<textarea
          v-model="draft.actionItems"
          rows="3"
          maxlength="2000"
          placeholder="Tuliskan target tindakan konkret yang disepakati untuk sprint mendatang…"
        ></textarea>
        <small>{{ draft.actionItems.length }}/2.000 karakter</small></label
      >
      <div class="follow-up-actions">
        <button
          type="button"
          class="button secondary"
          :disabled="saving"
          @click="formOpen = false; resetDraft()"
        >
          Batal
        </button>
        <button class="button primary" type="submit" :disabled="saving">
          <Icon v-if="saving" name="refresh" class="spinning" :size="16" />
          <Icon v-else name="save" :size="16" />
          {{ saving ? "Menyimpan…" : editingId ? "Perbarui catatan" : "Simpan catatan" }}
        </button>
      </div>
    </form>
    <div v-if="loading" class="loading-state" role="status">
      <Icon name="refresh" class="spinning" />Memuat catatan 1-on-1…
    </div>
    <div v-else-if="!notes.length" class="compact-empty">
      Belum ada catatan 1-on-1 untuk anggota ini.
    </div>
    <div v-else class="one-on-one-list">
      <article v-for="note in notes" :key="note.id" class="one-on-one-note">
        <div class="one-on-one-note-head">
          <strong>{{ note.focusArea }}</strong>
          <div>
            <span class="badge" :class="sentimentOrder[note.sentiment]">{{
              sentimentLabels[note.sentiment]
            }}</span>
            <span class="one-on-one-date">{{ dateLabel(note.date) }}</span>
          </div>
        </div>
        <p v-if="note.actionItems" class="one-on-one-actions">
          <span>Tindak lanjut:</span> {{ note.actionItems }}
        </p>
        <div class="one-on-one-note-foot">
          <small>{{ note.authorName }} · {{ dateLabel(note.date) }}</small>
          <div v-if="canWrite" class="one-on-one-note-actions">
            <button
              class="text-button"
              :disabled="saving || !!deleting"
              @click="startEdit(note)"
            >
              <Icon name="edit" :size="14" />Ubah
            </button>
            <button
              class="text-button danger"
              :disabled="saving || !!deleting"
              @click="remove(note)"
            >
              <Icon name="trash" :size="14" />{{
                deleting === note.id ? "Menghapus…" : "Hapus"
              }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
