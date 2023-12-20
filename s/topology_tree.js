//SEE: https://en.wikipedia.org/wiki/Test-driven_development
//SEE: https://en.wikipedia.org/wiki/Tree_(data_structure)#Terminology
//SEE: https://nodejs.org/api/test.html
const test = require('node:test');
const assert = require('node:assert');

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
