
const LightingEngine = require('../classes/LightingEngine.js');

let engine = new LightingEngine();

let WIDTH = 300;
let HEIGHT = 300;

console.log("Calculating lighting");

let image = engine.calculateLighting({
  obstacleData: new Uint8Array(new Uint32Array([]).buffer),//4,0
  obstaclePointData: new Uint8Array(new Float32Array([]).buffer),//20,20,20,40,40,40,40,20
  lightData: new Uint8Array(new Float32Array([1, 0, 441, 418.5, 0.001, 10, 0.01, 0, 255, 255, 227, 0]).buffer),//10, 0, 50, 50, 0, 0.001, 0.01, 0 , 1.0,1.0,1.0, 0, 10, 0, 10, 25, 0, 0.001, 0.01, 0 , 1.0,1.0,1.0, 0
  screenSize: {width: WIDTH, height: HEIGHT},
  numLights: 1,
  numObstacles: 0,
  ambientLight: {
    r: 0.1,
    g: 0.1,
    b: 0.1,
  }
});

console.log("Printing results");

console.log(image);

let shades = [" ","░","▒","▓","█"];

//32350332715176
//2114210495936
//

/*

87602373284928
87602371166472
*/

// for (let i = 0; i < WIDTH; i ++) {
//   let res = "";
//   for (let j = 0; j < HEIGHT; j ++) {
//     let shadeIndex = Math.floor(image[(j * WIDTH + i) * 4 + 1] / 255 * 4);
//     res += shades[shadeIndex] + shades[shadeIndex];//"#" + image[(j * WIDTH + i) * 4].toString(16) + image[(j * WIDTH + i) * 4 + 1].toString(16) + image[(j * WIDTH + i) * 4 + 2].toString(16) + image[(j * WIDTH + i) * 4 + 3].toString(16);//
//   }
//   console.log(res);
// }
