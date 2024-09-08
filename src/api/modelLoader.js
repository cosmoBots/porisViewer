import axios from 'axios'
//import parseString from  'xml2js'
/*
function promisifyXml2Js(arg) {
    return new Promise(function(resolve, reject) {
        parseString(arg, function(err, result){
            if(err){
                reject(err);
            }
            else {
                resolve(result)
            }
        });
    })
}
*/
export function xmlModelLoader(modelFileName) {
    return axios.get(`/models/${modelFileName}.xml`)
        .then(response => {
            //return promisifyXml2Js(response.data)

            return response.data
        })
}

export function jsonModelLoader(modelFileName) {
    return axios.get(`/models/${modelFileName}.json`)
        .then(response => {
            //return promisifyXml2Js(response.data)

            return response.data
        })
}

