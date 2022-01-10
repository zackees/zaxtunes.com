let worker;
const workerPath = 'https://archive.org/download/ffmpeg_asm/ffmpeg_asm.js';
//const ffmpeg_args = '-i audio.wav -c:a aac -b:a 96k -strict experimental output.mp4';
const ffmpeg_args = '-i audio.wav -c:a aac -strict experimental output.mp4';

// for some reason the local path version of ffmpeg_asm.js doesn't work well!
//var workerPath = 'ffmpeg_asm.js'
//if(document.domain == 'localhost') {
//	workerPath = location.href.replace(location.href.split('/').pop(), '') + 'ffmpeg_asm.js';
//}
var div_output = document.querySelector('#div_output');

const log = console.log


function processInWebWorker() {
  var worker = new Worker("sw.js");
  return worker;
}

function convertStreams(audioBlob) {
  if (!worker) {

    worker = processInWebWorker();
  }
  worker.postMessage({
    type: 'command',
    arguments: ffmpeg_args.split(' '),
    files: [
      {
        data: new Uint8Array(audioBlob),
        name: "audio.wav"
      }
    ]
  });

  worker.onmessage = function (event) {
    var message = event.data;
    if (message.type == "ready") {
      log(`${message.js_src} loaded.`);
    } else if (message.type == "stdout") {
      log(message.data);
    } else if (message.type == "stderr") {
      log(message.data);
    } else if (message.type == "start") {
      log('ffmpeg started.');
    } else if (message.type == "done") {
      if (message.data.length === 0) {
        alert("failed to convert audio");
        console.log("failed to convert audio, reason: ", message);
      } else {
        log(JSON.stringify(message));
        const result = message.data[0];
        log(JSON.stringify(result));
        const blob = new File([result.data], 'test.mp3', {
          type: 'audio/mp3'
        });
        //log(JSON.stringify(blob));
        PostBlob(blob);
      }
    }
  };
}

function PostBlob(blob) {
  let src = URL.createObjectURL(blob);
  var p = document.createElement('p');
  p.innerHTML = `Download: <a href="${src}" target="_blank" download="out.mp3">out.mp3</a>`;
  div_output.appendChild(p);
  p.style.display = 'block';
}



window.onbeforeunload = function () {
  document.querySelector('#record-audio').disabled = false;
};
