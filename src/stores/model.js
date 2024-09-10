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

export const useModelStore = defineStore('model', () => {
  const xmlModel = ref(null)
  const values = ref([])
  const modes = ref([])
  const subsystems = ref([])
  const rootSubsystem = ref()

  const validModes = ref([])
  const currentModes = ref([])

  const systemValues = ref({})

  function loadModel(modelName) {
    xmlModelLoader(modelName).then((model) => {
      xmlModel.value = model

      let JSONmodel = parseToPorisModel(this, model)

      values.value = JSONmodel.values
      modes.value = JSONmodel.modes
      subsystems.value = JSONmodel.subsystems
      rootSubsystem.value = JSONmodel.rootSubsystem

      console.log('LIMPIANDO valores por defecto')
      validModes.value = []
      currentModes.value = []

      systemValues.value = {}

      console.log("Initial setValidMode")
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

  var DEBUG = false

  /**
   * Resets the whole tree of valid modes
   * @param {*} subsystem
   * @param {*} mode
   */
  function setValidMode(subsystem, mode) {
    console.log(`setValidMode() subsystem:`, subsystem, mode)
    console.log(`   setValidMode validModes`, validModes.value)

    let candidate = null
    if (validModes.value.length > 1)
    {
      if (validModes.value.includes(mode)) 
      {
        candidate = mode
      } 
      else
      {
        if (validModes.value.includes(subsystem.defaultMode))
        {
          candidate = subsystem.defaultMode
        }
        else
        {
          candidate = validModes.value[0]
        }
      }
    }
    else 
    {
      candidate = subsystem.defaultMode
    }
    

    const newValidModes = mode ? [mode] : [...subsystem.modesNodes]
    _addValidModeRecursive(
      subsystem,
      candidate,
      newValidModes,
      true,
      true
    )

    validModes.value = newValidModes

    // console.log(`   setValidMode setting current modes`)
    const currentMode = candidate
    const newCurrentModes = [currentMode]
    _addValidModeRecursive(subsystem, currentMode, newCurrentModes, true, false)

    currentModes.value = newCurrentModes

    //console.log(`setValidMode newValidMopdes`, validModes.value)
  }

  function _addValidModeRecursive(parent, mode, newValidModes, isRoot, addSibblingModes) {
    // Lets dig into it's children modes ...

    // DEBUG = true

    // if (DEBUG) {
    //   console.log(`_addValidModeRecursive mode.id: ${mode?.id}, isRoot: ${isRoot}, addSibblingModes: ${addSibblingModes}`, mode, newValidModes)
    // }

    if (mode.hasModes) {
      const children = mode.modesNodes
      // if (DEBUG) {
      //   console.log(`_addValidModeRecursive mode.id: ${mode.id}, children`, children)
      // }

      if (children.length > 0) {
        if (isRoot || addSibblingModes) {
          for (const child of children) {
            // if (DEBUG) {
            //   console.log(`_addValidModeRecursive mode.id: ${mode.id}, child.id: ${child.id}`, child)
            // }

            newValidModes.push(child)

            if (isRoot) {
              _addValidModeRecursive(mode, child, newValidModes, false, addSibblingModes)
            }
          }
          //console.log(`addValidMode newValidModes`, newValidModes)
        }

        if (!isRoot) {
          var childToFollow = null

          if (children.length === 0) {
            childToFollow = mode.defaultMode
          } else {
            childToFollow = children[0]
          }

          if (!addSibblingModes) {
            newValidModes.push(childToFollow)
          }

          // if (DEBUG) {
          //   console.log(`_addValidModeRecursive mode.id: ${mode.id}, childToFollow.id: ${childToFollow.id}`)
          // }

          _addValidModeRecursive(mode, childToFollow, newValidModes, false, addSibblingModes)
        }
      }
      /*
      let defaultMode = mode.defaultMode()
      if (defaultMode) {
        newValidModes.push(defaultMode)
        _addValidModeRecursive(defaultMode, newValidModes, true)
      }
*/
    }
  }

  /**
   * Replaces the oldMode valid modes tree with the new one
   * @param {*} newMode
   */
  function addValidMode(subsystem, newMode, oldMode) {
    // DEBUG = false

    // console.log(`addValidMode newMode`, newMode)
    // console.log(`    addValidMode oldMode`, oldMode)
    //console.log(`addValidMode paramModes`, validModes.value)

    // /*
    //     if (validModes.value.includes(newMode)) {
    //       console.log(`addValidMode newMode ${newMode.id} already on the list!`)
    //       return
    //     }
    // */
    let strippedValidModes

    if (oldMode) {
      console.log(`addValidMode ${newMode.name} with oldMode: ${oldMode.name}`)
      const oldModes = [oldMode]
      _addValidModeRecursive(subsystem, oldMode, oldModes, true)

      //console.log(`addValidMode oldModes`, oldModes)
      //console.log(`addValidMode strippedValidModes`, strippedValidModes)
      //console.log(`addValidMode strippedValidModes AFTER`, _difference(strippedValidModes, oldModes))

      strippedValidModes = _difference(strippedValidModes, oldModes)
    } else {
      strippedValidModes = validModes.value
    }

    const newValidModes = _concat(strippedValidModes, newMode)
    _addValidModeRecursive(subsystem, newMode, newValidModes, true)

    const newValidUniqueModels = [...new Set(newValidModes)]

    if (
      _intersection(validModes.value, newValidUniqueModels).length == newValidUniqueModels.length
    ) {
      console.log(`addValidMode no changes!`)
      return
    }

    validModes.value = newValidUniqueModels

    //console.log(`addValidMode newValidMopdes`, validModes.value)
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

    return _intersection(obj.modesNodes, validModes.value)
  }

  function hasValidObjModes(obj) {
    //console.log(`hasValidObjModes() id: ${obj.id}, ${getValidObjModes(obj).length > 0}`)
    return getValidObjModes(obj).length > 0
  }

  function setSystemValue(system, value) {
    console.log(`setSystemValue() system: ${system.id}, value:`, value)
    systemValues.value[`${system.id}`] = value
  }

  function getSystemValue(system, mode) {
    let value = systemValues.value[`${system.id}`]

    console.log(
      `getSystemValue() system: ${system.id}, _isUndefined(value): ${_isUndefined(value)}, mode / value`,
      mode,
      value
    )

    if (!mode.hasValues) {
      //console.log(`getSystemValue() no value!!`)
      return null
    }

    let valueOptions = mode.valuesNodes

    if (
      !_isUndefined(value) &&
      valueOptions.find((val) => {
        val.id === value.id
      }) === null
    ) {
      value = undefined
    }

    console.log(`getModelValue() valueOptions[0].type: ${valueOptions[0].type}`)

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
      console.log('FILE')
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
    validModes,
    currentModes,
    systemValues,
    loadModel,
    getValue,
    getMode,
    getSubsystem,
    getCurrentMode,
    setValidMode,
    addValidMode,
    getValidObjModes,
    hasValidObjModes,
    getSystemValue,
    setSystemValue
  }
})
