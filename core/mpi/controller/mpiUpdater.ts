import * as config from '../../../config';
import * as mongoose from 'mongoose';
import * as controller from './paciente';
import { paciente, pacienteMpi } from '../schemas/paciente';
import { Matching } from '@andes/match';

const fakeReq = {
    user: {
        usuario: {
            nombre: 'Mpi',
            apellido: 'Updater'
        },
        organizacion: {
            'nombre': 'HPN'
        }
    },
    ip: '0.0.0.0',
    connection: {
        localAddress: '0.0.0.0'
    }
};

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
        'claveBlocking.0': pacienteBuscado.claveBlocking[0]
    };
    let weights = {
        identity: 0.3,
        name: 0.3,
        gender: 0.1,
        birthDate: 0.3
    };

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
                    resolve([mergeFlag, pacienteBuscado]);
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
        try {
            /*La condición de búsqueda es que sea un paciente validado por fuente auténtica*/
            let condicion = {
                'estado': 'validado',
            };
            let cursorPacientes = paciente.find(condicion).cursor();
            cursorPacientes.eachAsync(async data => {
                if (data !== null) {
                    let resultado = await existeEnMpi(data);
                    let objectId = new mongoose.Types.ObjectId(resultado[1]._id);
                    /*Si NO hubo matching al 100% lo tengo que insertar en MPI */
                    if (resultado[0] !== 'merge') {
                        if (resultado[0] === 'new') {
                            let pac = resultado[1].toObject();
                            await controller.postPacienteMpi(pac, fakeReq);
                            await controller.deletePacienteAndes(objectId);
                        } else if (resultado[0] === 'notMerge') {
                            await controller.deletePacienteAndes(objectId);
                        }
                    } else {
                        /*Se fusionan los pacientes, pacFusionar es un paciente de ANDES y tengo q agregar
                        los campos de este paciente al paciente de mpi*/
                        let pacienteAndes = data;
                        let pacMpi = resultado[1];
                        await controller.updatePaciente(pacMpi, pacienteAndes, fakeReq);
                        await controller.deletePacienteAndes(objectId);
                    }
                }
            });
        } catch (err) { }
    });
}
