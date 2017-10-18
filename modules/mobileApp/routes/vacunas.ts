import * as mongoose from 'mongoose';
import * as express from 'express';

import { Matching } from '@andes/match';
import * as controller from './../../../core/mpi/controller/paciente';
import { vacunas } from '../schemas/vacunas';

let router = express.Router();

// pesos para el matcheo
const weights = {
    identity: 0.3,
    name: 0.2,
    gender: 0.3,
    birthDate: 0.2
};

/**
 * Obtenemos las vacunas del Paciente App
 */

router.get('/vacunas', function (req: any, res, next) {
    let conditions = {};

    const pacienteId = req.user.pacientes[0].id;

    // primero buscar paciente
    controller.buscarPaciente(pacienteId).then(data => {
        const pacienteMPI = data.paciente;

        // Filtramos por documento
        if (req.query.dni) {
            conditions['documento'] = req.query.dni;
        }

        const sort = { fechaAplicacion: -1 };

        // buscar vacunas
        vacunas.find(conditions).sort(sort).exec( (err, resultados)  => {
            if (!resultados) {
                return next(err);
            }

            if (err) {
                return next(err);
            }

            resultados.forEach( (vacuna: any, index) => {

                let pacienteVacuna = {
                    nombre: vacuna.nombre,
                    apellido: vacuna.apellido,
                    documento: vacuna.documento,
                    sexo: vacuna.sexo,
                    fechaNacimiento: vacuna.fechaNacimiento
                };

                let match = new Matching();
                let resultadoMatching = match.matchPersonas(pacienteMPI, pacienteVacuna, weights, 'Levenshtein');

                // no cumple con el numero del matching
                if (resultadoMatching < 0.90) {
                    resultados.splice(index, 1);
                }
            });


            res.json(resultados);
        });
    }).catch(error => {
        return next(error);
    });
});


/**
 * Cantidad de vacunas de un paciente
 */

router.get('/vacunas/count', function (req: any, res, next) {
    let dni = req.query.dni;

    // buscar vacunas
    vacunas.find({ 'documento': dni }).count().exec( (err, count)  => {
        if (err) {
            return next(res);
        }

        res.json(count);

    });

});

module.exports = router;
