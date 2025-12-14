import {
  concat as _concat,
  intersection as _intersection,
  difference as _difference,
  isUndefined as _isUndefined
} from 'lodash-es'
import { ref } from 'vue'
import { defineStore } from 'pinia'

import { VALUE_STRING_TYPE, VALUE_DOUBLE_RANGE_TYPE, VALUE_FILE_PATH_TYPE } from './porisNode'

import { xmlModelLoader } from '@/api/modelLoader'
import { parseToPorisModel } from './xmlParser'
import { debugLog } from '@/utils/debug'

export const useModelStore = defineStore('model', () => {
  const xmlModel = ref(null)
  const values = ref([])
  const modes = ref([])
  const subsystems = ref([])
  const rootSubsystem = ref()

  const currentModes = ref([])

  const systemValues = ref({})

  function loadModel(modelName) {
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
    })
  }

  function loadModelURL(path) {
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
        if (subsystem.hasValues) {
          getSystemValue(subsystem, subsystem.currentMode)
        }
        if (subsystem.hasSubsystems) {
          subsystem.subsystemsNodes.forEach((ss) => {
            setValidSubMode(ss, ss.currentMode, subsystem.currentMode)
          })
        }
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
   * Resets the whole tree of valid modes
   * @param {*} subsystem
   * @param {*} mode
   */
  function setValidMode(subsystem, mode) {
    debugLog(`setValidMode_ ${subsystem.name} ${mode?.name}, NOT using supermode`)
    let validModes = getValidObjModes(subsystem)
    debugLog(`   setValidMode validModes len ${validModes.length}`, validModes)

    return setValidModeFrom(subsystem, mode, validModes)
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

  function setSystemValue(system, value) {
    // console.log(`setSystemValue() system: ${system.id}, value:`, value)
    systemValues.value[`${system.id}`] = value
  }

  function getSystemValue(system, mode) {
    let value = systemValues.value[`${system.id}`]

    // console.log(
    //   `getSystemValue() system: ${system.id}, _isUndefined(value): ${_isUndefined(value)}, mode / value`,
    //   mode,
    //   value
    // )

    if (!mode.hasValues) {
      //console.log(`getSystemValue() no value!!`)
      return null
    }

    let valueOptions = mode.valuesNodes

    //console.log(`value`,value)
    if (
      value != null &&
      !_isUndefined(value) &&
      valueOptions.find((val) => {
        val.id === value.id
      }) === null
    ) {
      value = undefined
    }

    //console.log(`getModelValue() valueOptions[0].type: ${valueOptions[0].type}`)

    if (valueOptions[0].type == VALUE_STRING_TYPE) {
      if (_isUndefined(value)) {
        value = valueOptions[0].defaultString
      }
    } else if (valueOptions[0].type == VALUE_DOUBLE_RANGE_TYPE) {
      if (
        _isUndefined(value) ||
        valueOptions[0].rangemin > value ||
        valueOptions[0].rangemax < value
      ) {
        value = valueOptions[0].defaultFloat
      }
    } else if (valueOptions[0].type == VALUE_FILE_PATH_TYPE) {
      //console.log('FILE')
      if (_isUndefined(value)) {
        value = valueOptions[0].defaultString
      }
    } else {
      if (_isUndefined(value) || !valueOptions.includes(value)) {
        value = valueOptions[0]
      }
    }

    setSystemValue(system, value)

    return value
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
