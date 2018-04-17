import * as mongoose from 'mongoose';
import * as moment from 'moment';

import * as agendaSchema from '../../turnos/schemas/agenda';
import * as turnoCtrl from '../../turnos/controller/turnoCacheController';

import * as configPrivate from '../../../config.private';
import * as sql from 'mssql';

const MongoClient = require('mongodb').MongoClient;
let async = require('async');
let pool;
let transaction;

let connection = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database
};


export function facturacionCtrl() {
    console.log("Entra a facturacion controller")
    // if (tieneObrascial) {
    //     operacionesRecuepero
    // } else  {
    //     operacionesSumar
    // }
}