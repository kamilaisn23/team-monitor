<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import Icon from "./Icon.vue";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLElement | null>(null);

function close() {
  emit("close");
}
function onKey(event: KeyboardEvent) {
  if (event.key === "Escape") close();
}
watch(
  () => props.open,
  async (open) => {
    if (open) {
      document.addEventListener("keydown", onKey);
      await nextTick();
      dialog.value?.focus();
    } else {
      document.removeEventListener("keydown", onKey);
    }
  },
);
onBeforeUnmount(() => document.removeEventListener("keydown", onKey));
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="admin-preview-backdrop"
      role="presentation"
      @click.self="close"
    >
      <section
        ref="dialog"
        class="admin-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-preview-title"
        tabindex="-1"
      >
        <header>
          <div>
            <Icon name="shield" :size="18" />
            <h2 id="admin-preview-title">Panel Administrasi (/admin)</h2>
          </div>
          <button aria-label="Tutup" @click="close">
            <Icon name="close" :size="17" />
          </button>
        </header>
        <div class="admin-preview-body">
          <span class="admin-preview-symbol"><Icon name="shield" :size="23" /></span>
          <small>Role: superadmin &amp; admin · placeholder</small>
          <h3>Halaman admin / superadmin</h3>
          <p>
            Halaman ini berada di luar cakupan peran Manager dan Developer.
            Pada build ini, area admin tersedia melalui menu workspace untuk
            akun yang memiliki hak akses.
          </p>
        </div>
        <footer>
          <button class="admin-preview-close" @click="close">Tutup</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.admin-preview-backdrop {
  position: fixed;
  inset: 0;
  z-index: 130;
  display: grid;
  place-items: center;
  padding: 18px;
  background: #111d38b8;
  backdrop-filter: blur(4px);
}
.admin-preview {
  width: min(430px, 100%);
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: #fff;
  color: var(--ink);
  box-shadow: 0 26px 80px #0b17305c;
}
.admin-preview header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
  background: #f8fbff;
}
.admin-preview header > div { display: flex; align-items: center; gap: 8px; }
.admin-preview header svg { color: #6d7f99; }
.admin-preview h2 { font-size: 13px; }
.admin-preview header button {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: var(--muted);
}
.admin-preview header button:hover { background: #eef3fa; color: var(--ink); }
.admin-preview-body {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 28px 24px;
  text-align: center;
}
.admin-preview-symbol {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #edf1f7;
  color: #7a8ba2;
}
.admin-preview-body small {
  padding: 3px 9px;
  border-radius: 5px;
  background: #edf1f7;
  color: #5f7088;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}
.admin-preview-body h3 { font-size: 15px; }
.admin-preview-body p { color: var(--muted); font-size: 11px; line-height: 1.75; }
.admin-preview-footer, .admin-preview footer {
  display: flex;
  justify-content: flex-end;
  padding: 14px 18px;
  border-top: 1px solid var(--line);
  background: #f8fbff;
}
.admin-preview-close {
  padding: 9px 16px;
  border-radius: 10px;
  background: #4368ed;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}
.admin-preview-close:hover { background: #3557ba; }
</style>
