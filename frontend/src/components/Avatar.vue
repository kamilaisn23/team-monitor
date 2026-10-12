<script setup lang="ts">
import { initials } from "../types";
withDefaults(
  defineProps<{ name: string; image?: string | null; size?: string }>(),
  { size: "" },
);
</script>
<template>
  <span class="avatar" :class="size"
    ><img
      v-if="image"
      :src="image"
      alt=""
      loading="lazy"
      @error="($event.target as HTMLImageElement).style.display = 'none'"
    /><span>{{ initials(name) }}</span></span
  >
</template>
