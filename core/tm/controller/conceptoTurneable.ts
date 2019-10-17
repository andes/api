import { tipoPrestacion } from '../schemas/tipoPrestacion';
import { reject } from 'async';

export async function getConceptosTurneables(conceptoTurneable) {
    const query: any = {};

    if (conceptoTurneable.conceptId) {
        query.conceptId = RegExp('^.*' + conceptoTurneable.conceptId + '.*$', 'i');
    }

    if (conceptoTurneable.term) {
        query.term = RegExp('^.*' + conceptoTurneable.term + '.*$', 'i');
    }

    if (conceptoTurneable.fsn) {
        query.fsn = RegExp('^.*' + conceptoTurneable.fsn + '.*$', 'i');
    }

    if (conceptoTurneable.semanticTag) {
        query.semanticTag = RegExp('^.*' + conceptoTurneable.semanticTag + '.*$', 'i');
    }

    let conceptosTurneables = null

    if (query !== {}) {
        conceptosTurneables = await tipoPrestacion.find(query);
    }

    if (conceptosTurneables && conceptosTurneables.length) {
        return conceptosTurneables;
    } else {
        return null;
    }
}

export async function postConceptosTurneables(conceptoTurneable) {
    try {
        const nuevoConceptoTurneable = new tipoPrestacion(conceptoTurneable);
        await nuevoConceptoTurneable.save()
        return nuevoConceptoTurneable;
    } catch (err) {
        return err;
    }
}

export async function patchConceptosTurneables(idConceptoTurneable, cambios) {
    try {
        let resultado: any = await tipoPrestacion.findById(idConceptoTurneable);
        let conceptoTurneableOriginal = resultado.toObject();
        if (resultado) {
            if (cambios.noNominalizada !== resultado.noNominalizada) {
                resultado.noNominalizada = cambios.noNominalizada;
            }

            if (cambios.auditable !== resultado.auditable) {
                resultado.auditable = cambios.auditable;
            }
        }

        await resultado.save();
        return {
            conceptoTurneable: resultado,
            conceptoTurneableOriginal: conceptoTurneableOriginal
        };
    } catch (err) {
        return err;
    }
}

export async function deleteConceptoTurneable(idConceptoTurneable) {
    try {
        const conceptoTurneable = await tipoPrestacion.findOneAndDelete({'_id': idConceptoTurneable});
        return conceptoTurneable;
    } catch (err) {
        return err;
    }
}