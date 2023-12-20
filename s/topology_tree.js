//SEE: https://en.wikipedia.org/wiki/Test-driven_development
//SEE: https://en.wikipedia.org/wiki/Tree_(data_structure)#Terminology
//SEE: https://nodejs.org/api/test.html
const test = require('node:test');
const assert = require('node:assert');

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

            r[clients[index]] = [];
            for (let j=0; j < Math.min(breadth, Math.ceil(nextFloorChilds/currentFloorSize)); j++, childIndex++) {
                if (childIndex >= clients.length)
                    break;
                r[clients[index]].push(clients[childIndex]);
            }
        }
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

console.log("::ORIGINAL ARRAY::");
console.log(emuClients(15));
console.log("\n\nTREE")
console.log(computeClientsTopology(emuClients(15), null, 5));