import * as operationsCache from './operationsCacheController/operationsAgenda';
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

export async function integracionSips() {
    try {
        let agendasMongoPendientes = await operationsCache.getAgendasDeMongoPendientes();
        agendasMongoPendientes.forEach(async (agenda) => {
            await operationsCache.guardarCacheASips(agenda);
        });
    } catch (ex) {
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
