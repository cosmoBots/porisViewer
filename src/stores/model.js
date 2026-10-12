import { intersection as _intersection } from 'lodash-es'
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
    if (validModes.length > 0) {
      let prevMode = subsystem.currentMode
      let candidate = null
      if (validModes.length > 0) {
        if (mode != null && validModes.includes(mode)) {
          // console.log(`--> setValidMode_ candidate mode ${mode.name}`)
          candidate = mode
        } else {
          if (validModes.includes(subsystem.defaultMode)) {
            candidate = subsystem.defaultMode
            // console.log(`--> setValidMode_ candidate valid default ${subsystem.defaultMode.name}`)
          } else {
            candidate = validModes[0]
            // console.log(`--> setValidMode_ candidate first mode ${subsystem.validModes[0].name}`)
          }
        }
      } else {
        // console.log(`--> setValidMode_ candidate default (root)`)
        candidate = subsystem.defaultMode
      }

      if (prevMode != candidate) {
        //console.log(`*** setValidMode_() subsystem:`, subsystem.name, candidate.name)
        subsystem.currentMode = candidate
        subsystem.candidateMode = candidate
        currentModes.value[`${subsystem.id}`] = candidate
        //console.log(`setValidMode Value set`, subsystem.currentMode)
      }

      // A mode may become active through its parent even when the selected
      // child mode itself did not change. Ensure its value/default either way.
      if (subsystem.hasValues) {
        getSystemValue(subsystem, candidate)
      }
      if (subsystem.hasSubsystems) {
        subsystem.subsystemsNodes.forEach((ss) => {
          setValidSubMode(ss, ss.currentMode, candidate)
        })
      }
      return candidate
    } else {
      subsystem.currentMode = null
      subsystem.candidateMode = null
      // console.log(`--> setValidMode_ null (no valid mode available)`)
      return null
    }
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
    let validModes = _intersection(subsystem.modesNodes, supermode.modesNodes)
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
    // console.log(`getValidObjModes() _intersection`,  _intersection(obj.modesNodes, validModes.value))
    // }

    /*
    debugLog(`obj: ${obj.name}`)
    debugLog(`objModes: ${obj.modesNodes}`)
    obj.modesNodes.forEach((m) => {
      debugLog(m.name)
    })
    */
    if (obj.parent != null) {
      debugLog(`parent: ${obj.parent.name}`)
      debugLog(`parent mode: ${obj.parent.currentMode.name}`)
      debugLog(`parent.mode.submodes:`, obj.parent.currentMode.modesNodes)
      return _intersection(obj.modesNodes, obj.parent.currentMode.modesNodes)
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
    getValue,
    getMode,
    getSubsystem,
    getCurrentMode,
    setValidMode,
    getValidObjModes,
    hasValidObjModes,
    getSystemValue,
    setSystemValue
  }
})
