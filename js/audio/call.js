const CALL_NET_SETTINGS = {
    packet_ms: 80,
    packets_to_play: 5, //400ms
}

let _callRoutes = []; //array with routes to send data to each client.
let _globalCall = false;
let _audioPacketsQueue = {}; //array of audio packets peer each peerID
let _lastHeaderBlob = null;

function callOnDataAvailable(blob, audioChunks, isHeaderBlob) {
    let currentDBAverage = Math.round(getCurrentdBAverage()*100.0);
    blobToBase64(blob, (base64Data) => {
        
        if (_globalCall) {
            netSendData({
                tag: 'audio',
                global: true,
                audioBlob: base64Data,
                headerBlob: isHeaderBlob,
                dbAverage: currentDBAverage
            });
        } else {
            _callRoutes.forEach(route => {

                if (!route || route.length == 0) return;
                netSendData({
                    tag: 'audio',
                    global: false,
                    audioBlob: base64Data,
                    headerBlob: isHeaderBlob,
                    dbAverage: currentDBAverage
                }, route);
            });
        }
    });
}

function callMediaRecorderStop(mediaRec) {
	if (!mediaRec) return;

	mediaRec.stop();
}

function callReceivedAudioData(audioBlob64, isHeaderBlob, packetdBAverage, fromPeer) {
    let audioBlob = b64toBlob(audioBlob64, "audio/ogg; codecs=opus");
    if (!_audioPacketsQueue[fromPeer]) {
        _audioPacketsQueue[fromPeer] = [];
    }
    _audioPacketsQueue[fromPeer].push( {blob: audioBlob, isHeader: isHeaderBlob, dBAverage: packetdBAverage});

    if (isHeaderBlob) {
        if (!_lastHeaderBlob || _lastHeaderBlob.dBAverage > packetdBAverage) {
            _lastHeaderBlob = {blob: audioBlob, isHeader: isHeaderBlob, dBAverage: packetdBAverage};
        }
    }
}

function callOnSilence(mediaRec) {
    //printToConsole('silence');
    callMediaRecorderStop(mediaRec);
}
  
function callOnSpeak(mediaRec, stream) {
    //printToConsole('speaking');
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

//A: Handle the _audioPacketsQueue while receiving audio packets.
setInterval(() => {
    let delay=0;
    Object.keys(_audioPacketsQueue).forEach(peerId => {
        let peerAudioPackets = _audioPacketsQueue[peerId];

        if (!peerAudioPackets || peerAudioPackets.length == 0) return;

        if (peerAudioPackets.length >= CALL_NET_SETTINGS.packets_to_play) {

            let audioChunksToPlay = peerAudioPackets.slice(0, CALL_NET_SETTINGS.packets_to_play);
            if (peerAudioPackets.length <= CALL_NET_SETTINGS.packets_to_play) {
                peerAudioPackets = [];
            } else {
                peerAudioPackets = peerAudioPackets.slice(CALL_NET_SETTINGS.packets_to_play, peerAudioPackets.length);
            }

            let startChunk = audioChunksToPlay[0];
            if (!audioChunksToPlay[0].isHeaderBlob && _lastHeaderBlob) {
                startChunk = _lastHeaderBlob;
            }

            audioChunksToPlay = audioChunksToPlay.filter(x => !x.isHeaderBlob);
            audioChunksToPlay.unshift(startChunk);

            _audioPacketsQueue[peerId] = peerAudioPackets;

            let concatChunks = new Blob(audioChunksToPlay.map(x => x.blob), { type: AUDIO_SETTINGS.codec });
            
            const arrayBuffer = new FileReader();

            arrayBuffer.onloadend = () => {
                audioContext.decodeAudioData(arrayBuffer.result, (buffer) => {
                    playAudioBuffer(buffer, delay);
                });
            };
            arrayBuffer.readAsArrayBuffer(concatChunks);
        }
        delay++;
    });
}, 1);