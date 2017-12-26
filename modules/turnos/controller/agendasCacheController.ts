import * as operationsCache from './operationsCacheController';
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
    return new Promise<Array<any>>(async function (resolve, reject) {
        try {
            let promisesArray: any = [];
            pool = await sql.connect(connection);
            let agendasMongoPendientes = await operationsCache.getAgendasDeMongoPendientes();
            if (agendasMongoPendientes.length > 0) {
                await operationsCache.guardarCacheASips(agendasMongoPendientes, 0, pool);
                resolve();
            } else {
                resolve();
            }
            let agendasMongoExportadas = await operationsCache.getAgendasDeMongoExportadas();
            agendasMongoExportadas.forEach(async (agenda) => {
                promisesArray.push(await operationsCache.checkCodificacion(agenda, pool));
            });

            if (promisesArray.length > agendasMongoExportadas) {
                Promise.all(promisesArray).then(values => {
                    pool.close();
                    resolve();
                });
            } else {
                resolve();
            }
        } catch (ex) {
            pool.close();
            reject(ex);
        }
    });
}
