const CALL_NET_SETTINGS = {
    packet_ms: 80,
    packets_to_play: 5, //400ms
}

let _callRoutes = []; //array with routes to send data to each client.
let _globalCall = false;
let _audioPacketsQueue = [];
let _lastHeaderBlob = null;

function callOnDataAvailable(blob, audioChunks, isHeaderBlob) {
    blobToBase64(blob, (base64Data) => {
        if (_globalCall) {
            netSendData({
                tag: 'audio',
                global: true,
                from: getLocalPeerIDFromHash(),
                audioBlob: base64Data,
                headerBlob: isHeaderBlob,
            });
        } else {
            printToConsole(`Sending audio part: ${JSON.stringify(_callRoutes)}`);
            _callRoutes.forEach(route => {

                if (!route || route.length == 0) return;
                netSendData({
                    tag: 'audio',
                    global: false,
                    from: getLocalPeerIDFromHash(),
                    audioBlob: base64Data,
                    headerBlob: isHeaderBlob 
                }, route);
            });
        }
    });
}

function callMediaRecorderStop(mediaRec) {
	if (!mediaRec) return;

	mediaRec.stop();
}

function callReceivedAudioData(audioBlob64, isHeaderBlob) {
    let audioBlob = b64toBlob(audioBlob64, "audio/ogg; codecs=opus");
    _audioPacketsQueue.push( {blob: audioBlob, isHeader: isHeaderBlob});
    if (isHeaderBlob) {
        lastHeaderBlob = {blob: audioBlob, isHeader: isHeaderBlob};
    }
}

function callOnSilence(mediaRec) {
    printToConsole('silence');
    callMediaRecorderStop(mediaRec);
}
  
function callOnSpeak(mediaRec, stream) {
    printToConsole('speaking');
    mediaRecorderStart(stream, CALL_NET_SETTINGS.packet_ms);
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
    startRecordingAudio(callOnSilence, callOnSpeak, callOnDataAvailable);

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

setInterval(() => {
    if (_audioPacketsQueue.length == 0) return;

    if (_audioPacketsQueue.length >= CALL_NET_SETTINGS.packets_to_play) {
        let audioChunksToPlay = _audioPacketsQueue.slice(0, CALL_NET_SETTINGS.packets_to_play);
        if (_audioPacketsQueue.length <= CALL_NET_SETTINGS.packets_to_play) {
            _audioPacketsQueue = [];
        } else {
            _audioPacketsQueue = _audioPacketsQueue.slice(CALL_NET_SETTINGS.packets_to_play, _audioPacketsQueue.length);
        }

        let startChunk = audioChunksToPlay[0];
        if (!audioChunksToPlay[0].isHeaderBlob && lastHeaderBlob) {
            startChunk = lastHeaderBlob;
        }

        audioChunksToPlay = audioChunksToPlay.filter(x => !x.isHeaderBlob);
        audioChunksToPlay.unshift(startChunk);

		let concatChunks = new Blob(audioChunksToPlay.map(x => x.blob), { type: "audio/ogg; codecs=opus" });
        
        const arrayBuffer = new FileReader();
        arrayBuffer.onloadend = () => {
            audioContext.decodeAudioData(arrayBuffer.result, (buffer) => {
              playAudioBuffer(buffer);
            });
        };
        arrayBuffer.readAsArrayBuffer(concatChunks);
    } 
}, 1);