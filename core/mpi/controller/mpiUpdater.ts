import * as config from '../../../config';
import {
    userScheduler
} from '../../../config.private';
import * as mongoose from 'mongoose';
import * as controller from './paciente';
import {
    paciente,
    pacienteMpi
} from '../schemas/paciente';
import {
    Matching
} from '@andes/match';

import * as debug from 'debug';
let log = debug('mpiUpdater');


/**
 * Verfica que el paciente a insertar en MPI no exista previamente
 *
 * @export
 * @param {Paciente} pacienteBuscado
 * @returns
 */

async function existeEnMpi(pacienteBuscado: any) {
    let condicion = {
        // Usamos el documento ya que son pacientes validados
        'documento': pacienteBuscado.documento
    };
    let weights = config.mpi.weightsUpdater;
    let data = await controller.searchSimilar(pacienteBuscado, 'mpi', condicion);
    if (data.length) {
        let match = data[0];
        log('Match Value', match.value);
        if (match.value < 1) {
            // Inserta como paciente nuevo ya que no matchea al 100%
            return ['new', pacienteBuscado];
        } else {
            let pacienteDeMpi = match.paciente;
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
export function updatingMpi() {
    /*Definicion de variables y operaciones*/
    let counter = 0;
    log('MPIUpdater start');

    /*La condición de búsqueda es que sea un paciente validado por fuente auténtica*/
    let condicion = {
        'estado': 'validado',
    };
    let cursorPacientes = paciente.find(condicion).cursor();
    cursorPacientes.eachAsync(async (pacAndes: any) => {
        if (pacAndes !== null) {
            try {
                // Preservo el usuario real que hizo la modificación / creación
                userScheduler.user = {
                    usuario: { nombre: pacAndes.createdBy.nombre, apellido: pacAndes.createdBy.apellido },
                    organizacion: pacAndes.createdBy.organizacion
                };
                log('Paciente validado en ANDES ', pacAndes._id, pacAndes.apellido);
                let resultado = await existeEnMpi(pacAndes);
                let objectId = new mongoose.Types.ObjectId(resultado[1]._id);
                log('Existe en MPI', resultado[0], resultado[1].nombre + ' ' + resultado[1].apellido);
                /*Si NO hubo matching al 100% lo tengo que insertar en MPI */
                if (resultado[0] !== 'merge') {
                    if (resultado[0] === 'new') {
                        let pacElastic = resultado[1].toObject();
                        let pac = new pacienteMpi(pacElastic);
                        await controller.deletePacienteAndes(pacAndes._id); // Borra paciente mongodb Local
                        await controller.postPacienteMpi(pac, userScheduler);
                    } else if (resultado[0] === 'notMerge') {
                        // caso: paciente en mpi más actual que el paciente local
                        await controller.deletePacienteAndes(pacAndes._id); // no hace nada en elastic
                    }
                } else {
                    /*Se fusionan los pacientes, pacFusionar es un paciente de ANDES y tengo q agregar
                    los campos de este paciente al paciente de mpi*/
                    let pacienteAndes = pacAndes;
                    let pacMpi = new pacienteMpi(resultado[1]);
                    await controller.deletePacienteAndes(pacAndes._id); // Borro el paciente de mongodb Local
                    await controller.updatePacienteMpi(pacMpi, pacienteAndes, userScheduler);
                }
                log('Termino con el paciente');
            } catch (ex) {
                log('errorUpdater-----', ex);
                return (ex);
            }
        }
    });
}
