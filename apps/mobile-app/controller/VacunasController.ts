import * as mongoose from 'mongoose';
import { vacunas } from '../schemas/vacunas';
import { Matching } from '@andes/match';

const weights = {
    identity: 0.3,
    name: 0.2,
    gender: 0.3,
    birthDate: 0.2
};


export function getCount (paciente) {
    return new Promise((resolve, reject) => {
        vacunas.find({ 'documento' : paciente.documento }).count().exec( (err, count)  => {
            if (err) {
                return reject(err);
            }

            resolve(count);

        });
    });
}

export function getVacunas (paciente) {
    let conditions = {};
    conditions['documento'] = paciente.documento;
    const sort = { fechaAplicacion: -1 };

    return new Promise((resolve, reject) => {

        vacunas.find(conditions).sort(sort).exec( (err, resultados)  => {
            if (!resultados || err) {
                return reject(err);
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
                let resultadoMatching = match.matchPersonas(paciente, pacienteVacuna, weights, 'Levenshtein');

                // no cumple con el numero del matching
                if (resultadoMatching < 0.90) {
                    resultados.splice(index, 1);
                } else {
                    vacuna.nombre = undefined;
                    vacuna.apellido = undefined;
                    vacuna.sexo = undefined;
                    vacuna.documento = undefined;
                    vacuna.fechaNacimiento = undefined;
                }

            });

            return resolve(resultados);

        });
    });
}
