<script setup lang="ts">
withDefaults(
  defineProps<{ eyebrow?: string; title: string; description: string }>(),
  { eyebrow: "WORKSPACE OVERVIEW" },
);
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow"><span></span>{{ eyebrow }}</div>
      <h1>{{ title }}<span class="title-dot">.</span></h1>
      <p>{{ description }}</p>
    </div>
    <div class="heading-actions"><slot /></div>
  </div>
</template>
