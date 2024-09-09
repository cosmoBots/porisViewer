<template>
  <div class="panel">
    <h3 class="title" v-if="subsystem.label != '-'">
      {{ subsystem.label || subsystem.name }} / {{ subsystem.id }}
    </h3>

    <ModeSelector v-if="modes.length > 1" v-model="mode" :modes="modes" />

    <InputSystemPanel v-if="mode" :subsystem="subsystem" :mode="mode" />

    <template v-for="sub in subSubsystems" :key="sub.id">
      <sub-system-panel v-if="sub.hasSubsystems" :subsystems="[...props.subsystems, sub]" />
      <InputSystemPanel
        v-else-if="mode"
        :subsystems="[...props.subsystems, sub]"
        :modes="store.getValidObjModes(mode)"
      />
    </template>
  </div>
</template>
<script setup>
import { ref, computed, watch } from 'vue'
import { useModelStore } from '@/stores/model'
import ModeSelector from './ModeSelector.vue'

import InputSystemPanel from './InputSystemPanel.vue'

const store = useModelStore()

const props = defineProps({
  subsystems: {
    type: Array,
    required: true
  },
  isRoot: {
    type: Boolean,
    default: false
  }
})

const mode = ref()

const subsystem = computed(() => {
  return props.subsystems[props.subsystems.length - 1]
})

const subSubsystems = computed(() => {
  return subsystem.value.subsystemsNodes.filter((sub) => store.hasValidObjModes(sub))
})

//console.log(`SubSystem name: ${subsystem.value.name}, ident: ${subsystem.value.ident} props.isRoot: ${props.isRoot}`)

const modes = computed(() => {
  //console.log(`modes for props.subsystem.id: ${subsystem.value.id}, isRoot: ${props.isRoot}`)
  if (props.isRoot) {
    return subsystem.value.modesNodes
  } else {
    return store.getValidObjModes(subsystem.value)
  }
})

//console.log(`mode: ${mode.value?.ident}, modes :`, modes)

function updateMode(newMode, oldMode) {
  //console.log(`updateMode: isRoot: ${props.isRoot}, newMode: ${newMode?.id}, oldMode: ${oldMode?.id}`)
  if (props.isRoot) {
    store.setValidMode(subsystem.value, newMode)
  } else {
    store.addValidMode(subsystem.value, newMode, oldMode)
  }
}

watch(modes, (newModes) => {
  //console.log(`watch.modes. mode ${mode.value?.id}, newModes.includes(mode.value): ${newModes.includes(mode.value)}, newModes :`, newModes)
  const oldMode = mode.value
  if (!oldMode || !newModes.includes(oldMode)) {
    mode.value = subsystem.value.defaultMode
  } else {
    if (!props.isRoot) {
      updateMode(mode.value, oldMode)
    }
  }
})

watch(mode, updateMode)
/*
watch(props.subsystem, (newSubSystem) => {
  console.log(`watch.props.subsystem ${newSubSystem.id}`)
})
*/

// default initial value
if (modes.value.length) {
  if (subsystem.value.defaultModeId) {
    mode.value = modes.value.find((m) => m.id === subsystem.value.defaultModeId)
  } else {
    mode.value = modes.value[0]
  }
}

console.log(`sub ${subsystem.value.id}, initial mode: ${mode.value.id}`)
</script>
<style lang="scss" scoped>
.panel {
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
