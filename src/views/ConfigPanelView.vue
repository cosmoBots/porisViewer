<template>
  <main>
    <div v-if="rootSubsystem" class="panel">
      <h2 class="title">{{ rootSubsystem.name }} Panel</h2>

      <SubSystemPanel :system="rootSubsystem" :isRoot="true" />
    </div>
  </main>
</template>
<script setup>
import SubSystemPanel from '../components/SubSystemPanel.vue'

import { computed } from 'vue'
import { useModelStore } from '@/stores/model'

const store = useModelStore()

const rootSubsystem = computed(() => store.rootSubsystem)
</script>

<style lang="scss" scoped>
.panel {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px;
  max-width: fit-content;
  min-width: 40em;
  
  .title {
    font-weight: bold;
  }
}
</style>
