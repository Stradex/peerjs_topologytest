//U: asi un minuto de hablar sin parar ocupa solo 400k => 1h<24Mb

//============================================================
//S: mediaRecorder

const AUDIO_SETTINGS = {
  channels: 1,
  codec: "audio/ogg; codecs=opus",
  sampleSize: 8,
  sampleRate: 8192,
  dBSampleSize: 10
}
let _currentInputAudioData = {
  dbAverage: 0
};

mediaRecorder = null;
mediaRecorderAudioURL = null; //U: el resultado
inputListening = false;

let audioContext = new (window.AudioContext || window.webkitAudioContext)();

function setCurrentdBAverage(dbAverage) {
  _currentInputAudioData.dbAverage = dbAverage;
}

function getCurrentdBAverage() {
  return _currentInputAudioData.dbAverage;
} 

function mediaRecorderStart(stream, datareceived_ms=200) {
	if (mediaRecorder!=null) {
        printToConsole(`mediaRecorder already started`);
		return;
	}

	//SEE: https://github.com/mdn/dom-examples/tree/main/media/web-dictaphone
	//SEE: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
	mediaRecorder= new MediaRecorder(stream);

	var mediaRecorderChunks= []; //U: guardar a medida que graba

	mediaRecorder.onstop = (e) => {
		let blob = new Blob(mediaRecorderChunks, { type: AUDIO_SETTINGS.codec });
    let audioUrl = URL.createObjectURL(blob);
    mediaRecorder.onStopCallback(audioUrl, blob, mediaRecorderChunks);
    mediaRecorder = null;
	}
  mediaRecorder["onStopCallback"] = () => { };
  mediaRecorder["onAudioChunkUpdated"] = () => {};

	mediaRecorder.ondataavailable = (e) => {
    let headerBlob = (mediaRecorderChunks.length == 0);
    mediaRecorderChunks.push(e.data);
    let blob = new Blob([e.data], { type: AUDIO_SETTINGS.codec });
    mediaRecorder.onAudioChunkUpdated(blob, mediaRecorderChunks, headerBlob);
	};

	mediaRecorder.start(datareceived_ms);
}

function mediaRecorderStop(mediaRec) {
	if (mediaRec) {
    mediaRec.onStopCallback = (audioURL, blob, audioChunks) => {
      setTimeout(() => { var a = new Audio(audioURL); a.play(); },200); //TODO: usar promise con grabar
    }
		mediaRec.stop();
	}
}

//============================================================
//S: camara, pantalla, microfono

//VER: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getUserMedia
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;  
var supported_constraints= navigator.mediaDevices.getSupportedConstraints();

function conseguirNuestroAudioYVideo(e, soloAudio) {
	var opts= { audio: true, video: { width: 320, }, };
	if (soloAudio) { opts.video= false; }
	else {
		if (supported_constraints.frameRate) { opts.video.frameRate= 1; }
	}
	if (supported_constraints.channelCount) { opts.audio.channelCount= AUDIO_SETTINGS.channels; }
	if (supported_constraints.echoCancellation) { opts.audio.echoCancellation= true ; }
	if (supported_constraints.sampleSize) { opts.audio.sampleSize= AUDIO_SETTINGS.sampleSize; }
	if (supported_constraints.sampleRate) { opts.audio.sampleRate= { ideal: AUDIO_SETTINGS.sampleRate}; }
	if (supported_constraints.noiseSuppression) { opts.audio.noiseSuppression = true; }

	return new Promise( (on_ok, on_err) => navigator.getUserMedia(opts, on_ok, on_err));
}


//============================================================
//S: detectSilence

//VER: https://github.com/webrtc/samples/blob/gh-pages/src/content/getusermedia/volume/js/soundmeter.js

function detectSilence(stream, onSoundEnd = _=>{}, onSoundStart = _=>{}, onSoundStream = _=>{}, silence_delay = 500, min_decibels = -80) {
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  const streamNode = ctx.createMediaStreamSource(stream);
  streamNode.connect(analyser);
  analyser.minDecibels = min_decibels;

  const data = new Uint8Array(analyser.frequencyBinCount); // will hold our data
  let silence_start = performance.now();
  let triggered = false; // trigger only once per silence even
  let dbLastData = [];

  function loop(time) {

    if (!inputListening) return;

    requestAnimationFrame(loop); // we'll loop every 60th of a second to check
    analyser.getByteFrequencyData(data); // get current data

    if (data.some(v => v)) { // if there is data above the given db limit

      dbLastData.push(data);
      if (dbLastData.length >= AUDIO_SETTINGS.dBSampleSize) {
        dbLastData.shift();
      }
      
      let sumOfDb = 0;
      let numOfDb = 0;
      dbLastData.forEach(dataArray => dataArray.forEach(db => {
        numOfDb++;
        sumOfDb+=db;
      }));

      setCurrentdBAverage(sumOfDb / numOfDb);

      if(triggered){
        triggered = false;
        onSoundStart(mediaRecorder, stream);
      }
      
      silence_start = time; // set it to now
    }

    if (!triggered && time - silence_start > silence_delay) {
      onSoundEnd(mediaRecorder, stream);
      triggered = true;
    }

    if (mediaRecorder) {
      mediaRecorder.onAudioChunkUpdated = onSoundStream;
    }
  }
  loop();
}

function onSilence(mediaRec) {
  //printToConsole('silence');
	mediaRecorderStop(mediaRec);
}

function onSpeak(mediaRec, stream) {
   //printToConsole('speaking');
   mediaRecorderStart(stream);
}

function startRecordingAudio(onSilenceFunc, onSpeakFunc, onReceiveDataFunc = _=>{}) {

    if (inputListening) return;

    inputListening = true;
    conseguirNuestroAudioYVideo(null,true)
    .then(stream => {
          window.xs= stream;
          detectSilence(stream, onSilenceFunc, onSpeakFunc, onReceiveDataFunc, 500, -70);
          // do something else with the stream
    }).catch(e=>printToConsole(e));

    return;
}

function stopRecordingAudio() {
    inputListening = false;
}

function playAudioBuffer(buffer, delay=1) {
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.start(delay);

  source.connect(audioContext.destination);
  source.onended = () => {
    printToConsole('Playback ended');
  };
}