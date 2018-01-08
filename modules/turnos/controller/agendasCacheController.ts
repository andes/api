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
        let promisesArray: any = [];
        let opsPromises = [];
        opsPromises.push(operationsCache.getAgendasDeMongoPendientes());
        opsPromises.push(operationsCache.getAgendasDeMongoExportadas());
        let results = await Promise.all(opsPromises);
        let agendasMongoPendientes = results[0];
        let agendasMongoExportadas = results[1];

        let promises = [];
        agendasMongoPendientes.forEach((agenda) => {
            promises.push(operationsCache.guardarCacheASips(agenda));
        });
        agendasMongoExportadas.forEach((agenda) => {
            promises.push(operationsCache.checkCodificacion(agenda));
        });

        await Promise.all(promises);
    } catch (ex) {
        return (ex);
    }
}
