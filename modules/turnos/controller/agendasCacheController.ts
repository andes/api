import * as operationsCache from './operationsCacheController/operationsAgenda';
import * as dbg from 'debug';

let debug = dbg('integracion');

export async function integracionSips(done) {
    try {
        let agendasMongoPendientes = await operationsCache.getAgendasDeMongoPendientes();
        let total = agendasMongoPendientes.length;
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
        return (ex);
    }
}

export async function integracionAndes(done) {
    try {
        let agendasMongoExportadas = await operationsCache.getAgendasDeMongoExportadas();
        let counter = 0;
        let total = agendasMongoExportadas.length;
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
