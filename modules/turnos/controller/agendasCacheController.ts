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
        pool = await sql.connect(connection);
        let agendasMongoPendientes = await operationsCache.getAgendasDeMongoPendientes();
        if (agendasMongoPendientes.length > 0) {
            operationsCache.guardarCacheASips(agendasMongoPendientes, 0, pool);
        }
        let agendasMongoExportadas = await operationsCache.getAgendasDeMongoExportadas();
        agendasMongoExportadas.forEach(async (agenda) => {
            promisesArray.push(await operationsCache.checkCodificacion(agenda, pool));
        });

        if (promisesArray.length > agendasMongoExportadas) {
            Promise.all(promisesArray).then(values => {
                pool.close();
            });
        } else {
        }
    } catch (ex) {
        pool.close();
        return (ex);
    }
}
