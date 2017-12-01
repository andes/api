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
    return new Promise<Array<any>>(async function (resolve, reject) {
        try {
            let promisesArray: any = [];
            let agendasMongoPendientes = await operationsHPNCache.getAgendasDeMongoPendientes();

            for (let agenda of agendasMongoPendientes) {
                pool = await sql.connect(connection);
                await operationsHPNCache.saveAgendasToHospital(agenda, pool);
                pool.close();
            };

            console.log('FINISHED');
            
            //await operationsHPNCache.saveAgenda(null, null, pool);
            //await operationsHPNCache.saveTurno(null, null, pool);
            //await operationsHPNCache.savePaciente(null, null, pool);
            
            ///
            
            // let agendasMongoPendientes = await operationsCache.getAgendasDeMongoPendientes();
            // if (agendasMongoPendientes.length > 0) {
            //     await operationsCache.guardarCacheASips(agendasMongoPendientes, 0, pool);
            //     resolve();
            // } else {
            //     resolve();
            // }

            // let promisesArray: any = [];
            // let agendasMongoExportadas = await operationsCache.getAgendasDeMongoExportadas();
            // agendasMongoExportadas.forEach(async (agenda) => {
            //     promisesArray.push(await operationsCache.checkCodificacion(agenda, pool));
            // });

            // if (promisesArray.length > agendasMongoExportadas) {
            //     Promise.all(promisesArray).then(values => {
            //         pool.close();
            //         resolve();
            //     });
            // } else {
            //     resolve();
            // }
        } catch (ex) {
            pool.close();
            reject(ex);
        }
    });
}
