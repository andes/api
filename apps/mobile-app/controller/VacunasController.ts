import { Vacunas } from '../schemas/vacunas';
import { Matching } from '@andes/match';

const weights = {
    identity: 0.3,
    name: 0.2,
    gender: 0.3,
    birthDate: 0.2
};


export async function getCount(paciente) {
    const count = await Vacunas.find({ documento : paciente.documento }).count();
    return count;
}

export async function getVacunas(paciente) {
    const match = new Matching();
    const sort = { fechaAplicacion: -1 };
    let resultados = await Vacunas.find({ documento: paciente.documento }).sort(sort);
    resultados.forEach( (vacuna: any, index) => {
        const pacienteVacuna = {
            nombre: vacuna.nombre,
            apellido: vacuna.apellido,
            documento: vacuna.documento,
            sexo: vacuna.sexo,
            fechaNacimiento: vacuna.fechaNacimiento
        };
        const resultadoMatching = match.matchPersonas(paciente, pacienteVacuna, weights, 'Levenshtein');

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

    return resultados;

}
