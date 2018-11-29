import { vacunas } from '../schemas/vacunas';
import { Matching } from '@andes/match';
import { weightsVaccine } from '../../../config';

export function getCount(paciente) {
    return new Promise((resolve, reject) => {
        vacunas.find({ documento: paciente.documento }).count().exec((err, count) => {
            if (err) {
                return reject(err);
            }
            resolve(count);
        });
    });
}
export function getVacunas(paciente) {
    const conditions = {};
    conditions['documento'] = paciente.documento;
    const sort = { fechaAplicacion: -1 };
    return new Promise((resolve, reject) => {
        vacunas.find(conditions).sort(sort).exec((err, resultados) => {
            if (!resultados || err) {
                return reject(err);
            }
            resultados.forEach((vacuna: any, index) => {
                const pacienteVacuna = {
                    nombre: vacuna.nombre,
                    apellido: vacuna.apellido,
                    documento: vacuna.documento,
                    sexo: vacuna.sexo,
                    fechaNacimiento: vacuna.fechaNacimiento
                };
                const match = new Matching();
                const resultadoMatching = match.matchPersonas(paciente, pacienteVacuna, weightsVaccine, 'Levenshtein');
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
export function getVacuna(id) {
    return vacunas.findOne({ idvacuna: id }).then((doc) => {
        return doc;
    });
}
export function createVacuna(vacuna) {
    let doc = new vacunas(vacuna);
    return doc.save().then(() => {
        return doc;
    });
}
