import * as operationsCache from './operationsCacheController/operationsAgenda';
import * as dbg from 'debug';

let debug = dbg('integracion');

export async function integracionSips() {
    try {
        let agendasMongoPendientes = await operationsCache.getAgendasDeMongoPendientes();
        debug('agendas pendientes: ', agendasMongoPendientes);
        agendasMongoPendientes.forEach(async (agenda) => {
            await operationsCache.guardarCacheASips(agenda);
        });
    } catch (ex) {
        // No pudo traer las agendas
        debug('Error al buscar agendas pendientes: ', ex);
        return (ex);
    }
}

export async function integracionAndes() {
    try {
        let agendasMongoExportadas = await operationsCache.getAgendasDeMongoExportadas();
        agendasMongoExportadas.forEach(async (agenda) => {
            await operationsCache.checkCodificacion(agenda);
        });
    } catch (ex) {
        return (ex);
    }
}
