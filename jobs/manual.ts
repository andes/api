let schedule = require('node-schedule');
import { Connections } from './../connections';
import { jobs } from '../config.private';

Connections.initialize();
let action = require('../' + process.argv[2]);
action();
