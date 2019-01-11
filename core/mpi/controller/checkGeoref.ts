import {
    userScheduler
} from '../../../config.private';
import * as controller from './paciente';
import { pacienteGeoPrueba } from '../schemas/paciente';


/**
 * Verfica que el paciente a insertar en MPI no exista previamente
 *
 * @export
 * @param {Paciente} pacienteBuscado
 * @returns
 */

export function checkGeoreferencia() {

    const pacientes = pacienteGeoPrueba.find().cursor();

    return pacientes.eachAsync((unPaciente: any) => {
        return new Promise(async (resolve, reject) => {
            if (unPaciente !== null) {
                try {
                    // Usuario que crea/modifica (Para audit)
                    userScheduler.user = {
                        usuario: { nombre: (unPaciente.createdBy) ? unPaciente.createdBy.nombre : 'nunca actualizado', apellido: (unPaciente.createdBy) ? unPaciente.createdBy.apellido : 'nunca actualizado' },
                        organizacion: (unPaciente.createdBy) ? unPaciente.createdBy.organizacion : 'nunca actualizado'
                    };
                    // Se eliminan los registros a modificar
                    delete unPaciente.direccion[0].geoReferencia;
                    delete unPaciente.direccion[0].ubicacion.barrio;
                    await controller.actualizarGeoReferencia(unPaciente, unPaciente, userScheduler);

                    console.log('Paciente con DNI: ' + unPaciente.documento + ' finalizado.');
                    resolve();
                } catch (ex) {
                    console.log('**** error en paciente con DNI: ', unPaciente.documento, ' ****\n', ex);
                    resolve();
                    return (ex);
                }
            }
        });
    });
}
