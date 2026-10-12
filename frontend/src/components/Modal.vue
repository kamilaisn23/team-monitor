<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, useId } from "vue";
import Icon from "./Icon.vue";
defineProps<{ title: string; description?: string }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement>();
const headingId = useId();
function backdrop(event: MouseEvent) {
  if (event.target === dialog.value) {
    const rect = dialog.value.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      emit("close");
  }
}
onMounted(() => {
  dialog.value?.showModal();
});
onBeforeUnmount(() => dialog.value?.close());
</script>
<template>
  <Teleport to="body"
    ><dialog
      ref="dialog"
      class="detail-modal"
      :aria-labelledby="headingId"
      @cancel.prevent="emit('close')"
      @click="backdrop"
    >
      <div class="modal-heading">
        <div>
          <div class="eyebrow">TEAM MONITOR</div>
          <h2 :id="headingId">{{ title }}</h2>
          <p v-if="description">{{ description }}</p>
        </div>
        <button
          class="icon-button"
          aria-label="Tutup detail"
          @click="emit('close')"
        >
          <Icon name="close" />
        </button>
      </div>
      <div class="modal-body"><slot /></div></dialog
  ></Teleport>
</template>
