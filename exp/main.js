let worker;
const log = console.log

function get_mime_type(filename) {
  filename = filename.toLowerCase();
  if (filename.endsWith("mp3")) {
    return "audio/mp3";
  } else if (filename.endsWith("mp4")) {
    return "video/mp4";
  } else {
    alert("not suppported: " + filename);
  }
}
function ffmpeg_process(file_name, input_blob, ffmpeg_args, on_success, on_fail) {
  file_name = encodeURI(file_name);
  if (!worker) {
    worker = new Worker("sw.js");
  }
  const full_cmd = `-i ${file_name} ${ffmpeg_args}`
  worker.postMessage({
    type: 'command',
    arguments: full_cmd.split(' '),
    files: [
      {
        data: new Uint8Array(input_blob),
        name: file_name
      }
    ]
  });

  worker.onmessage = function(event) {
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
        on_fail("failed to convert, reason: " + JSON.stringify(message))
      } else {
        const result = message.data[0];
        if (result.data.byteLength == 0) {
          on_fail("ffmpeg generated an empty file.");
          return;
        }
        const blob = new File([result.data], result.name, {
          type: get_mime_type(result.name)
        });
        on_success(blob);
      }
    }
  };
}
