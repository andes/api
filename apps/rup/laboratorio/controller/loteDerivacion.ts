
import { EventCore } from '@andes/event-bus';
import { LoteDerivacion } from './../schemas/loteDerivacion';
/**
 *
 *
 * @export
 * @param {*} req
 * @returns
 */
export async function updateLote(req) {
    let result = await LoteDerivacion.updateOne(
        { _id: req.params.id },
        { $push: { estados : req.body.estado } }
    );

    if (req.body.estado.tipo === 'enviado') {
        let loteDerivacion: any = await LoteDerivacion.findById(req.params.id);

        EventCore.emitAsync('rup:laboratorio:prestacion:derivar', {
            idOrganizacionOrigen: req.body.idOrganizacion,
            derivaciones: loteDerivacion.itemsLoteDerivacion
        });
    }

    return result;
}

/**
 *
 *
 * @export
 * @returns
 */
export function generarNumeroLoteDerivacion() {
    return 'XXX';
}
