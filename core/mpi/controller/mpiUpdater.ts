import { paciente, pacienteMpi } from '../schemas/paciente';
import { matchSisa } from '../../../utils/servicioSisa';
import { Auth } from '../../../auth/auth.class';
import * as config from '../../../config';
import * as configPrivate from '../../../config.private';
import { Matching } from '@andes/match';
import * as controller from './paciente';
import * as mongoose from 'mongoose';

/*Verfica que el paciente que si desea insertar en MPI no exista previamente*/
export function existeEnMpi(pacienteBuscado: any) {
    let url = configPrivate.hosts.mongoDB_mpi;
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

        /*Busco todos los pacientes en MPI que caen en ese bloque */
        cursorPacienteMpi = pacienteMpi.find(condicion).cursor();

        cursorPacienteMpi.on('end', function () { // Si no lo encontró, devuelvo el paciente
            resolve(['new', pacienteBuscado]);
        });
        cursorPacienteMpi.eachAsync(data => {
            if (data != null) {
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

export function updatingMpi(token: any) {
    /*Definicion de variables y operaciones*/
    let pacientesInsertados: any = [];
    let counter = 0;
    return new Promise((resolve: any, reject: any) => {

        try {
            let url = configPrivate.hosts.mongoDB_main.host;
            /*La condición de búsqueda es que sea un paciente validado por fuente auténtica*/
            let condicion = {
                'estado': 'validado',
            };
            let cursorPacientes = paciente.find(condicion).cursor();
            /*Finaliza el recorrido del cursor con los datos de pacientes validados */
            cursorPacientes.on('end', function () {
                resolve(pacientesInsertados);
            });
            cursorPacientes.eachAsync(data => {
                if (data !== null) {
                    /*Hacemos una pausa para que de tiempo a la inserción y luego al borrado del paciente*/
                    cursorPacientes.pause();
                    existeEnMpi(data)
                        .then((resultado: any) => {
                            let ObjectId = mongoose.Types.ObjectId;
                            let objectId = new ObjectId(resultado._id);
                            controller.deletePacienteAndes(objectId)
                                .then((rta3: any) => {
                                    /*Si NO hubo matching al 100% lo tengo que insertar en MPI */
                                    if (resultado[0] !== 'merge') {
                                        if (resultado[0] === 'new') {
                                            pacientesInsertados.push(resultado);
                                            controller.postPacienteMpi(resultado)
                                                .then((rta4: any) => {
                                                    // console.log('Paciente Guardado es:', resultado);
                                                });
                                        }
                                    } else {
                                        /*Se fusionan los pacientes, pacFusionar es un paciente de ANDES y tengo q agregar
                                        los campos de este paciente al paciente de mpi*/
                                        let pacienteAndes = data;
                                        let pacienteMpi = resultado;
                                        controller.updatePaciente(pacienteMpi, pacienteAndes)
                                            .then((rta5: any) => {
                                                // console.log('El paciente ha sido actualizado: ', pacienteMpi);
                                            });
                                    }
                                });
                            // console.log('Cantidad de pacientes procesados', counter++);
                            cursorPacientes.resume();
                        });
                }
            });

        } catch (err) {
            reject(err);
        }
    });
}
