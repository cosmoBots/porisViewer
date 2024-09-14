<template>
  <main>
    <div v-if="rootSubsystem" class="panel">
      <h2 class="title">{{ rootSubsystem.name }} Panel</h2>

      <SubSystemPanel :system="rootSubsystem" />
    </div>
  </main>
</template>
<script setup>
import SubSystemPanel from '../components/SubSystemPanel.vue'

import { computed } from 'vue'
import { useModelStore } from '@/stores/model'
const store = useModelStore()

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
