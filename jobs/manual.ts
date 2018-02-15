/**
 * Corre una Jobs de forma manual. Corre desde el root del proyecto.
 *
 * node jobs/manual.js [Js File to run]
*/
let schedule = require('node-schedule');
import { Connections } from './../connections';
import { jobs } from '../config.private';

Connections.initialize();
let action = require('../' + process.argv[2]);
action();
