var recordAudio;
var audioPreview = document.getElementById('audio-preview');
var inner = document.querySelector('.inner');

document.querySelector('#record-audio').onclick = function () {
  this.disabled = true;
  navigator.getUserMedia({
    audio: true
  }, function (stream) {
    audioPreview.srcObject = stream;
    audioPreview.play();

    recordAudio = RecordRTC(stream, {
      bufferSize: 16384,
      recorderType: StereoAudioRecorder
    });

    recordAudio.startRecording();
  }, function (error) { throw error; });
  document.querySelector('#stop-recording-audio').disabled = false;
};

document.querySelector('#stop-recording-audio').onclick = function () {
  this.disabled = true;

  recordAudio.stopRecording(function (url) {
    if (!!navigator.mozGetUserMedia) { // remove this if-block if you still want to use ffmpeg-asm.js in Firefox.
      log('We do not need to use ffmpeg-asm.js in Firefox.');
      log('If you are still interested to use ffmpeg-asm.js in Firefox then set <a href="https://github.com/muaz-khan/RecordRTC#recordertype">this recorderType</a> parameter.');
      log('E.g. <code>recordAudio = RecordRTC(stream, { recordertype: StereoAudioRecorder });</code>');

      var blob = new File([recordAudio.blob], 'test.mp3', {
        type: ' audio/mp3'
      });
      audioPreview.src = URL.createObjectURL(blob);
      audioPreview.download = 'Orignal.mp3';

      PostBlob(blob);
      return;
    }

    audioPreview.src = url;
    audioPreview.download = 'Orignal.wav';

    log('<a href="' + workerPath + '" download="ffmpeg-asm.js">ffmpeg-asm.js</a> file download started. It is about 18MB in size; please be patient!');
    convertStreams(recordAudio.getBlob());
  });
};

var workerPath = 'https://archive.org/download/ffmpeg_asm/ffmpeg_asm.js';
//var workerPath = 'ffmpeg_asm.js'
//if(document.domain == 'localhost') {
//	workerPath = location.href.replace(location.href.split('/').pop(), '') + 'ffmpeg_asm.js';
//}

function processInWebWorker() {
  var blob = URL.createObjectURL(new Blob(['importScripts("' + workerPath + '");var now = Date.now;function print(text) {postMessage({"type" : "stdout","data" : text});};onmessage = function(event) {var message = event.data;if (message.type === "command") {var Module = {print: print,printErr: print,files: message.files || [],arguments: message.arguments || [],TOTAL_MEMORY: message.TOTAL_MEMORY || false};postMessage({"type" : "start","data" : Module.arguments.join(" ")});postMessage({"type" : "stdout","data" : "Received command: " +Module.arguments.join(" ") +((Module.TOTAL_MEMORY) ? ".  Processing with " + Module.TOTAL_MEMORY + " bits." : "")});var time = now();var result = ffmpeg_run(Module);var totalTime = now() - time;postMessage({"type" : "stdout","data" : "Finished processing (took " + totalTime + "ms)"});postMessage({"type" : "done","data" : result,"time" : totalTime});}};postMessage({"type" : "ready"});'], {
    type: 'application/javascript'
  }));

  var worker = new Worker(blob);
  URL.revokeObjectURL(blob);
  return worker;
}

var worker;

function convertStreams(audioBlob) {
  var aab;
  var buffersReady;
  var workerReady;
  var posted;

  var fileReader = new FileReader();
  fileReader.onload = function () {
    aab = this.result;
    postMessage();
  };
  fileReader.readAsArrayBuffer(audioBlob);

  if (!worker) {
    worker = processInWebWorker();
  }

  worker.onmessage = function (event) {
    var message = event.data;
    if (message.type == "ready") {
      log('<a href="' + workerPath + '" download="ffmpeg-asm.js">ffmpeg-asm.js</a> file has been loaded.');

      workerReady = true;
      if (buffersReady)
        postMessage();
    } else if (message.type == "stdout") {
      log(message.data);
    } else if (message.type == "start") {
      log('<a href="' + workerPath + '" download="ffmpeg-asm.js">ffmpeg-asm.js</a> file received ffmpeg command.');
    } else if (message.type == "done") {
      log(JSON.stringify(message));

      var result = message.data[0];
      log(JSON.stringify(result));

      var blob = new File([result.data], 'test.mp3', {
        type: 'audio/mp3'
      });

      log(JSON.stringify(blob));

      PostBlob(blob);
    }
  };
  var postMessage = function () {
    posted = true;

    worker.postMessage({
      type: 'command',
      arguments: '',
      arguments: '-i audio.wav -c:a aac -b:a 96k -strict experimental output.mp4'.split(' '),
      files: [
        {
          data: new Uint8Array(aab),
          name: "audio.wav"
        }
      ]
    });
  };
}

function PostBlob(blob) {
  var audio = document.createElement('audio');
  audio.controls = true;

  var source = document.createElement('source');
  source.src = URL.createObjectURL(blob);
  source.type = 'audio/mp3; codecs=aac';
  audio.appendChild(source);

  audio.download = 'Converted Audio.mp3';

  inner.appendChild(document.createElement('hr'));
  var h2 = document.createElement('h2');
  h2.innerHTML = '<a href="' + source.src + '" target="_blank" download="Converted Audio.mp3" style="font-size:200%;color:red;">Download Converted AAC:</a>';
  inner.appendChild(h2);
  h2.style.display = 'block';
  inner.appendChild(audio);

  audio.tabIndex = 0;
  audio.focus();
  audio.play();

  document.querySelector('#record-audio').disabled = false;
}

var logsPreview = document.getElementById('logs-preview');

function log(message) {
  var li = document.createElement('li');
  li.innerHTML = message;
  logsPreview.appendChild(li);

  li.tabIndex = 0;
  li.focus();
}

window.onbeforeunload = function () {
  document.querySelector('#record-audio').disabled = false;
};
