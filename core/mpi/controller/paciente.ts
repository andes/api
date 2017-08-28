/* Realiza la búsqueda del paciente en la bd LOCAL y en MPI remoto */
import { paciente, pacienteMpi } from "../schemas/paciente";

export function buscarPaciente(id) {
    return new Promise((resolve, reject) => {
        paciente.findById(id, function (err, data) {
            if (err) {
                reject(err);
            } else {
                if (data) {
                    let resultado = {
                        db: 'andes',
                        paciente: data
                    };
                    resolve(resultado);
                } else {
                    pacienteMpi.findById(id, function (err2, dataMpi) {
                        if (err2) {
                            reject(err2);
                        }
                        let resultado = {
                            db: 'mpi',
                            paciente: dataMpi
                        };
                        resolve(resultado);
                    });
                }
            }
        });
    });
}