const LightingEngine = require('./LightingEngine.js');
let engine = new LightingEngine();
onmessage = ({data})=>{
  if (typeof data == 'string') {
    switch (data) {
      case 'cleanup':
        engine.cleanup();
        postMessage('finished')
        // process.exit();
        break;
      case 'getPerfInfo':
        postMessage(engine.getPerformanceInfo());
        break;
      default:

    }
  } else {
    let res = engine.calculateLighting(data);
    postMessage(res,[res]);//[res]
  }

}
