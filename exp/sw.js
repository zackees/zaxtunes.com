const workerPath = 'https://archive.org/download/ffmpeg_asm/ffmpeg_asm.js';
console.log('ffmpeg-asm.js download started. It is about 18MB in size; please be patient!');

importScripts(workerPath);
var now = Date.now;
function print(text) {
  postMessage({ "type": "stdout", "data": text });
};
function printErr(text) {
  postMessage({ "type": "stderr", "data": text });
};
onmessage = function (event) {
  var message = event.data;
  if (message.type === "command") {
    //debugger;
    var Module = { print: print, printErr: printErr, files: message.files || [], arguments: message.arguments || [], TOTAL_MEMORY: message.TOTAL_MEMORY || false };
    postMessage({ "type": "start", "data": Module.arguments.join(" ") });
    postMessage({ "type": "stdout", "data": "Received command: " + Module.arguments.join(" ") + ((Module.TOTAL_MEMORY) ? ".  Processing with " + Module.TOTAL_MEMORY + " bits." : "") });
    var time = now();
    var result = ffmpeg_run(Module);
    var totalTime = now() - time;
    postMessage({ "type": "stdout", "data": "Finished processing (took " + totalTime + "ms)" });
    postMessage({ "type": "done", "data": result, "time": totalTime });
  }
};
postMessage({ "type": "ready", "js_src": workerPath });
