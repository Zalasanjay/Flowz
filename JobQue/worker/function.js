const Queue = require('rethinkdb-job-queue')
const app = require('config')
const cxnOptions = app.get('rethinkdb')
const SCHEDULER_TABLE = app.get('qOptions.name')
const FLOWZ_TABLE = app.get('flowz_table')
const rdash = require('rethinkdbdash')(cxnOptions)
const TIMEOUT = 60000*60
const pino = require('pino')
const fs = require('fs')
const PINO_DB_OPTION = app.get('pinoDB')
const PINO_C_OPTION = app.get('pinoConsole')

async function notifyScheduler (fId, output, input, currentProcess, processType, forProcess){
  await checkConnection(false, 100)
  //--------------- Queue Options -----------------
  const qOptions = {
    name: SCHEDULER_TABLE
  }

  const q = new Queue(cxnOptions, qOptions)
  var jobOptions = {}
  jobOptions.data = {}
  jobOptions.data.fId = fId
  jobOptions.data.type = processType.toLowerCase()
  jobOptions.data.isNewInstance = false
  jobOptions.data.output = output
  jobOptions.data.currentProcess = currentProcess
  jobOptions.data.input = input
  jobOptions.data.forProcess = forProcess
  jobOptions.data.processNotification = true
  jobOptions.timeout = TIMEOUT
  jobOptions.retryMax = 0

  //--------------- Create new job -----------------
  const job = q.createJob(jobOptions)

  //--------------- Add job -----------------
  q.addJob(job).then((savedJobs) => {
  }).catch(err => console.error(err))
}

async function updateFlowInstance (newStatus, fId, forProcess, current, output, type, input, jobId, sourceCount) {
  await checkConnection(false, 20000)
  sourceCount = sourceCount ? sourceCount : []
  let tmp = await rdash.table(FLOWZ_TABLE).get(fId).update({'process_log': rdash.row('process_log').append({job: current, jobType: type.toLowerCase(), jobId: jobId, input: input, sourceCount: sourceCount, output: output, status: newStatus, lastModified: new Date()})}).run()
  pino(PINO_C_OPTION).info('process in flow instance updated')
}

async function checkConnection (crash, delay){
  var r = require('rethinkdb')
  r.connect(cxnOptions, function (err, conn) {
    if (err) {
      pino().error('\x1b[31m%s\x1b[0m','... rethinkdb error')
      setTimeout(function(){
        pino().info('\x1b[33m%s\x1b[0m','... retrying connection')
        this.checkConnection(true, delay)
      },5000)
    } else {
      if(crash){
        setTimeout(function(){},delay)
      }
    }
  })
}

async function processSuccess (job, jobId) {
  notifyScheduler(job.fId, job.output, job.input, job.id, job.type, job.forProcess)
  await updateFlowInstance('completed', job.fId, job.forProcess, job.id, job.output, job.type, job.input, jobId, job.sourceCount)
}

async function processError (job) {
  await updateFlowInstance('terminated', job.fId, job.forProcess, job.id, job.output, job.type, job.input, jobId, job.sourceCount)
}

module.exports.processError = processError
module.exports.processSuccess = processSuccess
module.exports.checkConnection = checkConnection