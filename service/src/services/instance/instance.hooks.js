let async = require('asyncawait/async');
let await = require('asyncawait/await');
let axios = require('axios')
const app = require('config');
const config = app.get('rethinkdb')
const rdash = require('rethinkdbdash')(config)
const _ = require('lodash')
module.exports = {
  before: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },
  after: {
    all: [],
    find: [],
    get: [],
    create: [
      hook => aftercreateInstance(hook)
    ],
    update: [],
    patch: [],
    remove: []
  },
  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
var aftercreateInstance = async(function(hook) {
  let outputObject = [];
  console.log('hook.result', hook.result)
  for (var element in hook.result) {
    let object = await (getinstancevalue(hook.result[element].refid))
    outputObject.push(object);
  }
  console.log('hook.data.processid', hook.data.processid)
  console.log('hook.data.instanceid', hook.data.instanceid)
  let flowinstace = await (axios.get('http://localhost:3030/flowz-instance/' + hook.data.instanceid))
  let process = _.find(flowinstace.data.processList, function(o) { return o.id == hook.data.processid; });
  console.log('process', process)
  if (process != undefined) {
    if (process.inputProperty[0].approvalClass !== undefined) {
      addtoApprovalClass(hook.data.instanceid, outputObject, hook.data.processid, hook.data.jobId)
    } else {
      AddValueToJobQue(hook.data.instanceid, outputObject, hook.data.processid, hook.data.jobId)
    }
  } else {
    AddValueToJobQue(hook.data.instanceid, outputObject, hook.data.processid, hook.data.jobId)
  }
  // AddValueToJobQue(hook.data.instanceid, outputObject, hook.data.processid)
});
var addtoApprovalClass = async(function(instanceid, inputdata, processid, jobId) {
  console.log('approval class', inputdata)
  const Queue = require('rethinkdb-job-queue')
    //--------------- Connection Options -----------------
  const cxnOptions = config
    //--------------- Queue Options -----------------
  const qOptions = {
    name: app.get('approvar_table')
  }
  const q = new Queue(cxnOptions, qOptions)
  var jobOptions = {}
  jobOptions.data = {}
    // jobOptions.data.fId = id
  jobOptions.data = {
    "fId": instanceid,
    "input": inputdata,
    "isExternalInput": true,
    "job": processid,
    "jobId": jobId
  }
  jobOptions.timeout = app.get('qJobTimeout')
  jobOptions.retryMax = app.get('qJobRetryMax')
  console.log('jobOptions', jobOptions)
    //--------------- Create new job -----------------
  const job = q.createJob(jobOptions)
    //--------------- Add job -----------------
  q.addJob(job).then((savedJobs) => {}).catch(err => console.error(err))
})
var getinstancevalue = async(function(id) {
  var response = await (axios.get('http://localhost:3030/instance/' + id))
    // console.log('response', response)
  return response.data
});

function AddValueToJobQue(flowid, data, processid, jobId) {
  const Queue = require('rethinkdb-job-queue')
  const cxnOptions = config
  const qOptions = {
    name: app.get('scheduler_table')
  }
  const q = new Queue(cxnOptions, qOptions)
  var jobOptions = {}
  jobOptions.data = {}
  jobOptions.data = {
    "fId": flowid,
    "input": data,
    "isExternalInput": true,
    "job": processid,
    "jobId": jobId
  }
  jobOptions.timeout = app.get('qJobTimeout')
  jobOptions.retryMax = app.get('qJobRetryMax')
  const job = q.createJob(jobOptions)
  q.addJob(job).then((savedJobs) => {}).catch(err => console.error(err))
}