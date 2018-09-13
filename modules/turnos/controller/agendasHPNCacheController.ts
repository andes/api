import * as operationsHPNCache from './operationsCacheHPNController';
import * as configPrivate from '../../../config.private';
import * as sql from 'mssql';

let pool;

const connection = {
    user: configPrivate.conSqlHPN.auth.user,
    password: configPrivate.conSqlHPN.auth.password,
    server: configPrivate.conSqlHPN.serverSql.server,
    database: configPrivate.conSqlHPN.serverSql.database,
    port: configPrivate.conSqlHPN.serverSql.port,
    requestTimeout: 30000
};

export async function integracion() {
    return new Promise<Array<any>>(async (resolve, reject) => {
        try {
            const agendasMongoPendientes = await operationsHPNCache.getAgendasDeMongoPendientes();
            for (const agenda of agendasMongoPendientes) {
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
