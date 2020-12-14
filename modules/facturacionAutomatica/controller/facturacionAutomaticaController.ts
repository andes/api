import * as facturacionAutomaticaModel from './../schemas/configFacturacionAutomatica';

export async function getConfigFacturacionAutomatica(query) {
    let params = {};
    if ((query.idPrestacionEjecutada) && (query.idPrestacionEjecutada !== 'undefined') && (query.idPrestacionEjecutada !== 'null')) {
        params['prestacionSnomed.conceptId'] = query.idPrestacionEjecutada;
    }

    if ((query.idPrestacionTurneable) && (query.idPrestacionTurneable !== 'undefined') && (query.idPrestacionTurneable !== 'null')) {
        params['conceptosTurneables.conceptId'] = query.idPrestacionTurneable;
    }

    return await facturacionAutomaticaModel.find(params);
}
