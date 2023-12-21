//SEE: https://en.wikipedia.org/wiki/Test-driven_development
//SEE: https://en.wikipedia.org/wiki/Tree_(data_structure)#Terminology
//SEE: https://nodejs.org/api/test.html
const test = require('node:test');
const assert = require('node:assert');

/*
function getRouteFromTopology(sourcePeer, destPeer, topologyObj) {
    let r = [];
    
    if (!topologyObj[sourcePeer] || !topologyObj[destPeer]) return r;

    let sourceSubTree = getSubTreeFromTopology(sourcePeer); 
    let destSubTree = getSubTreeFromTopology(destPeer);
}
*/

function getSubTreeFromTopology(peerID, topologyObj) { //U: returns an array of the tree without silbings nodes.
    let r = {};

    if (!topologyObj[peerID]) return r;

    let currentPeerID = peerID;
    let depth = topologyObj[currentPeerID].depth;

    while(depth >= 0) { //A: fill with parents.
        r[currentPeerID] = topologyObj[currentPeerID];

        let parentID = Object.keys(topologyObj)
            .find(pid => topologyObj[pid].forwardTo.includes(currentPeerID) );
    
        if (!parentID)
            break;
        currentPeerID = parentID;
        depth--;
    }

     //A: fill widh childs.
    let childElements = [ topologyObj[peerID] ];
    do
    {
        let nextChildElements = [];
        childElements.forEach(tObj => {
                if (!tObj) return;
                tObj.forwardTo.forEach(childPeerID => {
                    if (!topologyObj[childPeerID]) return;
                    r[childPeerID] = topologyObj[childPeerID];
                    nextChildElements.push(topologyObj[childPeerID]);
            });
        });

        childElements = nextChildElements;

    } while (childElements.length > 0);
    
    return r;
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

function emuClients(n) { //U: Generate an array of n clients.
    let r = [];
    for (let i=0; i < n; i++) {
        r.push("C" + i);
    }

    return r;
}

test('one client forward to none', (t) => {
    let r = computeClientsTopology(['AA']);
    assert.deepEqual(r, {AA: []});
});

test('upto breadth clients', (t) => {
    let c = emuClients(5);
    let r = computeClientsTopology(c, null, 5);
    assert.deepEqual(r, {
        C0: [],
        C1: [],
        C2: [],
        C3: [],
        C4: []
      });
});

test('breadth + 1 clients', (t) => {
    let c = emuClients(3);
    let r = computeClientsTopology(c, null, 2);
    assert.deepEqual(r, {
        C0: ["C2"],
        C1: [],
        C2: []
      });
});

test('breadth*5 clients', (t) => {
    let c = emuClients(2*5);
    let r = computeClientsTopology(c, null, 2);
    assert.deepEqual(r, {
        C0: ["C2"],
        C1: [],
        C2: []
      });
});

test('path to node', (t) => {
    let c = emuClients(2*6);
    let r = computeClientsTopology(c, null, 2);
    let path = getSubTreeFromTopology("C2", r);
    assert.deepEqual(path, {
        C0: ["C2"],
        C1: [],
        C2: []
      });
});
