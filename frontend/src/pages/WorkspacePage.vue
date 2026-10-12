<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import Dashboard from "./Dashboard.vue";
import Reports from "./Reports.vue";
import Members from "./Members.vue";
import Teams from "./Teams.vue";
import Repositories from "./Repositories.vue";
import Settings from "./Settings.vue";
const route = useRoute();
const views = {
  dashboard: Dashboard,
  reports: Reports,
  members: Members,
  teams: Teams,
  repositories: Repositories,
  settings: Settings,
};
const section = computed(
  () => String(route.query.section || "dashboard") as keyof typeof views,
);
const component = computed(() => views[section.value] || Dashboard);
</script>
<template><component :is="component" /></template>
