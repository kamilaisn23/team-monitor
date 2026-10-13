<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import Icon from "./Icon.vue";
import type { Team } from "../types";

const props = defineProps<{ modelValue: string; teams: Team[] }>();
const emit = defineEmits<{
  "update:modelValue": [value: string];
  change: [];
}>();
const trigger = ref<HTMLButtonElement>();
const menu = ref<HTMLDivElement>();
const open = ref(false);
const menuStyle = ref({ left: "0px", top: "0px", width: "300px", maxHeight: "400px" });
const options = computed(() => [
  { id: "", name: "Seluruh tim", detail: "Pantau semua tim sekaligus" },
  ...props.teams.map((team) => ({
    id: team.id,
    name: team.name,
    detail: team.memberCount === undefined ? "Fokus pada tim ini" : `${team.memberCount} anggota`,
  })),
]);
const selected = computed(() => options.value.find((option) => option.id === props.modelValue) || options.value[0]!);

function positionMenu() {
  const rect = trigger.value?.getBoundingClientRect();
  if (!rect) return;
  const width = Math.min(Math.max(rect.width, 300), window.innerWidth - 24);
  const desiredHeight = Math.min(380, 60 + options.value.length * 66);
  const below = window.innerHeight - rect.bottom - 20;
  const above = rect.top - 20;
  const upward = below < desiredHeight && above > below;
  const height = Math.min(desiredHeight, Math.max(100, upward ? above : below));
  menuStyle.value = {
    left: `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`,
    top: `${upward ? Math.max(12, rect.top - height - 8) : rect.bottom + 8}px`,
    width: `${width}px`,
    maxHeight: `${height}px`,
  };
}
function focusOption(index: number) {
  const buttons = menu.value?.querySelectorAll<HTMLButtonElement>("[role=option]");
  if (!buttons?.length) return;
  buttons[Math.max(0, Math.min(index, buttons.length - 1))]?.focus();
}
async function showMenu(last = false) {
  open.value = true;
  positionMenu();
  await nextTick();
  focusOption(last ? options.value.length - 1 : options.value.findIndex((option) => option.id === props.modelValue));
}
function closeMenu(restoreFocus = false) {
  open.value = false;
  if (restoreFocus) trigger.value?.focus();
}
function choose(id: string) {
  emit("update:modelValue", id);
  emit("change");
  closeMenu(true);
}
function onMenuKey(event: KeyboardEvent) {
  const buttons = Array.from(menu.value?.querySelectorAll("[role=option]") || []);
  const index = buttons.indexOf(document.activeElement as Element);
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    focusOption(index + (event.key === "ArrowDown" ? 1 : -1));
  } else if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    focusOption(event.key === "Home" ? 0 : options.value.length - 1);
  } else if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    closeMenu(true);
  } else if (event.key === "Tab") {
    closeMenu(true);
  }
}
function dismissOutside(event: Event) {
  if (!open.value) return;
  const target = event.target as Node;
  if (!trigger.value?.contains(target) && !menu.value?.contains(target)) closeMenu();
}
function onScroll(event: Event) {
  if (open.value && !menu.value?.contains(event.target as Node)) positionMenu();
}
onMounted(() => {
  document.addEventListener("pointerdown", dismissOutside);
  document.addEventListener("focusin", dismissOutside);
  window.addEventListener("resize", positionMenu);
  document.addEventListener("scroll", onScroll, true);
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", dismissOutside);
  document.removeEventListener("focusin", dismissOutside);
  window.removeEventListener("resize", positionMenu);
  document.removeEventListener("scroll", onScroll, true);
});
</script>

<template>
  <button
    id="scope-team"
    ref="trigger"
    class="team-scope-trigger"
    :class="{ 'is-open': open }"
    type="button"
    aria-label="Pilih cakupan tim"
    aria-haspopup="listbox"
    :aria-expanded="open"
    aria-controls="team-scope-options"
    @click="open ? closeMenu() : showMenu()"
    @keydown.down.prevent="showMenu()"
    @keydown.up.prevent="showMenu(true)"
    @keydown.esc.prevent="closeMenu(true)"
  >
    <span class="team-scope-trigger-icon"><Icon name="filter" :size="17" /></span>
    <span class="team-scope-trigger-name">{{ selected.name }}</span>
    <Icon class="team-scope-chevron" name="down" :size="15" />
  </button>
  <Teleport to="body">
    <div v-if="open" ref="menu" class="team-scope-menu" :style="menuStyle" @keydown="onMenuKey">
      <div class="team-scope-menu-heading">
        <span>Pilih cakupan</span><span>{{ teams.length }} tim</span>
      </div>
      <div id="team-scope-options" role="listbox" aria-label="Cakupan pemantauan tim" class="team-scope-options">
        <button
          v-for="option in options"
          :key="option.id"
          type="button"
          role="option"
          tabindex="-1"
          :aria-selected="option.id === modelValue"
          class="team-scope-option"
          :class="{ 'is-selected': option.id === modelValue, 'all-teams': !option.id }"
          @click="choose(option.id)"
        >
          <span class="team-scope-option-icon"><Icon :name="option.id ? 'teams' : 'grid'" :size="18" /></span>
          <span class="team-scope-option-copy"><strong>{{ option.name }}</strong><small>{{ option.detail }}</small></span>
          <Icon v-if="option.id === modelValue" name="check" :size="17" class="team-scope-check" />
        </button>
      </div>
    </div>
  </Teleport>
</template>
