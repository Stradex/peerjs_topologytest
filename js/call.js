let _callRoutes = []; //array with routes to send data to each client.
let _globalCall = false;

function callMediaRecorderStop(mediaRec) {
	if (!mediaRec) return;

    mediaRec.onStopCallback = (audioURL, blob, _audioChunks) => {
        blobToBase64(blob, (base64Blob) => {

        if (_globalCall) {
            netSendData({
                tag: 'audio',
                global: true,
                from: getLocalPeerIDFromHash(),
                audioBlob: base64Blob
            });
        } else { //local calls are not working fine, only global calls. 
            _callRoutes.forEach(route => {

                if (!route || route.length == 0) return;

                netSendData({
                    tag: 'audio',
                    global: false,
                    from: getLocalPeerIDFromHash(),
                    audioBlob: base64Blob
                }, route);
            });
        }

        });
    };

	mediaRec.stop();
}

function callReceivedAudioData(audioBlob64) {
    printToConsole("B64 Blobl: " + audioBlob64);
    let audioBlob = b64toBlob(audioBlob64, "audio/ogg; codecs=opus");
    let audioUrl = URL.createObjectURL(audioBlob);
    printToConsole(`Playing received audio: ${audioBlob.size} - ${audioUrl}`);
    setTimeout(() => { var a = new Audio(audioUrl); a.play(); },10);
}

function callOnSilence(mediaRec) {
    printToConsole('silence');
    callMediaRecorderStop(mediaRec);
}
  
function callOnSpeak(mediaRec, stream) {
    printToConsole('speaking');
    mediaRecorderStart(stream);
}

function startCall(callRoute=[]) {

    if (callRoute.length == 0) {
        _globalCall = true;
        printToConsole(`Starting global call`);
        _callRoutes = [];
    } else {
        _globalCall = false;
        printToConsole(`Starting call with route ${JSON.stringify(callRoute)}`);
        _callRoutes.push(callRoute);
    }
    startRecordingAudio(callOnSilence, callOnSpeak);
}

function endCall(peersToEndCallWith = []) {
    if (peersToEndCallWith.length == 0) {
        printToConsole(`Ending call with everyone`);
        _callRoutes = [];
    } else {
        printToConsole(`Ending call with peers ${JSON.stringify(peersToEndCallWith)}`);
        _callRoutes = _callRoutes.filter(route => {
            if (route.length == 0) return false;
            return peersToEndCallWith.includes(route[route.length-1]);
        });
    }

    if (_callRoutes.length == 0) {
        stopRecordingAudio();
    }
}