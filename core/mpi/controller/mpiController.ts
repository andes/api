import {
    userScheduler
} from '../../../config.private';
import {
    pacienteMpi
} from '../schemas/paciente';
import {
    pacienteRejected
} from '../schemas/pacienteRejected';
import {
    matchSisa
} from '../../../utils/servicioSisa';
import {
    Auth
} from '../../../auth/auth.class';
import * as controllerPaciente from './paciente';
import * as debug from 'debug';

/**
 * Corrije nombre y apellido de los pacientes que ingresaron al repositorio
 * para detectar posibles problemas durante el escaneo del código QR del dni del paciente
 *
 * @export
 * @returns {Any}
 */
export function mpiCorrector() {
    return new Promise( async (resolve, reject) => {
        let logger = debug('mpiCorrector');
        let condicion = {
            reportarError: true
            //    $or:
            //      [{entidadesValidadoras: {$nin: ['Sisa']}}, {reportarError: true}]
        };
        let cursor = pacienteMpi.find(condicion).cursor();
        await cursor.eachAsync(async(doc: any) => {
            if (doc) {
                try {
                    let pacienteAndes: any = doc;
                    // realiza la consulta con sisa y devuelve los resultados del matcheo
                    await matchSisa(pacienteAndes).then(async resultado => {
                        let data = {};
                        if (resultado) {
                            let match = resultado['matcheos'].matcheo; // Valor del matcheo de sisa
                            let pacienteSisa = resultado['matcheos'].datosPaciente; // paciente con los datos de Sisa originales

                            if (match >= 95) {
                                // Solo lo validamos con sisa si entra por aquí
                                pacienteAndes.entidadesValidadoras.push('Sisa');
                                data = {
                                    nombre: pacienteSisa.nombre,
                                    apellido: pacienteSisa.apellido,
                                    reportarError: 'false',
                                    entidadesValidadoras: pacienteAndes.entidadesValidadoras
                                };
                                // PUT de paciente en MPI
                                await controllerPaciente.updatePaciente(pacienteAndes, data, userScheduler);

                            } else {
                                // POST/PUT en una collection pacienteRejected para un control a posteriori
                                let pacienteMatch = new pacienteRejected();
                                pacienteMatch.id = pacienteAndes._id;
                                pacienteMatch['documento'] = pacienteAndes.documento;
                                pacienteMatch['nombre'] = pacienteAndes.nombre;
                                pacienteMatch['apellido'] = pacienteAndes.apellido;
                                pacienteMatch['sexo'] = pacienteAndes.sexo;
                                pacienteMatch['fechaNacimiento'] = pacienteAndes.fechaNacimiento;
                                await pacienteRejected.findById(pacienteAndes.id).then(async pac => {
                                    if (pac) {
                                        pacienteMatch = pac;
                                    }
                                    pacienteMatch['porcentajeMatch'] = [{
                                        'entidad': 'Sisa',
                                        'match': pacienteAndes.matchSisa
                                    }];
                                    await pacienteMatch.save();

                                });
                            }

                        }
                    });
                } catch (err) {
                    logger('Error', err);
                }
            }
            return Promise.resolve();
        });
        logger('Proceso finalizado');
        resolve();
    });
}
