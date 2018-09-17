import * as operationsCache from './operationsCacheController/operationsAgenda';
import * as dbg from 'debug';

const debug = dbg('integracion');

export async function integracionSips(done) {
    try {
        const agendasMongoPendientes = await operationsCache.getAgendasDeMongoPendientes();
        const total = agendasMongoPendientes.length;
        let counter = 0;
        debug('agendas pendientes: ', agendasMongoPendientes);
        agendasMongoPendientes.forEach(async (agenda) => {
            await operationsCache.guardarCacheASips(agenda);
            counter++;
            if (total === counter) {
                done();
            }
        });
        if (total === 0) {
            done();
        }
    } catch (ex) {
        // No pudo traer las agendas
        debug('Error al buscar agendas pendientes: ', ex);
        done();
        return (ex);
    }
}

export async function integracionAndes(done) {
    try {
        const agendasMongoExportadas = await operationsCache.getAgendasDeMongoExportadas();
        let counter = 0;
        const total = agendasMongoExportadas.length;
        agendasMongoExportadas.forEach(async (agenda) => {
            await operationsCache.checkCodificacion(agenda);
            counter++;
            if (counter === total) {
                done();
            }
        });
        if (total === 0) {
            done();
        }
    } catch (ex) {
        return (ex);
    }
}
