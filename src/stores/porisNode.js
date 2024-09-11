import {
    assign as _assign,
    isArray as _isArray,
  } from 'lodash-es' 

export const VALUE_TYPE = 'Value'
export const VALUE_STRING_TYPE = 'ValueString'
export const VALUE_DOUBLE_RANGE_TYPE = 'ValueFloat'
export const VALUE_DATE_RANGE_TYPE = 'ValueDate'
export const VALUE_FILE_PATH_TYPE = 'ValueFilePath'
export const MODE_TYPE = 'Mode'
export const SUBSYSTEM_TYPE = 'SubSystem'

export const ValueTypes = [
    VALUE_TYPE,
    VALUE_STRING_TYPE,
    VALUE_DOUBLE_RANGE_TYPE,
    VALUE_DATE_RANGE_TYPE,
    VALUE_FILE_PATH_TYPE
  ]

export class PorisNode {
    constructor(args) {
        _assign(this, args)
    }

    getDestinations(destType) {
        const destTypes = _isArray(destType) ? destType : [destType]

        
        //console.log(this)
        //console.log("=========")

        //console.log(`getDestinations() destType: ${destType}`, obj)
        const modes = this.destinations.reduce((accumulator, dest) => {
          if (destTypes.includes(dest.type)) {
            accumulator.push(dest)
            }
          return accumulator
        }, [])
    
        return modes
    }

    getValues() {
        if (this.hasValues) {
            return this.getDestinations(valueTypes)
        } else {
            return []
        }
    }

    getModes() {
        //console.log(`getObjModes()`, obj)
        if (this.hasModes) {
            return this.getDestinations(MODE_TYPE)
        } else {
            return []
        }
    }

    getSubsystems() {
        return this.getDestinations(SUBSYSTEM_TYPE)
    }

    getValidModes() {
        if (this.validModes == null)
        {
            this.validModes = []
        }
        return this.validModes
    }

    getActiveSubsystems()
    {
        let ret = []
        let ss = this.subsystemsNodes
        //console.log(`ss has subsystems ${ss.length}`)
        ss.forEach((s) => {
            //console.log(`s is ${typeof s} ${s.name}`)
            if (s.getValidModes().length > 0) {
                //console.log(`**** adding ${s.name}`)
                ret.push(s)
            }
        });
        return ret
    }
}