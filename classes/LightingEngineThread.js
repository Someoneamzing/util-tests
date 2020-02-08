// const {Worker, parentPort, isMainThread} = require('worker_threads');
const EventEmitter = require('events');

  class LightingEngineThread extends EventEmitter {
    constructor(){
      super();
      this.worker = new Worker('../classes/lighting_engine_thread_script.js');
      this.running = true;
      this.worker.addEventListener('error', (...args)=>{
        this.emit('error', ...args);
        console.error("LightingEngine closed unexpectedly. Further calls to lighting engine will return blank lighting data");
        this.running = false;
      });
    }

    calculateLighting(data) {
      if (!this.running) {
        return Promise.resolve(new ArrayBuffer(data.screenSize.width * data.screenSize.height * 4));
      } else {
        return new Promise((res, rej)=>{
          this.worker.addEventListener('message', ({data})=>res(data), {once: true});
          this.worker.postMessage(data, [data.obstacleData, data.obstaclePointData, data.lightData]);
        })
      }
    }

    getPerformanceInfo(){
      if (!this.running) return Promise.resolve('Error retrieving performance data:\r\n  Engine has terminated.');
      return new Promise((resolve, reject)=>{
        this.worker.addEventListener('message', ({data})=>resolve(data), {once: true});
        this.worker.postMessage('getPerfInfo');
      });
    }

    cleanup(){
      this.running = false;
      this.worker.addEventListener('message', ({data})=>{
        if (data == 'finished') {
          this.worker.terminate();
        }
      }, {once: true})
      this.worker.postMessage('cleanup');
    }
  }
  module.exports = LightingEngineThread;
