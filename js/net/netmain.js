//S: Server
const LOCAL_PEER_INDEX = -1;
const P2P_HASH_KEY = "PA2023_";

const NET_OPTS = {
    snapshot_ms: 5,
    max_packet_bytes: 128,
    max_packets_at_once: 2
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

function netInit() {
    let serverToConnect = getServerPeerIDFromHash();
    if (serverToConnect) {
        joinServer(serverToConnect, "no-name");
    }
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
    }
}

function netSendData(dataToSend, netRoute = null) { //U: Send message to peers by connections arrays.
    if (!_currentPeer) return;

    if (netRoute && netRoute.length > 0) {
        netRoute = netRoute.map(x => x); //create local copy.
        let peerID = netRoute.shift();
        if (netRoute.length == 0) {
            sendDataToPeerID(peerID, dataToSend);
        } else {
            printToConsole("Sending forward to: " + peerID);
            sendDataToPeerID(peerID, {
                tag: "forward",
                route: netRoute,
                data: dataToSend,
                server: _userInfo.server
            });
        }
    } else if (_userInfo.peerClients && _userInfo.peerClients.forwardTo) {
        _userInfo.peerClients.forwardTo.forEach(pid => sendDataToPeerID(pid, dataToSend));
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

function setServerTopology(topologyObj) {
    _serverTopology = topologyObj;
}

function getServerTopology() {
    return _serverTopology;
}

function updateLocalPeersFromTopology(topologyObj) {
    if (!_userInfo.conn || !_userInfo.conn.peer || !topologyObj[_userInfo.conn.peer]) return;
    _userInfo.peerClients = topologyObj[_userInfo.conn.peer];
    setTimeout(() => {
        netSendData({
            tag: 'topology',
            server: true,
            global: true, //if message should be sent to all clients
            data: getServerTopology()
        });
    }, 1);
}

function setClientsToEmulate(numberOfClients) {
    _clientsToEmu = numberOfClients;
}
function getClientsToEmulate() {
    return _clientsToEmu;
} 

function getLocalPeerIDFromHash() {
    if (!window.location.hash) return P2P_HASH_KEY + "S";
    return P2P_HASH_KEY + window.location.hash.substring(1).split("&server=")[0];
}
function getServerPeerIDFromHash() {
    if (!window.location.hash) return null;
    if (!window.location.hash.substring(1).split("&server=")[1]) return null;
    return window.location.hash.substring(1).split("&server=")[1];
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
                data: getServerTopology()
            });
        }, 25000);
    });

    //CLIENT CONNECTION
    _currentPeer.on('connection', (remoteConn) => {
        printToConsole(`Client connected: ${remoteConn.peer}`);
       
        remoteConn.on('open', function() {
            remoteConn.on('data', function(data) {
                processNetMessage(data);
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

function processNetMessage(dataReceived) {

    if (!dataReceived || !dataReceived.tag) return;

    if (dataReceived.global) { //A: Spread data to children peers in the tree
        netSendData(dataReceived);
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
        printToConsole(`Trying to connecto to peer ID: ${peerID}`);
        let conn = _currentPeer.connect(peerID, {label: _userInfo.name});
        _userInfo.conn = {peer: id};

        _currentPeer.on('connection', (remoteConn) => {
            remoteConn.on('data', function(data) {
                processNetMessage(data);
            });
        });

        conn.on('open', () => {
            conn.on('close', function() {
                printToConsole(`Connection closed with: ${peerID}`);
            });
            conn.on('error', function(err) {
                printToConsole(`Error trying to connect with: ${peerID}\nError: ${err}`);
            });

            conn.on('data', function(data) {
                processNetMessage(data);
            });
    
            printToConsole(`Connected to server: ${peerID} as ${userName}`);
        });

    });
}

function createNewPeer() {
    return new Peer();
}