import * as mongoose from 'mongoose';
import * as express from 'express';

import { Matching } from '@andes/match';
import { vacunas } from '../schemas/vacunas';
import { paciente, pacienteMpi } from '../../../core/mpi/schemas/paciente';

let router = express.Router();

// pesos para el matcheo
const weights = {
    identity: 0.3,
    name: 0.2,
    gender: 0.3,
    birthDate: 0.2
};

function buscarPaciente(id): Promise<{ db: String, paciente: any }> {
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
                        } else if (dataMpi) {
                            let resultado = {
                                db: 'mpi',
                                paciente: dataMpi
                            };
                            resolve(resultado);
                        } else {
                            reject(null);
                        }
                    });
                }
            }
        });
    });
}


router.get('/vacunas', function (req: any, res, next) {
    let conditions = {};

    const pacienteId = req.user.pacientes[0].id;

    // primero buscar paciente
    buscarPaciente(pacienteId).then(data => {
        const pacienteMPI = data.paciente;

        // Filtramos por documento
        if (req.query.documento) {
            conditions['documento'] = req.query.documento;
        }

        const sort = { fechaAplicacion: -1 };



        // buscar vacunas
        vacunas.find(conditions).sort(sort).exec((err, resultados) => {
            resultados.forEach((vacuna: any, index) => {

                let pacienteVacuna = {
                    nombre: vacuna.nombre,
                    apellido: vacuna.apellido,
                    documento: vacuna.documento,
                    sexo: vacuna.sexo,
                    fechaNacimiento: vacuna.fechaNacimiento
                };
                console.log(pacienteVacuna);

                let match = new Matching();
                let resultadoMatching = match.matchPersonas(pacienteMPI, pacienteVacuna, weights, 'Levenshtein');

                // no cumple con el numero del matching
                if (resultadoMatching < 0.90) {
                    resultados.splice(index, 1);
                }
            });

            if (err) {
                return next(err);
            }

            res.json(resultados);
        });
    }).catch(error => {
        return next(error);
    });
});

router.get('/vacunas/count', function (req: any, res, next) {
    let dni = req.query.dni;
    // buscar vacunas
    console.log(dni);
    vacunas.find({ documento: dni }).count().exec((err, count) => {
        if (err) {
            return next(res);
        }

        res.json(count);

    });

});

module.exports = router;
