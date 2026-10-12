<script setup lang="ts">
import Icon from "./Icon.vue";
withDefaults(
  defineProps<{
    label: string;
    value: number | string;
    detail: string;
    icon: string;
    tone?: string;
    active?: boolean;
  }>(),
  { tone: "blue" },
);
defineEmits<{ click: [] }>();
</script>
<template>
  <button
    class="metric-card"
    :class="[tone, { selected: active }]"
    :aria-label="'Lihat detail ' + label.toLowerCase()"
    :aria-pressed="active"
    @click="$emit('click')"
  >
    <div class="metric-top">
      <span>{{ label }}</span
      ><span class="metric-icon"><Icon :name="icon" :size="21" /></span>
    </div>
    <strong class="metric-value">{{ value }}</strong>
    <div class="metric-bottom">
      <span>{{ detail }}</span
      ><Icon name="arrow" :size="18" />
    </div>
  </button>
</template>
