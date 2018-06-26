/**
 * Corre una Jobs de forma manual. Corre desde el root del proyecto.
 *
 * node jobs/manual.js [Js File to run]
*/


import { Connections } from './../connections';
let path = require('path');

Connections.initialize();

let done = () => {
    process.exit(0);
};

let actionName = process.argv[2];
let action = require(path.join('..', actionName));

action(done);
