import { pacienteMpi } from '../schemas/paciente';
import { pacienteRejected } from '../schemas/pacienteRejected';
import { matchSisa } from '../../../utils/servicioSisa';
import { Auth } from '../../../auth/auth.class';
import * as controllerPaciente from './paciente';

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
 * Corrije nombre y apellido de los pacientes que ingresaron al repositorio
 * para detectar posibles problemas durante el escaneo del código QR del dni del paciente
 *
 * @export
 * @returns {Any}
 */
export function mpiCorrector() {
    return new Promise((resolve, reject) => {
        let condicion = {
            'entidadesValidadoras': {
                $nin: ['Sisa']
            }
        };
        let cursor = pacienteMpi.find(condicion).cursor();
        cursor.eachAsync(doc => {
            let pacienteAndes: any = doc;
            // realiza la consulta con sisa y devuelve los resultados del matcheo
            matchSisa(pacienteAndes).then(resultado => {
                if (resultado) {
                    let match = resultado['matcheos'].matcheo; // Valor del matcheo de sisa
                    let pacienteSisa = resultado['matcheos'].datosPaciente; // paciente con los datos de Sisa originales
                    let data = {};
                    if (match >= 95) {
                        // Si el matcheo es mayor a 95% tengo que actualizar los datos en MPI
                        // pacienteAndes.nombre = pacienteSisa.nombre;
                        // pacienteAndes.apellido = pacienteSisa.apellido;
                        data = {
                            nombre: pacienteSisa.nombre,
                            apellido: pacienteSisa.apellido,
                        };
                    } else {
                        // POST/PUT en una collection pacienteRejected
                        let pacienteMatch = new pacienteRejected();
                        pacienteMatch.id = pacienteAndes._id;
                        pacienteMatch['documento'] = pacienteAndes.documento;
                        pacienteMatch['nombre'] = pacienteAndes.nombre;
                        pacienteMatch['apellido'] = pacienteAndes.apellido;
                        pacienteMatch['sexo'] = pacienteAndes.sexo;
                        pacienteMatch['fechaNacimiento'] = pacienteAndes.fechaNacimiento;

                        pacienteRejected.findById(pacienteAndes.id).then(pac => {
                            if (pac) {
                                pacienteMatch = pac;
                            }
                            pacienteMatch['porcentajeMatch'] = [{'entidad': 'Sisa', 'match': pacienteAndes.matchSisa }];
                            pacienteMatch.save((err) => {
                                if (err) {
                                    return reject(err);
                                }
                            });

                        });
                    }
                    // Agrega a sisa como entidad validadora
                    pacienteAndes.entidadesValidadoras.push('Sisa');
                    data['entidadesValidadoras'] = pacienteAndes.entidadesValidadoras;
                    // PUT de paciente en MPI
                    controllerPaciente.updatePaciente(pacienteAndes, data, fakeReq);
                }

            });
        });
    });
}
