import axios from 'axios'

export function xmlModelLoader(path) {
    return axios.get(path, { withCredentials: true })
        .then(response => {
            return response.data
        })
}
