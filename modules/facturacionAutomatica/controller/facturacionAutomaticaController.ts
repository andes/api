import * as facturacionAutomaticaModel from './../schemas/configFacturacionAutomatica';

export async function getConfigFacturacionAutomatica(query) {
    let params = {};
    if ((query.idPrestacionEjecutada) && (query.idPrestacionEjecutada !== 'undefined') && (query.idPrestacionEjecutada !== 'null')) {
        query['prestacionSnomed.conceptId'] = query.idPrestacionEjecutada;
    }

    if ((query.idPrestacionTurneable) && (query.idPrestacionTurneable !== 'undefined') && (query.idPrestacionTurneable !== 'null')) {
        query['conceptosTurneables.conceptId'] = query.idPrestacionTurneable;
    }

    return await facturacionAutomaticaModel.find(params);
}
