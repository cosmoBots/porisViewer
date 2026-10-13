<template>
  <div class="subsystem-panel" v-if="shallShowThisSystem(subsystem)">
    <div class="subsystem-heading">
      <h3 class="title" v-if="subsystem.label != '-'">
        {{ subsystem.label || subsystem.name }}
      </h3>
      <div v-if="subsystem.commandsNodes?.length" class="command-buttons">
        <button
          v-for="command in subsystem.commandsNodes"
          :key="command.id"
          type="button"
          data-poris-command
          @click="launchCommand(command, $event)"
        >
          {{ command.label || command.name }}
        </button>
      </div>
    </div>

    <!--<br/> s:{{  subsystem.name  }} <br/>-->
    <!--{{ "(s)validModes #: " + subsystem.name + " " + subsystem.getValidModes().length + " / " }}-->
    <!--{{  "(s)has_values #: " + subsystem.hasValues + " / " }}-->
    <!--{{  "(s)has_subsystems #: " + subsystem.hasSubsystems + " / " }}-->
    <!--"(sm)has_submodes #: " + subsystem.currentMode.hasModes  / -->
    <!--"(sub)fake_param_wnv: " + fakeParamWithNoValue(subsystem) -->
    <div class="mode-selector" v-if="shallShowModeSelector(subsystem)">
      <ModeSelector v-model="subsystem.candidateMode" :modes="subsystem.getValidModes()" />
    </div>
    <template v-for="sub in subsystem.getActiveSubnodes()" :key="sub.id">
      <!--<br/>------------------<br/>-->
      <!--{{ sub.name }}<br/>-->
      <!--{{ "(sub)has_values: " + sub.hasValues + " / " }}-->
      <!--"(sub)has_real_values: " + sub.hasRealValues  / -->
      <!--"(sub)valid_modes #: " + sub.getValidModes().length -->
      <!--"(sub)has_sub_systems: " + sub.hasSubsystems -->
      <!--"(sub)fake_param: " + fakeParam(sub) -->
      <!--"(sub)fake_param_wnv: " + fakeParamWithNoValue(sub) -->
      <!--{{ "(sub)shall_show_subpanel: " + shallShowSubPanels(sub) }}-->
      <SubSystemPanel
        :system="sub"
        v-if="shallShowSubPanels(sub)"
        @command-launched="emit('command-launched', $event)"
      />
      <!--sub.name  <br/-->
      <!--br/>------------------<br/-->

      <!--<br/>sub:{{ sub.name }}<br/>-->
      <InputSystemPanel
        v-if="shallShowInputPanel(sub)"
        :subsystem="sub"
        :modes="sub.getValidModes()"
        :mode="sub.currentMode"
        @command-launched="emit('command-launched', $event)"
      />
    </template>
  </div>
  <!--<br/>{{ "(sub)shall_show_inputpanel #: " + shallShowInputPanel(subsystem) }} -->
  <InputSystemPanel
    v-if="shallShowInputPanel(subsystem)"
    :subsystem="subsystem"
    :modes="subsystem.getValidModes()"
    :mode="subsystem.currentMode"
    @command-launched="emit('command-launched', $event)"
  />
</template>
<script setup>
import { ref, watch } from 'vue'
import { useModelStore } from '@/stores/model'
import { debugLog } from '@/utils/debug'
import ModeSelector from './ModeSelector.vue'

import InputSystemPanel from './InputSystemPanel.vue'

function fakeParam(s) {
  return !s.hasRealValues && s.hasValues && s.currentMode.hasValues
}

function fakeParamWithNoValue(s) {
  return !s.hasRealValues && !s.currentMode.hasValues && !s.currentMode.hasModes && !s.hasSubsystems
}

function shallShowSubPanels(s) {
  return !shallShowInputPanel(s) //!s0.hasRealValues && !(s1.hasRealValues || fakeParam(s1)) && !fakeParamWithNoValue(s0)
}

function shallShowInputPanel(s) {
  return s.hasRealValues || fakeParam(s) || fakeParamWithNoValue(s)
}

function shallShowModeSelector(s) {
  return (!s.currentMode.hasValues && !s.currentMode.hasModes) || s.getValidModes().length > 1
}

function shallShowThisSystem(s) {
  return s.getValidModes().length > 0 && !s.hasRealValues
}

const store = useModelStore()

const props = defineProps({
  system: {
    type: Object,
    required: false
  }
})

const emit = defineEmits(['command-launched'])

const system = ref(props.system)
const subsystem = system.value
subsystem.candidateMode = subsystem.currentMode

function launchCommand(command, event) {
  if (event.currentTarget.dataset.porisCommandCancelled === 'true') {
    delete event.currentTarget.dataset.porisCommandCancelled
    return
  }

  emit('command-launched', { systemName: subsystem.name, commandName: command.name })
}

//console.log(`SubSystem name: ${subsystem.name}, ident: ${subsystem.ident} props.isRoot: ${props.isRoot}`)

watch(() => subsystem.candidateMode, () => {
  debugLog(
    `watch.mode. mode ${subsystem.currentMode?.name}, newMode :${subsystem.candidateMode?.name}`
  )
  if (subsystem.candidateMode != null && subsystem.candidateMode != subsystem.currentMode) {
    store.setValidMode(subsystem, subsystem.candidateMode)
    debugLog(`watch result >> ${subsystem.currentMode.name}`)
  }
})
</script>
<style lang="scss">
.subsystem-panel {
  background-color: rgba(204, 204, 204, 0.05);
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px;
  margin: 2px;

  .subsystem-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .command-buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 4px;
  }

  .title {
    font-weight: bold;
  }
}
</style>
