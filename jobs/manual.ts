/**
 * Corre una Jobs de forma manual. Corre desde el root del proyecto.
 *
 * node jobs/manual.js [Js File to run]
*/


import { AndesDrive } from '@andes/drive/';

import { Connections } from './../connections';
import { Drive } from '../config.private';
import { setupServices } from '../services';

const path = require('path');

Connections.initialize();

AndesDrive.setup(Drive);

setupServices();

const done = () => {
    process.exit(0);
};

const actionName = process.argv[2];
const action = require(path.join('..', actionName));

action(done);
