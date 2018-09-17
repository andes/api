/**
 * Corre una Jobs de forma manual. Corre desde el root del proyecto.
 *
 * node jobs/manual.js [Js File to run]
*/


import { Connections } from './../connections';
const path = require('path');

Connections.initialize();

const done = () => {
    process.exit(0);
};

const actionName = process.argv[2];
const action = require(path.join('..', actionName));

action(done);
