import * as facturacionAutomaticaModel from './../schemas/configFacturacionAutomatica';

export async function getConfigFacturacionAutomatica(query) {
    const params = {};
    if (query.idPrestacionEjecutada) {
        params['prestacionSnomed.conceptId'] = query.idPrestacionEjecutada;
    }

    if (query.idPrestacionTurneable) {
        params['conceptosTurneables.conceptId'] = query.idPrestacionTurneable;
    }

    return await facturacionAutomaticaModel.find(params);
}
