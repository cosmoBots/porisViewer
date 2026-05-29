<template>
  <div class="poris-main">
    <div v-if="isLoading" class="loading">
      <span class="spinner"></span>
    </div>
    <div v-else-if="rootSubsystem" class="panel">
      <h2 class="title">{{ rootSubsystem.name }} Panel</h2>

      <SubSystemPanel :system="rootSubsystem" />
    </div>
  </div>
</template>
<script setup>
import SubSystemPanel from '../components/SubSystemPanel.vue'

import { computed } from 'vue'
import { useModelStore } from '@/stores/model'
const store = useModelStore()

const isLoading = computed(() => store.isLoading)
const rootSubsystem = computed(() => store.rootSubsystem)

const props = defineProps({
  modelPath: {
    type: String
  }
})

if (props.modelPath) {
  store.loadModelURL(props.modelPath)
}
</script>
<style scoped lang="scss">
.poris-main {
  max-width: 40em;
}

.loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: #666;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e0e0e0;
  border-top-color: #666;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>