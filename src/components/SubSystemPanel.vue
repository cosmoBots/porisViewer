<template>
  <div class="subsystem-panel">
    <h3 class="title" v-if="true">
      {{ subsystem.name }} / {{ subsystem.id }}
    </h3>
    <span v-else>{{ subsystem.id }}</span>

    <div class="mode-selector" v-if="(true || modes.length > 1) && subsystem.hasSubsystems">
      <ModeSelector v-model="mode" :modes="modes" />
    </div>

    <InputSystemPanel
      v-if="mode && !subsystem.hasSubsystems"
      :subsystem="subsystem"
      :modes="modes"
      :mode="mode"
    />

    <template v-for="sub in subSubsystems" :key="sub.id">
      {{ subsystem.id }}
      {{ sub.id }}
      <SubSystemPanel v-if="sub.hasSubsystems" :subsystems="[...props.subsystems, sub]" />
      <InputSystemPanel
        v-if="sub.hasModes && sub.hasValues && validMode(sub,mode) != null"
        :subsystem="sub"
        :modes="sub.modesNodes"
        :mode="validMode(sub,mode)"
      />
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

// subsystemas dentro del modo actual que tienen este modo como opción
const subSubsystems = computed(() => {
  if (mode.value != null && mode.value.hasModes && subsystem.value.hasSubsystems) {
    let listOfSubsystems = subsystem.value.subsystemsNodes.filter((sub) => { 
      let ret = sub.hasModes
      console.log(`\n\nChecking for subsystem: ${sub.name} of system: ${subsystem.value.name}?`)
      if (ret)
      {
        ret = false
        mode.value.modesNodes.forEach(m => 
        { 
            console.log(`active submode: ${m.name} of mode ${mode.value.name}?`)
            sub.modesNodes.forEach(sm => 
            {
              console.log(`check against mode of subsystem: ${sm.name} ?`)
              ret = ret || (m == sm)
              console.log(`this found ${ret}`)
            })
            console.log(`found ${ret}`)
        });
        //ret = ret && _intersection(sub.modesNodes, mode.value.modesNodes).length > 0
      }
      console.log(`return will be ${ret}`)
      return ret
    })
    listOfSubsystems.forEach( ss => {
      console.log(`activeSubSubsystem: ${ss.name}`)
    })
    return listOfSubsystems
  } else {
    console.log(`SubSub mode.id: ${mode.value?.id} [VACIO]`)
    return []
  }
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

function validMode(s, parentMode) {
  let ret = null
  console.log(`validModes for parantMode ${parentMode.name} and subsystem ${s.name}`)
  parentMode.modesNodes.forEach(m => {
    console.log(`checking parentMode submode ${m.name}`)
    s.modesNodes.forEach(sm => {
      console.log(`checking subsystem submode ${sm.name}`)
      if (m == sm)
      {
        console.log("AAAAAAAAAAAAAAAAAA")
        ret = sm
      }
    })
  })
  if (ret == null)
  {
    console.log("OOOOOOOOOOOOOOOOO")
  }
  return ret
}

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

console.log(`sub ${subsystem.value?.id}, initial mode: ${mode.value?.id}`)
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
