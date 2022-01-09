const workerPath = 'https://archive.org/download/ffmpeg_asm/ffmpeg_asm.js';
//const ffmpeg_args = '-i audio.wav -c:a aac -b:a 96k -strict experimental output.mp4';
const ffmpeg_args = '-i audio.wav -c:a aac -strict experimental output.mp4';

// for some reason the local path version of ffmpeg_asm.js doesn't work well!
//var workerPath = 'ffmpeg_asm.js'
//if(document.domain == 'localhost') {
//	workerPath = location.href.replace(location.href.split('/').pop(), '') + 'ffmpeg_asm.js';
//}

var recordAudio;
var audioPreview = document.getElementById('audio-preview');
var inner = document.querySelector('.inner');


function processInWebWorker() {
  // Generate an import script based on the worker path.
  var worker = new Worker("sw.js");
  // Worker now has the blob, meaning we can evict the generated script from local memory.
  //URL.revokeObjectURL(blob);
  return worker;
}

var worker;

function convertStreams(audioBlob, new_method) {
  console.log("found audioBlob", audioBlob);
  var audio_array_buffer;
  var buffersReady;
  var workerReady;
  if (!worker) {
    worker = processInWebWorker();
  }

  if (!new_method) {
    var fileReader = new FileReader();
    fileReader.onload = function () {
      console.log("fileReader onloaded");
      audio_array_buffer = this.result;
      console.log(audio_array_buffer);
      postMessage(worker, audio_array_buffer, ffmpeg_args);
    };
    fileReader.readAsArrayBuffer(audioBlob);
  } else {
    audio_array_buffer = audioBlob;
    worker.postMessage({
      type: 'command',
      //arguments: '',
      arguments: ffmpeg_args.split(' '),
      files: [
        {
          data: new Uint8Array(audio_array_buffer),
          name: "audio.wav"
        }
      ]
    });
  }


  var postMessage = function (worker, audio_array_buffer, ffmpeg_arg_string) {
    worker.postMessage({
      type: 'command',
      //arguments: '',
      arguments: ffmpeg_arg_string.split(' '),
      files: [
        {
          data: new Uint8Array(audio_array_buffer),
          name: "audio.wav"
        }
      ]
    });
  };

  worker.onmessage = function (event) {
    var message = event.data;
    console.log("Message:", message);
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
      if (message.data.length === 0) {
        alert("failed to convert audio");
        console.log("failed to convert audio, reason: ", message);
      } else {
        log(JSON.stringify(message));
        var result = message.data[0];
        log(JSON.stringify(result));
        var blob = new File([result.data], 'test.mp3', {
          type: 'audio/mp3'
        });
        log(JSON.stringify(blob));
        PostBlob(blob);
      }
    }
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
}

var logsPreview = document.getElementById('logs-preview');

function log(message) {
  if (message === undefined) {
    debugger;
  }
  console.log(message);
  /*
  var li = document.createElement('li');
  li.innerHTML = message;
  logsPreview.appendChild(li);

  li.tabIndex = 0;
  li.focus();
  */
}

window.onbeforeunload = function () {
  document.querySelector('#record-audio').disabled = false;
};
