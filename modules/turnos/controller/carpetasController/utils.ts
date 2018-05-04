import * as config from '../../../../config.private';
import * as sql from 'mssql';
import * as debug from 'debug';
const logger = debug('carpetasJob');

export function migrar(q_objeto, q_limites, page_size, addNuevoObjeto) {
    let max;
    const connection = {
        user: config.sqlCarpetasJob.user,
        password: config.sqlCarpetasJob.password,
        server: config.sqlCarpetasJob.server,
        database: config.sqlCarpetasJob.database,
        // connectionTimeout: config.sqlCarpetasJob.connectionTimeout,
        requestTimeout: config.sqlCarpetasJob.requestTimeout
    };

    async function navegar(pool, index) {
        if (index < max) {
            let offset = index + page_size;
            return pool.request()
                .query(q_objeto)
                .then(objetos => {
                    if (objetos.recordset && objetos.recordset.length) {
                        logger("ACA ESTAMOS", objetos.recordset)
                        let nuevosObjetos = objetos.recordset.map(o => addNuevoObjeto(o));
                        return Promise.all(nuevosObjetos).then(res =>
                            navegar(pool, offset + 1)
                        );
                    } else { return navegar(pool, offset + 1); }
                });
        } else {
            pool.close();
        }
    }

    async function runQuery() {
        try {
            let connectionPool = await sql.connect(connection);
            logger('RunQuery...');
            if (connectionPool.pool.max) {
                logger(connectionPool.pool.min + ' - ' + connectionPool.pool.max);
                let min = connectionPool.pool.min;
                max = connectionPool.pool.max;
                return navegar(connectionPool, min);
            }
        } catch (err) {
            logger('Catched error en runQuery() ---->', err);
        }
        sql.on('error', err => {
            logger('Error SQL---->', err);
        });
    }

    return runQuery();
}


// export function migrarOffset(q_objeto, q_limites, page_size, addNuevoObjeto) {
//     let max;
//     const connection = {
//         user: config.sqlCarpetasJob.user,
//         password: config.sqlCarpetasJob.password,
//         server: config.sqlCarpetasJob.server,
//         database: config.sqlCarpetasJob.database,
//         // connectionTimeout: config.sqlCarpetasJob.connectionTimeout,
//         requestTimeout: config.sqlCarpetasJob.requestTimeout
//     };

//     function jobMigracion(connection, i, page_size1, total) {
//         logger(i, page_size1);
//         if (i * page_size1 < total) {
//             let offset = i * page_size1;
//             return sqlserver.queryOffset(connection, q_objeto, page_size1, offset)
//                 .then(objetos => {
//                     if (objetos && objetos.length) {
//                         logger('Cant pacientes', objetos.length);
//                         let nuevosObjetos = objetos.map(o => addNuevoObjeto(o));
//                         return Promise.all(nuevosObjetos).then(res =>
//                             jobMigracion(connection, i + 1, page_size1, total)
//                         );
//                     } else {
//                         return jobMigracion(connection, i + 1, page_size1, total);
//                     }
//                 });
//         }
//     }

//     return sqlserver.query(connection, q_limites)
//         .then(resultado => {
//             if (resultado[0]) {
//                 logger(resultado[0]['min'] + ' - ' + resultado[0]['max']);
//                 let min = resultado[0]['min'];
//                 max = resultado[0]['max'];
//                 logger('MAX', max);
//                 return jobMigracion(connection, 0, 5000, max);
//             }
//         });
// }

