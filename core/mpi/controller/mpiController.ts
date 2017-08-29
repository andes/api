import { pacienteMpi, sisaRejected } from '../schemas/paciente';
import { matchSisa } from '../../../utils/servicioSisa';
import { Auth } from '../../../auth/auth.class';
import * as controllerPaciente from './paciente';
/**
 * Corrije nombre y apellido de los pacientes que ingresaron al repositorio
 * para detectar posibles problemas durante el escaneo del código QR del dni del paciente
 *
 * @export
 * @returns {Any}
 */
export function mpiCorrector(req) {
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
                    log(resultado);
                    let data;
                    if (match >= 95) {
                        // Si el matcheo es mayor a 95% tengo que actualizar los datos en MPI
                        // pacienteAndes.nombre = pacienteSisa.nombre;
                        // pacienteAndes.apellido = pacienteSisa.apellido;
                        data = {
                            nombre: pacienteSisa.nombre,
                            apellido: pacienteSisa.apellido,
                        };
                    } else {
                        // TODO: POST/PUT en una collection sisaRejected


                    }
                    pacienteAndes.entidadesValidadoras.push('Sisa');
                    data['entidadesValidadoras'] = pacienteAndes.entidadesValidadoras;
                    controllerPaciente.updatePaciente(pacienteAndes, data, req);
                    // agrega a sisa como entidad validadora
                    // pacienteAndes.entidadesValidadoras.push('Sisa');
                    // TODO: PUT de paciente en MPI
                }

            });
        });
    });
}
