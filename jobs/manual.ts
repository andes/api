/**
 * Corre una Jobs de forma manual. Corre desde el root del proyecto.
 *
 * node jobs/manual.js [Js File to run]
*/

import { Connections } from './../connections';

Connections.initialize();
let action = require('../' + process.argv[2]);
action();
