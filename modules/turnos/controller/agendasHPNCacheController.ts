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
    database: configPrivate.conSqlHPN.serverSql.database
};

export async function integracion() {
    console.log('INTEGRACION START');
    return new Promise<Array<any>>(async function (resolve, reject) {
        try {
            let promisesArray: any = [];
            let agendasMongoPendientes = await operationsHPNCache.getAgendasDeMongoPendientes();

            for (let agenda of agendasMongoPendientes) {
                pool = await sql.connect(connection);
                await operationsHPNCache.saveAgendaToHospital(agenda, pool);
                pool.close();
            }

            console.log('FINISHED');
            resolve();
        } catch (ex) {
            pool.close();
            reject(ex);
        }
    });
}
