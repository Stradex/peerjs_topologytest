//SEE: https://en.wikipedia.org/wiki/Tree_(data_structure)#Terminology
//SEE: https://nodejs.org/api/test.html
const test = require('node:test');
const assert = require('node:assert');

function computeClientsTopology(clients, prevTopology, breadth=2) { //U: Returns {client: clientsToFowardTo[]}
    let r = {};
    for (let i=0; i < Math.min(breadth, clients.length); i++) {
        r[clients[i]] = [];
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