<script setup lang="ts">
import { computed } from "vue";
import Icon from "./Icon.vue";
const props = withDefaults(
  defineProps<{ page: number; total: number; limit?: number }>(),
  { limit: 10 },
);
const emit = defineEmits<{ change: [page: number] }>();
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.limit)));
</script>
<template>
  <div class="table-footer">
    <span
      >{{ total ? (page - 1) * limit + 1 : 0 }}–{{
        Math.min(page * limit, total)
      }}
      dari <strong>{{ total }}</strong> hasil</span
    >
    <div class="pagination">
      <button
        class="icon-button"
        :disabled="page <= 1"
        aria-label="Halaman sebelumnya"
        @click="emit('change', page - 1)"
      >
        <Icon name="previous" :size="18" /></button
      ><span
        >{{ page }} <small>/ {{ pages }}</small></span
      ><button
        class="icon-button"
        :disabled="page >= pages"
        aria-label="Halaman berikutnya"
        @click="emit('change', page + 1)"
      >
        <Icon name="next" :size="18" />
      </button>
    </div>
  </div>
</template>
