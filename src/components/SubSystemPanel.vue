<template>
  <div class="subsystem-panel">
    <h3 class="title" v-if="true">
      {{ subsystem.name }} / {{ subsystem.id }} 
      / {{ subsystem.currentMode.name}} / {{ subsystem.getActiveSubsystems().length}}
    </h3>
    <span v-else>{{ subsystem.id }}</span>

    <div class="mode-selector" v-if="true || (subsystem.getValidModes().length > 1) && subsystem.hasSubsystems">
      <ModeSelector v-model="subsystem.candidateMode" :modes="subsystem.getValidModes()" />
    </div>

    <InputSystemPanel
      v-if="(subsystem.currentMode && !subsystem.hasSubsystems)"
      :subsystem="subsystem"
      :modes="subsystem.getValidModes()"
      :mode="subsystem.currentMode"
    />
    {{ subsystem.getActiveSubsystems().length }}
    <template v-for="sub in subsystem.getActiveSubsystems()" :key="sub.id">
      {{ subsystem.id }}
      {{ sub.id }}
      {{ subsystem.currentMode.name }}
      <SubSystemPanel v-if="true || sub.hasSubsystems" :system="sub" />
      ii
      <!--InputSystemPanel
        v-if="true || sub.hasModes && sub.hasValues && validMode(sub,mode) != null"
        :subsystem="sub"
      /-->
    </template>
    fin
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
    console.log(`querying validModes for ${subsystem.name}: ${subsystem.getValidModes()}`)
    return subsystem.getValidModes()
})

function updateMode(newMode, oldMode) {
  console.log(`updateMode: isRoot: ${props.isRoot}, newMode: ${newMode?.id}, oldMode: ${oldMode?.id}`)
    console.log("setValidMode inside updateNode")
    store.setValidMode(subsystem, newMode)
}

watch(modes, (newModes) => {
  console.log(`watch.modes, newModes :`, newModes)
  const oldMode = subsystem.currentMode
  if (!oldMode || !newModes.includes(oldMode)) {
    store.setValidMode(subsystem, oldMode)
  } 
})

watch(subsystem.candidateMode,(newMode) => {
  console.log(`watch.mode. mode ${subsystem.currentMode?.name}, newMode :${subsystem.candidateMode?.name}`)
  if (subsystem.candidateMode != subsystem.currentMode)
  {
    store.setValidMode(subsystem, subsystem.candidateMode)
  }
  
})

</script>
<style lang="scss" scoped>
.subsystem-panel {
  background-color: rgba(204, 204, 204, 0.5);
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px;
  margin: 8px;

  .title {
    font-weight: bold;
  }
}
</style>
