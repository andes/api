/**
 * Corre una Jobs de forma manual. Corre desde el root del proyecto.
 *
 * node jobs/manual.js [Js File to run]
*/


import { AndesDrive } from '@andes/drive/';
import { Drive } from '../config.private';
import { Connections } from './../connections';

const path = require('path');

Connections.initialize();
AndesDrive.setup(Drive);

const { setupServices } = require('../services');
setupServices();

const done = () => {
    process.exit(0);
};

const actionName = process.argv[2];
require('./../modules/webhook');
const action = require(path.join('..', actionName));

action(done);
