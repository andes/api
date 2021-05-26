
import { CarnetPerinatal } from '../modules/perinatal/schemas/carnet-perinatal.schema';
import { CarnetPerinatalCtr } from '../modules/perinatal/carnet-perinatal.routes'
import { perinatalFechaFinEmbarazoLog } from '../modules/perinatal/perinatal.log';
import { getPaciente as getPacienteSP } from '../utils/servicioSipPlus';

import { userScheduler } from '../config.private';

import moment = require('moment');

import { ISnomedConcept } from 'modules/rup/schemas/snomed-concept';

const fechaFinEmbLog = perinatalFechaFinEmbarazoLog.startTrace();


/**
 * Se actualiza el dato de fechaFinEmbarazo en carnetPerinatal con los obtenidos de sip-plus
 */
export async function updatePerinatalFechaFinEmbarazo() {
    // se obtienen los registros de pacientes que no contengan fecha fin embarazo
    const query = {
        $or: [
            { fechaFinEmbarazo: { $exists: false } },
            { fechaFinEmbarazo: { $eq: null } }]
    };

    let listaCarnetPerinatal: any = await CarnetPerinatal.find(query);

    for (let regPerinatal of listaCarnetPerinatal) {
        try {
            await actualizarFechaFin(regPerinatal);
        } catch (err) {
            await fechaFinEmbLog.error('carnet-perinatal-updated', { id: regPerinatal._id }, err, userScheduler);
        }
    }
}

export async function actualizarFechaFin(registroPer: any) {
    let documento = registroPer.paciente.documento;
    if (documento) {
        const resultSP = await getPacienteSP({ documento });
        const pacienteSP = resultSP ? resultSP.paciente : null;

        if (pacienteSP && registroPer.embarazo && pacienteSP['pregnancies']) {

            const numGesta = getNumGesta(registroPer.embarazo).toString() || null;

            let embarazoSP = numGesta ? pacienteSP['pregnancies'][numGesta] : null;
            if (embarazoSP) {

                // "0182": tipo de finalización del embarazo (0=> parto / 1=> aborto)
                const finEmbarazo = [0, 1].includes(embarazoSP['0182']);

                // "0183" : fecha de finalización del embarazo
                const fechaFinEmb = embarazoSP['0183'] ? moment(embarazoSP['0183'], 'DD/MM/YY') : null;

                if (finEmbarazo && fechaFinEmb) {
                    registroPer.fechaFinEmbarazo = fechaFinEmb;
                    await CarnetPerinatalCtr.update(registroPer.id, registroPer, userScheduler as any);
                }
            }

        }

    }
}


/**
 * obtenemos el número de embarazo
 * @param concepto concepto snomed con el numero de embarazo
 * @returns numero de embarazo
 */
function getNumGesta(concepto: ISnomedConcept) {
    const conceptId = concepto.conceptId;
    const conceptIdPrimerGesta = ['29399001', '199719009', '127364007', '53881005'];
    let numGesta = null;
    if (conceptIdPrimerGesta.includes(conceptId)) {
        numGesta = 1;
    }
    else {
        switch (conceptId) {
            case '127365008': numGesta = 2;
                break;
            case '127366009': numGesta = 3;
                break;
            case '127367000': numGesta = 4;
                break;
            case '127368005': numGesta = 5;
                break;
            case '127369002': numGesta = 6;
                break;
            case '127370001': numGesta = 7;
                break;
            case '127371002': numGesta = 8;
                break;
            case '127372009': numGesta = 9;
                break;
            case '127373004': numGesta = 10;
                break;
            default:
                break;
        }
    }
    return numGesta;
}
