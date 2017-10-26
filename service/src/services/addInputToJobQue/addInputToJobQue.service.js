// Initializes the `emailtemplate` service on path `/emailtemplate`
const createService = require('feathers-rethinkdb');
const hooks = require('./addInputToJobQue.hooks');
const filters = require('./addInputToJobQue.filters');
module.exports = function() {
  const app = this;
  const Model = app.get('rethinkdbClient');
  const paginate = app.get('paginate');
  const options = {
    name: 'addInputToJobQue',
    Model,
    paginate
  };
  // Initialize our service with any options it requires
  app.use('/addInputToJobQue', createService(options));
  // Get our initialized service so that we can register hooks and filters
  const service = app.service('addInputToJobQue');
  service.hooks(hooks);
  if (service.filter) {
    service.filter(filters);
  }
};