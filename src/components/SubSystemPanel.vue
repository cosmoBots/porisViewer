<template>
  <div class="subsystem-panel" v-if="shallShowThisSystem(subsystem)">
    <h3 class="title" v-if="subsystem.label != '-'">
      {{ subsystem.label || subsystem.name }}
    </h3>

    <div class="mode-selector" v-if="shallShowModeSelector(subsystem)">
      <ModeSelector v-model="subsystem.candidateMode" :modes="subsystem.getValidModes()" />
    </div>

    <!--{{ "(s)shall_show_input_panel #: " + shallShowInputPanel(subsystem) }}-->
    <InputSystemPanel v-if="shallShowInputPanel(subsystem)" :subsystem="subsystem" :modes="subsystem.getValidModes()"
      :mode="subsystem.currentMode" />

    <template v-for="sub in subsystem.getActiveSubsystems()" :key="sub.id">
    <!--  {{ "(sub)has_values: " + sub.hasValues }} /
      {{ "(sub)has_real_values: " + sub.hasRealValues }} /
      {{ "(sub)valid_modes #: " + sub.getValidModes().length }}
      {{ "(sub)has_sub_systems #: " + sub.hasSubsystems }}
      {{ "(sub)fake_param #: " + fakeParam(sub) }}
      {{ "(sub)shall_show_subpanel #: " + shallShowSubPanels(subsystem, sub) }}-->

      <SubSystemPanel :system="sub" v-if="shallShowSubPanels(subsystem, sub)" />
      <!--{{ "(sub)shall_show_sub_inputpanel #: " + shallShowInputPanel(sub) }}-->
      <InputSystemPanel v-if="shallShowInputPanel(sub)" :subsystem="sub" :modes="sub.getValidModes()"
      :mode="sub.currentMode" />

    </template>
  </div>
</template>
<script setup>
import { intersection as _intersection } from 'lodash-es'
import { ref, computed, watch } from 'vue'
import { useModelStore } from '@/stores/model'
import ModeSelector from './ModeSelector.vue'

import InputSystemPanel from './InputSystemPanel.vue'

function fakeParam(s) {
  return (!s.hasSubSystems && !s.hasRealValues && s.hasValues && s.currentMode.hasValues)
}

function shallShowSubPanels(s0, s1) {
  return !s0.hasRealValues && !shallShowInputPanel(s1)
}

function shallShowInputPanel(s) {
  return s.hasRealValues || fakeParam(s)
}

function shallShowModeSelector(s) {
  return (s.getValidModes().length > 1) //|| (!s.hasRealValues && s.hasValues && s.getValidModes().length > 0)
}

function shallShowThisSystem(s) {
  return s.getValidModes().length > 0
}

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



watch(subsystem.candidateMode, (newMode) => {
  console.log(`watch.mode. mode ${subsystem.currentMode?.name}, newMode :${subsystem.candidateMode?.name}`)
  if (subsystem.candidateMode != null && subsystem.candidateMode != subsystem.currentMode) {
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
