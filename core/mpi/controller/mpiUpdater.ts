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


/**
 * Verfica que el paciente a insertar en MPI no exista previamente
 *
 * @export
 * @param {*} pacienteBuscado
 * @returns
 */
function existeEnMpi(pacienteBuscado: any) {
    let cursorPacienteMpi: any = [];
    let match = new Matching();
    let porcentajeMatcheo;
    let condicion = {
        // Usamos el documento ya que son pacientes validados
        'documento': pacienteBuscado.documento
    };
    let weights = config.mpi.weightsUpdater;

    return new Promise((resolve: any, reject: any) => {
        let flag = false;
        /*Busco todos los pacientes en MPI que caen en ese bloque */
        cursorPacienteMpi = pacienteMpi.find(condicion).cursor();
        cursorPacienteMpi.on('close', function () { // Si no lo encontró, devuelvo el paciente
            if (!flag) {
                resolve(['new', pacienteBuscado]);
            }
        });
        cursorPacienteMpi.on('data', function (data) {
            if (data != null) {
                flag = true;
                let pacienteDeMpi = data;
                porcentajeMatcheo = match.matchPersonas(pacienteBuscado, pacienteDeMpi, weights, config.algoritmo); // Por cada paciente lo comparo con el paciente Buscado
                if (porcentajeMatcheo < 1) {
                    // Inserta como paciente nuevo ya que no matchea al 100%
                    resolve(['new', pacienteBuscado]);
                } else {
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
                                if (pacienteDeMpi.updatedAt) {
                                    if (pacienteDeMpi.createdAt > pacienteBuscado.createdAt) {
                                        mergeFlag = 'notMerge';
                                    }
                                } else {
                                    mergeFlag = 'notMerge';
                                }
                            }
                        }
                    }
                    resolve([mergeFlag, pacienteDeMpi]);
                }
            }
        });

    });
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
    return new Promise((resolve: any, reject: any) => {

        /*La condición de búsqueda es que sea un paciente validado por fuente auténtica*/
        let condicion = {
            'estado': 'validado',
        };
        let cursorPacientes = paciente.find(condicion).cursor();
        cursorPacientes.eachAsync(async pacAndes => {
            if (pacAndes !== null) {
                try {
                    let resultado = await existeEnMpi(pacAndes);
                    let objectId = new mongoose.Types.ObjectId(resultado[1]._id);
                    /*Si NO hubo matching al 100% lo tengo que insertar en MPI */
                    if (resultado[0] !== 'merge') {
                        if (resultado[0] === 'new') {
                            let pac = resultado[1].toObject();
                            await controller.deletePacienteAndes(objectId); // Borra paciente mongodb Local
                            await controller.postPacienteMpi(pac, userScheduler); // Actualiza elastico
                        } else if (resultado[0] === 'notMerge') {
                            await controller.deletePacienteAndes(objectId); // no hace nada en elastic
                        }
                    } else {
                        /*Se fusionan los pacientes, pacFusionar es un paciente de ANDES y tengo q agregar
                        los campos de este paciente al paciente de mpi*/
                        let pacienteAndes = pacAndes;
                        let pacMpi = resultado[1];
                        await controller.deletePacienteAndes(objectId); // Borro el paciente de mongodb Local
                        await controller.updatePaciente(pacMpi, pacienteAndes, userScheduler);
                    }
                } catch (ex) {
                    reject(ex);
                }
            }
        });
    });
}
