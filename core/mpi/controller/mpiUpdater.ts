import { paciente, pacienteMpi } from '../schemas/paciente';
import { matchSisa } from '../../../utils/servicioSisa';
import { Auth } from '../../../auth/auth.class';
import * as config from '../../../config';
import * as configPrivate from '../../../config.private';
import { Matching } from '@andes/match';
import * as controller from './paciente';
import * as mongoose from 'mongoose';

const fakeReq = {
    user: {
        usuario: {
            nombre: 'Mpi',
            apellido: 'Updater'
        },
        organizacion: {
            "nombre": "HPN"
        }
    },
    ip: '0.0.0.0',
    connection: {
        localAddress: '0.0.0.0'
    }
}

/*Verfica que el paciente que si desea insertar en MPI no exista previamente*/
export function existeEnMpi(pacienteBuscado: any) {
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
                console.log("fin sin resultado");
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
            cursorPacientes.eachAsync(data => {
                if (data !== null) {
                    existeEnMpi(data).then((resultado: any) => {
                        let objectId = new mongoose.Types.ObjectId(resultado[1]._id);
                        /*Si NO hubo matching al 100% lo tengo que insertar en MPI */
                        if (resultado[0] !== 'merge') {
                            if (resultado[0] === 'new') {
                                let paciente = resultado[1].toObject();
                                controller.postPacienteMpi(paciente, fakeReq)
                                    .then((rta4: any) => {
                                        controller.deletePacienteAndes(objectId).catch(error => {
                                            console.log('Delete 1 error', error)
                                        });
                                    }).catch(error => {
                                        console.log('post Paciente error', error)
                                    });
                            } else if (resultado[0] === 'notMerge') {
                                controller.deletePacienteAndes(objectId).catch(error => {
                                    console.log('Delete 2 error', error)
                                });
                            }
                        } else {
                            /*Se fusionan los pacientes, pacFusionar es un paciente de ANDES y tengo q agregar
                            los campos de este paciente al paciente de mpi*/
                            let pacienteAndes = data;
                            let pacienteMpi = resultado[1];
                            controller.updatePaciente(pacienteMpi, pacienteAndes, fakeReq).then((rta5: any) => {
                                controller.deletePacienteAndes(objectId).catch(error => {
                                    console.log('Delete 3 error', error)
                                });
                            }).catch(error => {
                                console.log('Update paciente', error)
                            });
                        }
                    }).catch(error => {
                        console.log('exite en mpi error', error)
                    });
                }
            });
        } catch (err) {
        }
    });
}
