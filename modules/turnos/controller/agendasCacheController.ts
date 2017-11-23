// Se definen las operaciones de agendas y SIPS
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
    try {
        pool = await sql.connect(connection);
        let agendasMongoExportadas = await operationsCache.getAgendasDeMongoExportadas();
        console.log("Agendas Exportadas: ", agendasMongoExportadas.length)
        agendasMongoExportadas.forEach(async (agenda) => {
            await operationsCache.checkCodificacion(agenda, pool);
        });

        let agendasMongoPendientes = await operationsCache.getAgendasDeMongoPendientes();
        if (agendasMongoPendientes.length > 0) {
            console.log("Entra a Agendas Mongo Pendientes")
            await operationsCache.guardarCacheASips(agendasMongoPendientes, 0, pool);
        } else {
            // pool.close();
        }
    } catch (ex) {
        pool.close();
    }
}
