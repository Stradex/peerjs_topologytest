//S: Server
const LOCAL_PEER_INDEX = -1;
const P2P_HASH_KEY = "PA2023_";

let _currentPeer = null;
let _userInfo = {
    name: "No Name",
    server: false,
    conn: null,
    peerClients: [] //U: whom to send a message (server topology)
}
let _clientsToEmu=0;
let _clients = []; //U: _userInfo for each peer.

function netInit() {
    let serverToConnect = getServerPeerIDFromHash();
    if (serverToConnect) {
        joinServer(serverToConnect, )
    }
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
    let l = clients.length-1;
    let depth = parseInt(Math.floor(Math.log(l*breadth-l+breadth)/Math.log(breadth)));

    let index=0;
    let childIndex=breadth;
    for (let treeFloor = 1; treeFloor <= depth; treeFloor++) {

        let nextFloorSize = Math.pow(breadth, (treeFloor+1));
        let currentFloorSize = Math.pow(breadth, treeFloor);
        let nextFloorChilds = Math.min(nextFloorSize, clients.length-childIndex);

        for (let i=0; i < currentFloorSize; i++, index++) {
            if (index >= clients.length) break;

            r[index] = {floor: treeFloor, peerClients: []};
            for (let j=0; j < Math.min(breadth, Math.ceil(nextFloorChilds/currentFloorSize)); j++, childIndex++) {
                if (childIndex >= clients.length)
                    break;
                r[index].peerClients.push(childIndex);
            }
        }
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

function addPeerToClient(clientIndex, peerChildIndex) {
    _clients[clientIndex].peerClients.push(peerChildIndex);
}

function resetClientsTopology() {
    for (let i=0; i < _clients.length; i++) {
        _clients[i].peerClients = [];
    }
}

function resetServerTopology() {
    _userInfo.peerClients = [];
}

function addPeerToServer(peerChildIndex) {
    _userInfo.peerClients.push(peerChildIndex);
}

function createServer(serverName) {
    clearClients();
    _currentPeer = new Peer(getLocalPeerIDFromHash());
    printToConsole("Creating PeerJS server...");
    _userInfo.name = serverName;
    _userInfo.server = true;

    //SERVER INIT
    _currentPeer.on('open', (id) => {
        printToConsole(`Server ${serverName} was started`);
        printToConsole(`My peer ID is: ${id}`);

        for (let i=0; i < getClientsToEmulate(); i++) { //A: Start emulation
            emulateNewClient(i);
        }
    });

    //CLIENT CONNECTION
    _currentPeer.on('connection', (remoteConn) => {
        printToConsole(`Client connected: ${remoteConn.peer}`);

        addClient({
            name: remoteConn.label,
            server: false,
            conn: remoteConn,
            peerClients: []
        });

        resetClientsTopology();
        resetServerTopology();

        let clientsTopology = computeClientsTopology(getClients());

        Object.keys(clientsTopology).forEach(index => {
            if (clientsTopology[index].floor == 1) {
                addPeerToServer(parseInt(index));
            }
            for(let i=0; i < clientsTopology[index].peerClients.length; i++) {
                addPeerToClient(parseInt(index), parseInt(clientsTopology[index].peerClients[i]));
            }
        });
        printToConsole(`Server data:\n ${JSON.stringify(_userInfo, null, 3)}`);
        printToConsole(`Clients data:\n ${JSON.stringify(getClients().map(({conn, ...keepAttrs}) => keepAttrs), null, 3)}`);
    });
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
        
        conn.on('open', () => {
            conn.on('close', function() {
                printToConsole(`Connection closed with: ${peerID}`);
            });
            conn.on('error', function(err) {
                printToConsole(`Error trying to connect with: ${peerID}\nError: ${err}`);
            });
    
            printToConsole(`Connected to server: ${peerID} as ${userName}`);
        });
    });
}

function createNewPeer() {
    return new Peer();
}