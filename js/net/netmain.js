//S: Server
const LOCAL_PEER_INDEX = -1;
const P2P_HASH_KEY = "PA2023_";

const NET_OPTS = {
    snapshot_ms: 100,
    min_snapshot_ms: 40,
    max_packet_bytes: 4096,
    packets_delay_ms: 10,
};

let _currentPeer = null;

let _userInfo = {
    name: "No Name",
    server: false,
    conn: null,
    peerClients: [] //U: whom to send a message (server topology)
}

let _clientsToEmu=0;
let _clients = []; //U: _userInfo for each peer.
let _connections = {};
let _serverTopology={};
let _packetsQueue = [];

function netInit() {
    let serverToConnect = getServerPeerIDFromHash();
    setTimeout(netSendSnapshot, NET_OPTS.snapshot_ms);
    if (serverToConnect) {
        joinServer(serverToConnect, "no-name");
    }
}

function addDataToSnapshot(peerID, dataToSend) {
    _packetsQueue.push({pid: peerID, data: dataToSend});
}

function sendDataToPeerID(peerID, dataToSend) {
    if (_connections[peerID]) {
        _connections[peerID].conn.send(dataToSend);
    } else {
        let tmpConn = _currentPeer.connect(peerID, {label: _userInfo.name});
        tmpConn.on('open', () => {
            tmpConn.send(dataToSend);
            _connections[peerID] = {conn: tmpConn};
        });
        tmpConn.on('error', (err) => {
            printToConsole(`Error connecting with peer ${peerID} - error: ${err}`);
        });
    }
}

function netSendSnapshot() {
    if (!_currentPeer) {
        setTimeout(netSendSnapshot, NET_OPTS.snapshot_ms);
        return;
    }

    let bytesSent = 0;
    let delayMs = 0;
    while(bytesSent <= NET_OPTS.max_packet_bytes && _packetsQueue.length > 0 && (NET_OPTS.snapshot_ms-delayMs) >= NET_OPTS.min_snapshot_ms) 
    {
        let currentPacket = _packetsQueue.shift();
        bytesSent += roughSizeOfObject(currentPacket);
        setTimeout(() => sendDataToPeerID(currentPacket.pid, currentPacket.data),delayMs+1);
        delayMs+=NET_OPTS.packets_delay_ms;
    }
    if (bytesSent > 0) {
        //printToConsole(`bytes sent: ${bytesSent}`);
    }
    setTimeout(netSendSnapshot, Math.max(NET_OPTS.min_snapshot_ms, (NET_OPTS.snapshot_ms-delayMs)));
}

function netSendData(dataToSend, netRoute = null, firstSender = true) { //U: Send message to peers by connections arrays.
    if (!_currentPeer || !_userInfo.conn || !getLocalPeerID()) return;

    let currentDataToSend = {...dataToSend};
    let currentNetRoute = netRoute ? netRoute.slice() : null;
    if (!currentDataToSend["from"]) {
        currentDataToSend["from"] = getLocalPeerID();
    }

    if (currentNetRoute && currentNetRoute.length > 0) {
        currentNetRoute = currentNetRoute.map(x => x); //create local copy.
        let peerID = currentNetRoute.shift();
        if (currentNetRoute.length == 0) {
            addDataToSnapshot(peerID, currentDataToSend);
        } else {
            addDataToSnapshot(peerID, {
                tag: "forward",
                route: currentNetRoute,
                data: currentDataToSend,
                server: _userInfo.server
            });
        }
    } else if (firstSender && currentDataToSend.global && !_userInfo.server) {
        let rootPeerID = getRootPeerFromTopology(getServerTopology());
        addDataToSnapshot(rootPeerID, currentDataToSend);
    } else if (_userInfo.peerClients && _userInfo.peerClients.forwardTo) {
        _userInfo.peerClients.forwardTo.forEach(pid => addDataToSnapshot(pid, currentDataToSend));
    }
}

function clientsToTopologyArr(clientsArray) {
    let topologyArray = [];
    for(let i=0; i < clientsArray.length; i++) {
        if (!clientsArray[i].conn) continue;
        topologyArray.push(clientsArray[i].conn.peer);
    }
    
    return topologyArray;
}
function getRootPeerFromTopology(topologyObj) {
    return Object.keys(topologyObj).find(peerID => topologyObj[peerID].depth == 0);
} 

function isNetServer() {
    return _userInfo.server;
}

function isRootPeer(peerId, topologyObj) {
    return topologyObj && topologyObj[peerId] && topologyObj[peerId].depth && topologyObj[peerId].depth == 0;
}

function setServerTopology(topologyObj) {
    _serverTopology = topologyObj;
}

function getServerTopology() {
    return _serverTopology;
}

function updateLocalPeersFromTopology(topologyObj) {
    if (!_userInfo.conn || !getLocalPeerID() || !topologyObj[getLocalPeerID()]) return;
    _userInfo.peerClients = topologyObj[getLocalPeerID()];
}

function setClientsToEmulate(numberOfClients) {
    _clientsToEmu = numberOfClients;
}
function getClientsToEmulate() {
    return _clientsToEmu;
} 

function getLocalPeerID() {
    return _userInfo.conn.peer;
}

function getLocalPeerIDFromHash() {
    if (!window.location.hash) return P2P_HASH_KEY + "S";
    return P2P_HASH_KEY + window.location.hash.substring(1).split("&server=")[0];
}
function getServerPeerIDFromHash() {
    let upperCaseHash = window.location.hash.substring(1).toUpperCase();
    if (!window.location.hash) return null;
    if (!upperCaseHash.split("&SERVER=")[1]) return null;
    return upperCaseHash.split("&SERVER=")[1];
}

function emulateNewClient(clientNumber) {
    const url = new URL(location.href)
    url.hash="";
    window.open(`${url}#${clientNumber}&server=${getLocalPeerIDFromHash()}`, "_blank");
}

function computeClientsTopology(clients, prevTopology, breadth=2) { //U: Returns {client: clientsToFowardTo[]}
    let r = {};

    if (clients.length == 0) return r;
    //A: Hay al menos un cliente

    let ultimoAsignadoIndex=1;
    let profunidadActual = 0;
    while ((ultimoAsignadoIndex - Math.pow(breadth, profunidadActual)) < clients.length)
    {
        let cuantosPadres = Math.pow(breadth, profunidadActual);
        for (let i=0; i < cuantosPadres; i++) {
            let estePadreID = clients[ultimoAsignadoIndex-cuantosPadres+i];
            if (!estePadreID)
                break;
            r[estePadreID] = {
                    depth: profunidadActual,
                    forwardTo: clients
                        .slice(ultimoAsignadoIndex+i*breadth, ultimoAsignadoIndex+(i+1)*breadth)
            };
        }
        
        ultimoAsignadoIndex += breadth*cuantosPadres;
        profunidadActual++;
    }
    return r;
}

function getClients() {
    return _clients;
}

function clearClients() {
    _clients = [];
}

function addClient(userInfo) {
    _clients.push(userInfo);
}

function createServer(serverName) {
    
    _currentPeer = new Peer(getLocalPeerIDFromHash());
    printToConsole("Creating PeerJS server...");
    _userInfo.name = serverName;
    _userInfo.server = true;

    clearClients();
    addClient(_userInfo);

    //SERVER INIT
    _currentPeer.on('open', (id) => {
        printToConsole(`Server ${serverName} was started`);
        printToConsole(`My peer ID is: ${id}`);
        _userInfo.conn = {peer: id};

        for (let i=0; i < getClientsToEmulate(); i++) { //A: Start emulation
            emulateNewClient(i);
        }

        setInterval(() => {
            netSendData({
                tag: 'topology',
                server: true,
                global: true,
                data: getServerTopology()
            });
        }, 5000);
    });

    //CLIENT CONNECTION
    _currentPeer.on('connection', (remoteConn) => {
        printToConsole(`Client connected: ${remoteConn.peer}`);
       
        remoteConn.on('open', function() {
            remoteConn.on('data', function(data) {
                processNetMessage(data, remoteConn.peer);
            });
        });

        _connections[remoteConn.peer] = {conn: remoteConn};

        addClient({
            name: remoteConn.label,
            server: false,
            conn: remoteConn,
            peerClients: []
        });

        setServerTopology(computeClientsTopology(clientsToTopologyArr(getClients())));
        updateLocalPeersFromTopology(getServerTopology());

        printToConsole(`Comm Topology data:\n ${JSON.stringify(getServerTopology(), null, 3)}`);
        printToConsole(`Server data:\n ${JSON.stringify(_userInfo, null, 3)}`);
    });
}

function processNetMessage(dataReceived, peerSender) {

    if (!dataReceived || !dataReceived.tag) return;

    if (dataReceived.global) { //A: Spread data to children peers in the tree
        netSendData(dataReceived, null, false);

        //A: Avoid receiving the same packet peer sended globally.
        if (dataReceived.from.toLowerCase() == getLocalPeerID().toLowerCase()) {
            //printToConsole(`Packet from: ${dataReceived.from}`);
            return;
        }

    }

    switch(dataReceived.tag) {
        case 'topology':
            setServerTopology(dataReceived.data);
            updateLocalPeersFromTopology(dataReceived.data);
        break;
        case 'forward':
            printToConsole(`Forwarding message: ${dataReceived.route}`);
            netSendData(dataReceived.data, dataReceived.route);
        break;
        case 'msg':
            printToConsole(`${dataReceived.from}: ${dataReceived.msg}`);
        break;
        case 'audio':
            callReceivedAudioData(dataReceived.audioBlob, dataReceived.headerBlob, dataReceived.dbAverage, dataReceived.from);
        break;
        case 'cmd':
            let cmdCommand = `${dataReceived.cmd} ${dataReceived.args.toString()}`;
            printToConsole(`Emulating cmd: ${cmdCommand}`)
            processCMD(cmdCommand);
        break;
        case 'ping':
            if (dataReceived.from.toLowerCase() == getLocalPeerID().toLowerCase()) {
                printToConsole(`ping response ${Date.now() - dataReceived.time} ms received from route: ${dataReceived.route}`);
            } else if (Array.isArray(dataReceived.route)) {
                netSendData({
                    tag: 'ping',
                    from: dataReceived.from,
                    route: dataReceived.route,
                    time: dataReceived.time
                }, dataReceived.route);
            }
        break;
    }
}

function joinServer(peerID, userName) {
    clearClients();
    _currentPeer = new Peer(getLocalPeerIDFromHash());
    _userInfo.server = false;
    _userInfo.name = userName;

    printToConsole(`Creating Peer...`);

    _currentPeer.on('open', (id) => {
        printToConsole(`Peer created with ID: ${id}`)
        printToConsole(`Trying to connect to peer ID: ${peerID}`);
        let serverConn = _currentPeer.connect(peerID, {label: _userInfo.name});
        _userInfo.conn = {peer: id};

        _currentPeer.on('connection', (remoteConn) => {
            remoteConn.on('open', function() {
                remoteConn.on('data', function(data) {
                    processNetMessage(data, remoteConn.peer);
                });
            });
        });

        serverConn.on('open', () => {
            serverConn.on('close', function() {
                printToConsole(`Connection closed with: ${peerID}`);
            });
            serverConn.on('error', function(err) {
                printToConsole(`Error trying to connect with: ${peerID}\nError: ${err}`);
            });

            serverConn.on('data', function(data) {
                processNetMessage(data, peerID);
            });
    
            _connections[peerID] = {conn: serverConn};

            printToConsole(`Connected to server: ${peerID} as ${userName}`);
        });
    });
}

function createNewPeer() {
    return new Peer();
}