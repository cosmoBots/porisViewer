import { ref, triggerRef } from 'vue'
// These reactivity internals are not exported from Vue's public entry point.
// eslint-disable-next-line vue/prefer-import-from-vue
import { pauseTracking, enableTracking } from '@vue/reactivity'
import { defineStore } from 'pinia'

import {
  VALUE_STRING_TYPE,
  VALUE_DOUBLE_RANGE_TYPE,
  VALUE_FILE_PATH_TYPE,
  VALUE_DATE_RANGE_TYPE
} from './porisNode'

import { xmlModelLoader } from '@/api/modelLoader'
import { parseToPorisModel } from './xmlParser'
import { debugLog } from '@/utils/debug'

export const useModelStore = defineStore('model', () => {
  const xmlModel = ref(null)
  const values = ref([])
  const modes = ref([])
  const subsystems = ref([])
  const rootSubsystem = ref()
  const isLoading = ref(false)

  const currentModes = ref([])

  const systemValues = ref({})

  function loadModel(modelName) {
    isLoading.value = true
    let doc = xmlModelLoader(`/models/${modelName}.xml`)
    doc.then((model) => {
      xmlModel.value = model

      let JSONmodel = parseToPorisModel(this, model)

      values.value = JSONmodel.values
      modes.value = JSONmodel.modes
      subsystems.value = JSONmodel.subsystems
      rootSubsystem.value = JSONmodel.rootSubsystem

      //console.log('LIMPIANDO valores por defecto')
      currentModes.value = []

      systemValues.value = {}

      //console.log('Initial setValidMode')
      setValidMode(JSONmodel.rootSubsystem)
    }).finally(() => {
      isLoading.value = false
    })
  }

  function loadModelURL(path) {
    isLoading.value = true
    let doc = xmlModelLoader(`${path}`)
    doc.then((model) => {
      xmlModel.value = model

      let JSONmodel = parseToPorisModel(this, model)

      values.value = JSONmodel.values
      modes.value = JSONmodel.modes
      subsystems.value = JSONmodel.subsystems
      rootSubsystem.value = JSONmodel.rootSubsystem

      //console.log('LIMPIANDO valores por defecto')
      currentModes.value = []

      systemValues.value = {}

      //console.log('Initial setValidMode')
      setValidMode(JSONmodel.rootSubsystem)
    }).finally(() => {
      isLoading.value = false
    })
  }

  function loadModelXML(xmlText) {
    isLoading.value = true
    Promise.resolve(xmlText).then((model) => {
      xmlModel.value = model

      let JSONmodel = parseToPorisModel(this, model)

      values.value = JSONmodel.values
      modes.value = JSONmodel.modes
      subsystems.value = JSONmodel.subsystems
      rootSubsystem.value = JSONmodel.rootSubsystem
      currentModes.value = []
      systemValues.value = {}
      setValidMode(JSONmodel.rootSubsystem)
    }).finally(() => {
      isLoading.value = false
    })
  }
  function getValue(id) {
    return values.value.find((element) => element.id == id)
  }

  function getMode(id) {
    return modes.value.find((element) => element.id == id)
  }

  function getSubsystem(id) {
    return subsystems.value.find((element) => element.id == id)
  }

  function setValidModeFrom(subsystem, mode, validModes) {
    subsystem.validModes = validModes
    let candidate = null
    if (validModes.length > 0) {
      if (mode != null && validModes.includes(mode)) {
        candidate = mode
      } else if (subsystem.parent == null && validModes.includes(subsystem.defaultMode)) {
        candidate = subsystem.defaultMode
      } else {
        candidate = validModes[0]
      }
    } else {
      candidate = subsystem.unknownMode || null
    }

    const changed = subsystem.currentMode !== candidate
    subsystem.currentMode = candidate
    subsystem.candidateMode = candidate
    currentModes.value[`${subsystem.id}`] = candidate

    // Re-evaluate state even when the mode object is unchanged: its eligible
    // value ranges and descendants may have changed with the parent context.
    // Values are attached to modes, not necessarily directly to the
    // subsystem. Reconcile every node so a child that falls back to Unknown
    // cannot retain the value it had in its previously active mode.
    getSystemValue(subsystem, candidate)
    if (subsystem.hasSubsystems) {
      subsystem.subsystemsNodes.forEach((child) => {
        setValidSubMode(child, child.currentMode, candidate)
      })
    }
    if (changed) debugLog(`PORIS mode changed for ${subsystem.name}: ${candidate?.name || 'none'}`)
    return candidate
  }

  /**
   * Internal function that does the actual mode setting without tracking
   */
  function setValidModeInternal(subsystem, mode) {
    debugLog(`setValidMode_ ${subsystem.name} ${mode?.name}, NOT using supermode`)
    let validModes = getValidObjModes(subsystem)
    debugLog(`   setValidMode validModes len ${validModes.length}`, validModes)

    return setValidModeFrom(subsystem, mode, validModes)
  }

  /**
   * Resets the whole tree of valid modes
   * Pauses Vue reactivity tracking during the recursive update to avoid
   * intermediate re-renders, then triggers a single update at the end.
   * @param {*} subsystem
   * @param {*} mode
   */
  function setValidMode(subsystem, mode) {
    pauseTracking()
    let result
    try {
      result = setValidModeInternal(subsystem, mode)
    } finally {
      enableTracking()
    }
    // Trigger a single update for the reactive refs after all changes are done
    triggerRef(currentModes)
    triggerRef(systemValues)
    return result
  }

  function setValidSubMode(subsystem, mode, supermode) {
    // console.log(`setValidMode_ ${subsystem.name} ${mode?.name}, using supermode`, supermode.name)
    const subsystemModeIds = new Set(subsystem.modesNodes.map((candidate) => candidate.id))
    // The supermode's destination order carries PORIS priority. Preserve it
    // while limiting the list to modes actually offered by this subsystem.
    let validModes = supermode.modesNodes.filter((candidate) => subsystemModeIds.has(candidate.id))
    /*
    validModes.forEach((m) => {
      debugLog(`setValidMode_ valid:`, m)
    })
    */
    debugLog(`   setValidMode validModes  len ${validModes.length}`, validModes)

    return setValidModeFrom(subsystem, mode, validModes)
  }

  function getCurrentMode(modeOptions) {
    const current = currentModes.value.reduce((accumulator, param) => {
      if (modeOptions.includes(param.id)) {
        return param
      }

      return accumulator
    }, null)

    if (current) {
      return current
    } else {
      return modeOptions[0]
    }
  }

  function getValidObjModes(obj) {
    // if (obj.id === 534) {
    // console.log(`getValidObjModes() obj.id: ${obj.id}`, obj)
    //console.log(`getValidObjModes() getObjModes`, getObjModes(obj))
    // console.log(`getValidObjModes() validModes`, validModes.value)
    // }

    /*
    debugLog(`obj: ${obj.name}`)
    debugLog(`objModes: ${obj.modesNodes}`)
    obj.modesNodes.forEach((m) => {
      debugLog(m.name)
    })
    */
    if (obj.parent != null && obj.parent.currentMode != null) {
      debugLog(`parent: ${obj.parent.name}`)
      debugLog(`parent mode: ${obj.parent.currentMode.name}`)
      debugLog(`parent.mode.submodes:`, obj.parent.currentMode.modesNodes)
      const childModeIds = new Set(obj.modesNodes.map((candidate) => candidate.id))
      return obj.parent.currentMode.modesNodes.filter((candidate) => childModeIds.has(candidate.id))
    } else if (obj.parent != null) {
      return []
    } else {
      return obj.modesNodes
    }
  }

  function hasValidObjModes(obj) {
    //console.log(`hasValidObjModes() id: ${obj.id}, ${getValidObjModes(obj).length > 0}`)
    return getValidObjModes(obj).length > 0
  }

  function setSystemValue(system, value, data) {
    // Keep the selected PORIS value and its editable data together. The
    // selected value determines which type/range validator applies.
    systemValues.value[`${system.id}`] = { value, data }
  }

  // Hydrate the browser model from the committed session state returned by
  // the PORIS runtime. Rows are ordered parent-first by the server.
  function applyRuntimeState(rows) {
    for (const row of rows || []) {
      const subsystem = getSubsystem(row.node_id)
      if (!subsystem) continue

      const mode = String(row.mode_id || '').startsWith('unknown:')
        ? subsystem.unknownMode
        : getMode(row.mode_id)
      const validModes = subsystem.getValidModes()
      if (mode && (validModes.includes(mode) || (mode === subsystem.unknownMode && validModes.length === 0))) {
        setValidMode(subsystem, mode)
      }

      if (row.value_id != null) {
        const value = getValue(row.value_id)
        const activeValues = subsystem.currentMode?.valuesNodes || []
        if (value && activeValues.some((candidate) => candidate.id == value.id)) {
          setSystemValue(subsystem, value, row.data)
        }
      }
    }
  }

  function getSystemValue(system, mode, requestedValue = null) {
    const previous = systemValues.value[`${system.id}`] || {}

    // console.log(
    //   `getSystemValue() system: ${system.id}, mode / state`,
    //   mode,
    //   value
    // )

    if (!mode?.hasValues) {
      //console.log(`getSystemValue() no value!!`)
      setSystemValue(system, null, null)
      return { value: null, data: null }
    }

    const valueOptions = mode.valuesNodes || []
    if (valueOptions.length === 0) {
      setSystemValue(system, null, null)
      return { value: null, data: null }
    }
    const defaultValue = valueOptions.find((option) => option.id === mode.defaultValue?.id) || valueOptions[0]
    let value = valueOptions.find((option) => option.id === (requestedValue || previous.value)?.id) || defaultValue
    let data = previous.data

    if (value.type === VALUE_DOUBLE_RANGE_TYPE) {
      if (typeof data !== 'number' || !Number.isFinite(data) || data < Number(value.rangemin) || data > Number(value.rangemax)) {
        data = Number(value.defaultFloat)
      }
    } else if (value.type === VALUE_STRING_TYPE || value.type === VALUE_FILE_PATH_TYPE) {
      if (typeof data !== 'string') data = value.defaultString || ''
    } else if (value.type === VALUE_DATE_RANGE_TYPE) {
      if (data == null) data = value.defaultDate
    } else {
      // Discrete PORIS values carry their own selection and have no second
      // data editor. Keep any prior scalar intact so switching temporarily to
      // an enum does not discard a numeric value that may be valid again.
    }

    setSystemValue(system, value, data)
    return { value, data }
  }

  /*
  const doubleCount = computed(() => count.value * 2)
  function increment() {
    count.value++
  }
*/
  return {
    xmlModel,
    rootSubsystem,
    isLoading,
    currentModes,
    systemValues,
    loadModel,
    loadModelURL,
    loadModelXML,
    getValue,
    getMode,
    getSubsystem,
    getCurrentMode,
    setValidMode,
    getValidObjModes,
    hasValidObjModes,
    getSystemValue,
    setSystemValue,
    applyRuntimeState
  }
})
