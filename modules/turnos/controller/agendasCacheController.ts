import * as operationsCache from './operationsCacheController/operationsAgenda';
import * as configPrivate from '../../../config.private';
import * as sql from 'mssql';
import * as dbg from 'debug';

const MongoClient = require('mongodb').MongoClient;
let async = require('async');
let pool;
let transaction;
let debug = dbg('integracion');
let connection = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database
};

export async function integracionSips() {
    try {
        let agendasMongoPendientes = await operationsCache.getAgendasDeMongoPendientes();
        agendasMongoPendientes.forEach(async (agenda) => {
            await operationsCache.guardarCacheASips(agenda);
        });
    } catch (ex) {
        // No pudo traer las agendas
        debug('Error al buscar agendas pendientes: ', ex);
        return (ex);
    }
}

export async function integracionAndes() {
    try {
        let agendasMongoExportadas = await operationsCache.getAgendasDeMongoExportadas();
        agendasMongoExportadas.forEach(async (agenda) => {
            await operationsCache.checkCodificacion(agenda);
        });
    } catch (ex) {
        return (ex);
    }
}
