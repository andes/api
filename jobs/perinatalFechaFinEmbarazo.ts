
import { CarnetPerinatal } from '../modules/perinatal/schemas/carnet-perinatal.schema';
import { CarnetPerinatalCtr } from '../modules/perinatal/carnet-perinatal.routes';
import { perinatalFechaFinEmbarazoLog } from '../modules/perinatal/perinatal.log';
import { getPaciente as getPacienteSP } from '../utils/servicioSipPlus';
import { userScheduler } from '../config.private';
import moment = require('moment');
import { ISnomedConcept } from '../modules/rup/schemas/snomed-concept';

const fechaFinEmbLog = perinatalFechaFinEmbarazoLog.startTrace();


/**
 * Se actualiza el dato de fechaFinEmbarazo en carnetPerinatal con los obtenidos de sip-plus
 */
export async function updatePerinatalFechaFinEmbarazo() {
    // se obtienen los registros de pacientes que no contengan fecha fin embarazo
    const query = { fechaFinEmbarazo: null };

    const listaCarnetPerinatal: any[] = await CarnetPerinatal.find(query);
    for (const regPerinatal of listaCarnetPerinatal) {
        try {
            await actualizarRegistro(regPerinatal);
        } catch (err) {
            await fechaFinEmbLog.error('job-carnet-perinatal-updated', { id: regPerinatal._id }, err, userScheduler);
        }
    }
}


export async function actualizarRegistro(registroPer: any) {
    const documento = registroPer.paciente.documento;
    if (documento) {
        const resultSP = await getPacienteSP({ documento });

        const pacienteSP = resultSP ? resultSP.paciente : null;

        if (pacienteSP && registroPer.embarazo && pacienteSP['pregnancies']) {


            // eslint-disable-next-line no-console
            console.log(JSON.stringify(registroPer));

            const numGesta = getNumGesta(registroPer.embarazo);


            const embarazoSP = numGesta ? pacienteSP['pregnancies'][numGesta.toString()] : null;

            if (embarazoSP) {
                // se actualiza fechaFinEmbarazo
                // "0182": tipo de finalización del embarazo (0=> parto / 1=> aborto)
                const finEmbarazo = [0, 1].includes(embarazoSP['0182']);

                // "0183" : fecha de finalización del embarazo
                const fechaFinEmb = embarazoSP['0183'] ? moment(embarazoSP['0183'], 'DD/MM/YY') : '';

                const updatefechaFinEmb = finEmbarazo && fechaFinEmb.toString();

                if (updatefechaFinEmb) {
                    registroPer.fechaFinEmbarazo = fechaFinEmb;
                }

                // se actualiza fecha de Proximo Control embarazo
                let updateFechaProxCtrl = false;

                if (registroPer.fechaUltimoControl) {
                    let fechaProxCtrol = null;

                    const fechaUltimoCtrl = moment(registroPer.fechaUltimoControl).format('DD/MM/YY');

                    // verificamos si ya existe el control de embarazo en sip-plus
                    const keysPrenatal = embarazoSP['prenatal'] ? Object.keys(embarazoSP['prenatal']) : [];
                    const controlesEmb = keysPrenatal.map(key => ({ key, valor: embarazoSP['prenatal'][key] }));

                    const ultimoCtrl = controlesEmb.find(ctrl => ctrl.valor['0116'] && ctrl.valor['0116'] === fechaUltimoCtrl);
                    // fecha del próximo control
                    const diaProxCtrl = ultimoCtrl?.valor['0128']; // dia del próximo control (NUMERIC)
                    const mesProxCtrl = ultimoCtrl?.valor['0129']; // mes del próximo control (NUMERIC)
                    if (diaProxCtrl && mesProxCtrl) {
                        const proxAnio = moment(fechaUltimoCtrl, 'DD/MM/YY').format('YY');
                        fechaProxCtrol = moment(diaProxCtrl + '/' + mesProxCtrl + '/' + proxAnio, 'DD/MM/YY');
                        // si la fecha actual es menor a un año, entonces resto un año
                        if (fechaProxCtrol < fechaUltimoCtrl) {
                            fechaProxCtrol = moment(fechaProxCtrol).subtract(1, 'year');
                        }
                    }
                    const fechaProxPer = registroPer.fechaProximoControl;
                    updateFechaProxCtrl = fechaProxCtrol && (!fechaProxPer || (fechaProxPer && fechaProxPer < fechaProxCtrol));

                    if (updateFechaProxCtrl) {
                        registroPer.fechaProximoControl = fechaProxCtrol;
                    }
                }
                if (updatefechaFinEmb || updateFechaProxCtrl) {
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
    const gestas = {
        29399001: 1, 199719009: 1, 127364007: 1, 53881005: 1,
        127365008: 2, 127366009: 3, 127367000: 4, 127368005: 5,
        127369002: 6, 127370001: 7, 127371002: 8, 127372009: 9,
        127373004: 10
    };
    const numGesta = gestas[conceptId] || null;
    return numGesta;
}
