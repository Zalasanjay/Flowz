import api from '../../api'
// let model = 'instance'
let model = 'instance'
export default {

  // let gets = async function (id) {
  //     return true;
  //   },
  get: () => {
    return api.request('get', '/' + model)
  },
  getThis: (id) => {
    return api.request('get', '/' + model + '/' + id)
  },
  post: (data) => {
    return api.request('post', '/' + model, data)
  },
  put: (id, data) => {
    return api.request('pot', '/' + model + '/' + id, data)
  }
}
