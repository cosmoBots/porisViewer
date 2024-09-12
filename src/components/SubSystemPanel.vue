<template>
  <div class="subsystem-panel">
    <h3 class="title" v-if="subsystem.label != '-'">
      {{ subsystem.label || subsystem.name }}
    </h3>

    <div class="mode-selector" v-if="(subsystem.getValidModes().length > 1) && !subsystem.hasValues || (subsystem.getValidModes().length > 0) && (!subsystem.hasSubsystems || subsystem.currentMode.modesNodes.length == 0)">
      <ModeSelector v-model="subsystem.candidateMode" :modes="subsystem.getValidModes()" />
    </div>

    <InputSystemPanel
      v-if="(subsystem.currentMode && !subsystem.hasSubsystems)"
      :subsystem="subsystem"
      :modes="subsystem.getValidModes()"
      :mode="subsystem.currentMode"
    />
    <template v-for="sub in subsystem.getActiveSubsystems()" :key="sub.id">
      <SubSystemPanel :system="sub" v-if="!sub.hasValues && sub.modesNodes.length > 0"/>
      <InputSystemPanel
        v-if="sub.hasModes && sub.hasValues && sub.currentMode != null"
        :subsystem="sub"
        :modes="sub.getValidModes()"
        :mode="sub.currentMode"/>
    </template>
  </div>
</template>
<script setup>
import { intersection as _intersection } from 'lodash-es'
import { ref, computed, watch } from 'vue'  
import { useModelStore } from '@/stores/model'
import ModeSelector from './ModeSelector.vue'

import InputSystemPanel from './InputSystemPanel.vue'

const store = useModelStore()

const props = defineProps({
  system: {
    type: Object,
    required: false
  }
})

const system = ref(props.system)
const subsystem = system.value
subsystem.candidateMode = subsystem.currentMode

//console.log(`SubSystem name: ${subsystem.name}, ident: ${subsystem.ident} props.isRoot: ${props.isRoot}`)

const modes = computed(() => {
    //console.log(`querying validModes for ${subsystem.name}: ${subsystem.getValidModes()}`)
    return subsystem.getValidModes()
})



watch(subsystem.candidateMode,(newMode) => {
  console.log(`watch.mode. mode ${subsystem.currentMode?.name}, newMode :${subsystem.candidateMode?.name}`)
  if (subsystem.candidateMode != null && subsystem.candidateMode != subsystem.currentMode)
  {
    store.setValidMode(subsystem, subsystem.candidateMode)
    //console.log(`watch result >> ${subsystem.currentMode.name}`)
  }
  
})

</script>
<style lang="scss" scoped>
.subsystem-panel {
  background-color: rgba(204, 204, 204, 0.2);
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px;
  margin: 8px;

  .title {
    font-weight: bold;
  }
}
</style>
