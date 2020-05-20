import * as debug from 'debug';
import { LoggerJobs } from '../../../../utils/loggerJobs';
const logger = debug('carpetasJob');

export function migrar(q_objeto, _q_limites, page_size, addNuevoObjeto, connectionPool) {
    let max;

    async function navegar(pool, index) {
        if (index < max) {
            const offset = index + page_size;
            return pool.request()
                .query(q_objeto)
                .then(objetos => {
                    if (objetos.recordset && objetos.recordset.length) {
                        const nuevosObjetos = objetos.recordset.map(addNuevoObjeto);
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
            logger('RunQuery...');
            if (connectionPool.pool.max) {
                logger(connectionPool.pool.min + ' - ' + connectionPool.pool.max);
                const min = connectionPool.pool.min;
                max = connectionPool.pool.max;
                return navegar(connectionPool, min);
            }
        } catch (err) {
            logger('Catched error en runQuery() ---->', err);
            LoggerJobs.log('actualizar carpetas', 'Error catched en runQuery(): ' + err);

        }
    }

    return runQuery();
}
