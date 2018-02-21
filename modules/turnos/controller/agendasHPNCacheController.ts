import * as operationsHPNCache from './operationsCacheHPNController';
import * as configPrivate from '../../../config.private';
import * as sql from 'mssql';

const MongoClient = require('mongodb').MongoClient;
let async = require('async');
let pool;
let transaction;

let connection = {
    user: configPrivate.conSqlHPN.auth.user,
    password: configPrivate.conSqlHPN.auth.password,
    server: configPrivate.conSqlHPN.serverSql.server,
    database: configPrivate.conSqlHPN.serverSql.database,
    port: configPrivate.conSqlHPN.serverSql.port // solo para test! BORRAR
};

export async function integracion() {
    return new Promise<Array<any>>(async function (resolve, reject) {
        try {
            let promisesArray: any = [];
            let agendasMongoPendientes = await operationsHPNCache.getAgendasDeMongoPendientes();
            for (let agenda of agendasMongoPendientes) {
                pool = await new sql.ConnectionPool(connection).connect();
                await operationsHPNCache.saveAgendaToPrestaciones(agenda, pool);
                pool.close();
            }
            resolve();
        } catch (ex) {
            pool.close();
            reject(ex);
        }
    });
}
