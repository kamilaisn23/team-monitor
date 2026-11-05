<script setup lang="ts">
import { computed, reactive, ref, onMounted } from "vue";
import PageHeading from "../components/PageHeading.vue";
import SyncHealth from "../components/SyncHealth.vue";
import Icon from "../components/Icon.vue";
import Modal from "../components/Modal.vue";
import MemberDialog from "../components/MemberDialog.vue";
import Avatar from "../components/Avatar.vue";
import { workspace, notify } from "../state";
import { api } from "../api";
import { levelLabels, type Thresholds, type WorkloadLevel } from "../types";
import { previewMembers, previewIssues } from "../../../src/lib/preview-data";
const thresholds = reactive<Thresholds>({
  lowMax: 3,
  mediumMax: 7,
  staleDays: 30,
});
const saved = ref<Thresholds>({ ...thresholds });
const error = ref(""),
  loading = ref(false),
  saving = ref(false),
  category = ref<WorkloadLevel>(),
  selected = ref("");
const valid = computed(
  () =>
    Object.values(thresholds).every(
      (value) => Number.isInteger(value) && value > 0,
    ) && thresholds.lowMax < thresholds.mediumMax,
);
const levels: WorkloadLevel[] = ["low", "medium", "high"];
function band(load: number): WorkloadLevel {
  return load <= thresholds.lowMax
    ? "low"
    : load <= thresholds.mediumMax
      ? "medium"
      : "high";
}
const simulated = computed(() =>
  previewMembers.filter(
    (member) => band(member.currentLoad) === category.value,
  ),
);
onMounted(async () => {
  if (workspace.preview) return;
  loading.value = true;
  try {
    Object.assign(thresholds, await api<Thresholds>("/api/settings"));
    saved.value = { ...thresholds };
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
});
async function save() {
  if (!valid.value) return;
  saving.value = true;
  try {
    saved.value = await api<Thresholds>("/api/settings", {
      method: "PATCH",
      body: JSON.stringify(thresholds),
    });
    workspace.refreshKey++;
    notify("Ambang kapasitas berhasil diperbarui.");
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
      eyebrow="MAKE IT WORK FOR YOUR TEAM"
      title="Ukuran kerja yang tepat"
      description="Atur ambang kapasitas dan usia isu agar pemantauan sesuai dengan tim Anda."
      ><span class="scope-tag"
        ><Icon name="settings" :size="16" />{{
          workspace.preview ? "Simulasi lokal" : "Pengaturan sistem"
        }}</span
      ></PageHeading
    >
    <SyncHealth />
    <div v-if="error" class="error-banner" role="alert">
      <Icon name="alert" />{{ error }}
    </div>
    <div v-if="loading" class="loading-state">Memuat pengaturan…</div>
    <div v-else class="settings-grid">
      <section class="surface settings-panel">
        <div class="settings-panel-head">
          <div>
            <div class="eyebrow">YOUR WORKLOAD RULES</div>
            <h2>Definisikan kapasitas</h2>
            <p>Jumlah isu terbuka menentukan kategori beban anggota.</p>
          </div>
          <span class="settings-role-chip"
            ><Icon name="shield" :size="14" />Khusus Admin</span
          >
        </div>
        <div class="settings-band-grid">
          <div class="settings-band low">
            <div class="settings-band-head">
              <span>Beban ringan</span
              ><span class="settings-band-pill"
                >≤ {{ thresholds.lowMax }} isu</span
              >
            </div>
            <p>
              Anggota dengan isu sampai angka ini masuk kategori ringan dan
              punya kapasitas untuk tugas baru.
            </p>
            <div class="setting-field">
              <label for="low-max">Batas beban ringan</label>
              <div>
                <input
                  id="low-max"
                  v-model.number="thresholds.lowMax"
                  type="number"
                  min="1"
                  step="1"
                /><span>isu</span>
              </div>
            </div>
          </div>
          <div class="settings-band medium">
            <div class="settings-band-head">
              <span>Beban sedang</span
              ><span class="settings-band-pill"
                >{{ thresholds.lowMax + 1 }}–{{ thresholds.mediumMax }}
                isu</span
              >
            </div>
            <p>
              Di atas batas ringan sampai angka ini, kapasitas dinilai optimal
              untuk ritme kerja standar.
            </p>
            <div class="setting-field">
              <label for="medium-max">Batas beban sedang</label>
              <div>
                <input
                  id="medium-max"
                  v-model.number="thresholds.mediumMax"
                  type="number"
                  min="2"
                  step="1"
                /><span>isu</span>
              </div>
            </div>
          </div>
          <div class="settings-band high">
            <div class="settings-band-head">
              <span>Beban tinggi</span
              ><span class="settings-band-pill"
                >&gt; {{ thresholds.mediumMax }} isu</span
              >
            </div>
            <p>
              Peringatan potensi kelelahan atau hambatan review pull request.
              Kategori ini dihitung otomatis dari batas sedang.
            </p>
          </div>
          <div class="settings-band stale">
            <div class="settings-band-head">
              <span>Usia isu mengendap</span
              ><span class="settings-band-pill"
                >{{ thresholds.staleDays }} hari</span
              >
            </div>
            <div class="setting-field">
              <label for="stale-days"
                ><Icon name="clock" :size="16" />Usia isu mengendap<small
                  >Isu terbuka yang lebih tua akan ditandai.</small
                ></label
              >
              <div>
                <input
                  id="stale-days"
                  v-model.number="thresholds.staleDays"
                  type="number"
                  min="1"
                  step="1"
                /><span>hari</span>
              </div>
            </div>
          </div>
        </div>
        <p v-if="!valid" class="validation-error" role="alert">
          Gunakan bilangan bulat positif. Batas ringan harus lebih kecil dari
          batas sedang.
        </p>
        <div class="form-footer">
          <button
            class="button secondary"
            @click="
              Object.assign(
                thresholds,
                workspace.preview
                  ? { lowMax: 3, mediumMax: 7, staleDays: 30 }
                  : saved,
              )
            "
          >
            <Icon name="refresh" :size="16" />Reset</button
          ><button
            v-if="!workspace.preview"
            class="button primary"
            :disabled="saving || !valid"
            @click="save"
          >
            <Icon name="check" :size="17" />{{
              saving ? "Menyimpan…" : "Simpan perubahan"
            }}
          </button>
        </div>
        <p class="panel-footnote">
          {{
            workspace.preview
              ? "Simulasi tidak mengubah pengaturan atau data asli."
              : "Pengaturan berlaku untuk seluruh workspace setelah disimpan."
          }}
        </p>
      </section>
      <section class="simulation-panel">
        <div class="eyebrow">SEE THE IMPACT</div>
        <h2>Aturan yang mudah dipahami</h2>
        <p>
          {{
            workspace.preview
              ? "Lihat dampaknya langsung pada 14 anggota contoh."
              : "Rentang kategori yang akan diterapkan pada data anggota."
          }}
        </p>
        <div class="simulation-bands">
          <button
            v-for="level in levels"
            :key="level"
            :disabled="!workspace.preview || !valid"
            @click="category = level"
          >
            <span class="badge" :class="level"
              ><span class="level-dot" :class="level"></span
              >{{ levelLabels[level] }}</span
            >
            <div>
              <strong
                >{{
                  level === "low"
                    ? "≤ " + thresholds.lowMax
                    : level === "medium"
                      ? thresholds.lowMax + 1 + "–" + thresholds.mediumMax
                      : "> " + thresholds.mediumMax
                }}
                isu</strong
              ><small v-if="workspace.preview"
                >{{
                  previewMembers.filter(
                    (member) => band(member.currentLoad) === level,
                  ).length
                }}
                anggota contoh</small
              >
            </div>
            <Icon v-if="workspace.preview" name="arrow" :size="17" />
          </button>
        </div>
        <div class="simulation-note">
          <Icon name="clock" :size="22" />
          <div>
            <strong>{{
              workspace.preview
                ? previewIssues.filter(
                    (issue) => issue.ageDays > thresholds.staleDays,
                  ).length + " isu contoh mengendap"
                : "Usia isu > " + thresholds.staleDays + " hari"
            }}</strong>
            <p>Jadikan isu lama sebagai bahan tinjauan prioritas tim.</p>
          </div>
        </div>
      </section>
    </div>
    <Modal
      v-if="category"
      :title="'Anggota dengan beban ' + levelLabels[category].toLowerCase()"
      description="Hasil simulasi menggunakan data contoh."
      @close="category = undefined"
      ><div class="detail-list">
        <button
          v-for="member in simulated"
          :key="member.memberId"
          class="detail-row"
          @click="
            selected = member.memberId;
            category = undefined;
          "
        >
          <Avatar :name="member.name" />
          <div>
            <strong>{{ member.name }}</strong
            ><small>{{ member.currentLoad }} isu terbuka</small>
          </div>
          <Icon name="arrow" :size="18" />
        </button>
        <div v-if="!simulated.length" class="compact-empty">
          Tidak ada anggota pada kategori ini.
        </div>
      </div></Modal
    ><MemberDialog
      v-if="selected"
      :member-id="selected"
      @close="selected = ''"
    />
  </div>
</template>
