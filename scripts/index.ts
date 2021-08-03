/**
 * Corre una Jobs de forma manual. Corre desde el root del proyecto.
 *
 * node jobs/manual.js [Js File to run]
*/


import { Connections } from '../connections';
const path = require('path');

Connections.initialize();
const { setupServices } = require('../services');
setupServices();

const done = () => {
    process.exit(0);
};

const actionName = process.argv[2];
const fileName = path.join(process.cwd(), 'scripts', actionName + '.js');
const action = require(fileName);

action(done);
