import {
    userScheduler
} from '../../../config.private';
import * as controller from './paciente';
import {
    paciente,
    pacienteMpi
} from '../schemas/paciente';

import * as debug from 'debug';
import * as servicioAnses from './../../../utils/servicioAnses';
import { Logger } from '../../../utils/logService';
const dbg = debug('mpiUpdater');


/**
 * Verfica que el paciente a insertar en MPI no exista previamente
 *
 * @export
 * @param {Paciente} pacienteBuscado
 * @returns
 */

async function existeEnMpi(pacienteBuscado: any) {
    const condicion = {
        // Usamos el documento ya que son pacientes validados
        documento: pacienteBuscado.documento
    };
    const data = await controller.searchSimilar(pacienteBuscado, 'mpi', condicion);
    if (data.length) {
        const match = data[0];
        dbg('Match Value', match.value);
        if (match.value < 1) {
            // Inserta como paciente nuevo ya que no matchea al 100%
            return ['new', pacienteBuscado];
        } else {
            const pacienteDeMpi = match.paciente;
            /*Encontre el paciente al 100% */
            /*Para subir la última actualización se debe verificar los timeStamp existentes en caso que en mpi esté más actualizado
            se asigna notMerge para controlar que no se haga nada y el registro local sea eliminado de Andes por tener información vieja*/
            let mergeFlag = 'merge'; /*Default value*/
            // Primero verifico por UPDATE
            if (pacienteDeMpi.updatedAt && pacienteBuscado.updatedAt) {
                if (pacienteDeMpi.updatedAt > pacienteBuscado.updatedAt) {
                    mergeFlag = 'notMerge';
                }
            } else {
                // Verifico por CREATE
                if (pacienteDeMpi.createdAt && pacienteBuscado.createdAt) {
                    if (pacienteDeMpi.createdAt > pacienteBuscado.createdAt) {
                        if (pacienteBuscado.updatedAt) {
                            if (pacienteDeMpi.createdAt > pacienteBuscado.updatedAt) {
                                mergeFlag = 'notMerge';
                            }
                        } else {
                            mergeFlag = 'notMerge';
                        }
                    } else {
                        if (pacienteDeMpi.updatedAt) {
                            if (pacienteDeMpi.updatedAt > pacienteBuscado.createdAt) {
                                mergeFlag = 'notMerge';
                            }
                        }
                    }
                }
            }
            return [mergeFlag, pacienteDeMpi];
        }

    } else {
        return ['new', pacienteBuscado];
    }
}
/**
 * Inserta pacientes validados en MPI y los borra de ANDES
 * Ejecutada en un job del scheduler
 * @export
 * @returns
 */
export async function updatingMpi() {
    /*Definicion de variables y operaciones*/
    dbg('MPIUpdater start');
    Logger.log(userScheduler, 'mpiUpdater', 'started', {
    });
    /*La condición de búsqueda es que sea un paciente validado por fuente auténtica*/
    const condicion = {
        estado: 'validado',
    };
    const cursorPacientes = paciente.find(condicion).cursor();
    const cursorPromise = await cursorPacientes.eachAsync(async (pacAndes: any) => {
        if (!pacAndes) {
            Logger.log(userScheduler, 'mpiUpdater', 'update', {
                accion: 'Paciente no encontrado',
                paciente: pacAndes
            });
            return null;
        }
        try {
            // Preservo el usuario real que hizo la modificación / creación
            userScheduler.user = {
                usuario: { nombre: pacAndes.createdBy.nombre, apellido: pacAndes.createdBy.apellido },
                organizacion: pacAndes.createdBy.organizacion
            };
            dbg('Paciente validado en ANDES ', pacAndes._id, pacAndes.apellido);
            const resultado = await existeEnMpi(pacAndes);
            dbg('Existe en MPI', resultado[0], resultado[1].nombre + ' ' + resultado[1].apellido);
            /*Si NO hubo matching al 100% lo tengo que insertar en MPI */
            if (resultado[0] !== 'merge') {
                if (resultado[0] === 'new') {
                    const pacElastic = resultado[1].toObject();
                    const pac = new pacienteMpi(pacElastic);
                    await controller.deletePacienteAndes(pacAndes._id); // Borra paciente mongodb Local
                    await controller.postPacienteMpi(pac, userScheduler);
                } else if (resultado[0] === 'notMerge') {
                    // caso: paciente en mpi más actual que el paciente local
                    await controller.deletePacienteAndes(pacAndes._id); // no hace nada en elastic
                }
            } else {
                /*Se fusionan los pacientes, pacFusionar es un paciente de ANDES y tengo q agregar
                los campos de este paciente al paciente de mpi*/
                const pacienteAndes = pacAndes;
                const pacMpi: any = new pacienteMpi(resultado[1]);
                await controller.deletePacienteAndes(pacAndes._id); // Borro el paciente de mongodb Local
                // Comentado hasta que se corrija el servicio de ANSES
                // Verifico cuil anses
                // if (!pacienteAndes.cuil) {
                //     const cuilData = await servicioAnses.getServicioAnses(pacienteAndes);
                //     if (cuilData) {
                //         pacienteAndes.cuil = cuilData['cuil'];
                //     }
                // }
                await controller.updatePacienteMpi(pacMpi, pacienteAndes, userScheduler);
            }
            dbg('Termino con el paciente');
            Logger.log(userScheduler, 'mpiUpdater', 'update', {
                accion: resultado[0],
                paciente: pacAndes
            });
        } catch (ex) {
            dbg('errorUpdater-----', ex);
            Logger.log(userScheduler, 'mpiUpdater', 'error', {
                error: ex,
                paciente: pacAndes
            });
            return (ex);
        }

    });
    Logger.log(userScheduler, 'mpiUpdater', 'finished', {
    });
    return cursorPromise;
}
